// src/index.ts

import { Hono } from 'hono';
import type { Env, RuleItem, UserAccount, Schedule } from './types';
import { accessAuthMiddleware } from './auth';
import { renderDashboard } from './ui';

type AppEnv = { Bindings: Env; Variables: { userEmail: string } };

const app = new Hono<AppEnv>();

// Auth middleware
app.use('*', accessAuthMiddleware);

// Health check
app.get('/health', (c) => c.text('OK'));

// User info
app.get('/api/me', (c) => c.json({ email: c.get('userEmail') }));

// Helper: build auth headers from account
function getApiHeaders(acct: UserAccount): HeadersInit {
  return {
    'X-Auth-Email': acct.api_email,
    'X-Auth-Key': acct.api_key,
    'Content-Type': 'application/json',
  };
}

// Helper: build auth headers from env (for scheduled handler)
function getEnvAuthHeaders(env: Env): HeadersInit {
  return {
    'X-Auth-Email': env.CLOUDFLARE_EMAIL,
    'X-Auth-Key': env.CLOUDFLARE_API_KEY,
    'Content-Type': 'application/json',
  };
}

// Helper: log activity
async function logActivity(db: D1Database, email: string, action: string, details: string) {
  try {
    await db.prepare(
      'INSERT INTO activity_log (user_email, action, details) VALUES (?, ?, ?)'
    ).bind(email, action, details).run();
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

// Helper: resolve account by account_id param or default
async function resolveAccount(db: D1Database, email: string, accountId?: string): Promise<UserAccount | null> {
  if (accountId) {
    return db.prepare(
      'SELECT * FROM user_accounts WHERE user_email = ? AND account_id = ?'
    ).bind(email, accountId).first<UserAccount>();
  }
  const def = await db.prepare(
    'SELECT * FROM user_accounts WHERE user_email = ? AND is_default = 1'
  ).bind(email).first<UserAccount>();
  if (def) return def;
  return db.prepare(
    'SELECT * FROM user_accounts WHERE user_email = ? ORDER BY id ASC LIMIT 1'
  ).bind(email).first<UserAccount>();
}

// Helper: fetch ruleset rules from CF API using the magic_transit phase entrypoint
async function fetchRulesetRules(acct: UserAccount): Promise<{ ruleset_id: string; rules: RuleItem[]; error?: string }> {
  // If we have a stored ruleset_id, use it directly
  let rulesetId = acct.ruleset_id;
  const headers = getApiHeaders(acct);

  if (!rulesetId) {
    // Auto-discover via the magic_transit phase entrypoint
    const phaseUrl = 'https://api.cloudflare.com/client/v4/accounts/' + acct.account_id + '/rulesets/phases/magic_transit/entrypoint';
    const phaseResp = await fetch(phaseUrl, { method: 'GET', headers });
    if (!phaseResp.ok) {
      return { ruleset_id: '', rules: [], error: 'Could not discover Magic Firewall ruleset (phase entrypoint returned ' + phaseResp.status + '). You may need to enter the ruleset ID manually.' };
    }
    const phaseData = await phaseResp.json() as any;
    if (!phaseData.success || !phaseData.result?.id) {
      return { ruleset_id: '', rules: [], error: 'No Magic Firewall ruleset found for this account.' };
    }
    rulesetId = phaseData.result.id;
    return { ruleset_id: rulesetId, rules: (phaseData.result.rules || []) as RuleItem[] };
  }

  // Fetch the ruleset by ID
  const url = 'https://api.cloudflare.com/client/v4/accounts/' + acct.account_id + '/rulesets/' + rulesetId;
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) {
    return { ruleset_id: rulesetId, rules: [], error: 'Failed to fetch ruleset: ' + resp.status };
  }
  const data = await resp.json() as any;
  if (!data.success) {
    const errMsg = (data.errors || []).map((e: any) => e.message).join('; ');
    return { ruleset_id: rulesetId, rules: [], error: errMsg };
  }
  return { ruleset_id: rulesetId, rules: (data.result?.rules || []) as RuleItem[] };
}

// ─── Account Settings ───

app.get('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const rows = await c.env.DB.prepare(
    'SELECT id, account_label, account_id, api_email, api_key, ruleset_id, is_default FROM user_accounts WHERE user_email = ? ORDER BY is_default DESC, account_label ASC'
  ).bind(email).all();

  const accounts = (rows.results || []).map((r: any) => ({
    id: r.id,
    account_label: r.account_label || r.account_id,
    account_id: r.account_id,
    api_email: r.api_email,
    has_key: !!r.api_key,
    ruleset_id: r.ruleset_id || '',
    is_default: !!r.is_default,
  }));

  return c.json({ accounts });
});

app.post('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{
    account_id?: string; account_label?: string; api_email?: string; api_key?: string;
    ruleset_id?: string;
  }>();

  const accountId = (body.account_id ?? '').trim();
  const accountLabel = (body.account_label ?? '').trim() || accountId;
  if (!accountId) return c.json({ ok: false, error: 'Account ID is required.' }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT id, api_key FROM user_accounts WHERE user_email = ? AND account_id = ?'
  ).bind(email, accountId).first<UserAccount>();

  const apiKey = (body.api_key && !body.api_key.startsWith('*'))
    ? body.api_key
    : (existing?.api_key || '');

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE user_accounts SET account_label = ?, api_email = ?, api_key = ?, ruleset_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(accountLabel, body.api_email || '', apiKey, body.ruleset_id || '', existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO user_accounts (user_email, account_label, account_id, api_email, api_key, ruleset_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(email, accountLabel, accountId, body.api_email || '', apiKey, body.ruleset_id || '').run();
  }

  await logActivity(c.env.DB, email, 'settings_saved', 'Account ' + accountId + ' saved');
  return c.json({ ok: true });
});

app.delete('/api/settings/:id', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  // Also delete schedules for that account
  const acct = await c.env.DB.prepare('SELECT account_id FROM user_accounts WHERE id = ? AND user_email = ?').bind(id, email).first<UserAccount>();
  if (acct) {
    await c.env.DB.prepare('DELETE FROM schedules WHERE user_email = ? AND account_id = ?').bind(email, acct.account_id).run();
  }
  await c.env.DB.prepare('DELETE FROM user_accounts WHERE id = ? AND user_email = ?').bind(id, email).run();
  return c.json({ ok: true });
});

app.put('/api/settings/:id/default', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('UPDATE user_accounts SET is_default = 0 WHERE user_email = ?').bind(email).run();
  await c.env.DB.prepare('UPDATE user_accounts SET is_default = 1 WHERE id = ? AND user_email = ?').bind(id, email).run();
  return c.json({ ok: true });
});

// ─── Rules (auto-discover ruleset + enumerate rules) ───

app.post('/api/rules', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_id?: string }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);

  if (!acct || !acct.account_id || !acct.api_key || !acct.api_email) {
    return c.json({ ok: false, error: 'Configure your account first (Account ID, API Email, and API Key are required).' });
  }

  try {
    const result = await fetchRulesetRules(acct);
    if (result.error) {
      return c.json({ ok: false, error: result.error });
    }

    // Persist the discovered ruleset_id if it was empty
    if (result.ruleset_id && !acct.ruleset_id) {
      await c.env.DB.prepare(
        `UPDATE user_accounts SET ruleset_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(result.ruleset_id, acct.id).run();
    }

    const rules = result.rules.map((r: RuleItem) => ({
      id: r.id,
      description: r.description || '(no description)',
      expression: r.expression || '',
      action: r.action || '',
      enabled: r.enabled,
    }));

    return c.json({ ok: true, ruleset_id: result.ruleset_id, rules });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Network error: ' + err.message }, 502);
  }
});

// ─── Schedules CRUD ───

app.get('/api/schedules', async (c) => {
  const email = c.get('userEmail');
  const accountId = c.req.query('account_id') || '';
  let rows;
  if (accountId) {
    rows = await c.env.DB.prepare(
      'SELECT * FROM schedules WHERE user_email = ? AND account_id = ? ORDER BY id ASC'
    ).bind(email, accountId).all();
  } else {
    rows = await c.env.DB.prepare(
      'SELECT * FROM schedules WHERE user_email = ? ORDER BY id ASC'
    ).bind(email).all();
  }
  return c.json({ ok: true, schedules: rows.results || [] });
});

app.post('/api/schedules', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{
    id?: number; account_id: string; label?: string; rule_ids?: string;
    enable_hour_utc?: number; disable_hour_utc?: number; enabled?: string;
  }>();

  if (!body.account_id) return c.json({ ok: false, error: 'Account ID is required.' }, 400);

  if (body.id) {
    // Update existing
    await c.env.DB.prepare(
      `UPDATE schedules SET label = ?, rule_ids = ?, enable_hour_utc = ?, disable_hour_utc = ?, enabled = ?, updated_at = datetime('now') WHERE id = ? AND user_email = ?`
    ).bind(
      body.label || '', body.rule_ids || '',
      body.enable_hour_utc ?? 17, body.disable_hour_utc ?? 1,
      body.enabled || 'true', body.id, email
    ).run();
  } else {
    // Insert new
    await c.env.DB.prepare(
      'INSERT INTO schedules (user_email, account_id, label, rule_ids, enable_hour_utc, disable_hour_utc, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      email, body.account_id, body.label || '', body.rule_ids || '',
      body.enable_hour_utc ?? 17, body.disable_hour_utc ?? 1,
      body.enabled || 'true'
    ).run();
  }

  await logActivity(c.env.DB, email, 'schedule_saved', 'Schedule "' + (body.label || 'Untitled') + '" for ' + body.account_id);
  return c.json({ ok: true });
});

app.delete('/api/schedules/:id', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM schedules WHERE id = ? AND user_email = ?').bind(id, email).run();
  return c.json({ ok: true });
});

// ─── Status — shows all rules and their schedule associations ───

app.post('/api/status', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_id?: string }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);

  if (!acct || !acct.account_id || !acct.api_key || !acct.api_email) {
    return c.json({ ok: false, error: 'Configure your account settings first.' });
  }

  try {
    const result = await fetchRulesetRules(acct);
    if (result.error) {
      return c.json({ ok: false, error: result.error });
    }

    // Get schedules for this account
    const schedRows = await c.env.DB.prepare(
      'SELECT * FROM schedules WHERE user_email = ? AND account_id = ?'
    ).bind(email, acct.account_id).all();
    const schedules = (schedRows.results || []) as unknown as Schedule[];

    // Collect all rule IDs that are managed by any schedule
    const managedRuleIds = new Set<string>();
    schedules.forEach((s: Schedule) => {
      s.rule_ids.split(',').filter((id: string) => id.trim()).forEach((id: string) => managedRuleIds.add(id.trim()));
    });

    const now = new Date();
    const currentHourUtc = now.getUTCHours();

    // Determine desired state per schedule
    const scheduleStates = schedules.map((s: Schedule) => {
      let desiredState: boolean;
      if (s.enable_hour_utc < s.disable_hour_utc) {
        desiredState = currentHourUtc >= s.enable_hour_utc && currentHourUtc < s.disable_hour_utc;
      } else {
        desiredState = currentHourUtc >= s.enable_hour_utc || currentHourUtc < s.disable_hour_utc;
      }
      return {
        id: s.id,
        label: s.label,
        rule_ids: s.rule_ids.split(',').filter((id: string) => id.trim()).map((id: string) => id.trim()),
        enable_hour_utc: s.enable_hour_utc,
        disable_hour_utc: s.disable_hour_utc,
        enabled: s.enabled,
        desiredState: s.enabled !== 'false' ? desiredState : null,
      };
    });

    const rules = result.rules.map((r: RuleItem) => ({
      id: r.id,
      description: r.description || '(no description)',
      expression: r.expression,
      action: r.action,
      enabled: r.enabled,
    }));

    return c.json({
      ok: true,
      ruleset_id: result.ruleset_id,
      rules,
      totalRules: result.rules.length,
      currentHourUtc,
      schedules: scheduleStates,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Network error: ' + err.message }, 502);
  }
});

// ─── Toggle — force enable/disable specific rules ───

app.post('/api/toggle', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ enabled: boolean; account_id?: string; rule_ids?: string[] }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);

  if (!acct || !acct.account_id || !acct.api_key || !acct.api_email) {
    return c.json({ ok: false, error: 'Configure your account settings first.' });
  }

  try {
    const result = await fetchRulesetRules(acct);
    if (result.error) {
      return c.json({ ok: false, error: result.error });
    }

    // If rule_ids provided, toggle only those; otherwise toggle all managed rules from schedules
    let targetIds: string[] = body.rule_ids || [];
    if (targetIds.length === 0) {
      const schedRows = await c.env.DB.prepare(
        'SELECT rule_ids FROM schedules WHERE user_email = ? AND account_id = ?'
      ).bind(email, acct.account_id).all();
      const allIds = new Set<string>();
      (schedRows.results || []).forEach((s: any) => {
        s.rule_ids.split(',').filter((id: string) => id.trim()).forEach((id: string) => allIds.add(id.trim()));
      });
      targetIds = [...allIds];
    }

    if (targetIds.length === 0) {
      return c.json({ ok: false, error: 'No rules to toggle. Create a schedule first.' });
    }

    let changedCount = 0;
    const updatedRules = result.rules.map((rule: RuleItem) => {
      if (targetIds.includes(rule.id) && rule.enabled !== body.enabled) {
        changedCount++;
        return { ...rule, enabled: body.enabled };
      }
      return rule;
    });

    if (changedCount === 0) {
      const state = body.enabled ? 'enabled' : 'disabled';
      return c.json({ ok: true, message: 'All target rules are already ' + state + '.' });
    }

    const url = 'https://api.cloudflare.com/client/v4/accounts/' + acct.account_id + '/rulesets/' + result.ruleset_id;
    const updateResp = await fetch(url, {
      method: 'PUT',
      headers: getApiHeaders(acct),
      body: JSON.stringify({ rules: updatedRules }),
    });

    if (!updateResp.ok) {
      return c.json({ ok: false, error: 'API update error: ' + updateResp.status });
    }

    const action = body.enabled ? 'force_enable' : 'force_disable';
    const state = body.enabled ? 'enabled' : 'disabled';
    await logActivity(c.env.DB, email, action, 'Account ' + acct.account_id + ': ' + changedCount + ' rule(s) ' + state + ' manually');

    return c.json({ ok: true, message: changedCount + ' rule(s) ' + state + ' successfully.' });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Network error: ' + err.message }, 502);
  }
});

// GET /api/activity
app.get('/api/activity', async (c) => {
  const email = c.get('userEmail');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM activity_log WHERE user_email = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(email).all();
  return c.json({ ok: true, activity: rows.results });
});

// Dashboard
app.get('/', (c) => {
  const userEmail = c.get('userEmail');
  return c.html(renderDashboard(userEmail));
});

app.get('*', (c) => c.redirect('/'));

// Scheduled Handler (unchanged logic, reads from wrangler.toml env vars)
async function handleScheduled(env: Env): Promise<void> {
  if (env.WORKER_ENABLED === 'false') {
    console.log('Worker is disabled via WORKER_ENABLED=false. Skipping scheduled execution.');
    return;
  }

  const now = new Date();
  const currentHourUtc = now.getUTCHours();

  let desiredState: boolean;
  if (env.ENABLE_HOUR_UTC < env.DISABLE_HOUR_UTC) {
    desiredState = currentHourUtc >= env.ENABLE_HOUR_UTC && currentHourUtc < env.DISABLE_HOUR_UTC;
  } else {
    desiredState = currentHourUtc >= env.ENABLE_HOUR_UTC || currentHourUtc < env.DISABLE_HOUR_UTC;
  }

  const targetRuleIdsArray = env.TARGET_RULE_IDS.split(',').filter(id => id.trim() !== '');

  console.log('Cron triggered at ' + now.toISOString() + '. Desired Rule State: ' + (desiredState ? 'Enabled' : 'Disabled') + ' for ' + targetRuleIdsArray.length + ' rules.');

  if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_EMAIL || !env.RULESET_ID || !env.ACCOUNT_ID) {
    console.error('Missing required environment variables.');
    return;
  }

  const API_ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts/' + env.ACCOUNT_ID + '/rulesets/' + env.RULESET_ID;

  try {
    const fetchResponse = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: getEnvAuthHeaders(env),
    });

    if (!fetchResponse.ok) {
      throw new Error('API Fetch Error: ' + fetchResponse.status + ' - ' + await fetchResponse.text());
    }

    const ruleset: { result: { rules: RuleItem[] } } = await fetchResponse.json() as any;
    let updateRequired = false;
    const updatedRuleIds: string[] = [];

    const updatedRules = ruleset.result.rules.map(rule => {
      if (targetRuleIdsArray.includes(rule.id)) {
        if (rule.enabled !== desiredState) {
          updateRequired = true;
          updatedRuleIds.push(rule.id);
          console.log('Rule ' + rule.id + ' state change required: ' + rule.enabled + ' -> ' + desiredState + '.');
          return {
            ...rule,
            enabled: desiredState,
          };
        }
        return rule;
      }
      return rule;
    });

    if (!updateRequired) {
      console.log('All target rules are already in the desired state. No API update needed.');
      return;
    }

    const updateResponse = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: getEnvAuthHeaders(env),
      body: JSON.stringify({
        rules: updatedRules,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('API Update Error: ' + updateResponse.status + ' - ' + await updateResponse.text());
    }

    const impactedIdsString = updatedRuleIds.join(', ');
    console.log('Successfully updated the ruleset. Rules set to: ' + (desiredState ? 'Enabled' : 'Disabled') + '. Impacted Rule IDs: [' + impactedIdsString + ']');

  } catch (error) {
    console.error('An unexpected error occurred during API operations:', error);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
