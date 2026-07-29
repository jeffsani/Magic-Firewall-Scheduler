-- Accounts: one row per user + account combo (multi-account support)
CREATE TABLE IF NOT EXISTS user_accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email      TEXT NOT NULL,
  account_label   TEXT NOT NULL DEFAULT '',
  account_id      TEXT NOT NULL DEFAULT '',
  api_token       TEXT NOT NULL DEFAULT '',
  ruleset_id      TEXT NOT NULL DEFAULT '',
  is_default      INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_email, account_id)
);

-- Zones: cached zone list per account (for WAF / rate-limit rule scheduling)
CREATE TABLE IF NOT EXISTS zones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email  TEXT NOT NULL,
  account_id  TEXT NOT NULL,
  zone_id     TEXT NOT NULL,
  zone_name   TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_email, account_id, zone_id)
);

-- Schedules: each schedule targets 1+ rules in an account's ruleset
-- rule_type: 'mfw' | 'waf_custom' | 'rate_limit'
-- zone_id: required for waf_custom and rate_limit (zone-scoped); empty for mfw (account-scoped)
CREATE TABLE IF NOT EXISTS schedules (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email       TEXT NOT NULL,
  account_id       TEXT NOT NULL,
  label            TEXT NOT NULL DEFAULT '',
  rule_type        TEXT NOT NULL DEFAULT 'mfw',
  zone_id          TEXT NOT NULL DEFAULT '',
  rule_ids         TEXT NOT NULL DEFAULT '',
  enable_hour_utc  INTEGER NOT NULL DEFAULT 17,
  disable_hour_utc INTEGER NOT NULL DEFAULT 1,
  enabled          TEXT NOT NULL DEFAULT 'true',
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Activity log for tracking manual actions from the UI
CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email  TEXT NOT NULL,
  action      TEXT NOT NULL,
  details     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
