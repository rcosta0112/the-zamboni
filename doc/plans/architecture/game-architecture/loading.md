# Loading: tiers, transitions, times

Part of the [game architecture plan](README.md). Offline play and full download: see [offline](offline.md).

## Tiers

| Tier | What | When it loads | Size *(estimate)* |
|---|---|---|---|
| **0. Boot** | Game code (three, Svelte UI, game), Rapier, fonts, title screen | Page load | ≤ 3 MB |
| **1. Opening** | Travel terrain kit, ship exterior LOD, cockpit, Dr. Green + Adam | In the background as soon as the title screen is up | ≈ 4 MB |
| **2. Ship + crew** | Full ship interior, the characters in their jumpsuits with the player's, shared and personal animations, core sound effects | During the opening cutscene | ≈ 11 MB |
| **3. Next scene** | The next scene's animations (`anim-scene-<id>.glb`), plus its landing site and sounds if it has one; the parkas come with the first landing | During the section before it | ≤ 0.5 MB for animations; ≤ 10 MB for a landing site |
| **Streamed** | Music, long ambience loops | Played while downloading | ~1 MB per minute |

The story is linear, so the loader always knows what comes next and loads it in the background.

## Transitions and what hides them

| Transition | Load? | What the player sees |
|---|---|---|
| Page → title screen | Tier 0 | A plain page for about a second, then the title |
| Title → opening | Tier 1 (≈ 4 MB) | Usually ready before the player presses Start; on slow connections, a short wait shown on the Start button |
| Opening → first control | Tier 2 | The opening cutscene plays while the ship loads; its first shot is aerial (terrain + ship LOD only) |
| Inside ↔ outside | None | Same scene; the see-through hull switches mode at the door |
| Travel → landing | Site already preloaded | Landing cutscene; the terrain is swapped for the site under dust or cloud cover |
| Landing → travel | None | Take-off cutscene; the site unloads afterwards |
| Comm, dialogue, menus | None | Svelte overlay; instant |
| Continue a saved game | Tiers 0–2 + the save's site | The title screen covers it (see [saving](saving.md)) |

**If a preload isn't finished in time** (very slow connection): the travel section carries on (the ship keeps flying, conversations continue) until the site is ready. No loading screen.

> **Story levers:** the loading strategy relies on three things the script controls:
> - **The opening cutscene** has to last long enough to cover tier 2: about 15 s on a slow connection.
> - **Each travel section** has to last long enough to cover the next site's download: about 10 s on a slow connection, which any travel section with a conversation will.
> - **A landing or take-off cutscene** at every site change, to hide the swap.
>
> If any of these gets cut from the script, the matching load becomes visible.

## Predicted times *(estimate)*

Assumptions: fast broadband 50 Mbps (≈ 6 MB/s), slow connection 10 Mbps (≈ 1.2 MB/s), plus 0.5–1 s per tier for decoding and GPU upload on a mid-range laptop.

| Moment | Bytes | Fast | Slow | Visible? |
|---|---|---|---|---|
| Title screen appears | 3 MB | ~1 s | ~3 s | Yes: the only unavoidable wait |
| Opening ready | +4 MB | ~1.5 s | ~4 s | Usually not: overlaps the title screen |
| Ship + crew ready | +11 MB | ~2.5 s | ~9 s | No: overlaps the opening cutscene |
| Each landing site | ≤ 10 MB | ~2.5 s | ~9 s | No: overlaps travel |
| Repeat visit / installed app | 0 | ~1–2 s | ~1–2 s | Decode only |
