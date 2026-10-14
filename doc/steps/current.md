# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-14, sixth session (everything is committed).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01. **Tracker:** [`../plans/backlog.md`](../plans/backlog.md).
- **Passes 1, 2, 4 and 4.5, items 25, 26, 28–31 are built, played and approved** (30 and 31: "all good", 2026-10-14). **Pass 3 (lighting) is set aside** (owner, 2026-10-13); direction in the [decision log](../decision-log.md), 2026-10-12 update: the owner places the lights in the blend file.
- **Done in the fifth session (2026-10-14, committed), owner's go-ahead for each:**
  - **The collision boxes are in the ship file:** ten `Box … _col` objects in `Game Collision`, tagged `reach: "through"` (they stop her; the reach test passes through them). [`add-collision-boxes.py`](../../app/tools/add-collision-boxes.py) is the record. The export writes each as its own object in the collider file; `addCollisionBoxes` in `ship.ts` makes each a convex collider. `colliders.ts` is gone. In [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md) (naming contract, *Export*).
  - **The start button, approved ("perfect"), is the template for every game UI button** ([decision log](../decision-log.md), [`../design/README.md`](../design/README.md#components)): pressed as in the mockup's *Start Button* (node 21-2), whole pixels, the base's top and sides go only once the body has landed (no flash).
  - **The highlight is removed** (slider, setting, shader code, `setHighlight`, its smoke check).
  - **The three old copies of 1.19 are deleted**; the new one, `… (before collision boxes, 2026-10-14).blend`, is next to the file.
- **Pass 6 and 6b, the jetpack (21), built this session** before pass 5 (owner's call). Keyboard: hold Space, **Part 1's exact rule and values** (its `PlayerMovement.cs`, `Main.unity`, at `C:\Users\31658\Projects\Big Moon Tiny Moon\`), with the camera allowed below her and a lift-off near the ground. Gamepad: **R2, analog found by itself**: half-way hovers, above climbs, below descends; a digital R2 flies like Space (`input.ts` `flyTrigger`, `character.ts` `fly()` / `flyByTrigger()`, *analog R2* in the tuning panel). C / Cross jumps. Part 1's jet sound (`sfx_jetpack_loop`, follows R2) and *Flying* clip (`model.ts`). Seven smoke checks; the whole smoke passes. **The owner's to play with the real controller.** Open: Part 1's gravity was 6 m/s², ours 20 (notes: [`../plans/backlog-passes.md`](../plans/backlog-passes.md), pass 6 and 6b).
- **Then pass 5** (see-through: items 11, 13, 14, 15). **Its plan is drafted** (2026-10-14): *Fifth pass* in [`../plans/features/see-through-rules.md`](../plans/features/see-through-rules.md), **waiting on the owner's review** (two open questions; item 11 reverses the second pass's "cargo lockers cut"). It also settles the closed bulkhead door hiding her (rule 5).

## Waiting on the owner

- **To look at:** 1.19 in Blender with the ten boxes in `Game Collision`; then the copy `… (before collision boxes, 2026-10-14).blend` can go.
- **The start screen, still open:** the font file is public with the game, so its licence has to allow web embedding. Not checked: a gamepad, Firefox, Safari, a phone (the button is 61 px wide upright).
- **Not said, so still open:** whether the ship noise's repeat is heard. Loops in Firefox and Safari: not tested.
- **Lighting:** reference images and the lights in the blend file. The export reads marker objects (`lightRoom`, `lightColor`, `lightEnergy`); the game ignores `lightEnergy` and has four on at once. Pass 4 asks for daylight in engineering from the ramp, a light for the open window. **Pass 3, still to judge:** *sun through glass*, *metal reflections* (0.5). **Camera distances:** 3.5 m indoors, 4.5 m outdoors are placeholders.

## Found, not fixed

- **Dropping through the trapdoor's opening while pushing toward the ladder**, she lands where the ladder stands (it doesn't collide until she's clear of it) and overlaps it until she steps away. **Closed doors with colliders of their own** (the cargo hold's lockers) will stop her as the galley's did, wherever she slides along their wall: only the crew quarters have boxes.
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections. Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.
- The ship's triangle count fell by 74 when the panels and lever went from props to parts: not looked into (they look right in the game).

## Known traps

- **Exporting:** `npm run export:ship` / `export:crew` (in `app/`): Blender, resize, dedup, Meshopt and the comparison in one go, with a short summary; raw files and Blender's log in `app/.export/` (not in git). Every script: [`app/tools/README.md`](../../app/tools/README.md).
- **Saving the owner's `.blend` is allowed** (owner, 2026-10-13), but **say so first, every time**: the owner may have it open. Check Blender isn't running (`tasklist`), save a copy next to the file, then save. For bigger changes a script the owner runs is also fine.
- **The `Game` collection is excluded in 1.19**; the export includes it for itself. If "lights: 0, collision pieces: 0" shows in the export's last line, that broke. **A box tagged `reach: "through"` must be convex** (the game takes its hull).
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools**, nor named in a shell command. Blender scripts read it; a node script run from the project root reaches it through `process.cwd()`; scripts go in the scratchpad. **ffmpeg** and **Python 3.11** are on the PATH. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **The ship is turned half a turn in the world** and scaled 1.486: Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`; the other way, `worldToLocal`, then (x, -z, y).
- **In checks:** she turns in an arc when she sets off (face her first, or she misses a doorway); teleported into a closed door she's stuck; several spots 2.5 m into engineering and the cockpit are inside furniture.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time. **A frame's `dt` can be below zero** on the first frame: clamp it where a fade depends on it.
- **Screenshots from a script:** wait 2 s after moving her before capturing. The indoor camera is 3.5 m behind her: in a small room it's behind the bulkhead (set `cameraDistanceIndoors` lower for the shot).
- **In the Bash tool, heredocs with apostrophes fail:** write the script to the scratchpad with the Write tool, then run it.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it, and `npm run dev:01` then fails (port taken). **After `vite.config.ts` or a dependency changes it restarts by itself**; if the page is blank, restart it by hand.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__boxes()` (`count`), `__audio` (`started`, `playing()`), `__boombox()`, `__start()` (`ready`, `begun`, `share`), `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`. **Sound in a check:** a key sent through DevTools (`Input.dispatchKeyEvent`, not Shift) turns it on. **The start screen in a check:** the probe and the smoke script press Q, wait for the button and press Enter (`useStartButton` in `browser.mjs`); `--stay` leaves the screen up and the file runs **before the button is there** (wait on `__start().ready`). The load takes about 18 s. **A gamepad in a check:** replace `navigator.getGamepads` with a made-up pad.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`; one thing: `npm run probe -- <file.js>` (20 s); the whole check, **once at the end**: `npm run smoke` (three and a half minutes). Then `npm run dev:01` (http://localhost:5201). New checks go in `app/tools/smoke-01.mjs`, tried out with the probe first. **Small fixes: no plan, no record script, no new check** (CLAUDE.md, *Keeping the work cheap*). Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
