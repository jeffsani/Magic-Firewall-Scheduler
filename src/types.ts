export interface Env {
  // D1 database
  DB: D1Database;

  // Authentication Secrets (for scheduled handler)
  CLOUDFLARE_API_TOKEN: string;

  // Variables from wrangler.toml (for scheduled handler)
  ACCOUNT_ID: string;
  RULESET_ID: string;
  TARGET_RULE_IDS: string;
  ENABLE_HOUR_UTC: number;
  DISABLE_HOUR_UTC: number;
  WORKER_ENABLED: string;

  // CF Access
  ENVIRONMENT: string;
  CF_ACCESS_TEAM_DOMAIN: string;
}

export interface UserAccount {
  id: number;
  user_email: string;
  account_label: string;
  account_id: string;
  api_token: string;
  ruleset_id: string;
  is_default: number;
  updated_at: string;
}

export interface Schedule {
  id: number;
  user_email: string;
  account_id: string;
  label: string;
  rule_ids: string;
  enable_hour_utc: number;
  disable_hour_utc: number;
  enabled: string;
  updated_at: string;
}

export interface RuleItem {
  id: string;
  expression: string;
  action: string;
  description: string;
  enabled: boolean;
}

export interface ActivityLogEntry {
  id: number;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}
