# Privacy Shield — Chrome Extension

**Detect and block 1,300+ known trackers** including analytics scripts, advertising pixels, and fingerprinting code. Built with Manifest V3.

---

## Features

- **Tracker Detection** — Intercepts all network requests via `chrome.webRequest` and matches them against a blocklist of 1,300+ known tracker domains (Google Analytics, Facebook Pixel, Hotjar, Mixpanel, New Relic, Criteo, Taboola, and many more).
- **DOM Scanning** — Content script inspects inline scripts, external scripts, iframes, images, and tracking pixels for tracker code patterns.
- **MutationObserver** — Catches dynamically injected scripts after page load.
- **Per-Category & Per-Domain Blocking** — Master toggle to block all trackers on a site, plus per-category preferences (Analytics, Ads, Fingerprint) stored per domain.
- **Real-Time Popup** — Long-lived port connection to the background service worker pushes tracker detections instantly. Shows grouped tracker list with collapsible URLs.
- **Badge Counter** — Toolbar icon displays the number of trackers detected on the current tab.
- **Whitelist** — Add domains to the whitelist to skip blocking. Toggle from the popup or manage in Options.
- **Persistent Stats** — Tracks total blocked today, all-time, broken down by category and domain.
- **Export / Import Settings** — Backup or transfer your configuration as a JSON file.
- **SVG Icons** — Clean inline SVG icons throughout the UI (no emoji).

---

## Installation

### 1. Load in Chrome (unpacked)

1. Open **chrome://extensions**
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the folder containing the extension files
5. The shield icon appears in your toolbar

### 2. Load in Edge

1. Open **edge://extensions**
2. Enable **Developer mode**
3. Click **Load unpacked** and select the folder

### 3. Publish to Chrome Web Store

1. Zip the extension files (see [Files to upload](#files-to-upload) below)
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer registration fee
4. Click **New item** and upload the ZIP
5. Fill in the store listing (description, screenshots, icon)
6. Submit for review

---

## How to Use

### Popup

Click the shield icon in the toolbar to open the popup.

- **Status dot** — Green = no trackers on this page, Red = trackers found
- **Badge** — Shows total tracker count, click to open Options
- **Domain bar** — Current site domain, click **Whitelist** to add/remove from whitelist
- **Master toggle** — "Block trackers" enables/disables blocking for this domain
- **Category toggles** — Fine-tune which categories (Analytics / Ads / Fingerprint) to block
- **Stats row** — Quick breakdown of Analytics, Ads, Fingerprint, and Total trackers
- **Tracker list** — Grouped by category with colored tags. Click any row to expand and see the full URL.

### Options Page

Open Options from the popup (click the badge count or the "Options" link at the bottom).

- **Default Blocking** — Set which categories are blocked by default on every new site
- **Notifications** — Toggle browser notifications when trackers are blocked
- **Whitelist** — Manage all whitelisted domains (add / remove)
- **Statistics** — View today's blocked count, all-time total, per-category breakdown, and unique domains
- **Export / Import** — Download your settings as JSON or restore from a file
- **Danger Zone** — Reset all settings to defaults

---

## Files to Upload

For GitHub drag-and-drop or ZIP packaging, include **all** of these files at the root level:

```
Privacy Shield /
  manifest.json          # Extension manifest (Manifest V3)
  background.js          # Service worker — network interception, blocking, stats
  content.js             # DOM scanner — inline/external scripts, pixels, MutationObserver
  popup.html             # Popup interface
  popup.js               # Popup logic — port communication, toggles, whitelist
  options.html           # Options page
  options.js             # Options logic — defaults, whitelist, stats, export/import
  trackers.json          # Blocklist — 1,300+ tracker domains
  icon.svg               # SVG source icon
  icon16.png             # 16px toolbar icon
  icon48.png             # 48px extensions page icon
  icon128.png            # 128px store listing icon
  package.json           # (optional) Build dependencies
  scripts/
    build-icons.mjs      # (optional) SVG → PNG build script
```

**Minimum required for Chrome:** manifest.json, background.js, content.js, popup.html, popup.js, options.html, options.js, trackers.json, icon16.png, icon48.png, icon128.png

---

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `activeTab` | Access the current tab's URL for per-domain settings |
| `storage` | Save block preferences, stats, whitelist, and content scan results |
| `webRequest` | Intercept network requests to detect tracker domains |
| `webRequestBlocking` | Required alongside `webRequest` in MV3 |
| `declarativeNetRequest` | Dynamically block tracker requests when the master toggle is on |
| `<all_urls>` host permissions | Monitor requests across all websites |

---

## Blocklist

The blocklist lives in `trackers.json` as a categorized JSON object with **1,300+ entries** covering:

- **Analytics** — Google Analytics, Facebook Pixel, Hotjar, Mixpanel, Amplitude, New Relic, Segment, FullStory, Mouseflow, Clicky, Crazy Egg, Optimizely, VWO, Dynatrace, Datadog, Sentry, and dozens more
- **Fingerprint** — FingerprintJS, Datadome, PerimeterX, Distil Networks, reCAPTCHA, hCaptcha, ThreatMetrix, Sift Science, Forter, Signifyd, and more

Each entry can be a bare domain (matched via URL hostname) or a path-prefixed entry (e.g. `"google.com/ads"`) for more specific matching.

---

## Architecture

```
User visits page
  ├── content.js scans DOM (inline/external scripts, pixels, MutationObserver)
  │     └── Sends results to chrome.storage.local
  └── background.js intercepts all network requests
        ├── Checks whitelist → skip if whitelisted
        ├── Checks blocklist → classify category
        ├── Updates per-tab counter + badge text
        ├── Updates global stats (today, all-time, by category, by domain)
        └── Broadcasts update to connected popups via port

Popup opens
  ├── Connects via chrome.runtime.connect (long-lived port)
  ├── Requests tab data from background
  ├── Renders tracker list, stats, category breakdown
  ├── Master toggle → sends enableBlock/disableBlock → declarativeNetRequest rules
  └── Whitelist toggle → saves to chrome.storage.local, syncs to background
```

---

## Development

### Prerequisites

- Node.js 18+ (for building icons from SVG)

### Build icons from SVG

```bash
npm install
npm run build:icons
```

This uses the `sharp` library to convert `icon.svg` into `icon16.png`, `icon48.png`, and `icon128.png`.

### Submit to Chrome Web Store

1. Increment `"version"` in `manifest.json`
2. Run `npm run build:icons` to refresh icons if needed
3. ZIP all required files
4. Upload to the [Chrome Web Store Dashboard](https://chrome.google.com/webstore/devconsole)

---

## License

MIT
