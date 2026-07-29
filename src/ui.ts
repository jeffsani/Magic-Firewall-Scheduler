function infoTip(text: string): string {
  return `<span class="info-tip" tabindex="0" role="button" aria-label="More info"><span class="info-ico">i</span><span class="info-bubble">${text}</span></span>`;
}

export function renderDashboard(userEmail: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Firewall Rule Scheduler</title>
  <link rel="icon" href="https://www.cloudflare.com/favicon.ico" type="image/x-icon">
  <script>
    var _origWarn = console.warn;
    console.warn = function() {
      if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].indexOf('cdn.tailwindcss.com') >= 0) return;
      return _origWarn.apply(console, arguments);
    };
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          colors: {
            cf: { orange: '#F6821F', dark: '#0D1117', navy: '#1B2432', gray: '#8B949E', surface: '#161B22', border: '#30363D' },
          }
        }
      }
    }
  </script>
  <style>
    :root, [data-theme="dark"] {
      --page-bg: #0D1117; --surface: #161B22; --border: #30363D; --muted: #8B949E;
      --text-primary: #E5E7EB; --text-strong: #FFFFFF; --input-bg: #0D1117;
      --header-bg: rgba(22,27,34,0.85); --scrollbar: #30363D;
    }
    [data-theme="light"] {
      --page-bg: #F9FAFB; --surface: #FFFFFF; --border: #E5E7EB; --muted: #6B7280;
      --text-primary: #374151; --text-strong: #111827; --input-bg: #F3F4F6;
      --header-bg: rgba(255,255,255,0.85); --scrollbar: #D1D5DB;
    }
    body { background: var(--page-bg); color: var(--text-primary); transition: background 0.2s, color 0.2s; }
    * { scrollbar-width: thin; scrollbar-color: var(--scrollbar) transparent; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 3px; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .spinner { border: 2px solid var(--border); border-top-color: #F6821F; border-radius: 50%; width: 18px; height: 18px; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    [data-theme="light"] .text-white { color: var(--text-strong) !important; }
    [data-theme="light"] .bg-cf-dark { background-color: var(--input-bg) !important; }
    [data-theme="light"] .bg-cf-surface { background-color: var(--surface) !important; }
    [data-theme="light"] .border-cf-border { border-color: var(--border) !important; }
    [data-theme="light"] .text-cf-gray { color: var(--muted) !important; }
    [data-theme="light"] select, [data-theme="light"] input { background-color: var(--input-bg); color: var(--text-primary); border-color: var(--border); }
    [data-theme="light"] header { background: var(--header-bg) !important; }
    .theme-toggle { display: flex; align-items: center; padding: 2px; border-radius: 999px; background: var(--input-bg); border: 1px solid var(--border); cursor: pointer; }
    .theme-toggle-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; }
    .theme-toggle-icon.active { background: #F6821F; color: #FFF; }
    .theme-toggle-icon:not(.active) { color: var(--muted); }
    .badge-enabled { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
    .badge-disabled { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
    .badge-info { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
    .schedule-bar { height: 32px; border-radius: 6px; overflow: hidden; display: flex; position: relative; }
    .schedule-bar .active-zone { background: rgba(34,197,94,0.25); border: 1px solid rgba(34,197,94,0.4); }
    .schedule-bar .inactive-zone { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); }
    .schedule-marker { position: absolute; top: 0; bottom: 0; width: 2px; background: #F6821F; z-index: 10; }
    .info-tip { position: relative; display: inline-flex; vertical-align: middle; margin-left: 4px; outline: none; }
    .info-ico { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--border); color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; font-style: normal; line-height: 1; cursor: help; transition: all 0.15s; }
    .info-tip:hover .info-ico, .info-tip:focus .info-ico { color: #F6821F; border-color: #F6821F; }
    .info-bubble { display: none; position: absolute; z-index: 60; top: calc(100% + 6px); left: 0; width: 240px; padding: 8px 10px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 4px 16px rgba(0,0,0,0.35); font-size: 11px; font-weight: 400; line-height: 1.45; color: var(--text-primary); text-transform: none; letter-spacing: normal; white-space: normal; }
    .info-tip:hover .info-bubble, .info-tip:focus .info-bubble, .info-tip:focus-within .info-bubble { display: block; }
  </style>
</head>
<body class="font-sans min-h-screen">
  <!-- Header -->
  <header class="sticky top-0 z-40 backdrop-blur-md border-b border-cf-border" style="background:var(--header-bg)">
    <div class="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="w-7 h-7 flex-shrink-0" viewBox="0 0 64 64" fill="none"><path d="M44.048 43.904H19.2l-1.28-4.352L41.216 36l3.84 3.072-.512 3.84-.496.992z" fill="#F6821F"/><path d="M45.056 43.392l-.512-1.984c-.256-.768-.128-1.536.384-2.048.384-.512.96-.768 1.664-.768h.64l1.024.128c2.304.256 4.864.384 7.552.384h.512c.256 0 .384-.128.512-.256.128-.256.128-.512 0-.768-.896-2.944-3.712-5.056-6.912-5.184l-2.048-.128-.768-1.536c-2.432-5.184-7.68-8.512-13.504-8.512-6.656 0-12.416 4.48-14.08 10.88l-.512 2.048-2.048.256c-3.84.512-6.784 3.84-6.784 7.808 0 .384 0 .768.128 1.152 0 .256.256.384.512.384h34.112c.256 0 .512-.256.64-.512l.128-.384c.128-.384.128-.64.128-.896-.128-.768-.384-1.536-.768-1.984z" fill="#FBAD41"/></svg>
        <div>
          <h1 class="text-base font-semibold leading-tight" style="color:var(--text-strong)">Firewall Rule Scheduler</h1>
          <p class="text-[11px] text-cf-gray leading-tight mt-0.5">Automate L3/L4 & L7 firewall rule scheduling across accounts and zones</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="toggleAbout()" class="text-xs text-cf-gray hover:text-cf-orange flex items-center gap-1 no-print" title="What is this?">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <button onclick="toggleSettings()" class="text-xs text-cf-gray hover:text-cf-orange flex items-center gap-1 no-print" title="Settings">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <span id="user-email" class="text-xs text-cf-gray hidden sm:inline">${userEmail}</span>
        <div class="theme-toggle no-print" onclick="toggleTheme()">
          <span id="theme-sun" class="theme-toggle-icon"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg></span>
          <span id="theme-moon" class="theme-toggle-icon active"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg></span>
        </div>
      </div>
    </div>
    <!-- About dropdown (header-level, toggled by info icon) -->
    <div id="about-dropdown" class="hidden border-t border-cf-border">
      <div class="max-w-5xl mx-auto px-4 py-3">
        <p class="text-xs leading-relaxed" style="color:var(--text-primary)">
          This tool automates <b>Cloudflare firewall rule scheduling</b>. Connect one or more accounts, choose a ruleset — <b>Magic Firewall</b> (L3/L4), <b>WAF Custom Rules</b> (L7), or <b>Rate Limiting</b> (L7) — and create time-based schedules that automatically enable or disable rules on a UTC cadence. Use it to enforce geo-fencing during business hours, activate DDoS mitigations at night, toggle rate limits during peak traffic, or manage any firewall rule on a recurring schedule — no manual intervention required.
        </p>
        <div class="flex flex-wrap gap-3 text-[10px] text-cf-gray pt-1">
          <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Cron-based automation (every 15 min)</span>
          <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Multi-account support</span>
          <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Scoped API token auth</span>
          <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Pause/resume rules on demand</span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-6 space-y-4">

    <!-- Settings Panel (collapsible) -->
    <div id="settings-panel" class="panel fade-in p-5 space-y-4 no-print hidden">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button onclick="toggleSettings()" class="text-cf-gray hover:text-white" title="Close">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Accounts${infoTip('Add your Cloudflare accounts here. Each account needs an Account ID and an API token with Magic Firewall permissions. You can manage multiple accounts and switch between them.')}</h2>
        </div>
        <button onclick="showAddAccount()" class="px-3 py-1 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange">+ Add Account</button>
      </div>
      <div id="accounts-list" class="space-y-2"></div>

      <!-- Add/Edit account form -->
      <div id="account-form" class="hidden border border-cf-border rounded-lg p-4 space-y-3">
        <h3 class="text-xs font-semibold" style="color:var(--text-strong)" id="account-form-title">Add Account</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Label <span class="text-[10px]">(optional)</span>${infoTip('A friendly name for this account. Shown in the account selector to help you tell accounts apart.')}</label>
            <input type="text" id="cfg-account-label" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. Production">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Account ID${infoTip('Your Cloudflare Account ID (32-character hex string). Find it on the account home page or in the dashboard URL.')}</label>
            <input type="text" id="cfg-account-id" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. 7a0c39354edd...">
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-cf-gray mb-1">API Token${infoTip('A scoped Cloudflare API token. Required permissions:<br><b>L3/L4 (Magic Firewall):</b> Account &gt; Magic Firewall Packet Filter: Edit, Account &gt; Account Rulesets: Edit<br><b>L7 (WAF / Rate Limiting):</b> Zone &gt; Zone: Read, Zone &gt; Zone WAF: Edit<br>Click <b>Test Token</b> after saving to verify all permissions.')}</label>
          <input type="password" id="cfg-api-token" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="Scoped API token (see tooltip for required permissions)">
        </div>
        <div>
          <label class="block text-xs font-medium text-cf-gray mb-1">Ruleset ID <span class="text-[10px]">(auto-detected if blank)</span>${infoTip('The Magic Firewall (L3/L4) ruleset UUID. Leave blank to auto-discover via the magic_transit phase entrypoint API. L7 rulesets (WAF, Rate Limiting) are always auto-discovered per zone.')}</label>
          <input type="text" id="cfg-ruleset-id" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="Leave blank to auto-discover">
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <button onclick="saveAccount()" class="px-4 py-1.5 bg-cf-orange text-black text-xs font-bold rounded-lg hover:opacity-90">Save Account</button>
          <button onclick="testToken()" class="px-4 py-1.5 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-blue-500 hover:text-blue-400">Test Token</button>
          <button onclick="hideAccountForm()" class="px-4 py-1.5 text-xs text-cf-gray hover:text-white">Cancel</button>
          <span id="settings-status" class="text-xs text-cf-gray self-center"></span>
        </div>
        <div id="token-test-results" class="hidden mt-2 border border-cf-border rounded-lg p-3 space-y-1.5 bg-cf-dark"></div>
      </div>

      <!-- Active account selector -->
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-cf-gray">Active Account:${infoTip('The account whose firewall rules are managed. Schedules, rule status, and quick actions all operate on the selected active account.')}</label>
        <select id="active-account-select" onchange="onAccountSelected()" class="bg-cf-dark border border-cf-border rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="">No accounts configured</option>
        </select>
      </div>
    </div>

    <!-- Active Account Bar -->
    <div id="active-account-bar" class="hidden">
      <div class="panel fade-in px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-cf-orange" onclick="toggleSettings()">
        <svg class="w-4 h-4 text-cf-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <div>
          <span class="text-xs text-cf-gray">Active Account:</span> <span class="text-xs font-semibold" style="color:var(--text-strong)" id="active-account-name"></span>
          <span class="text-[10px] text-cf-gray font-mono ml-2" id="active-account-id-display"></span>
        </div>
      </div>
    </div>

    <!-- Schedules Panel -->
    <div id="schedules-panel" class="panel fade-in p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Schedules${infoTip('Time-based automations that enable or disable selected firewall rules on a daily UTC schedule. The cron runs every 15 minutes to apply the desired state.')}</h2>
        <div class="flex items-center gap-2">
          <span id="action-status" class="text-xs text-cf-gray"></span>
          <button onclick="toggleAllSchedules(true)" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg flex items-center gap-1" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e" onmouseover="this.style.background='rgba(34,197,94,0.3)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'" title="Resume all schedules — the cron will start applying scheduled rule states again">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Resume All
          </button>
          <button onclick="toggleAllSchedules(false)" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg flex items-center gap-1" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.08)'" title="Pause all schedules — the cron will stop applying scheduled rule states">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            Pause All
          </button>
          <button onclick="showAddSchedule()" class="px-3 py-1 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange">+ Add Schedule</button>
        </div>
      </div>
      <div id="schedules-list" class="space-y-2">
        <p class="text-xs text-cf-gray">Add an account first, then create schedules.</p>
      </div>

      <!-- Add/Edit schedule form -->
      <div id="schedule-form" class="hidden border border-cf-border rounded-lg p-4 space-y-3">
        <h3 class="text-xs font-semibold" style="color:var(--text-strong)" id="schedule-form-title">Add Schedule</h3>
        <input type="hidden" id="sched-id" value="">
        <input type="hidden" id="sched-rule-type" value="mfw">
        <input type="hidden" id="sched-zone-id" value="">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Label${infoTip('A friendly name for this schedule, e.g. "Business Hours" or "Overnight DDoS Protection". Shown in the timeline and rule status table.')}</label>
            <input type="text" id="sched-label" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. Business Hours">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Ruleset${infoTip('Select which firewall ruleset to schedule against. L3/L4 Magic Firewall rules are account-scoped. L7 WAF Custom Rules and Rate Limiting rules are zone-scoped — you will need to pick a zone after selecting one of these.')}</label>
            <select id="sched-type-select" onchange="onRuleTypeChange()" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white">
              <option value="mfw">Magic Firewall (L3/L4)</option>
              <option value="waf_custom">WAF Custom Rules (L7)</option>
              <option value="rate_limit">Rate Limiting (L7)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Enable Hour (UTC, 0-23)${infoTip('The UTC hour (0\u201323) when the selected rules will be enabled. The cron checks every 15 minutes and enables rules once the current hour reaches this value.')}</label>
            <input type="number" id="sched-enable-hour" min="0" max="23" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" value="17">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Disable Hour (UTC, 0-23)${infoTip('The UTC hour (0\u201323) when the selected rules will be disabled. If the disable hour is less than the enable hour, the active window wraps across midnight (e.g. 17:00\u201301:00).')}</label>
            <input type="number" id="sched-disable-hour" min="0" max="23" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" value="1">
          </div>
        </div>

        <!-- Zone selector (visible only for zone-scoped rule types) -->
        <div id="zone-select-wrap" class="hidden">
          <label class="block text-xs font-medium text-cf-gray mb-1">Zone${infoTip('WAF Custom Rules and Rate Limiting are zone-scoped. Select the zone whose rules you want to schedule.')}</label>
          <div class="flex gap-2 items-center">
            <select id="sched-zone-select" onchange="onZoneChange()" class="flex-1 bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select a zone...</option>
            </select>
            <button onclick="refreshZones()" class="px-3 py-2 text-xs text-cf-gray hover:text-cf-orange border border-cf-border rounded-lg" title="Refresh zones from API">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>

        <!-- Rule multi-select -->
        <div id="rule-select-wrap">
          <label class="block text-xs font-medium text-cf-gray mb-1">Rules${infoTip('Select which rules this schedule controls. Rules are auto-discovered from the selected ruleset. A rule can belong to multiple schedules.')}</label>
          <div class="relative">
            <button type="button" id="rule-select-btn" onclick="toggleRuleDropdown()" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-1.5 text-sm text-white text-left flex justify-between items-center">
              <span id="rule-select-label">Select rules...</span>
              <svg class="w-3 h-3 text-cf-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="rule-dropdown" class="hidden absolute z-50 mt-1 w-full bg-cf-dark border border-cf-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <label class="flex items-center gap-2 px-3 py-2 hover:bg-cf-border cursor-pointer text-sm text-white border-b border-cf-border">
                <input type="checkbox" id="rule-select-all" onchange="toggleAllRules(this.checked)" class="accent-orange-500">
                <span class="font-medium">Select All</span>
              </label>
              <div id="rule-options"><p class="text-xs text-cf-gray px-3 py-2">Loading rules...</p></div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 items-center">
          <button onclick="saveSchedule()" class="px-4 py-1.5 bg-cf-orange text-black text-xs font-bold rounded-lg hover:opacity-90">Save Schedule</button>
          <button onclick="hideScheduleForm()" class="px-4 py-1.5 text-xs text-cf-gray hover:text-white">Cancel</button>
          <span id="schedule-status" class="text-xs text-cf-gray self-center"></span>
        </div>
      </div>
    </div>

    <!-- Schedule Timeline Visualization (multi-schedule) -->
    <div id="timeline-panel" class="panel fade-in p-5 space-y-3">
      <div class="flex items-center justify-between cursor-pointer" onclick="togglePanel('timeline')">
        <div class="flex items-center gap-2">
          <svg id="timeline-chevron" class="w-4 h-4 text-cf-gray transition-transform" style="transform:rotate(-90deg)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Schedule Timeline (UTC)${infoTip('Visual 24-hour timeline showing when each schedule is active (green) or inactive (red). The orange marker indicates the current UTC time. Hover over a cell to see the hour and state.')}</h2>
        </div>
      </div>
      <div id="timeline-body" class="hidden">
      <div id="schedule-viz" class="space-y-3">
        <p class="text-xs text-cf-gray">Create schedules to see the timeline visualization.</p>
      </div>
      </div>
    </div>

    <!-- Rule Status Panel -->
    <div id="status-panel" class="panel fade-in p-5 space-y-4">
      <div class="flex items-center justify-between cursor-pointer" onclick="togglePanel('status')">
        <div class="flex items-center gap-2">
          <svg id="status-chevron" class="w-4 h-4 text-cf-gray transition-transform" style="transform:rotate(-90deg)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Rule Status${infoTip('Current enabled/disabled state of every rule in the ruleset, fetched live from the Cloudflare API. Shows which schedule(s) each rule belongs to and what the desired state should be right now.<br><br>You can enable or disable individual rules or all rules in a group. This requires write permissions: <b>Account Rulesets: Edit</b> for L3/L4, <b>Zone WAF: Edit</b> for L7.')}</h2>
        </div>
        <button onclick="event.stopPropagation(); refreshStatus()" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh
        </button>
      </div>
      <div id="status-body" class="hidden">
      <div id="status-content">
        <p class="text-xs text-cf-gray">Configure an account and create schedules, then refresh to see rule status.</p>
      </div>
      </div>
    </div>

    <!-- Activity Log -->
    <div class="panel fade-in p-5 space-y-3">
      <div class="flex items-center justify-between cursor-pointer" onclick="toggleActivityBody()">
        <div class="flex items-center gap-2">
          <svg id="activity-chevron" class="w-4 h-4 text-cf-gray transition-transform" style="transform:rotate(-90deg)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Activity Log${infoTip('Recent actions: account saves, schedule changes, force toggles, and cron-triggered rule state changes. Stored in D1 and limited to the most recent entries.')}</h2>
        </div>
      </div>
      <div id="activity-body" class="hidden">
        <div id="activity-content" class="space-y-1">
          <p class="text-xs text-cf-gray">Loading...</p>
        </div>
      </div>
    </div>

  </main>

  <script>
  // ============================================================
  // THEME
  // ============================================================
  function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('mfw-theme', next);
    document.getElementById('theme-sun').className = 'theme-toggle-icon' + (next === 'light' ? ' active' : '');
    document.getElementById('theme-moon').className = 'theme-toggle-icon' + (next === 'dark' ? ' active' : '');
  }
  (function() {
    var saved = localStorage.getItem('mfw-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      document.getElementById('theme-sun').className = 'theme-toggle-icon' + (saved === 'light' ? ' active' : '');
      document.getElementById('theme-moon').className = 'theme-toggle-icon' + (saved === 'dark' ? ' active' : '');
    }
  })();

  // ============================================================
  // STATE
  // ============================================================
  var savedAccounts = [];
  var activeAccountId = '';
  var cachedRules = [];
  var cachedZones = [];
  var activeRuleType = 'mfw';
  var activeZoneId = '';
  var savedSchedules = [];
  var SCHED_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1','#06b6d4','#84cc16'];
  var RULE_TYPE_LABELS = { mfw: 'L3/L4', waf_custom: 'L7 WAF', rate_limit: 'L7 RL' };
  var RULE_TYPE_FULL = { mfw: 'Magic Firewall (L3/L4)', waf_custom: 'WAF Custom Rules (L7)', rate_limit: 'Rate Limiting (L7)' };
  var schedLabelManual = false;

  // ============================================================
  // ABOUT (header dropdown)
  // ============================================================
  function toggleAbout() {
    document.getElementById('about-dropdown').classList.toggle('hidden');
  }

  // ============================================================
  // ACCOUNTS
  // ============================================================
  function toggleSettings() {
    var panel = document.getElementById('settings-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadAccounts();
  }

  async function loadAccounts() {
    try {
      var resp = await fetch('/api/settings');
      var data = await resp.json();
      savedAccounts = data.accounts || [];
      renderAccountsList();
      populateAccountDropdown();
      updateAccountBadge();
    } catch(e) {}
  }

  function renderAccountsList() {
    var container = document.getElementById('accounts-list');
    if (savedAccounts.length === 0) {
      container.innerHTML = '<p class="text-xs text-cf-gray">No accounts configured. Click "+ Add Account" to get started.</p>';
      return;
    }
    container.innerHTML = savedAccounts.map(function(a) {
      var keyBadge = a.has_token
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-900 text-green-300">Token saved</span>'
        : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-300">No token</span>';
      var defaultBadge = a.is_default
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-orange-900 text-orange-300">Default</span>'
        : '';
      var rsBadge = a.ruleset_id
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-300">RS: ' + a.ruleset_id.substring(0,8) + '...</span>'
        : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300">Auto-detect</span>';
      var defaultBtn = a.is_default
        ? ''
        : '<button onclick="setDefaultAccount(' + a.id + ')" class="text-[10px] text-cf-gray hover:text-cf-orange">Set Default</button>';
      return '<div class="flex items-center justify-between bg-cf-dark rounded-lg px-3 py-2 border border-cf-border' + (a.is_default ? ' border-orange-700' : '') + '">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="text-sm text-white font-medium">' + (a.account_label || a.account_id) + '</span>' +
          '<span class="text-[10px] text-cf-gray font-mono">' + a.account_id + '</span>' +
          keyBadge + rsBadge + defaultBadge +
        '</div>' +
        '<div class="flex gap-2">' +
          defaultBtn +
          '<button onclick="editAccount(' + a.id + ')" class="text-[10px] text-cf-gray hover:text-cf-orange">Edit</button>' +
          '<button onclick="deleteAccount(' + a.id + ')" class="text-[10px] text-cf-gray hover:text-red-400">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function populateAccountDropdown() {
    var sel = document.getElementById('active-account-select');
    var current = activeAccountId || sel.value;
    if (savedAccounts.length === 0) {
      sel.innerHTML = '<option value="">No accounts configured</option>';
      return;
    }
    sel.innerHTML = savedAccounts.map(function(a) {
      return '<option value="' + a.account_id + '">' + (a.account_label || a.account_id) + (a.is_default ? ' (default)' : '') + '</option>';
    }).join('');
    if (current && savedAccounts.some(function(a) { return a.account_id === current; })) {
      sel.value = current;
    } else {
      var defaultAcct = savedAccounts.find(function(a) { return a.is_default; });
      if (defaultAcct) sel.value = defaultAcct.account_id;
    }
    activeAccountId = sel.value;
  }

  function updateAccountBadge() {
    var bar = document.getElementById('active-account-bar');
    var nameEl = document.getElementById('active-account-name');
    var idEl = document.getElementById('active-account-id-display');
    if (!activeAccountId || savedAccounts.length === 0) {
      bar.classList.add('hidden');
      return;
    }
    var acct = savedAccounts.find(function(a) { return a.account_id === activeAccountId; });
    nameEl.textContent = acct ? (acct.account_label || acct.account_id) : activeAccountId;
    idEl.textContent = activeAccountId;
    bar.classList.remove('hidden');
  }

  function onAccountSelected() {
    var sel = document.getElementById('active-account-select');
    activeAccountId = sel.value;
    updateAccountBadge();
    cachedRules = [];
    cachedZones = [];
    loadSchedules();
    loadRulesForAccount();
    loadCachedZones();
  }

  function showAddAccount() {
    document.getElementById('account-form').classList.remove('hidden');
    document.getElementById('account-form-title').textContent = 'Add Account';
    document.getElementById('cfg-account-label').value = '';
    document.getElementById('cfg-account-id').value = '';
    document.getElementById('cfg-account-id').removeAttribute('disabled');
    document.getElementById('cfg-api-token').value = '';
    document.getElementById('cfg-ruleset-id').value = '';
  }

  function hideAccountForm() {
    document.getElementById('account-form').classList.add('hidden');
    document.getElementById('settings-status').textContent = '';
    var tr = document.getElementById('token-test-results');
    if (tr) { tr.classList.add('hidden'); tr.innerHTML = ''; }
  }

  function editAccount(id) {
    var acct = savedAccounts.find(function(a) { return a.id === id; });
    if (!acct) return;
    document.getElementById('account-form').classList.remove('hidden');
    document.getElementById('account-form-title').textContent = 'Edit Account';
    document.getElementById('cfg-account-label').value = acct.account_label || '';
    document.getElementById('cfg-account-id').value = acct.account_id;
    document.getElementById('cfg-account-id').setAttribute('disabled', 'true');
    document.getElementById('cfg-api-token').value = acct.has_token ? '********' : '';
    document.getElementById('cfg-ruleset-id').value = acct.ruleset_id || '';
  }

  async function deleteAccount(id) {
    if (!confirm('Remove this account and all its schedules?')) return;
    await fetch('/api/settings/' + id, { method: 'DELETE' });
    loadAccounts();
    loadSchedules();
  }

  async function setDefaultAccount(id) {
    await fetch('/api/settings/' + id + '/default', { method: 'PUT' });
    loadAccounts();
  }

  async function saveAccount() {
    var status = document.getElementById('settings-status');
    status.textContent = 'Saving...';
    status.style.color = '';
    try {
      var resp = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: document.getElementById('cfg-account-id').value.trim(),
          account_label: document.getElementById('cfg-account-label').value.trim(),
          api_token: document.getElementById('cfg-api-token').value,
          ruleset_id: document.getElementById('cfg-ruleset-id').value.trim(),
        }),
      });
      var data = await resp.json();
      if (data.ok) {
        status.style.color = '#10B981';
        status.textContent = 'Saved!';
        setTimeout(function() { hideAccountForm(); loadAccounts(); loadActivity(); loadRulesForAccount(); }, 800);
      } else {
        status.style.color = '#EF4444';
        status.textContent = data.error || 'Error saving';
      }
    } catch(e) { status.style.color = '#EF4444'; status.textContent = 'Error: ' + e.message; }
  }

  // ============================================================
  // TEST TOKEN (permissions checker)
  // ============================================================
  async function testToken() {
    var token = document.getElementById('cfg-api-token').value;
    var accountId = document.getElementById('cfg-account-id').value.trim();
    var resultsDiv = document.getElementById('token-test-results');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '<p class="text-xs text-cf-gray">Testing token permissions...</p>';

    if (!accountId) {
      resultsDiv.innerHTML = '<p class="text-xs text-red-400">Enter an Account ID first.</p>';
      return;
    }
    if (!token) {
      resultsDiv.innerHTML = '<p class="text-xs text-red-400">Enter an API Token first.</p>';
      return;
    }

    try {
      var resp = await fetch('/api/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: token, account_id: accountId }),
      });
      var data = await resp.json();
      var html = '<p class="text-xs font-semibold mb-2" style="color:var(--text-strong)">Permission Check Results</p>';
      var l3Checks = ['Token Valid', 'Account Rulesets', 'Magic Firewall', 'Magic Firewall Write'];
      var l7Checks = ['Zone Access', 'WAF Custom Rules', 'WAF Write', 'Rate Limiting', 'Rate Limiting Write'];
      var allChecks = data.checks || [];
      var l3Items = allChecks.filter(function(ch) { return l3Checks.indexOf(ch.name) !== -1; });
      var l7Items = allChecks.filter(function(ch) { return l7Checks.indexOf(ch.name) !== -1; });

      if (l3Items.length > 0) {
        html += '<p class="text-[10px] text-cf-gray font-semibold uppercase tracking-wide mb-1 mt-1">L3/L4 — Magic Firewall</p>';
        l3Items.forEach(function(ch) {
          var icon = ch.status === 'pass'
            ? '<span class="text-green-400 font-bold">&#10003;</span>'
            : '<span class="text-red-400 font-bold">&#10007;</span>';
          var detailColor = ch.status === 'pass' ? 'text-green-300' : 'text-red-300';
          html += '<div class="flex items-start gap-2 text-xs">'
            + icon
            + '<span style="color:var(--text-strong)" class="font-medium">' + ch.name + '</span>'
            + '<span class="' + detailColor + '">' + ch.detail + '</span>'
            + '</div>';
        });
      }
      if (l7Items.length > 0) {
        html += '<p class="text-[10px] text-cf-gray font-semibold uppercase tracking-wide mb-1 mt-2">L7 — WAF Custom Rules & Rate Limiting</p>';
        l7Items.forEach(function(ch) {
          var icon = ch.status === 'pass'
            ? '<span class="text-green-400 font-bold">&#10003;</span>'
            : '<span class="text-red-400 font-bold">&#10007;</span>';
          var detailColor = ch.status === 'pass' ? 'text-green-300' : 'text-red-300';
          html += '<div class="flex items-start gap-2 text-xs">'
            + icon
            + '<span style="color:var(--text-strong)" class="font-medium">' + ch.name + '</span>'
            + '<span class="' + detailColor + '">' + ch.detail + '</span>'
            + '</div>';
        });
      }

      var failedL3 = l3Items.filter(function(ch) { return ch.status !== 'pass'; });
      var failedL7 = l7Items.filter(function(ch) { return ch.status !== 'pass'; });
      if (data.ok) {
        html += '<p class="text-xs text-green-400 mt-2 font-semibold">All checks passed — token has the required permissions for both L3/L4 and L7 rulesets.</p>';
      } else if (data.error) {
        html += '<p class="text-xs text-red-400 mt-2">' + data.error + '</p>';
      } else {
        html += '<div class="mt-2 text-xs text-yellow-400 space-y-1">';
        html += '<p class="font-semibold">Some permissions are missing:</p>';
        if (failedL3.length > 0) {
          html += '<p><b>L3/L4:</b> Token needs <b>Account &gt; Magic Firewall Packet Filter: Edit</b> and <b>Account &gt; Account Rulesets: Edit</b></p>';
        }
        if (failedL7.length > 0) {
          html += '<p><b>L7:</b> Token needs <b>Zone &gt; Zone: Read</b> and <b>Zone &gt; Zone WAF: Edit</b></p>';
        }
        html += '<p class="text-[10px] text-cf-gray">L3/L4 permissions are only required if you plan to schedule Magic Firewall rules. L7 permissions are only required for WAF Custom Rules or Rate Limiting.</p>';
        html += '</div>';
      }
      resultsDiv.innerHTML = html;
    } catch(e) {
      resultsDiv.innerHTML = '<p class="text-xs text-red-400">Network error: ' + e.message + '</p>';
    }
  }
  window.testToken = testToken;

  // ============================================================
  // ZONES (for WAF / Rate Limiting)
  // ============================================================
  async function loadCachedZones() {
    if (!activeAccountId) { cachedZones = []; return; }
    try {
      var resp = await fetch('/api/zones?account_id=' + activeAccountId);
      var data = await resp.json();
      cachedZones = data.zones || [];
    } catch(e) { cachedZones = []; }
  }

  async function refreshZones() {
    if (!activeAccountId) { alert('Select an account first.'); return; }
    var sel = document.getElementById('sched-zone-select');
    sel.innerHTML = '<option value="">Fetching zones...</option>';
    try {
      var resp = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: activeAccountId }),
      });
      var data = await resp.json();
      if (data.ok) {
        cachedZones = data.zones || [];
        populateZoneDropdown();
      } else {
        sel.innerHTML = '<option value="">' + (data.error || 'Error loading zones') + '</option>';
      }
    } catch(e) {
      sel.innerHTML = '<option value="">Network error</option>';
    }
  }
  window.refreshZones = refreshZones;

  function populateZoneDropdown() {
    var sel = document.getElementById('sched-zone-select');
    if (cachedZones.length === 0) {
      sel.innerHTML = '<option value="">No zones found — click refresh</option>';
      return;
    }
    sel.innerHTML = '<option value="">Select a zone...</option>' + cachedZones.map(function(z) {
      return '<option value="' + z.id + '">' + z.name + '</option>';
    }).join('');
    // Restore selection if editing
    var currentZone = document.getElementById('sched-zone-id').value;
    if (currentZone && cachedZones.some(function(z) { return z.id === currentZone; })) {
      sel.value = currentZone;
    }
  }

  function onRuleTypeChange() {
    var ruleType = document.getElementById('sched-type-select').value;
    document.getElementById('sched-rule-type').value = ruleType;
    var zoneWrap = document.getElementById('zone-select-wrap');
    if (ruleType === 'mfw') {
      zoneWrap.classList.add('hidden');
      document.getElementById('sched-zone-id').value = '';
      // Reload MFW rules
      loadRules('mfw', '');
    } else {
      zoneWrap.classList.remove('hidden');
      populateZoneDropdown();
      // Clear rules until a zone is selected
      cachedRules = [];
      var container = document.getElementById('rule-options');
      container.innerHTML = '<p class="text-xs text-cf-gray px-3 py-2">Select a zone to load rules.</p>';
      updateRuleLabel();
    }
  }
  window.onRuleTypeChange = onRuleTypeChange;

  function onZoneChange() {
    var zoneId = document.getElementById('sched-zone-select').value;
    document.getElementById('sched-zone-id').value = zoneId;
    if (!zoneId) {
      cachedRules = [];
      var container = document.getElementById('rule-options');
      container.innerHTML = '<p class="text-xs text-cf-gray px-3 py-2">Select a zone to load rules.</p>';
      updateRuleLabel();
      return;
    }
    var ruleType = document.getElementById('sched-type-select').value;
    loadRules(ruleType, zoneId);
  }
  window.onZoneChange = onZoneChange;

  // ============================================================
  // RULES (auto-discovered)
  // ============================================================
  async function loadRules(ruleType, zoneId) {
    if (!activeAccountId) { cachedRules = []; return; }
    var reqBody = { account_id: activeAccountId, rule_type: ruleType || 'mfw' };
    if (zoneId) reqBody.zone_id = zoneId;
    try {
      var resp = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      var data = await resp.json();
      if (data.ok) {
        cachedRules = data.rules || [];
        if (cachedRules.length === 0) {
          console.warn('[Rules] API returned OK but 0 rules. Ruleset ID:', data.ruleset_id || '(auto-discovered)');
        }
        // If we have an open schedule form, refresh the rule checkboxes
        var form = document.getElementById('schedule-form');
        if (form && !form.classList.contains('hidden')) {
          var editingSchedId = document.getElementById('sched-id').value;
          if (editingSchedId) {
            var sched = savedSchedules.find(function(s) { return s.id === parseInt(editingSchedId); });
            var ids = sched ? sched.rule_ids.split(',').filter(function(id) { return id.trim(); }).map(function(id) { return id.trim(); }) : [];
            populateRuleCheckboxes(ids);
          } else {
            populateRuleCheckboxes([]);
          }
        }
      } else {
        cachedRules = [];
        console.error('[Rules] API error:', data.error || 'Unknown error');
        var container = document.getElementById('rule-options');
        if (container) container.innerHTML = '<p class="text-xs text-red-400 px-3 py-2">' + (data.error || 'Error loading rules') + '</p>';
      }
    } catch(e) {
      cachedRules = [];
      console.error('[Rules] fetch exception:', e);
    }
  }

  async function loadRulesForAccount() {
    return loadRules('mfw', '');
  }

  // ============================================================
  // RULE MULTI-SELECT (p95 tunnel pattern)
  // ============================================================
  function populateRuleCheckboxes(selectedIds) {
    var container = document.getElementById('rule-options');
    if (cachedRules.length === 0) {
      container.innerHTML = '<p class="text-xs text-cf-gray px-3 py-2">No rules found. Save account credentials first.</p>';
      return;
    }
    var selectedSet = {};
    (selectedIds || []).forEach(function(id) { selectedSet[id] = true; });
    container.innerHTML = cachedRules.map(function(r) {
      var checked = selectedSet[r.id] ? ' checked' : '';
      var desc = r.description || '(no description)';
      var badge = r.enabled ? '<span class="text-[9px] px-1 rounded bg-green-900 text-green-300">ON</span>' : '<span class="text-[9px] px-1 rounded bg-red-900 text-red-300">OFF</span>';
      return '<label class="flex items-center gap-2 px-3 py-1.5 hover:bg-cf-border cursor-pointer text-xs text-white">' +
        '<input type="checkbox" class="rule-cb accent-orange-500" value="' + r.id + '"' + checked + ' onchange="updateRuleLabel()">' +
        '<span class="flex-1 truncate">' + desc + '</span>' +
        badge +
        '<span class="text-[9px] text-cf-gray font-mono">' + r.id.substring(0,8) + '</span>' +
      '</label>';
    }).join('');
    document.getElementById('rule-select-all').checked = (selectedIds && selectedIds.length === cachedRules.length);
    updateRuleLabel();
  }

  function toggleRuleDropdown() {
    document.getElementById('rule-dropdown').classList.toggle('hidden');
  }

  function toggleAllRules(checked) {
    document.querySelectorAll('.rule-cb').forEach(function(cb) { cb.checked = checked; });
    updateRuleLabel();
  }

  function getSelectedRuleIds() {
    var cbs = document.querySelectorAll('.rule-cb');
    var selected = [];
    cbs.forEach(function(cb) { if (cb.checked) selected.push(cb.value); });
    return selected;
  }

  function updateRuleLabel() {
    var selected = getSelectedRuleIds();
    var label = document.getElementById('rule-select-label');
    var allCb = document.getElementById('rule-select-all');
    if (selected.length === 0) { label.textContent = 'None selected'; allCb.checked = false; }
    else if (selected.length === cachedRules.length) { label.textContent = 'All Rules (' + selected.length + ')'; allCb.checked = true; }
    else { label.textContent = selected.length + ' of ' + cachedRules.length + ' selected'; allCb.checked = false; }

    // Auto-fill schedule label from rule names unless user has manually edited it
    if (!schedLabelManual) {
      var schedLabel = document.getElementById('sched-label');
      var names = selected.map(function(id) {
        var r = cachedRules.find(function(rule) { return rule.id === id; });
        return r ? (r.description || '(no description)') : '';
      }).filter(function(n) { return n; });
      if (names.length === 0) { schedLabel.value = ''; }
      else if (names.length <= 2) { schedLabel.value = names.join(', '); }
      else { schedLabel.value = names[0] + ' + ' + (names.length - 1) + ' more'; }
    }
  }

  document.getElementById('sched-label').addEventListener('input', function() { schedLabelManual = true; });

  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('rule-select-wrap');
    if (wrap && !wrap.contains(e.target)) document.getElementById('rule-dropdown').classList.add('hidden');
  });

  // ============================================================
  // SCHEDULES
  // ============================================================
  async function loadSchedules() {
    if (!activeAccountId) {
      savedSchedules = [];
      renderSchedulesList();
      renderTimeline();
      return;
    }
    try {
      var resp = await fetch('/api/schedules?account_id=' + activeAccountId);
      var data = await resp.json();
      savedSchedules = data.schedules || [];
    } catch(e) { savedSchedules = []; }
    renderSchedulesList();
    renderTimeline();
  }

  function renderSchedulesList() {
    var container = document.getElementById('schedules-list');
    if (!activeAccountId) {
      container.innerHTML = '<p class="text-xs text-cf-gray">Select an account to manage schedules.</p>';
      return;
    }
    if (savedSchedules.length === 0) {
      container.innerHTML = '<p class="text-xs text-cf-gray">No schedules configured. Click "+ Add Schedule" to create one.</p>';
      return;
    }
    container.innerHTML = savedSchedules.map(function(s, idx) {
      var color = SCHED_COLORS[idx % SCHED_COLORS.length];
      var ruleCount = s.rule_ids ? s.rule_ids.split(',').filter(function(id) { return id.trim(); }).length : 0;
      var enabledBadge = s.enabled !== 'false'
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-900 text-green-300">Active</span>'
        : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-300">Paused</span>';
      var rt = s.rule_type || 'mfw';
      var typeBadge = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-900 text-purple-300">' + (RULE_TYPE_LABELS[rt] || rt) + '</span>';
      var zoneName = '';
      if (s.zone_id) {
        var z = cachedZones.find(function(zn) { return zn.id === s.zone_id; });
        zoneName = '<span class="text-[10px] text-cf-gray">' + (z ? z.name : s.zone_id.substring(0, 8) + '...') + '</span>';
      }
      return '<div class="flex items-center justify-between bg-cf-dark rounded-lg px-3 py-2 border border-cf-border">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + color + '"></span>' +
          '<span class="text-sm text-white font-medium">' + (s.label || 'Schedule ' + (idx+1)) + '</span>' +
          typeBadge +
          zoneName +
          '<span class="text-[10px] text-cf-gray">' + s.enable_hour_utc + ':00 - ' + s.disable_hour_utc + ':00 UTC</span>' +
          '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-300">' + ruleCount + ' rule' + (ruleCount !== 1 ? 's' : '') + '</span>' +
          enabledBadge +
        '</div>' +
        '<div class="flex gap-2">' +
          '<button onclick="toggleScheduleEnabled(' + s.id + ')" class="text-[10px] ' + (s.enabled !== 'false' ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300') + '">' + (s.enabled !== 'false' ? 'Pause' : 'Resume') + '</button>' +
          '<button onclick="editSchedule(' + s.id + ')" class="text-[10px] text-cf-gray hover:text-cf-orange">Edit</button>' +
          '<button onclick="deleteSchedule(' + s.id + ')" class="text-[10px] text-cf-gray hover:text-red-400">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function showAddSchedule() {
    if (!activeAccountId) { alert('Select an account first.'); return; }
    schedLabelManual = false;
    document.getElementById('schedule-form').classList.remove('hidden');
    document.getElementById('schedule-form-title').textContent = 'Add Schedule';
    document.getElementById('sched-id').value = '';
    document.getElementById('sched-label').value = '';
    document.getElementById('sched-enable-hour').value = '17';
    document.getElementById('sched-disable-hour').value = '1';
    document.getElementById('sched-type-select').value = 'mfw';
    document.getElementById('sched-rule-type').value = 'mfw';
    document.getElementById('sched-zone-id').value = '';
    document.getElementById('zone-select-wrap').classList.add('hidden');
    populateRuleCheckboxes([]);
  }

  function hideScheduleForm() {
    document.getElementById('schedule-form').classList.add('hidden');
    document.getElementById('schedule-status').textContent = '';
  }

  function editSchedule(id) {
    var sched = savedSchedules.find(function(s) { return s.id === id; });
    if (!sched) return;
    schedLabelManual = true;
    document.getElementById('schedule-form').classList.remove('hidden');
    document.getElementById('schedule-form-title').textContent = 'Edit Schedule';
    document.getElementById('sched-id').value = sched.id;
    document.getElementById('sched-label').value = sched.label || '';
    document.getElementById('sched-enable-hour').value = sched.enable_hour_utc;
    document.getElementById('sched-disable-hour').value = sched.disable_hour_utc;

    // Set rule type
    var rt = sched.rule_type || 'mfw';
    document.getElementById('sched-type-select').value = rt;
    document.getElementById('sched-rule-type').value = rt;

    // Set zone
    document.getElementById('sched-zone-id').value = sched.zone_id || '';
    if (rt !== 'mfw' && sched.zone_id) {
      document.getElementById('zone-select-wrap').classList.remove('hidden');
      populateZoneDropdown();
      document.getElementById('sched-zone-select').value = sched.zone_id;
    } else {
      document.getElementById('zone-select-wrap').classList.add('hidden');
    }

    // Load correct rules for this schedule's type + zone, then populate checkboxes
    var ruleIds = sched.rule_ids ? sched.rule_ids.split(',').filter(function(id) { return id.trim(); }).map(function(id) { return id.trim(); }) : [];
    loadRules(rt, sched.zone_id || '').then(function() {
      populateRuleCheckboxes(ruleIds);
    });
  }

  async function toggleScheduleEnabled(id) {
    await fetch('/api/schedules/' + id + '/toggle', { method: 'PUT' });
    loadSchedules();
  }
  window.toggleScheduleEnabled = toggleScheduleEnabled;

  async function deleteSchedule(id) {
    if (!confirm('Remove this schedule?')) return;
    await fetch('/api/schedules/' + id, { method: 'DELETE' });
    loadSchedules();
    loadActivity();
  }

  async function saveSchedule() {
    var status = document.getElementById('schedule-status');
    status.textContent = 'Saving...';
    status.style.color = '';
    var selectedRules = getSelectedRuleIds();
    if (selectedRules.length === 0) {
      status.style.color = '#EF4444';
      status.textContent = 'Select at least one rule.';
      return;
    }
    try {
      var schedId = document.getElementById('sched-id').value;
      var ruleType = document.getElementById('sched-rule-type').value || 'mfw';
      var zoneId = document.getElementById('sched-zone-id').value || '';
      var resp = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schedId ? parseInt(schedId) : undefined,
          account_id: activeAccountId,
          label: document.getElementById('sched-label').value.trim(),
          rule_type: ruleType,
          zone_id: zoneId,
          rule_ids: selectedRules.join(','),
          enable_hour_utc: parseInt(document.getElementById('sched-enable-hour').value) || 0,
          disable_hour_utc: parseInt(document.getElementById('sched-disable-hour').value) || 0,
          enabled: 'true',
        }),
      });
      var data;
      var ct = resp.headers.get('content-type') || '';
      if (ct.indexOf('application/json') !== -1) {
        data = await resp.json();
      } else {
        var text = await resp.text();
        data = { ok: false, error: 'Server error (' + resp.status + '): ' + text.substring(0, 200) };
      }
      if (data.ok) {
        status.style.color = '#10B981';
        status.textContent = 'Saved!';
        setTimeout(function() { hideScheduleForm(); loadSchedules(); loadActivity(); }, 600);
      } else {
        status.style.color = '#EF4444';
        status.textContent = data.error || 'Error saving';
      }
    } catch(e) { status.style.color = '#EF4444'; status.textContent = 'Error: ' + e.message; }
  }

  // ============================================================
  // TIMELINE VISUALIZATION (multi-schedule)
  // ============================================================
  function renderTimeline() {
    var container = document.getElementById('schedule-viz');
    if (savedSchedules.length === 0) {
      container.innerHTML = '<p class="text-xs text-cf-gray">Create schedules to see the timeline visualization.</p>';
      return;
    }

    var nowHour = new Date().getUTCHours();
    var nowPct = ((nowHour + new Date().getUTCMinutes() / 60) / 24 * 100).toFixed(1);
    var html = '';

    // Hour header row
    html += '<div class="flex text-[9px] text-cf-gray" style="padding-left:140px">';
    for (var h = 0; h < 24; h++) {
      html += '<div style="width:' + (100/24).toFixed(2) + '%;text-align:center">' + h + '</div>';
    }
    html += '</div>';

    // One bar per schedule
    savedSchedules.forEach(function(s, idx) {
      var color = SCHED_COLORS[idx % SCHED_COLORS.length];
      var enableH = s.enable_hour_utc;
      var disableH = s.disable_hour_utc;

      var isActive = function(h) {
        if (enableH < disableH) return h >= enableH && h < disableH;
        return h >= enableH || h < disableH;
      };

      var ruleCount = s.rule_ids ? s.rule_ids.split(',').filter(function(id) { return id.trim(); }).length : 0;
      var rt = s.rule_type || 'mfw';
      var typeTag = RULE_TYPE_LABELS[rt] || rt;
      var label = (s.label || 'Schedule ' + (idx+1));
      if (label.length > 12) label = label.substring(0, 12) + '..';

      html += '<div class="flex items-center gap-2">';
      html += '<div class="text-[10px] text-cf-gray w-[140px] flex-shrink-0 truncate" title="' + (s.label || 'Schedule ' + (idx+1)) + ' [' + typeTag + '] (' + ruleCount + ' rules)">';
      html += '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + color + ';margin-right:4px;vertical-align:middle"></span>';
      html += '<span class="text-[9px] px-1 rounded bg-purple-900 text-purple-300" style="margin-right:3px">' + typeTag + '</span>';
      html += label + ' <span class="text-[9px]">(' + ruleCount + ')</span>';
      html += '</div>';
      html += '<div class="flex-1 relative" style="height:24px">';
      html += '<div class="schedule-marker" style="left:' + nowPct + '%;top:0;bottom:0"></div>';
      html += '<div class="flex" style="height:100%">';
      for (var i = 0; i < 24; i++) {
        var active = isActive(i);
        var bg = active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.12)';
        var border = active ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.25)';
        html += '<div style="width:' + (100/24).toFixed(2) + '%;background:' + bg + ';border:1px solid ' + border + '" title="' + i + ':00 UTC - ' + (active ? 'Enabled' : 'Disabled') + '"></div>';
      }
      html += '</div>';
      html += '</div>';
      html += '</div>';
    });

    // Legend
    html += '<div class="flex flex-wrap gap-4 text-[10px] text-cf-gray mt-2">';
    html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.5);vertical-align:middle;margin-right:3px"></span>Enabled</span>';
    html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);vertical-align:middle;margin-right:3px"></span>Disabled</span>';
    html += '<span><span style="display:inline-block;width:10px;height:2px;background:#F6821F;vertical-align:middle;margin-right:3px"></span>Current Time (UTC ' + nowHour + ':00)</span>';
    html += '</div>';

    container.innerHTML = html;
  }

  // ============================================================
  // TOGGLE SECTIONS
  // ============================================================
  function togglePanel(name) {
    var body = document.getElementById(name + '-body');
    var chevron = document.getElementById(name + '-chevron');
    body.classList.toggle('hidden');
    chevron.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : '';
  }

  function toggleActivityBody() {
    togglePanel('activity');
  }

  // ============================================================
  // STATUS (shows all rules across all rule types with filter)
  // ============================================================
  var statusGroups = [];
  var statusFilter = 'all';

  async function refreshStatus() {
    // Auto-expand the status panel
    var statusBody = document.getElementById('status-body');
    var statusChevron = document.getElementById('status-chevron');
    if (statusBody.classList.contains('hidden')) {
      statusBody.classList.remove('hidden');
      statusChevron.style.transform = '';
    }
    var el = document.getElementById('status-content');
    el.innerHTML = '<span class="spinner"></span> <span class="text-xs text-cf-gray">Loading rule status across all rulesets...</span>';

    try {
      var resp = await fetch('/api/status/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: activeAccountId }),
      });
      var data = await resp.json();

      if (!data.ok) {
        el.innerHTML = '<p class="text-xs" style="color:#ef4444">' + data.error + '</p>';
        return;
      }

      statusGroups = data.groups || [];
      statusFilter = 'all';
      renderStatusView(data.currentHourUtc);
    } catch (e) {
      el.innerHTML = '<p class="text-xs" style="color:#ef4444">Network error.</p>';
    }
  }

  function setStatusFilter(filter) {
    statusFilter = filter;
    renderStatusView(new Date().getUTCHours());
  }
  window.setStatusFilter = setStatusFilter;

  function renderStatusView(currentHourUtc) {
    var el = document.getElementById('status-content');

    // Count totals per type for badges
    var totalRules = 0;
    var totalSchedules = 0;
    var typeCounts = { mfw: 0, waf_custom: 0, rate_limit: 0 };
    statusGroups.forEach(function(g) {
      totalRules += g.rules.length;
      totalSchedules += g.schedules.length;
      typeCounts[g.rule_type] = (typeCounts[g.rule_type] || 0) + g.rules.length;
    });

    var html = '';

    // Filter tabs
    var filters = [
      { key: 'all', label: 'All (' + totalRules + ')' },
      { key: 'mfw', label: 'L3/L4 MFW (' + typeCounts.mfw + ')' },
      { key: 'l7', label: 'L7 WAF + RL (' + (typeCounts.waf_custom + typeCounts.rate_limit) + ')' },
      { key: 'waf_custom', label: 'L7 WAF (' + typeCounts.waf_custom + ')' },
      { key: 'rate_limit', label: 'L7 RL (' + typeCounts.rate_limit + ')' },
    ];
    html += '<div class="flex flex-wrap gap-1.5 mb-3">';
    filters.forEach(function(f) {
      var active = statusFilter === f.key;
      var cls = active
        ? 'bg-cf-orange text-black font-bold'
        : 'bg-cf-dark text-cf-gray hover:text-white border border-cf-border';
      html += '<button onclick="setStatusFilter(\\'' + f.key + '\\')" class="px-2.5 py-1 text-[10px] rounded-lg ' + cls + '">' + f.label + '</button>';
    });
    html += '</div>';

    // Info badges
    html += '<div class="flex flex-wrap gap-2 mb-3">';
    html += '<span class="badge-info">UTC Hour: ' + currentHourUtc + '</span>';
    html += '<span class="badge-info">' + totalRules + ' rules total</span>';
    html += '<span class="badge-info">' + totalSchedules + ' schedule(s)</span>';
    html += '</div>';

    // Filter groups
    var filteredGroups = statusGroups.filter(function(g) {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'l7') return g.rule_type === 'waf_custom' || g.rule_type === 'rate_limit';
      return g.rule_type === statusFilter;
    });

    if (filteredGroups.length === 0) {
      html += '<p class="text-xs text-cf-gray">No rules found for this filter.</p>';
      el.innerHTML = html;
      return;
    }

    // Render each group
    filteredGroups.forEach(function(g) {
      // Group header
      var typeLabel = RULE_TYPE_FULL[g.rule_type] || g.rule_type;
      var zoneSuffix = g.zone_name ? ' — ' + g.zone_name : '';
      html += '<div class="mb-4">';
      html += '<div class="flex items-center gap-2 mb-2">';
      html += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-900 text-purple-300 font-semibold">' + (RULE_TYPE_LABELS[g.rule_type] || g.rule_type) + '</span>';
      html += '<span class="text-xs font-medium" style="color:var(--text-strong)">' + typeLabel + zoneSuffix + '</span>';
      html += '<span class="text-[10px] text-cf-gray">' + g.rules.length + ' rule' + (g.rules.length !== 1 ? 's' : '') + '</span>';
      if (g.rules.length > 0 && !g.error) {
        var zArg = g.zone_id ? '\'' + g.zone_id + '\'' : "''";
        html += '<button onclick="toggleGroupRules(\'' + g.rule_type + '\',' + zArg + ',true)" class="px-2 py-0.5 text-[9px] font-semibold rounded" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e">Enable All</button>';
        html += '<button onclick="toggleGroupRules(\'' + g.rule_type + '\',' + zArg + ',false)" class="px-2 py-0.5 text-[9px] font-semibold rounded" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#ef4444">Disable All</button>';
      }
      html += '</div>';

      if (g.error) {
        html += '<p class="text-xs text-red-400 mb-2">' + g.error + '</p>';
      }

      if (g.rules.length === 0) {
        html += '<p class="text-xs text-cf-gray mb-2">No rules in this ruleset.</p>';
      } else {
        // Build rule->schedule map for this group
        var ruleScheduleMap = {};
        (g.schedules || []).forEach(function(s, idx) {
          var color = SCHED_COLORS[idx % SCHED_COLORS.length];
          s.rule_ids.forEach(function(rid) {
            if (!ruleScheduleMap[rid]) ruleScheduleMap[rid] = [];
            ruleScheduleMap[rid].push({ label: s.label || 'Schedule ' + (idx+1), color: color, desiredState: s.desiredState, enabled: s.enabled });
          });
        });

        var zArg2 = g.zone_id ? '\'' + g.zone_id + '\'' : "''";
        html += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-cf-border"><th class="text-left py-2 pr-4 text-cf-gray font-medium">Rule ID</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Description</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Action</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Status</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Schedule</th><th class="text-left py-2 text-cf-gray font-medium">Toggle</th></tr></thead><tbody>';
        g.rules.forEach(function(r) {
          var badge = r.enabled ? '<span class="badge-enabled">Enabled</span>' : '<span class="badge-disabled">Disabled</span>';
          var schedInfo = ruleScheduleMap[r.id];
          var schedHtml = '';
          if (schedInfo) {
            schedHtml = schedInfo.map(function(si) {
              var desired = si.enabled === 'false' ? 'paused' : (si.desiredState ? 'should be Enabled' : 'should be Disabled');
              return '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + si.color + ';margin-right:3px;vertical-align:middle"></span><span class="text-[10px]">' + si.label + ' (' + desired + ')</span>';
            }).join(' ');
          } else {
            schedHtml = '<span class="text-[10px] text-cf-gray">unscheduled</span>';
          }
          var toggleBtn = r.enabled
            ? '<button onclick="toggleRule(\'' + g.rule_type + '\',' + zArg2 + ',\'' + r.id + '\',false)" class="text-[10px] px-2 py-0.5 rounded font-semibold" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#ef4444">Disable</button>'
            : '<button onclick="toggleRule(\'' + g.rule_type + '\',' + zArg2 + ',\'' + r.id + '\',true)" class="text-[10px] px-2 py-0.5 rounded font-semibold" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e">Enable</button>';
          html += '<tr class="border-b border-cf-border"><td class="py-2 pr-4 font-mono" style="color:var(--text-primary)">' + r.id.substring(0, 12) + '...</td><td class="py-2 pr-4" style="color:var(--text-primary)">' + r.description + '</td><td class="py-2 pr-4" style="color:var(--text-primary)">' + r.action + '</td><td class="py-2 pr-4">' + badge + '</td><td class="py-2 pr-4">' + schedHtml + '</td><td class="py-2">' + toggleBtn + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';
    });

    el.innerHTML = html;
  }

  // ============================================================
  // RULE TOGGLE (enable/disable individual or group rules via CF API)
  // ============================================================
  async function toggleRule(ruleType, zoneId, ruleId, enabled) {
    var btn = event && event.target;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      var body = { enabled: enabled, account_id: activeAccountId, rule_type: ruleType, rule_ids: [ruleId] };
      if (zoneId) body.zone_id = zoneId;
      var resp = await fetch('/api/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await resp.json();
      if (!data.ok) {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Network error: ' + e.message);
    }
    refreshStatus();
    loadActivity();
  }
  window.toggleRule = toggleRule;

  async function toggleGroupRules(ruleType, zoneId, enabled) {
    var action = enabled ? 'enable' : 'disable';
    if (!confirm('Are you sure you want to ' + action + ' all rules in this ruleset?')) return;
    try {
      var body = { enabled: enabled, account_id: activeAccountId, rule_type: ruleType };
      if (zoneId) body.zone_id = zoneId;
      var resp = await fetch('/api/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await resp.json();
      if (!data.ok) {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Network error: ' + e.message);
    }
    refreshStatus();
    loadActivity();
  }
  window.toggleGroupRules = toggleGroupRules;

  // ============================================================
  // TOGGLE ALL SCHEDULES (pause/resume schedule automation)
  // ============================================================
  async function toggleAllSchedules(resume) {
    var statusEl = document.getElementById('action-status');
    var action = resume ? 'resume' : 'pause';
    if (!confirm('Are you sure you want to ' + action + ' all schedules?')) return;

    if (savedSchedules.length === 0) {
      statusEl.innerHTML = '<span style="color:#ef4444">No schedules to ' + action + '.</span>';
      setTimeout(function() { statusEl.textContent = ''; }, 4000);
      return;
    }

    statusEl.innerHTML = '<span class="spinner"></span> ' + (resume ? 'Resuming' : 'Pausing') + ' schedules...';

    // Filter to only schedules that need toggling
    var toToggle = savedSchedules.filter(function(s) {
      return resume ? (s.enabled === 'false') : (s.enabled !== 'false');
    });

    if (toToggle.length === 0) {
      var state = resume ? 'active' : 'paused';
      statusEl.innerHTML = '<span style="color:#22c55e">All schedules are already ' + state + '.</span>';
      setTimeout(function() { statusEl.textContent = ''; }, 4000);
      return;
    }

    var errors = [];
    for (var i = 0; i < toToggle.length; i++) {
      try {
        var resp = await fetch('/api/schedules/' + toToggle[i].id + '/toggle', { method: 'PUT' });
        var data = await resp.json();
        if (!data.ok) errors.push(data.error || 'Unknown error');
      } catch (e) {
        errors.push('Network error');
      }
    }

    if (errors.length > 0) {
      statusEl.innerHTML = '<span style="color:#ef4444">&#10007; ' + errors.join('; ') + '</span>';
    } else {
      statusEl.innerHTML = '<span style="color:#22c55e">&#10003; ' + toToggle.length + ' schedule(s) ' + (resume ? 'resumed' : 'paused') + '.</span>';
    }

    loadSchedules();
    loadActivity();
    setTimeout(function() { statusEl.textContent = ''; }, 5000);
  }

  // ============================================================
  // ACTIVITY LOG
  // ============================================================
  async function loadActivity() {
    var el = document.getElementById('activity-content');
    try {
      var resp = await fetch('/api/activity');
      var data = await resp.json();
      if (!data.ok || !data.activity || data.activity.length === 0) {
        el.innerHTML = '<p class="text-xs text-cf-gray">No activity yet.</p>';
        return;
      }

      var html = '<div class="space-y-1">';
      data.activity.forEach(function(a) {
        var icon = '&#8226;';
        var color = 'var(--text-primary)';
        if (a.action === 'force_enable') { icon = '&#9654;'; color = '#22c55e'; }
        else if (a.action === 'force_disable') { icon = '&#9632;'; color = '#ef4444'; }
        else if (a.action === 'test_connection') { icon = '&#9889;'; color = '#3b82f6'; }
        else if (a.action === 'settings_saved' || a.action === 'schedule_saved') { icon = '&#9998;'; color = '#F6821F'; }

        html += '<div class="flex gap-2 items-start text-xs py-1 border-b border-cf-border">';
        html += '<span style="color:' + color + '">' + icon + '</span>';
        html += '<span class="text-cf-gray flex-shrink-0">' + (a.created_at || '').replace('T', ' ').substring(0, 19) + '</span>';
        html += '<span style="color:var(--text-primary)">' + a.details + '</span>';
        html += '</div>';
      });
      html += '</div>';
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<p class="text-xs" style="color:#ef4444">Failed to load activity.</p>';
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  (async function(){
    await loadAccounts();
    loadActivity();
    if (activeAccountId) {
      await loadRulesForAccount();
      loadCachedZones();
      loadSchedules();
    }
  })();
  </script>
</body>
</html>`;
}
