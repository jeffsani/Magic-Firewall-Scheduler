# Worker MFW Automation

A Cloudflare Worker that automates Magic Firewall rule scheduling. Configure multiple accounts, auto-discover rulesets, create schedules that enable/disable specific firewall rules on a time-based cadence, and visualize everything in a web dashboard.

## Features

- **Multi-account support** — manage multiple Cloudflare accounts from a single dashboard
- **Auto-discovery** — automatically detects the Magic Firewall ruleset via the `magic_transit` phase entrypoint (no manual ruleset ID entry required)
- **Rule enumeration** — fetches and displays all rules in the ruleset with a multi-select picker
- **Multiple schedules** — create multiple schedules per account, each targeting different rules with independent enable/disable time windows
- **Timeline visualization** — color-coded multi-schedule timeline showing active/inactive hours with current time marker
- **Manual override** — force enable/disable all scheduled rules with one click
- **Activity log** — tracks all actions (schedule changes, manual toggles, etc.)
- **Cloudflare Access** — protected by Cloudflare Access for authentication

## API Token Permissions

This worker authenticates to the Cloudflare API using a **Global API Key** (via `X-Auth-Email` + `X-Auth-Key` headers). The API key must belong to an account member with the following permissions:

### Required Permissions

| Permission | Access | Purpose |
|---|---|---|
| **Magic Firewall Read** | Read | Auto-discover the `magic_transit` phase entrypoint ruleset and enumerate rules |
| **Magic Firewall Write** | Write | Enable/disable individual rules within the ruleset |
| **Account Rulesets Read** | Read | List and view rulesets at the account level |
| **Account Rulesets Write** | Write | Update ruleset rules (toggle enabled state) |

### How It Works

1. **Ruleset discovery** — The worker calls `GET /accounts/{account_id}/rulesets/phases/magic_transit/entrypoint` to find the Magic Firewall root ruleset. This requires **Magic Firewall Read** and **Account Rulesets Read**.
2. **Rule enumeration** — Rules are returned as part of the entrypoint response, or fetched via `GET /accounts/{account_id}/rulesets/{ruleset_id}`.
3. **Rule toggling** — When enabling/disabling rules, the worker sends `PUT /accounts/{account_id}/rulesets/{ruleset_id}` with the full rule list (with `enabled` flags modified). This requires **Magic Firewall Write** and **Account Rulesets Write**.

> **Note:** If you prefer to use an API Token instead of a Global API Key, create a token with the permissions listed above scoped to the target account. You will need to modify the auth headers in `src/index.ts` to use `Authorization: Bearer <token>` instead of the `X-Auth-Email` / `X-Auth-Key` pair.

## Tech Stack

- **Runtime** — Cloudflare Workers
- **Framework** — [Hono](https://hono.dev/)
- **Database** — Cloudflare D1 (SQLite)
- **Auth** — Cloudflare Access (JWT validation)
- **Styling** — Tailwind CSS (via CDN)

## Getting Started

### Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- A Cloudflare account with Magic Firewall enabled

### Local Development

```bash
# Install dependencies
npm install

# Initialize the local D1 database
npx wrangler d1 execute mfw-automation-db --local --file=schema.sql

# Start dev server
npx wrangler dev --port 8788
```

### Configuration

1. Open the dashboard in your browser
2. Click the **gear icon** in the header to open the Accounts panel
3. Add an account with:
   - **Label** — friendly name (optional)
   - **Account ID** — your Cloudflare account ID
   - **API Email** — email associated with the Global API Key
   - **Global API Key** — your Cloudflare Global API Key
   - **Ruleset ID** — leave blank to auto-discover
4. Select the account as active
5. Create schedules: pick rules from the multi-select dropdown and set enable/disable hours (UTC)

### Deployment

```bash
# Create the D1 database (first time only)
npx wrangler d1 create mfw-automation-db

# Apply schema to remote database
npx wrangler d1 execute mfw-automation-db --remote --file=schema.sql

# Deploy the worker
npx wrangler deploy
```

## Project Structure

```
src/
  index.ts    — API routes (accounts, rules, schedules, status, toggle)
  ui.ts       — Dashboard HTML/CSS/JS (single-file SPA)
  types.ts    — TypeScript interfaces (Env, UserAccount, Schedule, RuleItem)
  auth.ts     — Cloudflare Access JWT validation middleware
schema.sql    — D1 database schema (user_accounts, schedules, activity_log)
wrangler.toml — Worker configuration
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings` | List all accounts for the authenticated user |
| `POST` | `/api/settings` | Create or update an account |
| `DELETE` | `/api/settings/:id` | Delete an account (cascades to schedules) |
| `PUT` | `/api/settings/:id/default` | Set an account as default |
| `POST` | `/api/rules` | Fetch rules from the account's Magic Firewall ruleset |
| `GET` | `/api/schedules` | List schedules (optional `?account_id` filter) |
| `POST` | `/api/schedules` | Create or update a schedule |
| `DELETE` | `/api/schedules/:id` | Delete a schedule |
| `POST` | `/api/status` | Get rule status with schedule associations |
| `POST` | `/api/toggle` | Force enable/disable rules |
| `GET` | `/api/activity` | Recent activity log |
