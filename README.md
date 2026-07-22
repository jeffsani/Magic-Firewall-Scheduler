# Magic Firewall Rule Scheduler

A Cloudflare Worker that automates Magic Firewall rule scheduling. Configure multiple Cloudflare accounts, auto-discover rulesets, create time-based schedules that enable/disable specific firewall rules, and manage everything from a web dashboard.

![Dashboard Screenshot](screenshot.png)

## Features

- **Multi-account support** — manage multiple Cloudflare accounts from a single dashboard
- **Auto-discovery** — automatically detects the Magic Firewall ruleset via the `magic_transit` phase entrypoint (no manual ruleset ID entry)
- **Rule enumeration** — fetches and displays all rules with a multi-select picker
- **Multiple schedules** — create independent schedules per account, each targeting different rules with their own enable/disable time windows (UTC)
- **Pause/resume** — temporarily pause a schedule without deleting it; paused schedules are skipped by the cron handler
- **Timeline visualization** — color-coded timeline showing enabled/disabled hours per schedule with a current-time marker
- **Manual override** — force enable/disable all scheduled rules with one click
- **Token permission checker** — built-in "Test Token" button verifies API token permissions
- **Activity log** — tracks all actions (schedule changes, manual toggles, cron runs)
- **Cloudflare Access auth** — protected by Cloudflare Access (JWT); bypassed in dev mode
- **Dark/light theme** — toggle between dark and light mode

## Tech Stack

- **Runtime** — [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Framework** — [Hono](https://hono.dev/)
- **Database** — [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Auth** — [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) (JWT validation)
- **Styling** — [Tailwind CSS](https://tailwindcss.com/) (via CDN)

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Wrangler CLI** — `npm install -g wrangler` ([docs](https://developers.cloudflare.com/workers/wrangler/install-and-update/))
- A **Cloudflare account** with [Magic Transit](https://developers.cloudflare.com/magic-transit/) / [Magic Firewall](https://developers.cloudflare.com/magic-firewall/) enabled
- (Optional) A **Cloudflare Access** application if you want to protect the dashboard in production

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/worker-mfw-automation.git
cd worker-mfw-automation
npm install
```

### 2. Authenticate Wrangler

```bash
npx wrangler login
```

This opens a browser window to authenticate with your Cloudflare account.

### 3. Create a D1 database

```bash
npx wrangler d1 create mfw-automation-db
```

Wrangler will output something like:

```
✅ Successfully created DB 'mfw-automation-db'

[[d1_databases]]
binding = "DB"
database_name = "mfw-automation-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` value.

### 4. Configure `wrangler.toml`

```bash
cp wrangler.toml.example wrangler.toml
```

Open `wrangler.toml` and replace the placeholder values:

| Variable | Where to find it |
|---|---|
| `ACCOUNT_ID` | Cloudflare Dashboard → any domain → **Overview** → right sidebar → **Account ID** |
| `RULESET_ID` | Leave blank — the dashboard auto-discovers it. Or find it via `cf api /accounts/{id}/rulesets` |
| `TARGET_RULE_IDS` | Comma-separated rule IDs for the **cron handler** to manage (the UI manages its own schedules separately) |
| `ENABLE_HOUR_UTC` / `DISABLE_HOUR_UTC` | UTC hours for the cron handler's enable/disable window |
| `CF_ACCESS_TEAM_DOMAIN` | Your Access team name (e.g. `mycompany` for `mycompany.cloudflareaccess.com`). Set `ENVIRONMENT` to anything other than `production` to bypass auth during development |
| `database_id` | The D1 database ID from step 3 |

### 5. Create an API Token

The worker authenticates to the Cloudflare API using a scoped **API Token**. Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**.

#### Required permissions

| Permission | Access | Purpose |
|---|---|---|
| **Magic Firewall Packet Filter** | Edit | Discover the `magic_transit` phase entrypoint, enumerate rules, toggle rule enabled state |
| **Account Rulesets** | Edit | List, view, and update rulesets at the account level |

> **Note:** "Edit" includes read — no separate read-only entry is needed.

#### Store the token as a secret

The cron handler reads the token from a Workers secret (not `wrangler.toml`):

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

Paste the token when prompted. For the **dashboard UI**, tokens are entered per-account in the settings panel and stored in D1.

### 6. Initialize the database

```bash
# Remote (production)
npx wrangler d1 execute mfw-automation-db --remote --file=schema.sql

# Local (development)
npx wrangler d1 execute mfw-automation-db --local --file=schema.sql
```

### 7. Deploy

```bash
npx wrangler deploy
```

The worker will be available at `https://magic-firewall-rule-scheduler.<your-subdomain>.workers.dev`.

### 8. (Optional) Protect with Cloudflare Access

To require authentication:

1. Go to **Cloudflare Zero Trust Dashboard** → **Access** → **Applications**
2. **Add an application** → **Self-hosted**
3. Set the **Application domain** to your worker's URL
4. Configure an **Access policy** (e.g. allow specific email addresses or identity providers)
5. In `wrangler.toml`, set `ENVIRONMENT = "production"` and `CF_ACCESS_TEAM_DOMAIN` to your team name

The worker reads the `Cf-Access-Jwt-Assertion` header to extract the authenticated user's email. In non-production mode, auth is bypassed and a placeholder email is used.

---

## Local Development

```bash
# Start dev server (auth bypassed automatically when ENVIRONMENT != "production")
npx wrangler dev --port 8788
```

Open `http://localhost:8788` in your browser.

---

## How It Works

### Dashboard (UI)

1. Click the **gear icon** → add an account (Account ID + API Token)
2. The worker auto-discovers the Magic Firewall ruleset via the `magic_transit` phase entrypoint
3. Create schedules: pick rules from the multi-select dropdown and set enable/disable hours (UTC)
4. Use the timeline visualization to see when rules will be active
5. Force enable/disable rules manually at any time

### Cron Handler

The scheduled handler runs every 15 minutes (configurable in `wrangler.toml`) and:

1. Reads `ACCOUNT_ID`, `RULESET_ID`, `TARGET_RULE_IDS`, `ENABLE_HOUR_UTC`, and `DISABLE_HOUR_UTC` from environment variables
2. Determines whether the current UTC hour falls within the enable window
3. Fetches the ruleset from the Cloudflare API
4. Updates any target rules whose state doesn't match the desired state

### API Flow

1. **Ruleset discovery** — `GET /accounts/{account_id}/rulesets/phases/magic_transit/entrypoint`
2. **Rule enumeration** — rules are returned in the entrypoint response, or fetched via `GET /accounts/{account_id}/rulesets/{ruleset_id}`
3. **Rule toggling** — `PUT /accounts/{account_id}/rulesets/{ruleset_id}` with the full rule list (modified `enabled` flags)

All API calls use `Authorization: Bearer <token>`. No Global API Key or email is required.

---

## Project Structure

```
src/
  index.ts    — API routes (accounts, rules, schedules, status, toggle) + cron handler
  ui.ts       — Dashboard HTML/CSS/JS (single-file SPA)
  types.ts    — TypeScript interfaces (Env, UserAccount, Schedule, RuleItem)
  auth.ts     — Cloudflare Access JWT validation middleware
schema.sql          — D1 database schema (user_accounts, schedules, activity_log)
wrangler.toml.example — Template config (copy to wrangler.toml and fill in your values)
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Dashboard UI |
| `GET` | `/api/settings` | List all accounts for the authenticated user |
| `POST` | `/api/settings` | Create or update an account |
| `DELETE` | `/api/settings/:id` | Delete an account (cascades to its schedules) |
| `PUT` | `/api/settings/:id/default` | Set an account as default |
| `POST` | `/api/rules` | Fetch rules from the account's Magic Firewall ruleset |
| `POST` | `/api/test-token` | Verify API token permissions |
| `GET` | `/api/schedules` | List schedules (optional `?account_id` filter) |
| `POST` | `/api/schedules` | Create or update a schedule |
| `PUT` | `/api/schedules/:id/toggle` | Pause or resume a schedule |
| `DELETE` | `/api/schedules/:id` | Delete a schedule |
| `POST` | `/api/status` | Get rule status with schedule associations |
| `POST` | `/api/toggle` | Force enable/disable rules |
| `GET` | `/api/activity` | Recent activity log |

---

## License

MIT
