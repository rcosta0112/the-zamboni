# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-15, fourteenth session. **On the branch `see-through-from-scratch`**, committed (not pushed).*

## Next session, in this order (owner)

0. **The camera indoors** (owner, 2026-10-15): it stays **inside the hull**, in front of the **bulkheads and their doors** (never cut while it does), and in the crew quarters of **two boxes** (bunks + galley; back wall) and the **couch, table and sitting-area walls** (that corner never cut on her deck). Settings `cameraInsideHull`, `cameraCollidesBulkheads`, `cameraCollidesFurniture`.
1. **The hole's far end** (item 41): owner chose **round, 0 m past her** (`holeEnd`, `holeBeyond`; square and vertical kept on the panel). Found with it (see-through-hull.md, last update): she's hidden behind engineering's contraption (never cut on her deck); the hole cuts the hull wall next to the camera and the outside shows (view 6). Still to do (owner): **the camera went inside a locker** (feet 3.612, 3.461, −13.92; yaw 6.304, pitch 0.008; camera 3.633, 4.469, −12.92) and **try the camera colliding with the ceiling**.
2. **Collision for medium and small objects** (item 42): a pass over the furniture and props that collide one by one, replacing detailed shapes with simple boxes where she catches or where several things stand together. Owner's example: **the jetpack rack and the fire extinguisher under it inside one box.** Today: big props (≥ 0.25 Blender units) collide as convex hulls, parts as their meshes, ten `Box … _col` boxes (`reach: "through"`, convex) stand in front of detailed shapes ([asset pipeline](../architecture/asset-pipeline.md), agent note at the top; [`add-collision-boxes.py`](../../app/tools/add-collision-boxes.py) is the record of how they were added). New since today: the six extinguisher clamps are parts, so they collide as meshes (845 triangles). Start by listing what collides and how (`collider` tags, hulls, boxes), propose the boxes, then a record script like `add-collision-boxes.py`; the export takes the boxes as they are.

## Where the see-through stands (item 41; [`see-through-hull.md`](../features/see-through-hull.md), agent notes at the top)

- `settings.seeThroughStage = 'hull only'` (`'all rules'` = main's rules, kept to take back from). **Everything is drawn**, cut by the hole while something hides her; the hull's parts draw a flat fill on their backs (`fillBackFaces`). The crew are hidden only while she's inside on the lower deck.
- **Never cut while she's on their deck** (`keepOnDeck`; ship.ts `ALWAYS_ON_DECK_ROOMS`, `ALWAYS_ON_DECK`, `CAMERA_BLOCKERS`): the cockpit and engineering (not what's on their bulkheads), the sled and pallet with what hangs on them, the crew quarters' table, lockers, bunks, galley and what's on them.
- **The camera indoors:** stops at the hull's shell (`hullWallAt`), the bulkheads and the crew quarters' boxes, couch and table (`furnitureAt`). Owner: the camera moving by itself should stay minimal.
- **Export (2026-10-15):** a prop hanging on a part is exported as its child (clamps and extinguishers, the cabinets' contents, the pallet's lantern); ship file edited by `hang-props.py`, saved.
- **Reproducing the owner's views:** the tuning panel's *Copy view* gives JSON (feet, yaw, pitch, camera, ramp, doors). This session's script set her position, `view.yaw` / `view.pitch`, `settings.cameraDistanceIndoors` = distance from the camera to her feet + `cameraHeight`, and the doors, waited 2.5 s, took a shot: it wasn't kept; rewrite it as `app/tools/owner-views.js` if it's needed again.
- **Checks:** `npm run see-through` after each change; the full `npm run smoke` **once, before merging the branch** (not run this session; the game files changed).

## Waiting on the owner

- The clipping fix of objects in the hull's wall (asked 2026-10-15): by hand, or a semi-automatic Blender script (Shrinkwrap on the offending vertices; `npm run probe -- tools/hull-clipping.js` lists them). The crew quarters need a modelling decision first (no inner skin there).
- **The start screen:** not checked with a gamepad (Chrome on desktop only for now: owner, 2026-10-15). **Lighting** for a later pass; camera distances placeholders.

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
