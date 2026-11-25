# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-11-25 (latest: **the planet map page, step 3b: contours and smoothing by zoom step**, the owner's values as defaults; committed and pushed with this handover). Tag `v0.0.1` on be0ffae.*
**Weekly budget (CLAUDE.md rule 7):** 50%; the hook reports it with every message (7.5% on 2026-11-25; the week resets Monday 09:30; calibration 1.86M per 1%). A pass's actual time: `node .claude/usage/agent-time.js ~/.claude/projects/c--Users-31658-Desktop-The-Zamboni .claude/usage/agent-time.json`.
## The versions
- **0.0.2 is current**: `app/prototypes/0.0.2/`, http://localhost:5202/, Vercel https://002-teal.vercel.app/; exports from `resources/models/The Zamboni 1.22.blend`. **0.0.1 frozen** (5201, `*:0.0.1`). `?scene=<id>` or the script's number (main.ts `SCENE_NUMBERS`); probes take `--query scene=…`. Dev pages: http://localhost:5202/tools.html.
## Next session: start here
- **Task: SC-195 pass 4, step 4 of the planet map page:** a probe (`tools/planet-map-probe.js`: the page loads with no game files, every zoom step, the centre's quadrant name matches the hex rule), with a cleaner way to run a tool page than `.export/map-init.js`'s stubs (e.g. a `--tool` flag). Steps 1–3b built, the owner tuning the look in the sidebar. [Plan](../plans/features/non-linear-travel/planet-map-page.md) (step 3b's note and updates). Pass order after: 5 navigation, 6 signal station, 7 steering ([flight test plan](../plans/features/non-linear-travel/flight-test-scene.md)).
- **Open, asked, no answer yet:** with heading up, north–south and east–west edge names share edges and look alike: keep (default), drop with heading up, or tell them apart. Offered: move *contour spacing (globe)* into the *Detail by zoom step* block (the globe's empty split slot). The owner may send more Look values as defaults (the browser keeps theirs; `DEFAULT_LOOK` only applies after *Reset look*).
- **Files:** `app/prototypes/0.0.2/src/planet/map-page.ts` (page, controls, overlay; `SHOT_END`, `ZOOM_STEPS`), `src/planet/map-overlay.ts` (grid, names (none on the whole globe), marks, ship, the 2 px border: `drawMapOverlay`, `gridSpacing`), `src/planet/map.ts` (material; `project(ns, ew)` → screen 0..1 or null, `travel()` great-circle step, `quadrantName`, `MapView.roll`), `planet-map.html`. Code map: the `planet/` row. No need to open planet.ts or shot.ts.
- **Known values:** 0050's region N–S 74.0°, E–W 199.5° (`04A-0C7`; in `world.md`). Heading up = `view.roll = ship.heading`. **Contours:** spacing per zoom step, nested (`contourSpacingAt`: globe 0.1, `contourSplit` 1/1/3/1 → 0.1 to 16°, 0.033 at 4°/2°), main and minor lines, darker by depth (`fadeDepth` 0.18, `deepest` 0.05; only deep interiors darken, by height: the line-count alternative was offered, not chosen). **Smoothing:** map-only octaves left out per step (1/1/1.2/1.5/1.5), not the preset's lacunarity (would reshape 0050's planet). Old saved looks are migrated in `loadLook`. Meridian 111.4°. `QuadMesh`'s uv runs top-down (`uvDown`).
- **Checking:** `node tools/probe-01.mjs .export/map-zoom.js --page planet-map.html --stay --init .export/map-init.js --shots .export/planet-map/<dir>` (every zoom step; `.export/map-detail.js` with the sidebar scrolled down). `__planetMap.lookChanged()` applies edits to `look`.
- **Start state:** all committed and pushed. Page: http://localhost:5202/planet-map.html.
## Other threads
- **Landing and take-off shots** ([plan](../plans/features/landing-takeoff-shots.md)): pass 1 committed; pass 2 on the owner's go; pass 3 needs the take-off's motion (SC-187).
- **Non-linear game, discussion:** [summary](../plans/features/non-linear-travel/non-linear-travel-summary.md); owner questions SC-191–193. **The player flies the ship** (open world in chunks, Adam the backup pilot, signals → waypoints, the handover problem answered): [summary](../plans/features/non-linear-travel/player-flight-summary.md), SC-197.
- **Flames and the flame editor: parked** (SC-189, SC-190).
- **To try (owner):** viewport closed in chapter 1 (SC-186), flyby / 0500 scene (SC-185), coffee (SC-184), pond water (SC-181, http://localhost:5202/water-test.html).
- **Optimisation, SC-180 ([plan](../plans/features/optimization.md)):** steps 1–4 done; ask the owner which step is next.
- **The `.blend`:** if the `Scanner Array` rename wasn't redone, the file says `Contraption`: compare at the next export.
- **Gadgets:** binoculars pass 3 on the owner's go; scanner synth (SC-178). **Landing (0600):** SC-174. **Dialogue:** SC-169, SC-170. **Flying scene:** SC-5, waits on SC-15.
- **Owner's tasks:** [`doc/tasks.md`](../tasks.md); **new tasks continue from SC-198**. `doc/steps/handover-flight-test.md` ready to delete (owner's yes).
## Where things stand (see-through: [`see-through-hull.md`](../features/see-through-hull.md))
- `seeThroughStage = 'hull only'`, the hole ending in a hemisphere at her chest; never cut on her deck (`keepOnDeck`); bulkheads never cut while the camera collides with them. **The player must never lose track of her.**
- Camera indoors stops at the shell, bulkheads, `CAMERA_BOXES` and the sitting area; it should move by itself as little as possible.
- Picking things up: curated events only (decision log), like the mug.
## Known traps
- **gltf-transform's `prune`:** limit it (`propertyTypes`, `keepAttributes: true`), or it drops the lights' nodes and unlit meshes' normals.
- **Before any export:** *Before the next export* in [`asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export); use `npm run export:ship|crew|player`; every script in [`tools/README.md`](../../app/prototypes/0.0.2/tools/README.md).
- **Saving the owner's `.blend`:** allowed, but say so first; check Blender isn't running (`Get-Process blender`, `MainWindowTitle`), copy it first, open with its UI.
- **Exports** switch collections per `export-collections.json`; the ship takes `ship-export-list.json` (read its `NOTE:` lines); a `SCALE:` line stops it; a `reach: "through"` box must be convex.
- **Collision corners:** Rapier stops her on a vertical convex edge, and overlapping shapes count apart: smooth corners inside one convex shape.
- **Doors** are exported at rest (`rest-poses.json`; `npm run rest-poses -- --accept "<name>"`). Her jetpack is found by the exact name `Jetpack`. `resources/` can't be read with the file tools. Blender 5.2: `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`.
- **The ship is turned half a turn:** Blender (x, y, z) = `ship.object.localToWorld(x, z, -y)`.
- **In checks:** face her before setting off; flying needs `settings.wearingJetpack`; `npm run probe` drops `--shot` (use `node tools/probe-01.mjs`); wait on values, not times (the single-sided switch stalls frames); a first frame's `dt` can be negative.
- **Node checks with `--experimental-strip-types`** can only import modules whose runtime imports carry `.ts` (flyby.ts imports types only): plain maths the checks run goes in `flyby.ts`.
- **Long checks' output to a file** (`npm run smoke > .export/smoke.txt`), never through `tail`. Don't edit `src/` while smoke runs (Vite reloads; the run dies).
- **Bash tool:** quote heredoc delimiters; Python writes with `newline="\n"`.
- **Nothing deleted and rewritten whole in a folder Vite watches** (`.export/`, `dist/` ignored in `vite.config.ts`).
- **Dev server:** one may already run on 5202 (the smoke uses it; `npm run dev` then fails, port taken). A background task's time limit kills only its npm wrapper, not Vite. Restart: `taskkill //PID <pid> //F`, then start detached (PowerShell `Start-Process cmd.exe '/c','npm run dev > prototypes\0.0.2\.export\dev.txt 2>&1'` in `app/`). Over wifi: `npm run dev -w prototypes/0.0.2 -- --host`.
- **Dev hooks** (`window`): `__director()`, `__cutscene()` (`play`, `load`, `skip`, `track.shot`, `track.buckets`), `__save` (`read`, `clear`, `recentShots`), `__story()`, `__start()`, `__character`, `__ship()`, `__entity(id)`, `__interaction()`, `__audio`, `__flames()`, `__treadmill()` and more (main.ts).
- **No gamepad in the test browser** (fake `navigator.getGamepads`); probes press Q then the start button; a fresh profile loads in ~16 s.
## How to verify
In `app/`: `npm run check` (with `tools/check-ids.mjs`: knows shot-built ids), `npm run build`; one thing: `npm run probe -- <file.js>`; the whole check once at the end: `npm run smoke`. **Smoke not run since the gear/tilt sounds (main.ts, doors.ts, cues.json; the planet map's steps 1–3b touch only its dev page); last run 2026-11-24 (after pass 3b): 82 passed, 5 failed, the known ones** (walking under the hull, `Turbine.001`, `.002`; the single-sided switch's 5 double-sided materials; the boombox, SC-51), no console errors. Small fixes: no plan, no record script, no new check. Code map: [`CODE-MAP.md`](../../app/prototypes/0.0.2/CODE-MAP.md).
