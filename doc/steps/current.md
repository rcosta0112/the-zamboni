# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-14, twelfth session. **On the branch `see-through-from-scratch`** (not committed).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. **Tracker:** [`../plans/backlog.md`](../plans/backlog.md). Passes 1, 2, 4, 4.5, 6 and items 25–40 built; items 32–40 **Done** (owner, 2026-10-14).
- **Settled by the owner, 2026-10-14:** gravity stays at 20; the tuning-panel switches stay as they are; the jetpack's dive with the camera pitch and its 2.5 m climb are fine; lighting (pass 3) is ok for now, another pass later; the blend file 1.19 is fine (the owner deals with the backup copies); no licensing questions until production.
- **Now: see-through from scratch** (owner; branch `see-through-from-scratch`; decision log). Pass 5's plan is on hold: the rules are rebuilt one at a time instead. **Stage 1 built:** only the shell is drawn (ship.ts `SHELL`: hull, windshield, side door, roof hatch, ramp, engineering window, turbines), cut by the hole; everything inside hidden on both decks (shader `cutSolid = -1`), the crew and the inside's shadows too (shadow caster split). Panel: the rules' settings left out. `settings.seeThroughStage = 'all rules'` gives main's version. Probed (both decks, screenshots), smoke all passed. **The owner's to play; then the next rule, the owner's pick.** Items 11, 13, 14, 15 come back as rules here.
  - **Then (owner): the hull's inner parts and floors back** (structure that isn't a divider, `lining`: floors, crew quarters' ceiling, ceiling lights, both hatches), cut like the shell. Probed both decks. **Then (owner): the cockpit floor** (`Dashboard Body`'s `Floor Tiles` and `Grate` meshes, split off at load) **and the crew quarters' inner walls** (`CREW_QUARTERS_WALLS`). Probed (crew quarters, cockpit). Prompts still appear on hidden keypads.
  - **Then (owner): the hull's gap filled** (`fillBackFaces`: an unlit back-face mesh on `Hull_Merged` in one flat *hull gap colour*; not on glass). The owner's to look at. **Open, the owner's call:** the camera can sit inside the wall's thickness indoors (it doesn't collide there): A pull it into the cabin (recommended), B push it outside, C a near-camera cut. Window frames (black in the file) show black where the cut crosses them.
  - **Checking during this pass (owner, 2026-10-14): `npm run see-through`** (30 s; 12 screenshots in `app/.export/see-through/`) after each change; **the full smoke only once, before merging the branch.** Its last run here: **18 failed**, all in movement, ladder, interaction and sound, with "◯" prompts and snow steps mid-check: most likely a real controller in use, not the change (rendering only; passed after stage 1). Rerun with no controller in use.
- `export:crew` not run since its collection name came back.

## Waiting on the owner

- **The start screen:** not checked with a gamepad, Firefox, Safari, a phone (the button is 61 px wide upright).
- **Not said, so still open:** whether the ship noise's repeat is heard. Loops in Firefox and Safari: not tested.
- **Lighting, for a later pass:** the export reads marker objects (`lightRoom`, `lightColor`, `lightEnergy`); the game ignores `lightEnergy` and has four on at once. **Camera distances:** 3.5 m indoors, 4.5 m outdoors are placeholders.

## Found, not fixed

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
