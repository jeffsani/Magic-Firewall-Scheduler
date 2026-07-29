export interface Env {
  // D1 database
  DB: D1Database;

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

export type RuleType = 'mfw' | 'waf_custom' | 'rate_limit';

export interface Zone {
  id: number;
  user_email: string;
  account_id: string;
  zone_id: string;
  zone_name: string;
  updated_at: string;
}

export interface Schedule {
  id: number;
  user_email: string;
  account_id: string;
  label: string;
  rule_type: RuleType;
  zone_id: string;
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
