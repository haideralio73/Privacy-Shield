// Privacy Shield - Content Script
// Scans DOM for known tracker patterns, including dynamically loaded scripts.

// ── Known inline tracker regex patterns ─────────────────────────────────────

const INLINE_PATTERNS = [
  /google-analytics\.com\/analytics\.js/,
  /googletagmanager\.com\/gtag\/js/,
  /gtag\s*\(/,
  /ga\s*\(/,
  /ga\.create/,
  /ga\.send/,
  /GoogleAnalyticsObject/,
  /dataLayer\s*=/,
  /dataLayer\.push/,
  /facebook\.com\/tr\b/,
  /fbq\s*\(/,
  /fbq\.init/,
  /fbq\.track/,
  /_fbq\s*=/,
  /connect\.facebook\.net/,
  /hotjar\.com\/hbo/,
  /hotjar\.io\/hbo/,
  /hj\s*\(/,
  /_hjSettings/,
  /hjs\s*=/,
  /hotjar\.com\/hjs/,
  /newrelic\.com/,
  /NREUM/,
  /fullstory\.com\/s/,
  /FS\.identify/,
  /FS\.event/,
  /window\[['"]_fs_host['"]\]/,
  /mouseflow\.com/,
  /_mfq\s*=/,
  /mfq\.push/,
  /clicky\.com/,
  /clicky\.init/,
  /clicky\.log/,
  /mixpanel\.com/,
  /mixpanel\.init/,
  /mixpanel\.track/,
  /amplitude\.com/,
  /amplitude\.init/,
  /amplitude\.logEvent/,
  /heap\.app/,
  /heap\.identify/,
  /heap\.track/,
  /segment\.io/,
  /analytics\.load/,
  /analytics\.page/,
  /analytics\.identify/,
  /analytics\.track/,
  /crazyegg\.com/,
  /CE\.setAccount/,
  /CE\.track/,
  /fingerprintjs/,
  /fpjs/,
  /_fingerprint/,
  /canvas\.toDataURL/,
  /getClientRects/,
  /measureText/,
  /webgl\.getParameter/,
  /getContext\s*\(\s*['"]webgl['"]\s*\)/,
  /getContext\s*\(\s*['"]2d['"]\s*\)/,
  /AudioContext/,
  /webkitAudioContext/,
  /mozAudioContext/,
  /RTCPeerConnection/,
  /webkitRTCPeerConnection/,
  /mozRTCPeerConnection/,
  /optimizely\.com/,
  /optimizely\.push/,
  /vwo\.com/,
  /_vwo_code/,
  /ab\.test/,
  /AB\.test/,
  /visualwebsiteoptimizer/,
  /adroll\.com/,
  /adroll\.init/,
  /adroll\.track/,
  /addthis\.com\/js/,
  /addthis\.init/,
  /addthis\.share/,
  /sharethis\.com/,
  /sharethis\.init/,
  /intercom\.com\/widget/,
  /intercom\.boot/,
  /Intercom\s*\(/,
  /drift\.com\/widget/,
  /drift\.boot/,
  /olark\.com/,
  /olark\.identify/,
  /livechatinc\.com/,
  /livechat_visitor/,
  /zopim\.com\/widget/,
  /zendesk\.com\/widget/,
  /freshchat\.com/,
  /freshchat\.init/,
  /crisp\.chat/,
  /crisp\.init/,
  /hubspot\.com\/livechat/,
  /hsConversations/,
  /recaptcha\/api\.js/,
  /grecaptcha/,
  /hcaptcha\.com/,
  /marketo\.com/,
  /munchkin\.marketo/,
  /Munchkin\.init/,
  /pardot\.com/,
  /pi\.pardot/,
  /eloqua\.com/,
  /eloqua\.track/,
  /acton\.com/,
  /affiliate\./i,
  /awin\.com/,
  /shareasale\.com/,
  /commissionjunction\.com/,
  /cj\.com/,
  /impactradius\.com/,
  /tapfiliate\.com/,
  /skimlinks\.com/,
  /viglink\.com/,
  /linkshare\.com/,
  /avantlink\.com/,
  /pepperjam\.com/,
  /linkpulse\.com/,
  /navigator\.sendBeacon/,
  /sendBeacon\(/,
  /localStorage\.setItem.*['"](_ga|_fbp|_gid|_hj|_mkto|_clck|_uetsid|_pin|_scid|_sp|_fbp)['"]/,
  /navigator\.(userAgent|platform|languages?|hardwareConcurrency|deviceMemory|webdriver|doNotTrack|plugins|mimeTypes|connection|getBattery)/
];

// ── Detection functions ─────────────────────────────────────────────────────

function matchesAny(text) {
  for (const re of INLINE_PATTERNS) {
    if (re.test(text)) return re.source.substring(0, 60);
  }
  return null;
}

const EXTERNAL_DOMAINS = [
  'google-analytics.com', 'googletagmanager.com', 'facebook.net', 'facebook.com/tr',
  'hotjar.com', 'hotjar.io', 'mouseflow.com', 'fullstory.com', 'clicky.com',
  'mixpanel.com', 'amplitude.com', 'segment.io', 'segment.com',
  'newrelic.com', 'nr-data.net', 'doubleclick.net', 'googleadservices.com',
  'googlesyndication.com', 'adservice.google.com', 'scorecardresearch.com',
  'quantserve.com', 'quantcount.com', 'bluekai.com', 'demdex.net',
  'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com',
  'optimizely.com', 'vwo.com', 'addthis.com', 'sharethis.com',
  'intercom.com', 'drift.com', 'zopim.com', 'zendesk.com', 'hubspot.com',
  'marketo.com', 'pardot.com', 'eloqua.com', 'acton.com',
  'awin.com', 'shareasale.com', 'cj.com', 'impactradius.com',
  'tapfiliate.com', 'skimlinks.com', 'viglink.com', 'linkshare.com',
  'affiliate', 'fingerprintjs', 'recaptcha', 'hcaptcha.com',
  'linkedin.com/analytics', 'ads.linkedin.com', 'pinterest.com/analytics',
  'ads.pinterest.com', 'analytics.twitter.com', 'ads-twitter.com',
  'analytics.tiktok.com', 'ads.tiktok.com', 'snapchat.com/analytics',
  'ads.snapchat.com', 'reddit.com/ads', 'out.reddit.com', 'quora.com/ads',
  'bazaarvoice.com', 'trustpilot.com', 'yotpo.com', 'pixel'
];

function scanExternal(el) {
  const src = el.src || '';
  return EXTERNAL_DOMAINS.some(d => src.includes(d)) ? src : null;
}

function scanScripts() {
  const found = [];
  document.querySelectorAll('script:not([src])').forEach(s => {
    const text = s.textContent || '';
    const match = matchesAny(text);
    if (match) found.push({ type: 'inline', match, snippet: text.substring(0, 100).replace(/\s+/g, ' ').trim() });
  });
  document.querySelectorAll('script[src], img[src], iframe[src]').forEach(el => {
    const url = scanExternal(el);
    if (url) found.push({ type: 'external', url: url.substring(0, 200), tag: el.tagName.toLowerCase() });
  });
  return found;
}

function scanPixels() {
  const found = [];
  document.querySelectorAll('img[src]').forEach(img => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if ((w === 1 && h === 1) || (w === 0 && h === 0)) {
      found.push({ type: 'pixel', url: img.src.substring(0, 200), dims: `${w}x${h}` });
    }
  });
  return found;
}

// ── Report to background ────────────────────────────────────────────────────

function report(scan) {
  const hostname = location.hostname;
  chrome.runtime.sendMessage({ action: 'contentScan', hostname, results: scan }).catch(() => {});
  chrome.storage.local.set({ [`contentScan_${hostname}`]: { results: scan, ts: Date.now() } }).catch(() => {});
}

// ── Run scans ───────────────────────────────────────────────────────────────

function runScan() {
  return {
    scripts: scanScripts(),
    pixels: scanPixels(),
    detectedAt: Date.now()
  };
}

// Initial scan after page load
window.addEventListener('load', () => {
  setTimeout(() => report(runScan()), 600);
});

// ── MutationObserver: catch dynamically inserted scripts ──────────────────

let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => report(runScan()), 800);
});
observer.observe(document.documentElement, { childList: true, subtree: true });
