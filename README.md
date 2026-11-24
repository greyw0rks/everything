# Everything

Know the markets. Skip the scroll.

Everything has two market pages: **Everything Crypto** and **Everything RWA**. Switch between them, keep separate crypto and RWA watchlists in one account, follow original reporting and receive optional signed-in browser-extension alerts.

Website: https://everything-cmc.vercel.app

[DoraHacks BUIDL](https://dorahacks.io/build/51829) · [Demo video](https://everything-cmc.vercel.app/media/everything-demo.mp4)

## Source and local development

This repository contains the responsive website, standalone Expo Android/iOS app and Manifest V3 Chrome/Edge extension. The clients use Everything's hosted application API; market ingestion, provider adapters and account storage run in the private backend. Local development needs no provider keys.

Use Node.js 22 or newer:

```sh
npm start
```

Open http://localhost:3074. The local server serves the website and forwards allowed application requests over HTTPS to the hosted backend. Accounts created locally belong to the live service. The development server binds only to your computer's loopback address.

For the native app:

```sh
cd mobile
npm ci
EXPO_PUBLIC_API_URL=https://everything-cmc.vercel.app npm start
```

Use Expo's Android/iOS development workflow. Building an installable app requires the appropriate platform tooling and your signing configuration. The already-built APK is available below.

For an extension build that uses the deployed service, run from the repository root:

```sh
EC_PUBLIC_URL=https://everything-cmc.vercel.app npm run extension:build
```

Load the resulting `extension/` directory unpacked. For local extension development, run `npm run extension:build` while the local website server is running.

| Directory | Contents |
| --- | --- |
| `public/` | Website components, styles, account flows, Crypto/RWA pages and public brand assets |
| `mobile/` | Expo React Native screens, secure session storage and app configuration |
| `extension/` | Popup, account flows, service worker, alarms and optional notifications |
| `tools/` | Client development server and extension builder |

## Submission logo

Upload [public/brand/everything-logo.png](public/brand/everything-logo.png) as the DoraHacks project logo. The 1024 × 1024 PNG has a transparent background. PNG/SVG mark and wordmark files are included in `public/brand/`.

## Downloads

Download the standalone Android APK and Chrome/Edge extension from [GitHub Releases](https://github.com/greyw0rks/everything/releases).

Android: download everything.apk and install it directly. This is not a Play Store listing. Physical-device testing is pending; the APK signature and package are verified.

Extension: unzip everything-extension.zip, open chrome://extensions or edge://extensions, enable Developer mode, choose Load unpacked and select the extracted folder. Sign in and select Enable extension notifications. Allow notification permission. New alerts are checked every five minutes while the browser is running; the popup can remain closed.

X tracking is a paid feature coming soon. Pricing is unset. Mobile notifications are in-app; remote push is not configured. RWA totals describe covered tokenized assets, not their full underlying stock or commodity markets.

Upstream credentials, provider adapters and feed configuration belong to the private backend. Publisher attribution and original article links remain visible in the product. The owner has separate local endpoint/code/response evidence for the hackathon submission.
