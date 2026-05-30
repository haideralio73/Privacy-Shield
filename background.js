// Privacy Shield — Background Service Worker (MV3)
// Network interception, declarativeNetRequest blocking, persistent stats,
// whitelist, per-category defaults, real-time popup communication.

let rawBlocklist = [];
let domainSet = new Set();
let pathPrefixSet = [];
let categoryMap = new Map();
let blockRuleCounter = 1000;

const tabCache = new Map();
const portPool = new Set();

// ── Options (lazy-loaded from chrome.storage.local) ────────────────────────

let psOptions = {
  defaults: { analytics: true, ads: true, fingerprint: true },
  notifyBlock: false,
  whitelist: []
};
let psStats = { today: 0, allTime: 0, byCategory: {}, byDomain: {}, date: '' };

async function loadOptions() {
  try {
    const r = await chrome.storage.local.get('psOptions');
    if (r.psOptions) psOptions = r.psOptions;
    const s = await chrome.storage.local.get('psStats');
    if (s.psStats) {
      psStats = s.psStats;
      // Reset daily counter if day changed
      const today = new Date().toDateString();
      if (psStats.date !== today) {
        psStats.today = 0;
        psStats.date = today;
        await chrome.storage.local.set({ psStats });
      }
    }
  } catch {}
}

async function persistStats() {
  await chrome.storage.local.set({ psStats });
}

loadOptions();

// ── Load blocklist ─────────────────────────────────────────────────────────

async function initBlocklist() {
  try {
    const resp = await fetch(chrome.runtime.getURL('trackers.json'));
    const data = await resp.json();
    rawBlocklist = data;
    for (const cat in data) {
      for (const entry of data[cat]) {
        if (entry.includes('/')) {
          pathPrefixSet.push({ prefix: entry, category: cat });
        } else {
          domainSet.add(entry);
          categoryMap.set(entry, cat);
        }
      }
    }
  } catch (err) {
    console.error('Privacy Shield: blocklist load failed', err);
  }
}
initBlocklist();

// ── Helpers ────────────────────────────────────────────────────────────────

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

function isKnownTracker(url, domain) {
  if (domainSet.has(domain)) return categoryMap.get(domain) || 'unknown';
  for (const { prefix, category } of pathPrefixSet) {
    if (url.includes(prefix)) return category;
  }
  return null;
}

function classifyDomain(domain) {
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

// ── Tab data persistence (chrome.storage.session) ─────────────────────────

async function saveTabData(tabId, data) {
  tabCache.set(tabId, data);
  try { await chrome.storage.session.set({ [`tab_${tabId}`]: { data, ts: Date.now() } }); } catch {}
}

async function loadTabData(tabId) {
  if (tabCache.has(tabId)) return tabCache.get(tabId);
  try {
    const res = await chrome.storage.session.get(`tab_${tabId}`);
    if (res[`tab_${tabId}`]) { tabCache.set(tabId, res[`tab_${tabId}`].data); return res[`tab_${tabId}`].data; }
  } catch {}
  return null;
}

// ── Declarative Net Request: dynamic blocking ──────────────────────────────

async function enableBlocking(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const exists = rules.some(r =>
    r.condition.urlFilter === `||${domain}^`
  );
  if (exists) return;
  const rule = {
    id: blockRuleCounter++,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'other']
    }
  };
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [], addRules: [rule] });
}

async function disableBlocking(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const toRemove = rules.filter(r =>
    r.condition.urlFilter && r.condition.urlFilter.replace('||', '').replace('^', '') === domain
  ).map(r => r.id);
  if (toRemove.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: toRemove, addRules: [] });
  }
}

async function setBlockingForSite(siteDomain, blocked) {
  if (blocked) {
    await enableBlocking(siteDomain);
  } else {
    await disableBlocking(siteDomain);
  }
}

// ── chrome.webRequest.onBeforeRequest: intercept & count ───────────────────

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.tabId === -1) return;
    if (!domainSet.size && !pathPrefixSet.length) return;

    const url = details.url;
    const domain = extractDomain(url);
    if (!domain) return;

    // Check whitelist
    if (psOptions.whitelist.some(w => domain === w || domain.endsWith('.' + w))) return;

    const category = isKnownTracker(url, domain);
    if (!category) return;

    let tabData = await loadTabData(details.tabId);
    if (!tabData) tabData = { count: 0, trackers: [], categories: {} };
    if (tabData.trackers.some(t => t.url === url)) return;

    tabData.count += 1;
    tabData.trackers.push({ domain, type: category, url, ts: Date.now() });
    tabData.categories[category] = (tabData.categories[category] || 0) + 1;
    await saveTabData(details.tabId, tabData);

    // Update global stats
    const today = new Date().toDateString();
    if (psStats.date !== today) { psStats.today = 0; psStats.date = today; }
    psStats.today++;
    psStats.allTime++;
    psStats.byCategory[category] = (psStats.byCategory[category] || 0) + 1;
    psStats.byDomain[domain] = (psStats.byDomain[domain] || 0) + 1;
    await persistStats();

    chrome.action.setBadgeText({ text: String(tabData.count), tabId: details.tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#E53935', tabId: details.tabId });

    // Notify connected popups
    for (const port of portPool) {
      try {
        port.postMessage({ action: 'trackerUpdate', tabId: details.tabId, data: tabData, stats: psStats });
      } catch { portPool.delete(port); }
    }
  },
  { urls: ['<all_urls>'] }
);

chrome.tabs.onRemoved.addListener(async (tabId) => {
  tabCache.delete(tabId);
  try { await chrome.storage.session.remove(`tab_${tabId}`); } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabCache.delete(tabId);
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// ── chrome.runtime.onConnect: long-lived port (popup) ──────────────────────

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'privacy-shield') return;
  portPool.add(port);
  port.onDisconnect.addListener(() => portPool.delete(port));

  port.onMessage.addListener(async (msg) => {
    if (msg.action === 'getTabData') {
      const tabData = await loadTabData(msg.tabId) || { count: 0, trackers: [], categories: {} };
      port.postMessage({ action: 'tabData', tabId: msg.tabId, data: tabData, stats: psStats });
    }
    if (msg.action === 'enableBlock' && msg.url) {
      const domain = extractDomain(msg.url);
      if (domain) await setBlockingForSite(domain, true);
    }
    if (msg.action === 'disableBlock' && msg.url) {
      const domain = extractDomain(msg.url);
      if (domain) await setBlockingForSite(domain, false);
    }
  });
});

// ── chrome.runtime.onMessage: one-shot messages ────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTrackers') {
    loadTabData(message.tabId).then(d => sendResponse(d || { count: 0, trackers: [], categories: {} }));
    return true;
  }
  if (message.action === 'clearTrackers') {
    tabCache.delete(message.tabId);
    chrome.action.setBadgeText({ text: '', tabId: message.tabId });
    chrome.storage.session.remove(`tab_${message.tabId}`).catch(() => {});
    sendResponse({ success: true });
  }
  if (message.action === 'getStats') {
    sendResponse(psStats);
    return true;
  }
  if (message.action === 'getOptions') {
    sendResponse(psOptions);
    return true;
  }
  if (message.action === 'updateDefaults') {
    psOptions.defaults = message.defaults;
    chrome.storage.local.set({ psOptions });
    sendResponse({ success: true });
  }
  if (message.action === 'updateWhitelist') {
    psOptions.whitelist = message.whitelist;
    chrome.storage.local.set({ psOptions });
    sendResponse({ success: true });
  }
  if (message.action === 'contentScan') {
    chrome.storage.local.set({
      [`contentScan_${message.hostname}`]: { results: message.results, ts: Date.now() }
    }).catch(() => {});
    sendResponse({ received: true });
  }
  return true;
});

// ── Restore session on service worker wake ─────────────────────────────────

chrome.storage.session.get(null).then(all => {
  for (const key in all) {
    if (key.startsWith('tab_')) {
      const tabId = parseInt(key.replace('tab_', ''), 10);
      if (all[key]?.data) tabCache.set(tabId, all[key].data);
    }
  }
});
