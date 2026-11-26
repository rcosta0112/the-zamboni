# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-11-26 (1.23 imported: the new pilot console exported and taken into the game; `controls.ts` repointed at it; `main.ts`'s joystick hand fixed to `Hand_r`. Found blocking: 1.23's `Dr. Green - Piloting` action is down to one keyframe — SC-199, waiting on the owner. Also found: a new, unexplained smoke failure, the jetpack's sound not stopping on landing — SC-200). Committed, tag `v0.0.1` on be0ffae.*
**Weekly budget (CLAUDE.md rule 7):** 50%; the hook reports it with every message (12.4% on 2026-11-26; the week resets Monday 09:30; calibration ≈1.86M per 1%).
## The versions
- **0.0.2 is current**: `app/prototypes/0.0.2/`, http://localhost:5202/, Vercel https://002-teal.vercel.app/; exports from `resources/models/The Zamboni 1.23.blend` (default bumped in `export.mjs` this session). **0.0.1 frozen** (5201, `*:0.0.1`). `?scene=<id>` or the script's number (main.ts `SCENE_NUMBERS`); probes take `--query scene=…`. Dev pages: http://localhost:5202/tools.html.
## Next session: start here
- **SC-199, waiting on the owner:** 1.23's `Dr. Green - Piloting` action has only one keyframe per bone curve (`frame_range [1, 1]`) — a static pose, not the loop the joystick and `piloting-probe.js` need. Likely broken by whatever flipped it horizontally. Don't try to fix it in the `.blend` without the owner's say-so (rule 1). Once they confirm it's fixed: `npm run export:player`, `export:accept -- player`, then `node tools/probe-01.mjs tools/piloting-probe.js --game --query scene=opening --shots <folder>` (last run: still FAILs on the joystick not moving, cascading into the watched-conversation checks — re-check those too once the loop is back).
- **Doesn't wait on the owner:** pass 4's step 4 (a `tools/planet-map-probe.js`, a `--tool` flag for tool pages) is still owed ([plan](../plans/features/non-linear-travel/planet-map-page.md)). SC-200 (the jetpack sound regression) hasn't been looked into.
- **Waiting on the owner:** the deferred story-gates pass (Green's refusals, the visited-waypoint rule — [flight-test-scene.md](../plans/features/non-linear-travel/flight-test-scene.md) pass 5) needs a go-ahead; a UX question asked in chat, unanswered — loosen the signal dials' tuning tolerance or round their steps, so any of the three test targets is reachable by stepping alone (currently ±0.04, tight for a D-pad).
- **Built this session, committed:** the new pilot console (1.23: `Dashboard` collection, 14 tagged parts) imported — `export-collections.json` (`Dashboard` on, `Dashboard - Archive` off), `ship-export-list.json` (stale archived `Dashboard`/`Dashboard Keypad` entries dropped, the new parts added), `export.mjs`'s default blend bumped to 1.23, `flight-test/controls.ts`'s `CONTROL_SOURCES.pilot` repointed at the new console's node names (the old `Dashboard` node is archived, gone from the export). Ship and player exports taken; after-export checks pass both times. Still pending in the file (left alone, per the owner): Signal Station's 4 buttons, the engine/lights/cargo-ramp buttons and panels, `Dashboard Keypad.002/.003`.
- **Start state:** http://localhost:5202/flight-test.html (Tab/Shift+Tab to a station) shows the new console. **Reload** (re-exported `.glb`s, changed `.ts`).
## Other threads
- **Landing and take-off shots** ([plan](../plans/features/landing-takeoff-shots.md)): pass 1 committed; pass 2 on the owner's go; pass 3 needs the take-off's motion (SC-187).
- **Non-linear game, discussion:** [summary](../plans/features/non-linear-travel/non-linear-travel-summary.md); owner questions SC-191–193. **The player flies the ship**: [summary](../plans/features/non-linear-travel/player-flight-summary.md), SC-197.
- **Flames and the flame editor: parked** (SC-189, SC-190).
- **To try (owner):** viewport closed in chapter 1 (SC-186), flyby / 0500 scene (SC-185), coffee (SC-184), pond water (SC-181, http://localhost:5202/water-test.html).
- **Optimisation, SC-180 ([plan](../plans/features/optimization.md)):** steps 1–4 done; ask the owner which step is next.
- **Gadgets:** binoculars pass 3 on the owner's go; scanner synth (SC-178). **Landing (0600):** SC-174. **Dialogue:** SC-169, SC-170. **Flying scene:** SC-5, waits on SC-15.
- **Owner's tasks:** [`doc/tasks.md`](../tasks.md); **new tasks continue from SC-200**.
## Where things stand (see-through: [`see-through-hull.md`](../features/see-through-hull.md))
- `seeThroughStage = 'hull only'`, the hole ending in a hemisphere at her chest; never cut on her deck (`keepOnDeck`); bulkheads never cut while the camera collides with them. **The player must never lose track of her.**
- Camera indoors stops at the shell, bulkheads, `CAMERA_BOXES` and the sitting area; it should move by itself as little as possible.
- Picking things up: curated events only (decision log), like the mug.
## Known traps
- **gltf-transform's `prune`:** limit it (`propertyTypes`, `keepAttributes: true`), or it drops the lights' nodes and unlit meshes' normals.
- **Before any export:** *Before the next export* in [`asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export); use `npm run export:ship|crew|player`; every script in [`tools/README.md`](../../app/prototypes/0.0.2/tools/README.md).
- **Saving the owner's `.blend`:** allowed, but say so first; check Blender isn't running (`Get-Process blender`, `MainWindowTitle`), copy it first, open with its UI.
- **Exports** switch collections per `export-collections.json`; the ship takes `ship-export-list.json` (read its `NOTE:` lines); a `SCALE:` line stops it; a `reach: "through"` box must be convex. **`resources/` can't be read with the file tools**, but a Blender `-b --python` run against a file under it works fine (used this session to diff 1.22 vs 1.23: collections, objects, actions, tags — no scratch script kept, delete-after-use).
- **Collision corners:** Rapier stops her on a vertical convex edge, and overlapping shapes count apart: smooth corners inside one convex shape.
- **Doors** are exported at rest (`rest-poses.json`). Her jetpack is found by the exact name `Jetpack`. Blender 5.2: `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`.
- **The ship is turned half a turn:** Blender (x, y, z) = `ship.object.localToWorld(x, z, -y)`.
- **Blender 5.2's layered actions:** `action.fcurves` doesn't exist any more; walk `action.layers[].strips[].channelbags[].fcurves`.
- **In checks:** face her before setting off; flying needs `settings.wearingJetpack`; `npm run probe` drops `--shot` (use `node tools/probe-01.mjs`); wait on values, not times.
- **Long checks' output to a file**, never through `tail`. Don't edit `src/` while smoke runs (Vite reloads; the run dies).
- **Dev server:** one may already run on 5202 (the smoke uses it; `npm run dev` then fails, port taken). Restart: `taskkill //PID <pid> //F`, then start detached.
- **Dev hooks** (`window`): `__director()`, `__cutscene()`, `__save`, `__story()`, `__start()`, `__character`, `__ship()`, `__entity(id)`, `__interaction()`, `__audio`, `__flames()`, `__treadmill()`, `__signals()`, `__announce()` and more (main.ts).
- **No gamepad in the test browser** (fake `navigator.getGamepads`); probes press Q then the start button.
## How to verify
In `app/`: `npm run check` (clean, both after the console import and the `HAND` fix); `npm run build`; one thing: `npm run probe -- <file.js>`; the whole check once at the end: `npm run smoke`. **Last full smoke run 2026-11-25: 81 passed, 6 failed** — the 5 known ones (walking under the hull, `Turbine.001`/`.002`, the single-sided switch's 5 double-sided materials, the boombox) **plus 1 new (SC-200, the jetpack sound)**; no console errors. Code map: [`CODE-MAP.md`](../../app/prototypes/0.0.2/CODE-MAP.md).
