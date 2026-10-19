# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-19, end of the sixteenth session. **On the branch `see-through-from-scratch`**, committed up to 257621d (item 46), not pushed. `The Zamboni 1.21.blend` written by the agent (not in git).*

## Next session, in this order (owner)

0. **Item 46 built: one scale** ([scale-normalization.md](../plans/features/scale-normalization.md), *As built*). The reference file is **1.21**: 1 unit = 1 m, Dr. Green 1.23 tall at scale 1, the game's proportions unchanged (positions within 1.5 mm). **What the ship export takes is a list**, `app/tools/ship-export-list.json`. **The owner fixes in 1.21** (their 1.20 changes; [asset pipeline](../architecture/asset-pipeline.md#before-the-next-export), *To look at in 1.21*): close the trapdoor (`Hatch.002` rotated open), give `Dr. Kaufman.002` her action back (deleted in 1.20; it's in 1.19), then `npm run export:ship` and `export:crew`. Confirm the signal receiver belongs in the list. Then **re-key the ladder clip** in 1.21 (`Body` rising 2.26) → pass 2: [ladder-climb-animation.md](../plans/features/ladder-climb-animation.md).
   **Smoke, 2026-10-19: 7 failed** (`app/.export/smoke.txt`; the same with the trapdoor closed in a test export, `smoke-hatch.txt`, minus the thruster one). The 4 ladder checks (dropping through, collides again, jump part way, the rung sound: she never takes hold) come from the **longer ladder of 1.20** against the old free climb: not fixed, pass 2 replaces it. *Single-sided materials*: the receiver's 4 double-sided materials. *Can't walk under the hull / a front thruster*: her feet 3 to 6 cm into the ground (limit 2 cm): **not yet known whether it's this change**; run those two checks on 93d26cb's assets to tell.
1. **The owner walks around the cargo hold, engineering and the cockpit** with the gamepad (item 42 built: [collision-boxes.md](../plans/features/collision-boxes.md), *As built*). Twelve boxes, 96 objects out of the collider (49,842 → 19,862 triangles). Open: she may fly onto the jetpack rack's box (top 0.85 above the floor, as planned).
2. **The camera** (asked by the owner, not started): it went **inside a locker** (view: feet 3.612, 3.461, −13.92; yaw 6.304, pitch 0.008; camera 3.633, 4.469, −12.92 = 1.19's Blender (0.25, 2.75, 3.01), ×1.4856 in 1.21, behind the lockers' front): check whether the back-wall camera box already stops it; then **try the camera colliding with the ceiling**.
3. **Later (owner, 2026-10-16, backlog item 43):** the camera also collides with the cargo ramp when it's closed.

## Where things stand (item 41; [`see-through-hull.md`](../features/see-through-hull.md), updates at the top)

- `settings.seeThroughStage = 'hull only'`: everything drawn, cut by the hole while something hides her. **The hole ends in a hemisphere closing at her chest** (`holeEnd: 'round'`, `holeBeyond: 0`; square and vertical on the panel). Owner: partial coverage is fine (better framing); **the player must never lose track of her**. Idea kept for later: stop cutting the shell indoors if more artifacts beside the camera turn up.
- **Never cut on her deck** (`keepOnDeck`): the cockpit, engineering, the sled and pallet, the crew quarters' lockers, bunks, galley and the couch corner (`SITTING_AREA_WALLS`). **The bulkheads and their doors are never cut** while the camera collides with them (`cameraWall`).
- **The camera indoors** (ship.ts `hullWallAt`, `furnitureAt`; main.ts): stops at the shell (glass and outer doors too), the bulkheads and their doors, two boxes in the crew quarters (`CAMERA_BOXES`) and the couch, table and sitting-area walls (owner: fine as it is there). Owner: the camera moving by itself should stay minimal.
- **Picking things up** (later; notes and the sorted list of every prop in [interaction-doors.md](../plans/features/interaction-doors.md)): the costly parts are deferred by the owner (clothes, one object per pickable, attaching, throw vs back in place). Getting into a seat will be a button.
- **Owner's views:** a probe set feet, `view.yaw`/`pitch`, `cameraDistanceIndoors` (camera to feet + `cameraHeight`) and doors, with the camera's indoor collisions off; not kept (write `app/tools/owner-views.js` if needed again). Chrome on desktop only for now (owner).

## Waiting on the owner

- The clipping fix of objects in the hull's wall (asked 2026-10-15): by hand, or a semi-automatic Blender script (Shrinkwrap on the offending vertices; `npm run probe -- tools/hull-clipping.js` lists them). The crew quarters need a modelling decision first (no inner skin there).
- **The start screen:** not checked with a gamepad. **Lighting** for a later pass; camera distances placeholders.

## Found, not fixed

- **Window frames** (black in the file) show as strips where the hole half-cuts them (their front faces; their cut edge is filled). Options given: leave frames out of the cut, or let *hull gap black* blend them. A **cargo hold artifact** (a lit face in the wall by the side door) couldn't be reproduced: the owner reports it if seen again.
- **Engineering seen from above is slow in the test browser:** about 110 ms a frame (other rooms 16.7), the same with the see-through off and with main's rules: not this branch. Not looked into (headless Chrome; may not happen on a real GPU).
- **Smoke, once in two runs (2026-10-14):** *the ramp closes from its keypad* failed (it didn't move in 4 s) and E then took a jetpack from the rack instead. Likely: she ends the walk-in at y 0.88, on the ramp's walkway, and since item 35 the ramp waits until she's off. Passed on the rerun.
- **Dropping through the trapdoor's opening while pushing toward the ladder**, she lands where the ladder stands (it doesn't collide until she's clear of it) and overlaps it until she steps away. **Closed doors with colliders of their own** stop her (in the air too) when she touches their edge: the crew quarters and the cargo locker have boxes 0.08 in front of them now.
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections. Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.

## Known traps

- **Exporting:** `npm run export:ship` / `export:crew` / `export:player` (in `app/`): Blender, resize, dedup, Meshopt and the comparison in one go, with a short summary; raw files and Blender's log in `app/.export/` (not in git). Every script: [`app/tools/README.md`](../../app/tools/README.md).
- **Saving the owner's `.blend` is allowed** (owner, 2026-10-13), but **say so first, every time**: the owner may have it open. Check Blender isn't running (`tasklist`), save a copy next to the file, then save; open it with its UI (`open_mainfile` without `load_ui=False`) or the owner's layout is lost. For bigger changes a script the owner runs is also fine.
- **The ship export takes `ship-export-list.json`**, every collection switched on or not: read its `NOTE:` lines (listed but missing, in the file but unlisted). Every export stops on a `SCALE:` line if her armature isn't at scale 1, 1.23 tall. **A box tagged `reach: "through"` must be convex** (the game takes its hull). Coordinates in plans before 2026-10-19 are 1.19's units (×1.4856).
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools**, nor named in a shell command. Blender scripts read it; a node script run from the project root reaches it through `process.cwd()`; scripts go in the scratchpad. **ffmpeg** and **Python 3.11** are on the PATH. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **The ship is turned half a turn in the world**, at scale 1 since 1.21 (1.486 before): Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`; the other way, `worldToLocal`, then (x, -z, y).
- **In checks:** she turns in an arc when she sets off (face her first, or she misses a doorway); teleported into a closed door she's stuck; several spots 2.5 m into engineering and the cockpit are inside furniture. **Flying needs `settings.wearingJetpack`.** `npm run probe` drops `--shot`: run `node tools/probe-01.mjs` for screenshots.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time. **A frame's `dt` can be below zero** on the first frame: clamp it where a fade depends on it.
- **Screenshots from a script:** wait 2 s after moving her before capturing.
- **Keep a long check's whole output in a file** (`npm run smoke > .export/smoke.txt`), never piped through `tail`: a cut-off run has to be run again (3.5 min).
- **In the Bash tool, heredocs with apostrophes fail:** write the script to the scratchpad with the Write tool, then run it.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it, and `npm run dev:01` then fails (port taken). **After `vite.config.ts` or a dependency changes it restarts by itself**; if the page is blank, restart it by hand.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__boxes()` (`count`), `__audio` (`started`, `playing()`), `__boombox()`, `__rack()`, `__exhaust` (`shown`), `__wind` (`level`), `__start()` (`ready`, `begun`, `share`), `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`. **Sound in a check:** a key sent through DevTools (`Input.dispatchKeyEvent`, not Shift) turns it on. **The start screen in a check:** the probe and the smoke script press Q, wait for the button and press Enter (`useStartButton` in `browser.mjs`); `--stay` leaves the screen up and the file runs **before the button is there** (wait on `__start().ready`). The load takes about 18 s. **A gamepad in a check:** replace `navigator.getGamepads` with a made-up pad.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`; one thing: `npm run probe -- <file.js>` (20 s); the whole check, **once at the end**: `npm run smoke` (three and a half minutes). Then `npm run dev:01` (http://localhost:5201). New checks go in `app/tools/smoke-01.mjs`, tried out with the probe first. **Small fixes: no plan, no record script, no new check** (CLAUDE.md, *Keeping the work cheap*). Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
