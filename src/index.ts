// src/index.ts

import { Hono } from 'hono';
import type { Env, RuleItem, UserAccount, Schedule, RuleType, Zone } from './types';
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
    'Authorization': 'Bearer ' + acct.api_token,
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

// Map rule_type to Cloudflare API phase name
const PHASE_MAP: Record<RuleType, string> = {
  mfw: 'magic_transit',
  waf_custom: 'http_request_firewall_custom',
  rate_limit: 'http_ratelimit',
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  mfw: 'Magic Firewall (L3/L4)',
  waf_custom: 'WAF Custom Rules (L7)',
  rate_limit: 'Rate Limiting (L7)',
};

// Helper: fetch ruleset rules from CF API for any supported phase
// mfw is account-scoped; waf_custom and rate_limit are zone-scoped
async function fetchPhaseRules(
  acct: UserAccount,
  ruleType: RuleType,
  zoneId?: string,
): Promise<{ ruleset_id: string; rules: RuleItem[]; error?: string }> {
  const headers = getApiHeaders(acct);
  const phase = PHASE_MAP[ruleType];

  // Build the entrypoint URL based on scope
  let entrypointUrl: string;
  if (ruleType === 'mfw') {
    // Account-scoped: use stored ruleset_id if available, otherwise auto-discover
    if (acct.ruleset_id) {
      const url = 'https://api.cloudflare.com/client/v4/accounts/' + acct.account_id + '/rulesets/' + acct.ruleset_id;
      const resp = await fetch(url, { method: 'GET', headers });
      if (!resp.ok) {
        return { ruleset_id: acct.ruleset_id, rules: [], error: 'Failed to fetch ruleset: ' + resp.status };
      }
      const data = await resp.json() as any;
      if (!data.success) {
        const errMsg = (data.errors || []).map((e: any) => e.message).join('; ');
        return { ruleset_id: acct.ruleset_id, rules: [], error: errMsg };
      }
      return { ruleset_id: acct.ruleset_id, rules: (data.result?.rules || []) as RuleItem[] };
    }
    entrypointUrl = 'https://api.cloudflare.com/client/v4/accounts/' + acct.account_id + '/rulesets/phases/' + phase + '/entrypoint';
  } else {
    // Zone-scoped
    if (!zoneId) {
      return { ruleset_id: '', rules: [], error: 'Zone ID is required for ' + RULE_TYPE_LABELS[ruleType] + ' rules.' };
    }
    entrypointUrl = 'https://api.cloudflare.com/client/v4/zones/' + zoneId + '/rulesets/phases/' + phase + '/entrypoint';
  }

  const resp = await fetch(entrypointUrl, { method: 'GET', headers });
  if (!resp.ok) {
    // 404 means no ruleset exists for this phase yet — that's normal (e.g. no WAF custom rules configured)
    if (resp.status === 404) {
      return { ruleset_id: '', rules: [] };
    }
    return { ruleset_id: '', rules: [], error: 'Could not discover ' + RULE_TYPE_LABELS[ruleType] + ' ruleset (HTTP ' + resp.status + ').' };
  }
  const data = await resp.json() as any;
  if (!data.success || !data.result?.id) {
    return { ruleset_id: '', rules: [], error: 'No ' + RULE_TYPE_LABELS[ruleType] + ' ruleset found.' };
  }
  return { ruleset_id: data.result.id, rules: (data.result.rules || []) as RuleItem[] };
}

// Helper: build the update URL for a given rule type
function getRulesetUpdateUrl(acct: UserAccount, ruleType: RuleType, rulesetId: string, zoneId?: string): string {
  if (ruleType === 'mfw') {
    return 'https://api.cloudflare.com/client/v4/accounts/' + acct.account_id + '/rulesets/' + rulesetId;
  }
  return 'https://api.cloudflare.com/client/v4/zones/' + zoneId + '/rulesets/' + rulesetId;
}

// ─── Account Settings ───

app.get('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const rows = await c.env.DB.prepare(
    'SELECT id, account_label, account_id, api_token, ruleset_id, is_default FROM user_accounts WHERE user_email = ? ORDER BY is_default DESC, account_label ASC'
  ).bind(email).all();

  const accounts = (rows.results || []).map((r: any) => ({
    id: r.id,
    account_label: r.account_label || r.account_id,
    account_id: r.account_id,
    has_token: !!r.api_token,
    ruleset_id: r.ruleset_id || '',
    is_default: !!r.is_default,
  }));

  return c.json({ accounts });
});

app.post('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{
    account_id?: string; account_label?: string; api_token?: string;
    ruleset_id?: string;
  }>();

  const accountId = (body.account_id ?? '').trim();
  const accountLabel = (body.account_label ?? '').trim() || accountId;
  if (!accountId) return c.json({ ok: false, error: 'Account ID is required.' }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT id, api_token FROM user_accounts WHERE user_email = ? AND account_id = ?'
  ).bind(email, accountId).first<UserAccount>();

  const apiToken = (body.api_token && !body.api_token.startsWith('*'))
    ? body.api_token
    : (existing?.api_token || '');

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE user_accounts SET account_label = ?, api_token = ?, ruleset_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(accountLabel, apiToken, body.ruleset_id || '', existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO user_accounts (user_email, account_label, account_id, api_token, ruleset_id) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, accountLabel, accountId, apiToken, body.ruleset_id || '').run();
  }

  await logActivity(c.env.DB, email, 'settings_saved', 'Account ' + accountId + ' saved');
  return c.json({ ok: true });
});

app.delete('/api/settings/:id', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  // Also delete schedules and cached zones for that account
  const acct = await c.env.DB.prepare('SELECT account_id FROM user_accounts WHERE id = ? AND user_email = ?').bind(id, email).first<UserAccount>();
  if (acct) {
    await c.env.DB.prepare('DELETE FROM schedules WHERE user_email = ? AND account_id = ?').bind(email, acct.account_id).run();
    await c.env.DB.prepare('DELETE FROM zones WHERE user_email = ? AND account_id = ?').bind(email, acct.account_id).run();
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

// ─── Zones (discover zones for an account) ───

app.post('/api/zones', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_id?: string }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);

  if (!acct || !acct.account_id || !acct.api_token) {
    return c.json({ ok: false, error: 'Configure your account first.' });
  }

  try {
    const headers = getApiHeaders(acct);
    const allZones: { id: string; name: string }[] = [];
    let page = 1;
    let totalPages = 1;

    // Paginate through all zones for this account
    while (page <= totalPages) {
      const url = 'https://api.cloudflare.com/client/v4/zones?account.id=' + acct.account_id + '&per_page=50&page=' + page;
      const resp = await fetch(url, { method: 'GET', headers });
      if (!resp.ok) {
        return c.json({ ok: false, error: 'Failed to list zones: HTTP ' + resp.status });
      }
      const data = await resp.json() as any;
      if (!data.success) {
        const errMsg = (data.errors || []).map((e: any) => e.message).join('; ');
        return c.json({ ok: false, error: errMsg });
      }
      (data.result || []).forEach((z: any) => allZones.push({ id: z.id, name: z.name }));
      totalPages = data.result_info?.total_pages || 1;
      page++;
    }

    // Cache in D1 (upsert)
    for (const z of allZones) {
      await c.env.DB.prepare(
        `INSERT INTO zones (user_email, account_id, zone_id, zone_name, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_email, account_id, zone_id) DO UPDATE SET zone_name = ?, updated_at = datetime('now')`
      ).bind(email, acct.account_id, z.id, z.name, z.name).run();
    }

    return c.json({ ok: true, zones: allZones });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Network error: ' + err.message }, 502);
  }
});

// GET cached zones (no API call)
app.get('/api/zones', async (c) => {
  const email = c.get('userEmail');
  const accountId = c.req.query('account_id') || '';
  if (!accountId) return c.json({ ok: true, zones: [] });
  const rows = await c.env.DB.prepare(
    'SELECT zone_id, zone_name FROM zones WHERE user_email = ? AND account_id = ? ORDER BY zone_name ASC'
  ).bind(email, accountId).all();
  const zones = (rows.results || []).map((r: any) => ({ id: r.zone_id, name: r.zone_name }));
  return c.json({ ok: true, zones });
});

// ─── Rules (auto-discover ruleset + enumerate rules) ───

app.post('/api/rules', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_id?: string; rule_type?: RuleType; zone_id?: string }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);
  const ruleType: RuleType = body.rule_type || 'mfw';

  if (!acct || !acct.account_id || !acct.api_token) {
    return c.json({ ok: false, error: 'Configure your account first (Account ID and API Token are required).' });
  }

  try {
    const result = await fetchPhaseRules(acct, ruleType, body.zone_id);
    if (result.error) {
      return c.json({ ok: false, error: result.error });
    }

    // Persist the discovered MFW ruleset_id if it was empty
    if (ruleType === 'mfw' && result.ruleset_id && !acct.ruleset_id) {
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

// ─── Test Token (permission checker) ───

app.post('/api/test-token', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ api_token?: string; account_id?: string }>();
  let token = (body.api_token ?? '').trim();
  const accountId = (body.account_id ?? '').trim();

  if (!accountId) {
    return c.json({ ok: false, error: 'Account ID is required.' });
  }

  // If no token provided (or masked), look up the stored one
  if (!token || token.startsWith('*')) {
    const acct = await resolveAccount(c.env.DB, email, accountId);
    token = acct?.api_token || '';
  }

  if (!token) {
    return c.json({ ok: false, error: 'No API Token found. Enter a token and save the account first.' });
  }

  const headers: HeadersInit = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  };

  const checks: { name: string; status: string; detail: string }[] = [];

  // 1. Verify token — try /user/tokens/verify first (works for user tokens),
  //    but don't block on failure since account tokens (cfat_) won't pass this.
  try {
    const verifyResp = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', { headers });
    const verifyData = await verifyResp.json() as any;
    if (verifyResp.ok && verifyData.success) {
      checks.push({ name: 'Token Valid', status: 'pass', detail: 'Status: ' + (verifyData.result?.status || 'active') });
    } else {
      // Account tokens don't support /user/tokens/verify — skip, let the actual API calls validate
      checks.push({ name: 'Token Valid', status: 'pass', detail: 'Skipped (account token) — will validate via API calls below' });
    }
  } catch (err: any) {
    checks.push({ name: 'Token Valid', status: 'pass', detail: 'Skipped — will validate via API calls below' });
  }

  // 2. Check account access — list rulesets
  try {
    const rsResp = await fetch('https://api.cloudflare.com/client/v4/accounts/' + accountId + '/rulesets', { headers });
    const rsData = await rsResp.json() as any;
    if (rsResp.ok && rsData.success) {
      checks.push({ name: 'Account Rulesets', status: 'pass', detail: rsData.result?.length + ' rulesets found' });
    } else {
      const msg = (rsData.errors || []).map((e: any) => e.message).join('; ') || 'HTTP ' + rsResp.status;
      checks.push({ name: 'Account Rulesets', status: 'fail', detail: msg });
    }
  } catch (err: any) {
    checks.push({ name: 'Account Rulesets', status: 'fail', detail: 'Network error' });
  }

  // 3. Check Magic Firewall access — phase entrypoint
  let mfwRulesetId: string | null = null;
  let mfwRules: any[] | null = null;
  try {
    const mfwResp = await fetch('https://api.cloudflare.com/client/v4/accounts/' + accountId + '/rulesets/phases/magic_transit/entrypoint', { headers });
    const mfwData = await mfwResp.json() as any;
    if (mfwResp.ok && mfwData.success) {
      const ruleCount = mfwData.result?.rules?.length || 0;
      mfwRulesetId = mfwData.result?.id || null;
      mfwRules = mfwData.result?.rules || [];
      checks.push({ name: 'Magic Firewall', status: 'pass', detail: 'Ruleset found with ' + ruleCount + ' rules' });
    } else {
      const msg = (mfwData.errors || []).map((e: any) => e.message).join('; ') || 'HTTP ' + mfwResp.status;
      checks.push({ name: 'Magic Firewall', status: 'fail', detail: msg });
    }
  } catch (err: any) {
    checks.push({ name: 'Magic Firewall', status: 'fail', detail: 'Network error' });
  }

  // 3b. Check Magic Firewall WRITE — no-op PUT
  if (mfwRulesetId && mfwRules) {
    try {
      const mfwWriteResp = await fetch('https://api.cloudflare.com/client/v4/accounts/' + accountId + '/rulesets/' + mfwRulesetId, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: mfwRules }),
      });
      if (mfwWriteResp.ok) {
        checks.push({ name: 'Magic Firewall Write', status: 'pass', detail: 'Write permission verified (no-op PUT)' });
      } else {
        const msg = mfwWriteResp.status === 403 ? 'Forbidden — Token needs Account > Account Rulesets: Edit' : 'HTTP ' + mfwWriteResp.status;
        checks.push({ name: 'Magic Firewall Write', status: 'fail', detail: msg });
      }
    } catch (err: any) {
      checks.push({ name: 'Magic Firewall Write', status: 'fail', detail: 'Network error' });
    }
  } else if (checks.some(ch => ch.name === 'Magic Firewall' && ch.status === 'pass')) {
    checks.push({ name: 'Magic Firewall Write', status: 'pass', detail: 'Skipped (no ruleset to test against)' });
  }

  // 4. Check Zone access — list zones for this account
  let firstZone: { id: string; name: string } | null = null;
  try {
    const zoneResp = await fetch('https://api.cloudflare.com/client/v4/zones?account.id=' + accountId + '&per_page=5', { headers });
    const zoneData = await zoneResp.json() as any;
    if (zoneResp.ok && zoneData.success) {
      const zoneCount = zoneData.result_info?.total_count || zoneData.result?.length || 0;
      checks.push({ name: 'Zone Access', status: 'pass', detail: zoneCount + ' zone(s) accessible' });
      firstZone = (zoneData.result || [])[0] || null;
    } else {
      const msg = (zoneData.errors || []).map((e: any) => e.message).join('; ') || 'HTTP ' + zoneResp.status;
      checks.push({ name: 'Zone Access', status: 'fail', detail: msg + ' — Token needs Zone > Zone: Read permission' });
    }
  } catch (err: any) {
    checks.push({ name: 'Zone Access', status: 'fail', detail: 'Network error — Token may be missing Zone > Zone: Read permission' });
  }

  // 5. Check WAF access — try first zone's WAF custom rules entrypoint
  if (firstZone) {
    let wafRulesetId: string | null = null;
    let wafRules: any[] | null = null;
    try {
      const wafResp = await fetch('https://api.cloudflare.com/client/v4/zones/' + firstZone.id + '/rulesets/phases/http_request_firewall_custom/entrypoint', { headers });
      if (wafResp.ok) {
        const wafData = await wafResp.json() as any;
        const wafRuleCount = wafData.result?.rules?.length || 0;
        wafRulesetId = wafData.result?.id || null;
        wafRules = wafData.result?.rules || [];
        checks.push({ name: 'WAF Custom Rules', status: 'pass', detail: 'Zone ' + firstZone.name + ': ' + wafRuleCount + ' rules' });
      } else {
        checks.push({ name: 'WAF Custom Rules', status: wafResp.status === 404 ? 'pass' : 'fail', detail: wafResp.status === 404 ? 'No custom rules configured (OK)' : 'HTTP ' + wafResp.status + ' — Token needs Zone > Zone WAF: Edit permission' });
      }
    } catch (err: any) {
      checks.push({ name: 'WAF Custom Rules', status: 'fail', detail: 'Network error' });
    }

    // 5b. Check WAF WRITE — no-op PUT
    if (wafRulesetId && wafRules) {
      try {
        const wafWriteResp = await fetch('https://api.cloudflare.com/client/v4/zones/' + firstZone.id + '/rulesets/' + wafRulesetId, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ rules: wafRules }),
        });
        if (wafWriteResp.ok) {
          checks.push({ name: 'WAF Write', status: 'pass', detail: 'Write permission verified (no-op PUT)' });
        } else {
          const msg = wafWriteResp.status === 403 ? 'Forbidden — Token needs Zone > Zone WAF: Edit' : 'HTTP ' + wafWriteResp.status;
          checks.push({ name: 'WAF Write', status: 'fail', detail: msg });
        }
      } catch (err: any) {
        checks.push({ name: 'WAF Write', status: 'fail', detail: 'Network error' });
      }
    } else if (checks.some(ch => ch.name === 'WAF Custom Rules' && ch.status === 'pass')) {
      checks.push({ name: 'WAF Write', status: 'pass', detail: 'Skipped (no ruleset to test against)' });
    }

    // 6. Check Rate Limiting access
    let rlRulesetId: string | null = null;
    let rlRules: any[] | null = null;
    try {
      const rlResp = await fetch('https://api.cloudflare.com/client/v4/zones/' + firstZone.id + '/rulesets/phases/http_ratelimit/entrypoint', { headers });
      if (rlResp.ok) {
        const rlData = await rlResp.json() as any;
        const rlRuleCount = rlData.result?.rules?.length || 0;
        rlRulesetId = rlData.result?.id || null;
        rlRules = rlData.result?.rules || [];
        checks.push({ name: 'Rate Limiting', status: 'pass', detail: 'Zone ' + firstZone.name + ': ' + rlRuleCount + ' rules' });
      } else {
        checks.push({ name: 'Rate Limiting', status: rlResp.status === 404 ? 'pass' : 'fail', detail: rlResp.status === 404 ? 'No rate limiting rules configured (OK)' : 'HTTP ' + rlResp.status + ' — Token needs Zone > Zone WAF: Edit permission' });
      }
    } catch (err: any) {
      checks.push({ name: 'Rate Limiting', status: 'fail', detail: 'Network error' });
    }

    // 6b. Check Rate Limiting WRITE — no-op PUT
    if (rlRulesetId && rlRules) {
      try {
        const rlWriteResp = await fetch('https://api.cloudflare.com/client/v4/zones/' + firstZone.id + '/rulesets/' + rlRulesetId, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ rules: rlRules }),
        });
        if (rlWriteResp.ok) {
          checks.push({ name: 'Rate Limiting Write', status: 'pass', detail: 'Write permission verified (no-op PUT)' });
        } else {
          const msg = rlWriteResp.status === 403 ? 'Forbidden — Token needs Zone > Zone WAF: Edit' : 'HTTP ' + rlWriteResp.status;
          checks.push({ name: 'Rate Limiting Write', status: 'fail', detail: msg });
        }
      } catch (err: any) {
        checks.push({ name: 'Rate Limiting Write', status: 'fail', detail: 'Network error' });
      }
    } else if (checks.some(ch => ch.name === 'Rate Limiting' && ch.status === 'pass')) {
      checks.push({ name: 'Rate Limiting Write', status: 'pass', detail: 'Skipped (no ruleset to test against)' });
    }
  } else {
    // Zone access failed or no zones — still report L7 checks so they're visible
    if (!checks.some(ch => ch.name === 'Zone Access')) {
      checks.push({ name: 'Zone Access', status: 'fail', detail: 'Could not list zones' });
    }
    checks.push({ name: 'WAF Custom Rules', status: 'fail', detail: 'Cannot test — zone access required (add Zone > Zone: Read permission)' });
    checks.push({ name: 'WAF Write', status: 'fail', detail: 'Cannot test — zone access required' });
    checks.push({ name: 'Rate Limiting', status: 'fail', detail: 'Cannot test — zone access required (add Zone > Zone: Read permission)' });
    checks.push({ name: 'Rate Limiting Write', status: 'fail', detail: 'Cannot test — zone access required' });
  }

  const allPassed = checks.every(function(ch) { return ch.status === 'pass'; });
  return c.json({ ok: allPassed, checks });
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
  try {
    const body = await c.req.json<{
      id?: number; account_id: string; label?: string; rule_type?: RuleType;
      zone_id?: string; rule_ids?: string;
      enable_hour_utc?: number; disable_hour_utc?: number; enabled?: string;
    }>();

    if (!body.account_id) return c.json({ ok: false, error: 'Account ID is required.' }, 400);

    const ruleType = body.rule_type || 'mfw';
    const zoneId = body.zone_id || '';

    // Validate zone_id for zone-scoped rule types
    if (ruleType !== 'mfw' && !zoneId) {
      return c.json({ ok: false, error: 'Zone is required for ' + RULE_TYPE_LABELS[ruleType] + ' schedules.' }, 400);
    }

    if (body.id) {
      // Update existing
      await c.env.DB.prepare(
        `UPDATE schedules SET label = ?, rule_type = ?, zone_id = ?, rule_ids = ?, enable_hour_utc = ?, disable_hour_utc = ?, enabled = ?, updated_at = datetime('now') WHERE id = ? AND user_email = ?`
      ).bind(
        body.label || '', ruleType, zoneId, body.rule_ids || '',
        body.enable_hour_utc ?? 17, body.disable_hour_utc ?? 1,
        body.enabled || 'true', body.id, email
      ).run();
    } else {
      // Insert new
      await c.env.DB.prepare(
        'INSERT INTO schedules (user_email, account_id, label, rule_type, zone_id, rule_ids, enable_hour_utc, disable_hour_utc, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        email, body.account_id, body.label || '', ruleType, zoneId, body.rule_ids || '',
        body.enable_hour_utc ?? 17, body.disable_hour_utc ?? 1,
        body.enabled || 'true'
      ).run();
    }

    await logActivity(c.env.DB, email, 'schedule_saved', 'Schedule "' + (body.label || 'Untitled') + '" (' + RULE_TYPE_LABELS[ruleType] + ') for ' + body.account_id);
    return c.json({ ok: true });
  } catch (err: any) {
    console.error('POST /api/schedules error:', err);
    return c.json({ ok: false, error: 'Failed to save schedule: ' + (err.message || String(err)) }, 500);
  }
});

app.delete('/api/schedules/:id', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM schedules WHERE id = ? AND user_email = ?').bind(id, email).run();
  return c.json({ ok: true });
});

app.put('/api/schedules/:id/toggle', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  const sched = await c.env.DB.prepare(
    'SELECT enabled FROM schedules WHERE id = ? AND user_email = ?'
  ).bind(id, email).first<{ enabled: string }>();
  if (!sched) return c.json({ ok: false, error: 'Schedule not found' }, 404);
  const newEnabled = sched.enabled === 'false' ? 'true' : 'false';
  await c.env.DB.prepare(
    `UPDATE schedules SET enabled = ?, updated_at = datetime('now') WHERE id = ? AND user_email = ?`
  ).bind(newEnabled, id, email).run();
  return c.json({ ok: true, enabled: newEnabled });
});

// ─── Status — shows all rules and their schedule associations ───

app.post('/api/status', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_id?: string; rule_type?: RuleType; zone_id?: string }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);
  const ruleType: RuleType = body.rule_type || 'mfw';

  if (!acct || !acct.account_id || !acct.api_token) {
    return c.json({ ok: false, error: 'Configure your account settings first.' });
  }

  try {
    const result = await fetchPhaseRules(acct, ruleType, body.zone_id);
    if (result.error) {
      return c.json({ ok: false, error: result.error });
    }

    // Get schedules for this account filtered by rule_type (and zone_id for zone-scoped)
    let schedRows;
    if (ruleType === 'mfw') {
      schedRows = await c.env.DB.prepare(
        "SELECT * FROM schedules WHERE user_email = ? AND account_id = ? AND rule_type = 'mfw'"
      ).bind(email, acct.account_id).all();
    } else {
      schedRows = await c.env.DB.prepare(
        'SELECT * FROM schedules WHERE user_email = ? AND account_id = ? AND rule_type = ? AND zone_id = ?'
      ).bind(email, acct.account_id, ruleType, body.zone_id || '').all();
    }
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
        rule_type: s.rule_type,
        zone_id: s.zone_id,
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
      rule_type: ruleType,
      rules,
      totalRules: result.rules.length,
      currentHourUtc,
      schedules: scheduleStates,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Network error: ' + err.message }, 502);
  }
});

// ─── Status All — aggregated status across all rule types ───

app.post('/api/status/all', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_id?: string }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);

  if (!acct || !acct.account_id || !acct.api_token) {
    return c.json({ ok: false, error: 'Configure your account settings first.' });
  }

  try {
    // Fetch ALL schedules for this account to discover which rule_type+zone_id combos exist
    const schedRows = await c.env.DB.prepare(
      'SELECT * FROM schedules WHERE user_email = ? AND account_id = ? ORDER BY id ASC'
    ).bind(email, acct.account_id).all();
    const allSchedules = (schedRows.results || []) as unknown as Schedule[];

    // Build unique groups: always include mfw, plus any zone-scoped types from schedules
    const groups: { rule_type: RuleType; zone_id: string }[] = [{ rule_type: 'mfw', zone_id: '' }];
    const seen = new Set<string>();
    seen.add('mfw|');
    for (const s of allSchedules) {
      const key = s.rule_type + '|' + (s.zone_id || '');
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ rule_type: s.rule_type as RuleType, zone_id: s.zone_id || '' });
      }
    }

    // Fetch cached zone names for display
    const zoneRows = await c.env.DB.prepare(
      'SELECT zone_id, zone_name FROM zones WHERE user_email = ? AND account_id = ?'
    ).bind(email, acct.account_id).all();
    const zoneNameMap: Record<string, string> = {};
    (zoneRows.results || []).forEach((r: any) => { zoneNameMap[r.zone_id] = r.zone_name; });

    const now = new Date();
    const currentHourUtc = now.getUTCHours();

    // Fetch rules for each group in parallel
    const groupResults = await Promise.all(groups.map(async (g) => {
      const result = await fetchPhaseRules(acct, g.rule_type, g.zone_id || undefined);
      // Get matching schedules
      const matchingSchedules = allSchedules.filter((s) => {
        if (g.rule_type === 'mfw') return s.rule_type === 'mfw';
        return s.rule_type === g.rule_type && s.zone_id === g.zone_id;
      });

      const scheduleStates = matchingSchedules.map((s) => {
        let desiredState: boolean;
        if (s.enable_hour_utc < s.disable_hour_utc) {
          desiredState = currentHourUtc >= s.enable_hour_utc && currentHourUtc < s.disable_hour_utc;
        } else {
          desiredState = currentHourUtc >= s.enable_hour_utc || currentHourUtc < s.disable_hour_utc;
        }
        return {
          id: s.id, label: s.label, rule_type: s.rule_type, zone_id: s.zone_id,
          rule_ids: s.rule_ids.split(',').filter((id: string) => id.trim()).map((id: string) => id.trim()),
          enable_hour_utc: s.enable_hour_utc, disable_hour_utc: s.disable_hour_utc,
          enabled: s.enabled,
          desiredState: s.enabled !== 'false' ? desiredState : null,
        };
      });

      const rules = (result.rules || []).map((r: RuleItem) => ({
        id: r.id, description: r.description || '(no description)',
        expression: r.expression, action: r.action, enabled: r.enabled,
      }));

      return {
        rule_type: g.rule_type,
        rule_type_label: RULE_TYPE_LABELS[g.rule_type],
        zone_id: g.zone_id,
        zone_name: g.zone_id ? (zoneNameMap[g.zone_id] || g.zone_id) : '',
        ruleset_id: result.ruleset_id,
        error: result.error || null,
        rules,
        schedules: scheduleStates,
      };
    }));

    return c.json({ ok: true, currentHourUtc, groups: groupResults });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Network error: ' + err.message }, 502);
  }
});

// ─── Toggle — force enable/disable specific rules ───

app.post('/api/toggle', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ enabled: boolean; account_id?: string; rule_type?: RuleType; zone_id?: string; rule_ids?: string[] }>();
  const acct = await resolveAccount(c.env.DB, email, body.account_id);
  const ruleType: RuleType = body.rule_type || 'mfw';

  if (!acct || !acct.account_id || !acct.api_token) {
    return c.json({ ok: false, error: 'Configure your account settings first.' });
  }

  try {
    const result = await fetchPhaseRules(acct, ruleType, body.zone_id);
    if (result.error) {
      return c.json({ ok: false, error: result.error });
    }

    // If rule_ids provided, toggle only those; otherwise toggle all managed rules from matching schedules
    let targetIds: string[] = body.rule_ids || [];
    if (targetIds.length === 0) {
      let schedRows;
      if (ruleType === 'mfw') {
        schedRows = await c.env.DB.prepare(
          "SELECT rule_ids FROM schedules WHERE user_email = ? AND account_id = ? AND rule_type = 'mfw'"
        ).bind(email, acct.account_id).all();
      } else {
        schedRows = await c.env.DB.prepare(
          'SELECT rule_ids FROM schedules WHERE user_email = ? AND account_id = ? AND rule_type = ? AND zone_id = ?'
        ).bind(email, acct.account_id, ruleType, body.zone_id || '').all();
      }
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

    const url = getRulesetUpdateUrl(acct, ruleType, result.ruleset_id, body.zone_id);
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
    const typeLabel = RULE_TYPE_LABELS[ruleType];
    await logActivity(c.env.DB, email, action, typeLabel + ' — Account ' + acct.account_id + ': ' + changedCount + ' rule(s) ' + state + ' manually');

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

// ─── Scheduled Handler ───
// D1-driven scheduler — processes all enabled schedules for all rule types
async function handleScheduledD1(env: Env): Promise<void> {
  const now = new Date();
  const currentHourUtc = now.getUTCHours();

  // Fetch all enabled schedules
  const schedRows = await env.DB.prepare(
    "SELECT s.*, ua.api_token, ua.ruleset_id, ua.account_label FROM schedules s JOIN user_accounts ua ON s.user_email = ua.user_email AND s.account_id = ua.account_id WHERE s.enabled = 'true'"
  ).all();
  const schedules = (schedRows.results || []) as any[];

  if (schedules.length === 0) {
    console.log('[D1 Scheduler] No enabled schedules found.');
    return;
  }

  console.log('[D1 Scheduler] Processing ' + schedules.length + ' enabled schedule(s) at ' + now.toISOString());

  // Group schedules by (account_id, rule_type, zone_id) to batch API calls
  const groups: Record<string, { acctId: string; token: string; rulesetId: string; ruleType: RuleType; zoneId: string; schedules: any[] }> = {};

  for (const s of schedules) {
    const key = s.account_id + '|' + s.rule_type + '|' + (s.zone_id || '');
    if (!groups[key]) {
      groups[key] = {
        acctId: s.account_id,
        token: s.api_token,
        rulesetId: s.ruleset_id || '',
        ruleType: (s.rule_type || 'mfw') as RuleType,
        zoneId: s.zone_id || '',
        schedules: [],
      };
    }
    groups[key].schedules.push(s);
  }

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const { acctId, token, ruleType, zoneId } = group;

    if (!token) {
      console.warn('[D1 Scheduler] Skipping group ' + key + ': no API token.');
      continue;
    }

    // Build a synthetic UserAccount for the helper functions
    const acct: UserAccount = {
      id: 0, user_email: '', account_label: '', account_id: acctId,
      api_token: token, ruleset_id: group.rulesetId, is_default: 0, updated_at: '',
    };

    try {
      const result = await fetchPhaseRules(acct, ruleType, zoneId || undefined);
      if (result.error) {
        console.error('[D1 Scheduler] Error fetching rules for ' + key + ': ' + result.error);
        continue;
      }

      // Merge all schedule rule_ids and compute desired state per rule
      const ruleDesiredState: Record<string, boolean> = {};
      for (const s of group.schedules) {
        let desiredState: boolean;
        if (s.enable_hour_utc < s.disable_hour_utc) {
          desiredState = currentHourUtc >= s.enable_hour_utc && currentHourUtc < s.disable_hour_utc;
        } else {
          desiredState = currentHourUtc >= s.enable_hour_utc || currentHourUtc < s.disable_hour_utc;
        }
        const ruleIds = (s.rule_ids || '').split(',').filter((id: string) => id.trim()).map((id: string) => id.trim());
        for (const ruleId of ruleIds) {
          // If multiple schedules target the same rule, enable wins (OR logic)
          if (ruleDesiredState[ruleId] === undefined) {
            ruleDesiredState[ruleId] = desiredState;
          } else if (desiredState) {
            ruleDesiredState[ruleId] = true;
          }
        }
      }

      let updateRequired = false;
      const updatedRuleIds: string[] = [];

      const updatedRules = result.rules.map(rule => {
        if (ruleDesiredState[rule.id] !== undefined && rule.enabled !== ruleDesiredState[rule.id]) {
          updateRequired = true;
          updatedRuleIds.push(rule.id);
          console.log('[D1 Scheduler] ' + RULE_TYPE_LABELS[ruleType] + ' rule ' + rule.id + ': ' + rule.enabled + ' -> ' + ruleDesiredState[rule.id]);
          return { ...rule, enabled: ruleDesiredState[rule.id] };
        }
        return rule;
      });

      if (!updateRequired) {
        console.log('[D1 Scheduler] Group ' + key + ': all rules already in desired state.');
        continue;
      }

      const updateUrl = getRulesetUpdateUrl(acct, ruleType, result.ruleset_id, zoneId || undefined);
      const updateResp = await fetch(updateUrl, {
        method: 'PUT',
        headers: getApiHeaders(acct),
        body: JSON.stringify({ rules: updatedRules }),
      });

      if (!updateResp.ok) {
        console.error('[D1 Scheduler] API update error for ' + key + ': HTTP ' + updateResp.status);
        continue;
      }

      console.log('[D1 Scheduler] Group ' + key + ': updated ' + updatedRuleIds.length + ' rule(s). IDs: [' + updatedRuleIds.join(', ') + ']');
    } catch (error) {
      console.error('[D1 Scheduler] Unexpected error for group ' + key + ':', error);
    }
  }
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledD1(env));
  },
};
