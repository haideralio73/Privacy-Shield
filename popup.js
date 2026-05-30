// Privacy Shield — Popup Script
// Real-time port communication, per-category + master blocking,
// whitelist, collapsible tracker details, stats display.

let port = null;
let currentTabId = null;
let currentDomain = null;
let currentData = { count: 0, trackers: [], categories: {} };

// ── Helpers ────────────────────────────────────────────────────────────────

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

function svgIcon(name) {
  const icons = {
    analytics: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#66bb6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    ads: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef5350" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    fingerprint: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ab47bc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 00-7.07 17.07"/><path d="M12 6a6 6 0 00-4.24 10.24"/><path d="M12 10a2 2 0 00-1.41 3.41"/><circle cx="12" cy="12" r="2"/></svg>',
    unknown: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b0bec5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    shield: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>'
  };
  return icons[name] || icons.unknown;
}

// ── Classify ───────────────────────────────────────────────────────────────

function classify(domain) {
  const d = domain.toLowerCase();
  if (d.includes('google-analytics') || d.includes('googletagmanager') || d.includes('doubleclick') ||
      d.includes('hotjar') || d.includes('mouseflow') || d.includes('fullstory') || d.includes('clicky') ||
      d.includes('mixpanel') || d.includes('amplitude') || d.includes('segment.') || d.includes('heap') ||
      d.includes('newrelic') || d.includes('nr-data') || d.includes('scorecardresearch') ||
      d.includes('quant') || d.includes('comscore') || d.includes('optimizely') || d.includes('vwo') ||
      d.includes('abtasty') || d.includes('dynatrace') || d.includes('appdynamics') || d.includes('datadog') ||
      d.includes('splunk') || d.includes('loggly') || d.includes('bugsnag') || d.includes('sentry') ||
      d.includes('rollbar') || d.includes('raygun') || d.includes('trackjs') || d.includes('airbrake') ||
      d.includes('firebase') || d.includes('analytics') || d.includes('facebook.net') ||
      d.includes('facebook.com/tr') || d.includes('pinterest.com/analytics') || d.includes('linkedin.com/analytics') ||
      d.includes('analytics.twitter') || d.includes('analytics.tiktok') || d.includes('snapchat.com/analytics') ||
      d.includes('t.co/analytics') || d.includes('addthis') || d.includes('sharethis') ||
      d.includes('bazaarvoice') || d.includes('trustpilot') || d.includes('yotpo') ||
      d.includes('intercom') || d.includes('drift') || d.includes('zopim') || d.includes('zendesk') ||
      d.includes('hubspot') || d.includes('marketo') || d.includes('pardot') || d.includes('eloqua') ||
      d.includes('acton') || d.includes('livechat') || d.includes('olark') || d.includes('crisp') ||
      d.includes('freshchat') || d.includes('typeform') || d.includes('qualaroo') || d.includes('usabilla') ||
      d.includes('surveymonkey')) return 'analytics';
  if (d.includes('adservice') || d.includes('adsystem') || d.includes('adsymptotic') || d.includes('adnxs') ||
      d.includes('appnexus') || d.includes('pubmatic') || d.includes('rubicon') || d.includes('openx') ||
      d.includes('criteo') || d.includes('taboola') || d.includes('outbrain') || d.includes('bluekai') ||
      d.includes('demdex') || d.includes('adform') || d.includes('sovrn') || d.includes('triplelift') ||
      d.includes('indexexchange') || d.includes('casalemedia') || d.includes('improvedigital') ||
      d.includes('teads') || d.includes('sharethrough') || d.includes('adtech') || d.includes('adzerk') ||
      d.includes('moat') || d.includes('exelator') || d.includes('mookie') || d.includes('krxd') ||
      d.includes('dotomi') || d.includes('conversant') || d.includes('media.net') || d.includes('adpushup') ||
      d.includes('popads') || d.includes('exoclick') || d.includes('trafficjunky') || d.includes('yieldmanager') ||
      d.includes('advertising.com') || d.includes('burst') || d.includes('valueclick') || d.includes('tribalfusion') ||
      d.includes('rightmedia') || d.includes('mediaplex') || d.includes('netmng') || d.includes('revsci') ||
      d.includes('salesforce.com/dmp') || d.includes('rocketfuel') || d.includes('everesttech') ||
      d.includes('googlesyndication') || d.includes('googleadservices') ||
      d.includes('pixel') || d.includes('ads.linkedin') || d.includes('ads.pinterest') || d.includes('ads-twitter') ||
      d.includes('ads.tiktok') || d.includes('ads.snapchat') || d.includes('ads.yahoo') ||
      d.includes('reddit.com/ads') || d.includes('quora.com/ads') || d.includes('out.reddit') ||
      d.includes('adroll') || d.includes('affiliate') || d.includes('awin') || d.includes('shareasale') ||
      d.includes('commissionjunction') || d.includes('cj.com') || d.includes('impactradius') ||
      d.includes('tapfiliate') || d.includes('skimlinks') || d.includes('viglink') || d.includes('linkshare') ||
      d.includes('avantlink') || d.includes('pepperjam') || d.includes('linkpulse')) return 'ads';
  if (d.includes('fingerprint') || d.includes('fpjs') || d.includes('datadome') || d.includes('perimeterx') ||
      d.includes('distil') || d.includes('shapesecurity') || d.includes('recaptcha') || d.includes('hcaptcha') ||
      d.includes('funcaptcha') || d.includes('arkoselabs') || d.includes('turnstile') || d.includes('siftscience') ||
      d.includes('sift.com') || d.includes('fraud') || d.includes('maxmind') || d.includes('threatmetrix') ||
      d.includes('rsa.com') || d.includes('seon') || d.includes('forter') || d.includes('signifyd') ||
      d.includes('riskified') || d.includes('ekata') || d.includes('crossid') || d.includes('authid') ||
      d.includes('deviceid') || d.includes('smart-id') || d.includes('idnow') || d.includes('veriff') ||
      d.includes('jumio') || d.includes('onfido') || d.includes('mitek') || d.includes('trulioo') ||
      d.includes('lexisnexis') || d.includes('acxiom') || d.includes('corelogic') || d.includes('experian') ||
      d.includes('transunion') || d.includes('equifax') || d.includes('idology')) return 'fingerprint';
  return 'unknown';
}

// ── chrome.runtime.connect: port ───────────────────────────────────────────

function connectPort() {
  try {
    port = chrome.runtime.connect({ name: 'privacy-shield' });
  } catch {
    setTimeout(connectPort, 500);
    return;
  }

  port.onMessage.addListener((msg) => {
    if ((msg.action === 'tabData' || msg.action === 'trackerUpdate') && msg.tabId === currentTabId && msg.data) {
      currentData = msg.data;
      render();
    }
    if (msg.stats) {
      document.getElementById('sessionBlocked').textContent = `${msg.stats.today || 0} blocked`;
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(connectPort, 1000);
  });
}

function requestTabData() {
  if (port && currentTabId) port.postMessage({ action: 'getTabData', tabId: currentTabId });
}

// ── chrome.storage.local ────────────────────────────────────────────────────

async function getDomainSettings() {
  const r = await chrome.storage.local.get('domainSettings');
  return r.domainSettings || {};
}

async function saveDomainSettings(key, val) {
  const all = await getDomainSettings();
  all[key] = val;
  await chrome.storage.local.set({ domainSettings: all });
}

async function getOptions() {
  const r = await chrome.storage.local.get('psOptions');
  return r.psOptions || { defaults: { analytics: true, ads: true, fingerprint: true }, notifyBlock: false, whitelist: [] };
}

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  const data = currentData;
  const count = data.count || 0;
  const cats = data.categories || {};
  const trackers = data.trackers || [];

  document.getElementById('badgeNum').textContent = count;
  const dot = document.getElementById('dot');
  dot.className = 'dot ' + (count > 0 ? 'danger' : 'safe');

  document.getElementById('statAnalytics').textContent = cats.analytics || 0;
  document.getElementById('statAds').textContent = cats.ads || 0;
  document.getElementById('statFingerprint').textContent = cats.fingerprint || 0;
  document.getElementById('statTotal').textContent = count;

  const listEl = document.getElementById('trackerList');
  if (!trackers.length) {
    listEl.innerHTML = '<div class="empty"><div class="ic">' + svgIcon('shield') + '</div><p>No trackers detected</p><div class="sub">This page looks clean</div></div>';
    return;
  }

  const grouped = {};
  const seen = new Map();
  for (const t of trackers) {
    const key = t.url || t.domain;
    if (seen.has(key)) continue;
    seen.set(key, true);
    const type = classify(t.domain || t.url || '');
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(t);
  }

  const order = ['analytics', 'ads', 'fingerprint', 'unknown'];
  let html = '';
  for (const type of order) {
    const items = grouped[type];
    if (!items?.length) continue;
    html += '<div class="section-title">' + type.charAt(0).toUpperCase() + type.slice(1) + ' (' + items.length + ')</div>';
    for (const t of items) {
      const domain = escapeHtml(t.domain || extractDomain(t.url) || 'unknown');
      const detail = t.url ? escapeHtml(t.url) : '';
      html += '<div class="tracker-item" data-url="' + escapeHtml(detail) + '">'
        + '<span class="icon">' + svgIcon(type) + '</span>'
        + '<span class="dom">' + domain + '</span>'
        + '<span class="tag ' + type + '">' + type + '</span>'
        + '</div>';
      if (detail) {
        html += '<div class="tracker-detail">' + detail + '</div>';
      }
    }
  }
  listEl.innerHTML = html;

  // Click to expand detail
  listEl.querySelectorAll('.tracker-item').forEach(el => {
    el.addEventListener('click', () => {
      const detail = el.nextElementSibling;
      if (detail?.classList.contains('tracker-detail')) {
        detail.classList.toggle('open');
      }
    });
  });
}

// ── Block toggle (master) ──────────────────────────────────────────────────

async function setupBlockToggle(domain) {
  const cb = document.getElementById('blockToggle');
  const status = document.getElementById('blockStatus');

  const settings = await getDomainSettings();
  const blocked = settings[domain]?.blocked || false;
  cb.checked = blocked;
  status.textContent = blocked ? 'on' : 'off';
  status.className = 'status ' + (blocked ? 'on' : 'off');

  cb.addEventListener('change', async () => {
    const on = cb.checked;
    status.textContent = on ? 'on' : 'off';
    status.className = 'status ' + (on ? 'on' : 'off');

    if (port) port.postMessage({ action: on ? 'enableBlock' : 'disableBlock', url: 'https://' + domain });

    const existing = await getDomainSettings();
    const prev = existing[domain] || {};
    await saveDomainSettings(domain, { blocked: on, categories: prev.categories || {}, updatedAt: Date.now() });
  });
}

// ── Per-category toggles ───────────────────────────────────────────────────

async function setupCatToggles(domain) {
  const settings = await getDomainSettings();
  const catState = settings[domain]?.categories || {};

  document.querySelectorAll('#catToggles input[type="checkbox"]').forEach(cb => {
    const cat = cb.dataset.cat;
    cb.checked = catState[cat] !== false;

    cb.addEventListener('change', async () => {
      const s = await getDomainSettings();
      const existing = s[domain] || { blocked: false, categories: {} };
      existing.categories = existing.categories || {};
      existing.categories[cat] = cb.checked;
      await saveDomainSettings(domain, existing);
    });
  });
}

// ── Whitelist ──────────────────────────────────────────────────────────────

async function setupWhitelistBtn(domain) {
  const btn = document.getElementById('whitelistBtn');
  const opts = await getOptions();
  const isWhitelisted = opts.whitelist.includes(domain);
  btn.textContent = isWhitelisted ? 'Whitelisted' : 'Whitelist';
  btn.classList.toggle('on', isWhitelisted);

  btn.addEventListener('click', async () => {
    const o = await getOptions();
    const idx = o.whitelist.indexOf(domain);
    if (idx >= 0) {
      o.whitelist.splice(idx, 1);
      btn.textContent = 'Whitelist';
      btn.classList.remove('on');
    } else {
      o.whitelist.push(domain);
      btn.textContent = 'Whitelisted';
      btn.classList.add('on');
    }
    await chrome.storage.local.set({ psOptions: o });
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist: o.whitelist });
    }
  });
}

// ── Options link ───────────────────────────────────────────────────────────

function setupOptionsLink() {
  const badge = document.getElementById('openOptions');
  const link = document.getElementById('optionsLink');
  const handler = () => {
    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };
  badge.addEventListener('click', handler);
  link.addEventListener('click', (e) => { e.preventDefault(); handler(); });
}

// ── Init ────────────────────────────────────────────────────────────────────

async function init() {
  connectPort();

  const tab = await getTab();
  if (!tab?.id || !tab?.url) {
    document.getElementById('domainName').textContent = 'No active tab';
    return;
  }

  currentTabId = tab.id;
  currentDomain = extractDomain(tab.url) || 'unknown';
  document.getElementById('domainName').textContent = currentDomain;

  await setupBlockToggle(currentDomain);
  await setupCatToggles(currentDomain);
  await setupWhitelistBtn(currentDomain);
  setupOptionsLink();

  requestTabData();
  setInterval(() => {
    if (!port) connectPort();
    requestTabData();
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
