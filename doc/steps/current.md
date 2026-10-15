# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-15, thirteenth session. **On the branch `see-through-from-scratch`** (pushed); stage 1 committed; stage 2 (below) **not committed**: ask the owner.*

## Now: see-through from scratch (backlog item 41)

- **Why:** the owner put pass 5's plan on hold and rebuilds the see-through rules one at a time, from the hull alone ([decision log](../decision-log.md), 2026-10-14 and its updates; what exists: [`see-through-hull.md`](../features/see-through-hull.md), agent notes at the top).
- **Stage 1, closed 2026-10-15** (owner: "good enough for now"). `settings.seeThroughStage = 'hull only'` (`'all rules'` = main's version, kept in the code to take rules back from):
  - **Drawn:** the shell (ship.ts `SHELL`), the hull's inner parts (`lining`: structure that isn't a divider), the cockpit floor (split off `Dashboard Body` at load), the crew quarters' walls. Cut by the hole. **Hidden:** everything else (shader `cutSolid = -1`), the crew, their shadows (shadow caster split).
  - **The gap between the hull's skins:** every drawn hull part draws front faces only, plus a back-face mesh in one flat unlit colour (`fillBackFaces`; *hull gap colour*, switch *hull gap black*).
  - **The camera kept out of the hull's wall** indoors (`hullWallAt`, switch *camera out of the hull wall*). **Owner: the camera moving by itself is "not great": minimise it in future work.** It misfires in the crew quarters (single skin there: see below).
  - Tuning panel: the old rules' settings left out; **Copy view** button (her position, camera, ramp, doors) to reproduce the owner's screenshots (example: `app/tools/views/owner-2026-10-14.json`).
- **Stage 2, built 2026-10-15:** every object drawn again, cut by the hole like the hull; the crew hidden only while she's inside on the lower deck. **Never cut on her deck** (`keepOnDeck`; ship.ts `ALWAYS_ON_DECK_ROOMS`, `ALWAYS_ON_DECK`, `CAMERA_BLOCKERS`): the cockpit and engineering (not what's on their bulkheads), the sled and pallet with what hangs on them, the table, the lockers, bunks, galley and what's on them. **The camera stays in front of the lockers, bunks, galley** (`furnitureAt`; owner: it works). Ship file: `hang-props.py` saved (clamps as parts, cabinet contents parented); export: props hanging on a part become its children. Owner's views: `app/tools/views/owner-2026-10-15.json`.
- **Next (owner): the hole's flat far end** (`t < 0.98` in cutaway.ts): slanted cuts on bulkheads, lockers, the hull round the engineering window (views 2, 4, 5, 6, 9). Recommended: a vertical end through her; or brought-back objects cut only while they hide her.
- **Checks during this work (owner):** `npm run see-through` (30 s, 12 screenshots in `app/.export/see-through/`) after each change; the full `npm run smoke` **once, before merging the branch**: its last run had 18 failures from a real controller in use mid-run (rerun with none).

## Answer owed / given to the owner

- **Clipping into the hull's wall: how much could be automated?** (given 2026-10-15) Detection is done: `npm run probe -- tools/hull-clipping.js` lists 56 of 153 objects; about 25 outside the crew quarters, mostly a few vertices (floors' edges, benches, bulkheads, jetpack rack, dashboard, doors). A **semi-automatic fix** is feasible in about half a day: a Blender script puts each offending vertex in a vertex group and adds a Shrinkwrap modifier that pulls it back onto the hull's inner surface; the owner reviews and applies. Good for shallow overlaps, not for objects deep in the wall. **Not automatable: the crew quarters**, where the hull has no inner skin (the walls and bunks are the room's surface): a modelling decision first (an inner skin there, or the walls treated as the lining). The owner chooses: by hand, or the script.

## Waiting on the owner

- How to proceed with the clipping fix (above); whether to commit stage 2.
- **The start screen:** not checked with a gamepad, Firefox, Safari, a phone. **The ship noise's repeat**, loops in Firefox and Safari: not said / not tested.
- **Lighting, for a later pass;** camera distances 3.5 m / 4.5 m are placeholders.

## Found, not fixed

- **Window frames** (black in the file) show as strips where the hole half-cuts them (their front faces; their cut edge is filled). Options given: leave frames out of the cut, or let *hull gap black* blend them. A **cargo hold artifact** (a lit face in the wall by the side door) couldn't be reproduced: the owner reports it if seen again.
- **Engineering seen from above is slow in the test browser:** about 110 ms a frame (other rooms 16.7), the same with the see-through off and with main's rules: not this branch. Not looked into (headless Chrome; may not happen on a real GPU).
- **Smoke, once in two runs (2026-10-14):** *the ramp closes from its keypad* failed (it didn't move in 4 s) and E then took a jetpack from the rack instead. Likely: she ends the walk-in at y 0.88, on the ramp's walkway, and since item 35 the ramp waits until she's off. Passed on the rerun.
- **Dropping through the trapdoor's opening while pushing toward the ladder**, she lands where the ladder stands (it doesn't collide until she's clear of it) and overlaps it until she steps away. **Closed doors with colliders of their own** (the cargo hold's lockers) will stop her as the galley's did, wherever she slides along their wall: only the crew quarters have boxes.
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections. Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.
- The ship's triangle count fell by 74 when the panels and lever went from props to parts: not looked into (they look right in the game).

## Known traps

- **Exporting:** `npm run export:ship` / `export:crew` / `export:player` (in `app/`): Blender, resize, dedup, Meshopt and the comparison in one go, with a short summary; raw files and Blender's log in `app/.export/` (not in git). Every script: [`app/tools/README.md`](../../app/tools/README.md).
- **Saving the owner's `.blend` is allowed** (owner, 2026-10-13), but **say so first, every time**: the owner may have it open. Check Blender isn't running (`tasklist`), save a copy next to the file, then save; open it with its UI (`open_mainfile` without `load_ui=False`) or the owner's layout is lost. For bigger changes a script the owner runs is also fine.
- **The `Game` collection is excluded in 1.19**; the export includes it for itself. If "lights: 0, collision pieces: 0" shows in the export's last line, that broke. **A box tagged `reach: "through"` must be convex** (the game takes its hull).
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools**, nor named in a shell command. Blender scripts read it; a node script run from the project root reaches it through `process.cwd()`; scripts go in the scratchpad. **ffmpeg** and **Python 3.11** are on the PATH. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **The ship is turned half a turn in the world** and scaled 1.486: Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`; the other way, `worldToLocal`, then (x, -z, y).
- **In checks:** she turns in an arc when she sets off (face her first, or she misses a doorway); teleported into a closed door she's stuck; several spots 2.5 m into engineering and the cockpit are inside furniture. **Flying needs `settings.wearingJetpack`.** `npm run probe` drops `--shot`: run `node tools/probe-01.mjs` for screenshots.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time. **A frame's `dt` can be below zero** on the first frame: clamp it where a fade depends on it.
- **Screenshots from a script:** wait 2 s after moving her before capturing. The indoor camera is 3.5 m behind her: in a small room it's behind the bulkhead (set `cameraDistanceIndoors` lower for the shot).
- **In the Bash tool, heredocs with apostrophes fail:** write the script to the scratchpad with the Write tool, then run it.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it, and `npm run dev:01` then fails (port taken). **After `vite.config.ts` or a dependency changes it restarts by itself**; if the page is blank, restart it by hand.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__boxes()` (`count`), `__audio` (`started`, `playing()`), `__boombox()`, `__rack()`, `__exhaust` (`shown`), `__wind` (`level`), `__start()` (`ready`, `begun`, `share`), `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`. **Sound in a check:** a key sent through DevTools (`Input.dispatchKeyEvent`, not Shift) turns it on. **The start screen in a check:** the probe and the smoke script press Q, wait for the button and press Enter (`useStartButton` in `browser.mjs`); `--stay` leaves the screen up and the file runs **before the button is there** (wait on `__start().ready`). The load takes about 18 s. **A gamepad in a check:** replace `navigator.getGamepads` with a made-up pad.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`; one thing: `npm run probe -- <file.js>` (20 s); the whole check, **once at the end**: `npm run smoke` (three and a half minutes). Then `npm run dev:01` (http://localhost:5201). New checks go in `app/tools/smoke-01.mjs`, tried out with the probe first. **Small fixes: no plan, no record script, no new check** (CLAUDE.md, *Keeping the work cheap*). Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
