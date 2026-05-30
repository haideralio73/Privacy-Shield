// Privacy Shield — Options Page
// chrome.storage.local backed settings for defaults, whitelist, stats.

const STORAGE_KEY = 'psOptions';
const STATS_KEY = 'psStats';

// ── Load / Save ─────────────────────────────────────────────────────────

async function loadOptions() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  return r[STORAGE_KEY] || {
    defaults: { analytics: true, ads: true, fingerprint: true },
    notifyBlock: false,
    whitelist: []
  };
}

async function saveOptions(opts) {
  await chrome.storage.local.set({ [STORAGE_KEY]: opts });
}

async function loadStats() {
  const r = await chrome.storage.local.get(STATS_KEY);
  return r[STATS_KEY] || { today: 0, allTime: 0, byCategory: {}, byDomain: {}, date: new Date().toDateString() };
}

async function saveStats(s) {
  await chrome.storage.local.set({ [STATS_KEY]: s });
}

// ── Render ──────────────────────────────────────────────────────────────

function renderWhitelist(opts) {
  const container = document.getElementById('whitelistTags');
  if (!opts.whitelist.length) {
    container.innerHTML = '<span style="color:#555;font-size:12px;">No whitelisted domains</span>';
    return;
  }
  container.innerHTML = opts.whitelist.map(d =>
    `<span class="tag">${escapeHtml(d)} <button data-domain="${escapeHtml(d)}" class="wl-remove">&times;</button></span>`
  ).join('');
  document.querySelectorAll('.wl-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const domain = btn.dataset.domain;
      const opts2 = await loadOptions();
      opts2.whitelist = opts2.whitelist.filter(d => d !== domain);
      await saveOptions(opts2);
      renderWhitelist(opts2);
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist: opts2.whitelist });
      }
    });
  });
}

async function renderStats() {
  const s = await loadStats();
  document.getElementById('statToday').textContent = s.today || 0;
  document.getElementById('statAllTime').textContent = s.allTime || 0;
  document.getElementById('statAnalytics').textContent = s.byCategory?.analytics || 0;
  document.getElementById('statAds').textContent = s.byCategory?.ads || 0;
  document.getElementById('statFingerprint').textContent = s.byCategory?.fingerprint || 0;
  document.getElementById('statDomains').textContent = Object.keys(s.byDomain || {}).length;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Toast ────────────────────────────────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Init ────────────────────────────────────────────────────────────────

async function init() {
  const opts = await loadOptions();

  // Restore defaults
  document.getElementById('defAnalytics').checked = opts.defaults.analytics !== false;
  document.getElementById('defAds').checked = opts.defaults.ads !== false;
  document.getElementById('defFingerprint').checked = opts.defaults.fingerprint !== false;
  document.getElementById('notifyBlock').checked = opts.notifyBlock || false;

  renderWhitelist(opts);
  await renderStats();

  // Live defaults
  async function updateDefault(key, field) {
    const opts2 = await loadOptions();
    opts2.defaults[key] = document.getElementById(field).checked;
    await saveOptions(opts2);
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ action: 'updateDefaults', defaults: opts2.defaults });
    }
  }
  document.getElementById('defAnalytics').addEventListener('change', () => updateDefault('analytics', 'defAnalytics'));
  document.getElementById('defAds').addEventListener('change', () => updateDefault('ads', 'defAds'));
  document.getElementById('defFingerprint').addEventListener('change', () => updateDefault('fingerprint', 'defFingerprint'));

  document.getElementById('notifyBlock').addEventListener('change', async () => {
    const o = await loadOptions();
    o.notifyBlock = document.getElementById('notifyBlock').checked;
    await saveOptions(o);
  });

  // Whitelist
  document.getElementById('whitelistAdd').addEventListener('click', async () => {
    const input = document.getElementById('whitelistInput');
    let domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;
    const o = await loadOptions();
    if (o.whitelist.includes(domain)) { toast('Already whitelisted'); return; }
    o.whitelist.push(domain);
    await saveOptions(o);
    renderWhitelist(o);
    input.value = '';
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist: o.whitelist });
    }
    toast('Domain whitelisted');
  });
  document.getElementById('whitelistInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('whitelistAdd').click();
  });

  // Stats
  document.getElementById('resetStats').addEventListener('click', async () => {
    await saveStats({ today: 0, allTime: 0, byCategory: {}, byDomain: {}, date: new Date().toDateString() });
    await renderStats();
    toast('Statistics reset');
  });

  // Export
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const o = await loadOptions();
    const s = await loadStats();
    const blob = new Blob([JSON.stringify({ options: o, stats: s, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `privacy-shield-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Settings exported');
  });

  // Import
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.options) await saveOptions(data.options);
      if (data.stats) await saveStats(data.stats);
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ action: 'updateDefaults', defaults: data.options?.defaults });
        chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist: data.options?.whitelist || [] });
      }
      toast('Settings imported successfully');
      location.reload();
    } catch {
      toast('Invalid settings file');
    }
    e.target.value = '';
  });

  // Reset all
  document.getElementById('resetAll').addEventListener('click', async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    await chrome.storage.local.remove([STORAGE_KEY, STATS_KEY]);
    toast('All settings reset');
    location.reload();
  });

  // Listen for stats updates from background
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STATS_KEY]) renderStats();
  });
}

document.addEventListener('DOMContentLoaded', init);
