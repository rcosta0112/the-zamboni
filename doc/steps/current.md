# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-13 (pass 4 built, committed and pushed).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01. **Tracker:** [`../plans/backlog.md`](../plans/backlog.md).
- **Passes 1 and 2 are done**; **pass 3 (lighting) is built and committed**, then opened again by the owner and **set aside** (owner, 2026-10-13: "ignore any of the lighting stuff for now"). The direction is in the [decision log](../decision-log.md), 2026-10-12 update: the same world light indoors and outdoors, more light sources, **the owner places the lights in the blend file**.
- **Pass 4 (bulkhead doors, panels, the engineering window and its lever: items 6, 7, 8) is built.** Plan, with the owner's answers: [`../plans/features/bulkhead-doors.md`](../plans/features/bulkhead-doors.md). What exists: [`../features/interaction.md`](../features/interaction.md#sliding-doors). `check`, `build` pass; `npm run smoke`: all checks pass. Re-exported from 1.19 as saved.
- **Committed and pushed 2026-10-13:** pass 4, with the tuning panel's folders starting collapsed and the doc updates of the lighting tests.
- **Next:** the owner plays pass 4. Then **pass 5** (see-through, fifth pass: items 11, 13, 14, 15), which **needs its own plan first**: a *fifth pass* section in [`../plans/features/see-through-rules.md`](../plans/features/see-through-rules.md).

## Waiting on the owner

- **1.19 was saved twice by the agent on 2026-10-13** (owner's go-ahead each time): pass 4's tags, the side-door keypad's `controls`, then the doors' fit (the four leaves scaled 1.02 across and up, closed edge to edge: the owner had found them not completely closed, with a gap at the frame). Two copies of the file as it was are next to it (`… (before pass 4 tags, 2026-10-13).blend`, `… (before door fit, 2026-10-13).blend`): delete them once 1.19 has been opened and looked at.
- **To judge in play, pass 4:**
  - **A closed bulkhead door hides her from a camera in the next room** (she shows only through the leaf's glass strip). Walking into the cockpit or engineering with the camera behind her, the door closes between them once she's 1.8 m past it. Options: the door stays open while the camera looks through its doorway; the leaves are cut like the hull; leave it. Belongs with pass 5.
  - The values: opens within **1.5 m**, slides in **0.3 s** (at 0.6 s she reached the leaves at a run before they were open). Both in the tuning panel, Interaction folder.
  - A door can be shut from its panel, not held open.
- **Lighting:** reference images and the lights in the blend file. The export reads marker objects (`lightRoom`, `lightColor`, `lightEnergy`); the game ignores `lightEnergy` and has four on at once. For pass 4's sake too: daylight in engineering from the ramp, a light for the open window (UE fades one with it).
- **Pass 3, still to judge:** *sun through glass*, *metal reflections* (0.5). **Camera distances:** 3.5 m indoors, 4.5 m outdoors are placeholders.
- **The highlight:** the prompt is approved, so the slider and its shader code can go (`highlight` in `settings.ts`, `tuning.ts`, `cutaway.ts`, `setHighlight` in `interaction.ts`): not done yet.

## Found, not fixed

- **Walking into the trapdoor's opening from the ladder's side, she comes down on the ladder's top end**, 1.2 m above the cargo floor (two times in three in the check, before it was moved to the other side). From the cockpit bulkhead's side she falls through.
- **Pushing on after the ladder leaves her, she walks into the edge of the cockpit doorway** (the ladder's top is beside it).
- About 7 fps when she's teleported onto the sled in the cargo bay (old assets too). Reachable on foot?
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections.
- Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.
- The ship's triangle count fell by 74 when the panels and lever went from props to parts: not looked into (they look right in the game).

## Known traps

- **The export command:** `blender -b "resources/models/The Zamboni 1.19.blend" --python app/tools/export-ship.py -- --out <raw>/zamboni-ship.glb --collider-out <raw>/zamboni-ship-col.glb`, then resize, dedup, meshopt (prototype README). Compare **raw with raw** (`node tools/compare-glb.mjs <before> <after>`): dedup changes the objects. Against the committed file, compare compressed with compressed (`git show HEAD:app/assets/test/zamboni-ship.glb > file`).
- **Saving the owner's `.blend` is allowed** (owner, 2026-10-13), but **say so first, every time**: the owner may have it open. Check Blender isn't running (`tasklist`), save a copy next to the file, then save. For bigger changes a script the owner runs is also fine.
- **The `Game` collection is excluded in 1.19**; the export includes it for itself. If "lights: 0, collision pieces: 0" shows in the export's last line, that broke.
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools.** Blender scripts read it; inspection scripts go in the scratchpad. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **`.uasset` files:** names are readable as plain text (runs of printable characters), numbers aren't. See [`../reference/ue-prototype.md`](../reference/ue-prototype.md).
- **The ship is turned half a turn in the world** and scaled 1.486: Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`.
- **In checks:** she turns in an arc when she sets off (face her first, or she misses a doorway); teleported into a closed door she's stuck; several spots 2.5 m into engineering and the cockpit are inside furniture.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time.
- **Screenshots from a script:** wait 2 s after moving her before capturing. The indoor camera is 3.5 m behind her: in a small room it's behind the bulkhead (set `cameraDistanceIndoors` lower for the shot).
- **In the Bash tool, heredocs with apostrophes fail:** write the script to the scratchpad with the Write tool, then run it.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`, `npm run smoke` (about three minutes, PASS / FAIL lines). Then `npm run dev:01` (http://localhost:5201) and each pass's *Done when* list in the plan. New checks go in `app/tools/smoke-01.mjs`. Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
