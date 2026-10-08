# Offline: installable web app, hosting

Part of the [game architecture plan](README.md).

## Decided (owner, 2026-10-08)

- The game becomes a **progressive web app (PWA)**: installable, and **the player can download everything at once and play offline**.
- **Hosting: Vercel, probably.**

## How it works

| Piece | Role |
|---|---|
| **Web app manifest** | Name, icons, colours, full-screen display. Lets browsers install the game as an app (Chrome and Edge: install button; Safari on macOS: *Add to Dock*) |
| **Service worker** | Sits between the game and the network. Serves every file from its cache when it has it, so repeat visits start in a second or two and work offline |
| **Normal play** | Files are cached as they're downloaded (tiers in [loading](loading.md)), so a played section stays available offline |
| **"Download for offline play"** | A button (title screen or settings) that fetches every file in the game in one go, music included (≈ 100 MB *(estimate)*), with a progress bar. After that, the whole game runs with no connection |

**Storage room:** browsers allow far more than 100 MB for a site, typically a share of free disk space, so this fits. The game asks for persistent storage so the cache isn't cleared to free space (also protects saves, see [saving](saving.md)).

**Streamed music offline:** music is streamed while online, using range requests (fetching part of a file). Cached files need range requests answered from the cache, which the service worker has to handle (a known pattern, e.g. Workbox's range-request plugin).

## Updates

Each release has content-hashed file names, so new files never get confused with old ones.
1. When the game starts online, the service worker checks for a new version.
2. The new version downloads in the background (only the files that changed).
3. It takes effect the next time the game starts; never mid-session.
4. Saves carry a format version, so a new release can read older saves ([saving](saving.md)).

If the player downloaded everything for offline play, an update downloads the changed files only.

## Hosting on Vercel

- Static files on Vercel's CDN. Content-hashed files get long-lived *immutable* cache headers (`vercel.json`); the service worker file and the manifest are never cached long, so updates are noticed.
- Compression: Vercel compresses JS, JSON and CSS automatically. Whether it does so for `.glb`/`.ktx2` needs checking: compressed geometry gets much smaller still when served compressed.
- **Bandwidth is the cost to watch.** Each new player downloads the whole game, about 100 MB with music, and a "download everything" makes that certain. Vercel plans include a monthly transfer allowance, so first-time players per month ≈ allowance ÷ ~100 MB. Check current plan limits (and the free plan's non-commercial terms) before launch. Repeat and installed players cost almost nothing.

## Open questions

- Which Vercel plan, given the bandwidth per new player.
- Should "Download for offline play" be offered up front (title screen) or tucked into settings?
