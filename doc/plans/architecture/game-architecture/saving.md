# Saving: stop and continue later

Part of the [game architecture plan](README.md).

## Decided (owner, 2026-10-08)

- The player must be able to **stop the game and continue another time**.
- **Individual objects aren't tracked.** Books, cups and other props go back to their places on reload.

## What a save holds

| Saved | Why |
|---|---|
| **Story state** (Ink's state: variables, visited knots, current position) | The single source of truth for progress ([`architecture/README.md`](../../../architecture/README.md)) |
| **Checkpoint id** (which scene, which location: travelling or which landing site) | Where to put the player back |
| **Mission data** (wildlife, ruins and artifacts documented) | Shown in the comm; mostly derivable from story state, but saved explicitly to keep the comm simple |
| **Comm chat history** | The chat log the player has already seen |
| **Save format version + game version** | So an update to the game can read older saves |

**Not saved:** positions of props, open/closed doors, the player's exact position (they return to the checkpoint's spawn point). Settings are stored separately, so they survive starting a new game.

A save is small, roughly 10–200 KB of JSON *(estimate)*.

## When it saves

**Checkpoints, automatically.** At the start of every scene, on landing and take-off, and after key story moments. The player never loses more than a few minutes.

> **Story lever:** checkpoints work best at natural breaks in the script: the start of a scene, a landing, a cutscene. Long stretches without a break mean more replay after quitting; a short beat (a cutscene, arriving somewhere) gives a natural place to save.

**Continue** on the title screen loads the latest checkpoint. Loading it is the same as a first start (tiers 0–2, plus the checkpoint's landing site, see [loading](loading.md)).

## Where it's stored

**IndexedDB** in the browser (more room and more reliable than `localStorage`), with a request for **persistent storage** so the browser doesn't clear it to free space.

**The risk:** browsers can still clear a site's stored data: when the user clears browsing data, and in Safari possibly after a long period without visiting. Installing the game as an app (see [offline](offline.md)) makes storage more durable. As a safety net: **export and import a save file** from the settings menu.

## Open questions

- One automatic save, or also a few manual save slots?
- Should the comm show where you are ("Chapter 2 — The drone"), to make continuing clearer?
