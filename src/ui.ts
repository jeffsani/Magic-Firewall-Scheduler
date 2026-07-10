export function renderDashboard(userEmail: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic Firewall Rule Scheduler</title>
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
  </style>
</head>
<body class="font-sans min-h-screen">
  <!-- Header -->
  <header class="sticky top-0 z-40 backdrop-blur-md border-b border-cf-border" style="background:var(--header-bg)">
    <div class="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="w-7 h-7 flex-shrink-0" viewBox="0 0 64 64" fill="none"><path d="M44.048 43.904H19.2l-1.28-4.352L41.216 36l3.84 3.072-.512 3.84-.496.992z" fill="#F6821F"/><path d="M45.056 43.392l-.512-1.984c-.256-.768-.128-1.536.384-2.048.384-.512.96-.768 1.664-.768h.64l1.024.128c2.304.256 4.864.384 7.552.384h.512c.256 0 .384-.128.512-.256.128-.256.128-.512 0-.768-.896-2.944-3.712-5.056-6.912-5.184l-2.048-.128-.768-1.536c-2.432-5.184-7.68-8.512-13.504-8.512-6.656 0-12.416 4.48-14.08 10.88l-.512 2.048-2.048.256c-3.84.512-6.784 3.84-6.784 7.808 0 .384 0 .768.128 1.152 0 .256.256.384.512.384h34.112c.256 0 .512-.256.64-.512l.128-.384c.128-.384.128-.64.128-.896-.128-.768-.384-1.536-.768-1.984z" fill="#FBAD41"/></svg>
        <div>
          <h1 class="text-base font-semibold leading-tight" style="color:var(--text-strong)">Magic Firewall Rule Scheduler</h1>
          <p class="text-[11px] text-cf-gray leading-tight mt-0.5">Configure and manage scheduled Magic Firewall rule automation</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
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
  </header>

  <main class="max-w-5xl mx-auto px-4 py-6 space-y-4">

    <!-- About Panel -->
    <div class="panel fade-in p-5 space-y-2" style="border-left: 3px solid #F6821F">
      <h2 class="text-sm font-semibold" style="color:var(--text-strong)">What is this?</h2>
      <p class="text-xs leading-relaxed" style="color:var(--text-primary)">
        This tool automates <b>Cloudflare Magic Firewall</b> rule scheduling. Connect one or more accounts, select the firewall rules you want to manage, and create time-based schedules that automatically enable or disable them on a UTC schedule. Use it to enforce geo-fencing during business hours, activate DDoS mitigations at night, or toggle any Magic Firewall rule on a recurring cadence — no manual intervention required.
      </p>
      <div class="flex flex-wrap gap-3 text-[10px] text-cf-gray pt-1">
        <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Cron-based automation (every 15 min)</span>
        <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Multi-account support</span>
        <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Scoped API token auth</span>
        <span class="flex items-center gap-1"><svg class="w-3 h-3 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Force enable/disable on demand</span>
      </div>
    </div>

    <!-- Settings Panel (collapsible) -->
    <div id="settings-panel" class="panel fade-in p-5 space-y-4 no-print hidden">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Accounts</h2>
        <button onclick="showAddAccount()" class="px-3 py-1 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange">+ Add Account</button>
      </div>
      <div id="accounts-list" class="space-y-2"></div>

      <!-- Add/Edit account form -->
      <div id="account-form" class="hidden border border-cf-border rounded-lg p-4 space-y-3">
        <h3 class="text-xs font-semibold" style="color:var(--text-strong)" id="account-form-title">Add Account</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Label <span class="text-[10px]">(optional)</span></label>
            <input type="text" id="cfg-account-label" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. Production">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Account ID</label>
            <input type="text" id="cfg-account-id" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. 7a0c39354edd...">
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-cf-gray mb-1">API Token</label>
          <input type="password" id="cfg-api-token" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="Account-scoped API token with Magic Firewall permissions">
        </div>
        <div>
          <label class="block text-xs font-medium text-cf-gray mb-1">Ruleset ID <span class="text-[10px]">(auto-detected if blank)</span></label>
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
        <label class="text-xs font-medium text-cf-gray">Active Account:</label>
        <select id="active-account-select" onchange="onAccountSelected()" class="bg-cf-dark border border-cf-border rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="">No accounts configured</option>
        </select>
      </div>
    </div>

    <!-- Active Account Bar -->
    <div id="active-account-bar" class="hidden">
      <div class="panel fade-in px-4 py-2.5 flex items-center gap-3">
        <svg class="w-4 h-4 text-cf-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <div>
          <span class="text-xs font-semibold" style="color:var(--text-strong)" id="active-account-name"></span>
          <span class="text-[10px] text-cf-gray font-mono ml-2" id="active-account-id-display"></span>
        </div>
      </div>
    </div>

    <!-- Schedules Panel -->
    <div id="schedules-panel" class="panel fade-in p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Schedules</h2>
        <button onclick="showAddSchedule()" class="px-3 py-1 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange">+ Add Schedule</button>
      </div>
      <div id="schedules-list" class="space-y-2">
        <p class="text-xs text-cf-gray">Add an account first, then create schedules.</p>
      </div>

      <!-- Add/Edit schedule form -->
      <div id="schedule-form" class="hidden border border-cf-border rounded-lg p-4 space-y-3">
        <h3 class="text-xs font-semibold" style="color:var(--text-strong)" id="schedule-form-title">Add Schedule</h3>
        <input type="hidden" id="sched-id" value="">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Label</label>
            <input type="text" id="sched-label" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. Business Hours">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Enable Hour (UTC, 0-23)</label>
            <input type="number" id="sched-enable-hour" min="0" max="23" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" value="17">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Disable Hour (UTC, 0-23)</label>
            <input type="number" id="sched-disable-hour" min="0" max="23" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" value="1">
          </div>
        </div>

        <!-- Rule multi-select -->
        <div id="rule-select-wrap">
          <label class="block text-xs font-medium text-cf-gray mb-1">Rules</label>
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
      <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Schedule Timeline (UTC)</h2>
      <div id="schedule-viz" class="space-y-3">
        <p class="text-xs text-cf-gray">Create schedules to see the timeline visualization.</p>
      </div>
    </div>

    <!-- Rule Status Panel -->
    <div id="status-panel" class="panel fade-in p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Rule Status</h2>
        <button onclick="refreshStatus()" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh
        </button>
      </div>
      <div id="status-content">
        <p class="text-xs text-cf-gray">Configure an account and create schedules, then refresh to see rule status.</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="panel fade-in p-5 space-y-3">
      <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Quick Actions</h2>
      <div class="flex flex-wrap gap-2">
        <button onclick="forceToggle(true)" class="px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5" style="background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.5);color:#22c55e" onmouseover="this.style.background='rgba(34,197,94,0.4)'" onmouseout="this.style.background='rgba(34,197,94,0.25)'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Force Enable All
        </button>
        <button onclick="forceToggle(false)" class="px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:#ef4444" onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
          Force Disable All
        </button>
        <span id="action-status" class="text-xs text-cf-gray self-center"></span>
      </div>
    </div>

    <!-- Activity Log -->
    <div class="panel fade-in p-5 space-y-3">
      <div class="flex items-center justify-between cursor-pointer" onclick="toggleActivityBody()">
        <div class="flex items-center gap-2">
          <svg id="activity-chevron" class="w-4 h-4 text-cf-gray transition-transform" style="transform:rotate(-90deg)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Activity Log</h2>
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
  var savedSchedules = [];
  var SCHED_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1','#06b6d4','#84cc16'];

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
    loadSchedules();
    loadRulesForAccount();
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
      var html = '<p class="text-xs font-semibold mb-1" style="color:var(--text-strong)">Permission Check Results</p>';
      (data.checks || []).forEach(function(ch) {
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
      if (data.ok) {
        html += '<p class="text-xs text-green-400 mt-2 font-semibold">All checks passed — token has the required permissions.</p>';
      } else if (data.error) {
        html += '<p class="text-xs text-red-400 mt-2">' + data.error + '</p>';
      } else {
        html += '<p class="text-xs text-yellow-400 mt-2">Some permissions are missing. Ensure the token has <b>Magic Firewall Packet Filter: Edit</b> and <b>Account Rulesets: Edit</b>.</p>';
      }
      resultsDiv.innerHTML = html;
    } catch(e) {
      resultsDiv.innerHTML = '<p class="text-xs text-red-400">Network error: ' + e.message + '</p>';
    }
  }
  window.testToken = testToken;

  // ============================================================
  // RULES (auto-discovered)
  // ============================================================
  async function loadRulesForAccount() {
    if (!activeAccountId) { cachedRules = []; return; }
    try {
      var resp = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: activeAccountId }),
      });
      var data = await resp.json();
      if (data.ok) {
        cachedRules = data.rules || [];
        if (cachedRules.length === 0) {
          console.warn('[MFW] Rules API returned OK but 0 rules. Ruleset ID:', data.ruleset_id || '(auto-discovered)');
        }
      } else {
        cachedRules = [];
        console.error('[MFW] Rules API error:', data.error || 'Unknown error');
        var container = document.getElementById('rule-options');
        if (container) container.innerHTML = '<p class="text-xs text-red-400 px-3 py-2">' + (data.error || 'Error loading rules') + '</p>';
      }
    } catch(e) {
      cachedRules = [];
      console.error('[MFW] Rules fetch exception:', e);
    }
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
  }

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
      return '<div class="flex items-center justify-between bg-cf-dark rounded-lg px-3 py-2 border border-cf-border">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + color + '"></span>' +
          '<span class="text-sm text-white font-medium">' + (s.label || 'Schedule ' + (idx+1)) + '</span>' +
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
    document.getElementById('schedule-form').classList.remove('hidden');
    document.getElementById('schedule-form-title').textContent = 'Add Schedule';
    document.getElementById('sched-id').value = '';
    document.getElementById('sched-label').value = '';
    document.getElementById('sched-enable-hour').value = '17';
    document.getElementById('sched-disable-hour').value = '1';
    populateRuleCheckboxes([]);
  }

  function hideScheduleForm() {
    document.getElementById('schedule-form').classList.add('hidden');
    document.getElementById('schedule-status').textContent = '';
  }

  function editSchedule(id) {
    var sched = savedSchedules.find(function(s) { return s.id === id; });
    if (!sched) return;
    document.getElementById('schedule-form').classList.remove('hidden');
    document.getElementById('schedule-form-title').textContent = 'Edit Schedule';
    document.getElementById('sched-id').value = sched.id;
    document.getElementById('sched-label').value = sched.label || '';
    document.getElementById('sched-enable-hour').value = sched.enable_hour_utc;
    document.getElementById('sched-disable-hour').value = sched.disable_hour_utc;
    var ruleIds = sched.rule_ids ? sched.rule_ids.split(',').filter(function(id) { return id.trim(); }).map(function(id) { return id.trim(); }) : [];
    populateRuleCheckboxes(ruleIds);
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
      var resp = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schedId ? parseInt(schedId) : undefined,
          account_id: activeAccountId,
          label: document.getElementById('sched-label').value.trim(),
          rule_ids: selectedRules.join(','),
          enable_hour_utc: parseInt(document.getElementById('sched-enable-hour').value) || 0,
          disable_hour_utc: parseInt(document.getElementById('sched-disable-hour').value) || 0,
          enabled: 'true',
        }),
      });
      var data = await resp.json();
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
    html += '<div class="flex text-[9px] text-cf-gray" style="padding-left:120px">';
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
      var label = (s.label || 'Schedule ' + (idx+1));
      if (label.length > 14) label = label.substring(0, 14) + '...';

      html += '<div class="flex items-center gap-2">';
      html += '<div class="text-[10px] text-cf-gray w-[120px] flex-shrink-0 truncate" title="' + (s.label || 'Schedule ' + (idx+1)) + ' (' + ruleCount + ' rules)">';
      html += '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + color + ';margin-right:4px;vertical-align:middle"></span>';
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
  function toggleActivityBody() {
    var body = document.getElementById('activity-body');
    var chevron = document.getElementById('activity-chevron');
    body.classList.toggle('hidden');
    chevron.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : '';
  }

  // ============================================================
  // STATUS (shows all rules with schedule info)
  // ============================================================
  async function refreshStatus() {
    var el = document.getElementById('status-content');
    el.innerHTML = '<span class="spinner"></span> <span class="text-xs text-cf-gray">Loading rule status...</span>';

    try {
      var resp = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: activeAccountId }),
      });
      var data = await resp.json();

      if (!data.ok) {
        el.innerHTML = '<p class="text-xs" style="color:#ef4444">' + data.error + '</p>';
        return;
      }

      var html = '';
      html += '<div class="flex flex-wrap gap-2 mb-3">';
      html += '<span class="badge-info">UTC Hour: ' + data.currentHourUtc + '</span>';
      html += '<span class="badge-info">' + data.totalRules + ' rules in ruleset</span>';
      html += '<span class="badge-info">' + (data.schedules || []).length + ' schedule(s)</span>';
      html += '</div>';

      if (data.rules.length === 0) {
        html += '<p class="text-xs text-cf-gray">No rules found in ruleset.</p>';
      } else {
        // Build a map of rule->schedules for display
        var ruleScheduleMap = {};
        (data.schedules || []).forEach(function(s, idx) {
          var color = SCHED_COLORS[idx % SCHED_COLORS.length];
          s.rule_ids.forEach(function(rid) {
            if (!ruleScheduleMap[rid]) ruleScheduleMap[rid] = [];
            ruleScheduleMap[rid].push({ label: s.label || 'Schedule ' + (idx+1), color: color, desiredState: s.desiredState, enabled: s.enabled });
          });
        });

        html += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-cf-border"><th class="text-left py-2 pr-4 text-cf-gray font-medium">Rule ID</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Description</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Action</th><th class="text-left py-2 pr-4 text-cf-gray font-medium">Status</th><th class="text-left py-2 text-cf-gray font-medium">Schedule</th></tr></thead><tbody>';
        data.rules.forEach(function(r) {
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
          html += '<tr class="border-b border-cf-border"><td class="py-2 pr-4 font-mono" style="color:var(--text-primary)">' + r.id.substring(0, 12) + '...</td><td class="py-2 pr-4" style="color:var(--text-primary)">' + r.description + '</td><td class="py-2 pr-4" style="color:var(--text-primary)">' + r.action + '</td><td class="py-2 pr-4">' + badge + '</td><td class="py-2">' + schedHtml + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }

      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<p class="text-xs" style="color:#ef4444">Network error.</p>';
    }
  }

  // ============================================================
  // FORCE TOGGLE
  // ============================================================
  async function forceToggle(enabled) {
    var statusEl = document.getElementById('action-status');
    var action = enabled ? 'enable' : 'disable';
    if (!confirm('Are you sure you want to force ' + action + ' all scheduled rules?')) return;

    statusEl.innerHTML = '<span class="spinner"></span> ' + (enabled ? 'Enabling' : 'Disabling') + ' rules...';

    try {
      var resp = await fetch('/api/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled, account_id: activeAccountId }),
      });
      var data = await resp.json();
      if (data.ok) {
        statusEl.innerHTML = '<span style="color:#22c55e">&#10003; ' + data.message + '</span>';
        refreshStatus();
      } else {
        statusEl.innerHTML = '<span style="color:#ef4444">&#10007; ' + data.error + '</span>';
      }
    } catch (e) {
      statusEl.innerHTML = '<span style="color:#ef4444">Network error.</span>';
    }

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
      loadSchedules();
    }
  })();
  </script>
</body>
</html>`;
}
