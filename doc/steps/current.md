# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-14, tenth session (everything is committed).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. **Tracker:** [`../plans/backlog.md`](../plans/backlog.md). Passes 1, 2, 4, 4.5, 6 and items 25–38 built; pass 3 (lighting) set aside. Gravity still open (Part 1: 6 m/s², ours 20; the auto-parachute's braking follows it).
- **39, the jetpack with momentum, built this session** ([plan](../plans/features/jetpack-hover-and-flight.md), approved with the agent's recommendations; [`interaction.md`](../features/interaction.md#flying); decision log). As in Asteroids: slow she hovers (R2 sets her height, the stick drifts her up to 1.5 m/s), from 4 m/s she flies (thrust where the stick points, forward where the camera looks, top speed 20); R2 let go at speed she glides, then falls; jet off on the ground at speed she skids. Space and a digital R2 = R2 held fully. Replaces pass 6b's R2 rule and Part 1's flight rule. `character.ts`: `jet`, `letGo`, `coast`, `moveBy`; eleven new settings, three removed. Eight smoke checks; smoke all passed. **Done** (owner: "no issues").
  - Raised, no change asked: flight follows the camera's usual 8° downward pitch (a slow dive to 1 m; option: count it as level); taking off with R2 full she climbs about 2.5 m.
- **Items 32–38 are still the owner's to play** (the rack, the ladder delay, the auto-parachute, the keypad ramp, the shadow range). Item 35 narrows the owner's rule "the keypad ramp doesn't stop for her": flagged in [`interaction.md`](../features/interaction.md).
- **Next: pass 5** (see-through: items 11, 13, 14, 15): plan drafted, *Fifth pass* in [`../plans/features/see-through-rules.md`](../plans/features/see-through-rules.md), **waiting on the owner's review** (two open questions).
- **Tuning-panel switches that compare against decided things** (raised 2026-10-14, the owner's call): *collision boxes* and *indoors: moves the way the stick points* (both approved in item 30; the first's comment names a `colliders.ts` that's gone); *bulkheads cut as a whole* (probably moot with *bulkheads always visible*: for pass 5).
- `export:crew` not run since its collection name came back.

## Waiting on the owner

- **To look at:** 1.19 in Blender (the boxes in `Game Collision`, the renamed collections, `Jetpack.003`); then the copies `… (before collision boxes / jetpack rack / fourth jetpack, 2026-10-14).blend` can go.
- **The start screen, still open:** the font file is public with the game, so its licence has to allow web embedding. Not checked: a gamepad, Firefox, Safari, a phone (the button is 61 px wide upright).
- **Not said, so still open:** whether the ship noise's repeat is heard. Loops in Firefox and Safari: not tested.
- **Lighting:** reference images and the lights in the blend file. The export reads marker objects (`lightRoom`, `lightColor`, `lightEnergy`); the game ignores `lightEnergy` and has four on at once. Pass 4 asks for daylight in engineering from the ramp, a light for the open window. **Pass 3, still to judge:** *sun through glass*, *metal reflections* (0.5). **Camera distances:** 3.5 m indoors, 4.5 m outdoors are placeholders.

## Found, not fixed

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
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__boxes()` (`count`), `__audio` (`started`, `playing()`), `__boombox()`, `__rack()`, `__exhaust` (`shown`), `__start()` (`ready`, `begun`, `share`), `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`. **Sound in a check:** a key sent through DevTools (`Input.dispatchKeyEvent`, not Shift) turns it on. **The start screen in a check:** the probe and the smoke script press Q, wait for the button and press Enter (`useStartButton` in `browser.mjs`); `--stay` leaves the screen up and the file runs **before the button is there** (wait on `__start().ready`). The load takes about 18 s. **A gamepad in a check:** replace `navigator.getGamepads` with a made-up pad.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`; one thing: `npm run probe -- <file.js>` (20 s); the whole check, **once at the end**: `npm run smoke` (three and a half minutes). Then `npm run dev:01` (http://localhost:5201). New checks go in `app/tools/smoke-01.mjs`, tried out with the probe first. **Small fixes: no plan, no record script, no new check** (CLAUDE.md, *Keeping the work cheap*). Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
