# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-13 (passes 4 and 4.5 committed; **not committed:** the displays' materials: the bake in the export scripts, the polaroid, the re-exported ship and crew files, the one-command export and the probe (`app/tools/README.md`), the *Keeping the work cheap* rules in CLAUDE.md, the docs).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01. **Tracker:** [`../plans/backlog.md`](../plans/backlog.md).
- **Passes 1 and 2 are done**; **pass 3 (lighting) is built and committed**, then opened again by the owner and **set aside** (owner, 2026-10-13: "ignore any of the lighting stuff for now"). The direction is in the [decision log](../decision-log.md), 2026-10-12 update: the same world light indoors and outdoors, more light sources, **the owner places the lights in the blend file**.
- **Pass 4 (bulkhead doors, panels, the engineering window and its lever: items 6, 7, 8) is built.** Plan, with the owner's answers: [`../plans/features/bulkhead-doors.md`](../plans/features/bulkhead-doors.md). What exists: [`../features/interaction.md`](../features/interaction.md#sliding-doors). `check`, `build` pass; `npm run smoke`: all checks pass. Re-exported from 1.19 as saved.
- **Pass 4.5 (audio from the UE prototype, item 24) is built** and committed. Plan, with what differs from it in its *As built*: [`../plans/features/audio-from-ue.md`](../plans/features/audio-from-ue.md). What exists: [`../architecture/audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13), [`../features/interaction.md`](../features/interaction.md#the-boombox). `check`, `build` pass; `npm run smoke`: all checks pass (11 new ones for sound). **The agent heard nothing**: every check is about what plays and when. **Licensing: don't raise it** until a production-ready build (owner); the list for then is `app/assets/test/audio/SOURCES.md`. **In short:** `audio.ts` + `cues.json` (cues, buses, streamed music, loops by crossfade), `boombox.ts` (ring: 1 → 2 → 3 → 4 → off), the door sound from `doors.ts`, a *Sound* folder in the tuning panel with *ship flying*. Game files: `app/assets/test/audio/` (9.2 MB), made by `node tools/encode-audio.mjs`.
- **The displays' materials (item 25) are built**, not committed. The glTF exporter wrote an image untouched when nodes sat between it and the Principled BSDF (the map table: white paper). Now `app/tools/bake_materials.py`, used by both export scripts, bakes those inputs to images in memory and prints `NODES:` lines ([decision log](../decision-log.md), 2026-10-13; [pipeline checklist](../architecture/asset-pipeline.md#before-the-next-export); plan with *As built*: [`../plans/features/display-materials.md`](../plans/features/display-materials.md)). Ship and crew re-exported from 1.19: same objects and triangles, collider identical, 3.3 → 3.7 MB. `check`, `build`, `smoke` pass (52 checks). Seen in close-up screenshots: the map table (as in Blender), keyboards, the VS Code screen, Dr. Kaufman's stripes. The owner looked: all fine but the scanner's ray, solid: the see-through shader's colour node dropped the colour texture's alpha (fixed in `cutaway.ts`, `makeCuttable`; the vents' slits are open now too).
- **`Polaroid` is a child of `Locker Door.003`** in 1.19 (owner, 2026-10-13; saved by the agent with the go-ahead, [`app/tools/parent-polaroid.py`](../../app/tools/parent-polaroid.py) is the record) and the ship is re-exported: it swings with the door, as `Gojira poster` does (both checked in `smoke`). Not committed.
- **Start here:** the owner plays passes 4 and 4.5 (lists below); fix what comes back. **Then pass 5** (see-through, fifth pass: items 11, 13, 14, 15), which **needs its own plan first**: a *fifth pass* section in [`../plans/features/see-through-rules.md`](../plans/features/see-through-rules.md).

## Waiting on the owner

- **Pass 4.5, to listen to** (tuning panel → *Sound*):
  - The door sound at both bulkhead doors and the window: the right file, its level. *Ship flying*: the mix of its two sounds (a level each), its level outside the ship, and **whether the repeat is heard** (each file fades into its own start over 2 s; 7:05 and 1:34 long).
  - The boombox: *Play*, *Next track* ×3, *Turn off*; the cassette sound before each track; the shake; **the falloff** (a straight line, full within 1.5 m, silent at 12 m, **measured from the camera**, 3.5 m behind her: never full. Move the listener to her?). **The order of the four tracks** is the inventory table's, not confirmed as UE's. **Does a gamepad alone start the sound?** (A key or a click does; Shift alone didn't in the check.) If not: a *press any key* moment or a start screen. The sound keeps playing while paused: wanted? Loops in Firefox and Safari: not tested.
- **1.19 was saved three times by the agent on 2026-10-13** (owner's go-ahead each time): pass 4's tags, the side-door keypad's `controls`, the polaroid's parent, and the doors' fit (the four leaves scaled 1.02 across and up, closed edge to edge: the owner had found them not completely closed, with a gap at the frame). Three copies of the file as it was are next to it (`… (before pass 4 tags, 2026-10-13).blend`, `… (before door fit, 2026-10-13).blend`, `… (before polaroid parent, 2026-10-13).blend`): delete them once 1.19 has been opened and looked at.
- **To judge in play, pass 4:**
  - **A closed bulkhead door hides her from a camera in the next room** (she shows only through the leaf's glass strip). Walking into the cockpit or engineering with the camera behind her, the door closes between them once she's 1.8 m past it. Options: the door stays open while the camera looks through its doorway; the leaves are cut like the hull; leave it. Belongs with pass 5.
  - The values: opens within **1.5 m**, slides in **0.3 s** (at 0.6 s she reached the leaves at a run before they were open). Both in the tuning panel, Interaction folder. A door can be shut from its panel, not held open.
- **Lighting:** reference images and the lights in the blend file. The export reads marker objects (`lightRoom`, `lightColor`, `lightEnergy`); the game ignores `lightEnergy` and has four on at once. For pass 4's sake too: daylight in engineering from the ramp, a light for the open window (UE fades one with it).
- **Pass 3, still to judge:** *sun through glass*, *metal reflections* (0.5). **Camera distances:** 3.5 m indoors, 4.5 m outdoors are placeholders.
- **The highlight:** the prompt is approved, so the slider and its shader code can go (`highlight` in `settings.ts`, `tuning.ts`, `cutaway.ts`, `setHighlight` in `interaction.ts`): not done yet.

## Found, not fixed

- **Walking into the trapdoor's opening from the ladder's side, she comes down on the ladder's top end**, 1.2 m above the cargo floor (two times in three in the check, before it was moved to the other side). From the cockpit bulkhead's side she falls through. **Pushing on after the ladder leaves her, she walks into the edge of the cockpit doorway** (the ladder's top is beside it).
- About 7 fps when she's teleported onto the sled in the cargo bay (old assets too). Reachable on foot?
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections. Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.
- The ship's triangle count fell by 74 when the panels and lever went from props to parts: not looked into (they look right in the game).

## Known traps

- **Exporting:** `npm run export:ship` / `export:crew` (in `app/`): Blender, resize, dedup, Meshopt and the comparison in one go, with a short summary; raw files and Blender's log in `app/.export/` (not in git). Every script: [`app/tools/README.md`](../../app/tools/README.md).
- **Saving the owner's `.blend` is allowed** (owner, 2026-10-13), but **say so first, every time**: the owner may have it open. Check Blender isn't running (`tasklist`), save a copy next to the file, then save. For bigger changes a script the owner runs is also fine.
- **The `Game` collection is excluded in 1.19**; the export includes it for itself. If "lights: 0, collision pieces: 0" shows in the export's last line, that broke.
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools**, nor named in a shell command. Blender scripts read it; a node script run from the project root reaches it through `process.cwd()`; scripts go in the scratchpad. **ffmpeg** and **Python 3.11** are on the PATH. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **`.uasset` files:** names are readable as plain text (runs of printable characters), numbers aren't. See [`../reference/ue-prototype.md`](../reference/ue-prototype.md).
- **The ship is turned half a turn in the world** and scaled 1.486: Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`.
- **In checks:** she turns in an arc when she sets off (face her first, or she misses a doorway); teleported into a closed door she's stuck; several spots 2.5 m into engineering and the cockpit are inside furniture.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time.
- **Screenshots from a script:** wait 2 s after moving her before capturing. The indoor camera is 3.5 m behind her: in a small room it's behind the bulkhead (set `cameraDistanceIndoors` lower for the shot).
- **In the Bash tool, heredocs with apostrophes fail:** write the script to the scratchpad with the Write tool, then run it.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__audio` (`started`, `playing()`), `__boombox()`, `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`. **Sound in a check:** the page's own simulated keys don't turn it on; a key sent through DevTools (`Input.dispatchKeyEvent`, not Shift) does.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`; one thing: `npm run probe -- <file.js>` (20 s); the whole check, **once at the end**: `npm run smoke` (three and a half minutes). Then `npm run dev:01` (http://localhost:5201). New checks go in `app/tools/smoke-01.mjs`, tried out with the probe first. **Small fixes: no plan, no record script, no new check** (CLAUDE.md, *Keeping the work cheap*). Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
