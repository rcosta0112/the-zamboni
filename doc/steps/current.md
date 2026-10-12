# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-12 (end of the pass 2 session).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01.
- **Tracker:** [`../plans/backlog.md`](../plans/backlog.md), one line per item with its pass and status.
- **Passes 1 and 2 are committed and pushed.** Pass 2: items 1, 12, 18, 19, 20 built; item 2 (the keypad) waits for the owner's updated file. `npm run smoke`: 26 of 26 checks pass.
- **Next: the owner's play-test of passes 1 and 2, then pass 3** (lighting: warm sunlight in the crew quarters and cockpit, item 10).

## Waiting on the owner

- **The keypad move (2):** set aside (owner, 2026-10-12): edits were lost when a file was overwritten. The owner updates the blend file and asks again; then re-export.
- **`The Zamboni 1.19.blend` is the owner's file from here on**: open it, look at the `Game` collection (light markers, collision boxes) and the custom properties. `build-ship-reference.py` refuses to overwrite it.
- **Single-sided:** on by default, switch in the tuning panel (see-through → *single-sided materials*). No measurable frame-time saving (112 vs 109 fps in engineering, 75 vs 73 in the crew quarters, uncapped). The look changes at every cut: you see through to what's behind (often the sky) instead of a dark cross-section. Keep it or not: the owner's call. No interior surface was seen to disappear in 12 views from inside and 6 from outside; a walk with the switch is the real check.
- **Collision boxes:** under the hull and each front thruster, sized by the agent. Resize in Blender (`Game Collision`).
- **Play-test of pass 1** (gamepad): where the prompt sits; the top of the ladder; the camera distances (3.5 m / 4.5 m are placeholders). Then the highlight slider and its shader code go.
- Play-tests still pending on everything built on 2026-10-09.

## What pass 2 found

- **`Monitor Arm` (12), cause confirmed:** the glTF exporter doesn't apply an armature's pose; the display came out in its rest pose. The export now bakes such parts.
- **The ramp was held open by one keyframe** (frame 197), removed in 1.19. `closedAngle` in `ship.ts` now returns 0.
- **About 7 fps when she's teleported onto the sled in the middle of the cargo bay** (124 ms frames; with the old assets too). Not looked into: is it reachable on foot?
- **`Tape.003` is in both exported files** as a stray object, and the front thrusters' collision mesh may lack geometry-nodes instances. Both noted in the pipeline checklist, not fixed.
- Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.

## Where to look (pass 3)

Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md). Lighting: `world.ts` (sun), `lights.ts` (room lights from markers), `ship.ts` (the merged shadow caster: does it include the glass?). Light markers are empties in 1.19 (`Game Lights`, `lightRoom` / `lightColor` / `lightEnergy`): a new marker is a new empty and a re-export. Plan: option A (glass lets the sun through), look, then B.

## Known traps

- **Doors in the file must be closed, and not animated:** the game takes the file's pose as closed.
- **`resources/` can't be read with the file tools** (a rule in `.claude/settings.json`, to save tokens). Blender scripts read it; put inspection scripts in the scratchpad.
- **Blender 5.2** saved the ship file (`C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`, not on the PATH). Two add-ons print tracebacks at start: harmless.
- **Test teleports:** putting her inside furniture leaves her floating and unable to move. Use spots from the smoke script.
- **The ship is turned half a turn in the world:** Blender +x is world -x. Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`.
- **Flipping the single-sided switch** rebuilds the shaders: wait 2 s before measuring anything.
- **Headless Chrome isn't paused**, so simulated keys work. Frame rate is capped at 60 unless Chrome gets `--disable-frame-rate-limit --disable-gpu-vsync`.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__interaction()`, `__ladders()`, `__THREE`.
- **No gamepad in the test browser:** gamepad behaviour is never verified by the agent.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export). After it: `node tools/compare-glb.mjs` against the last raw export shows exactly what changed.

## How to verify

In `app/`: `npm run check`, `npm run build`, `npm run smoke` (headless Chrome, about a minute and a half, PASS / FAIL lines). Then `npm run dev:01` (http://localhost:5201) for what the script doesn't cover, and each pass's *Done when* list in the plan. New checks for a pass go in `app/tools/smoke-01.mjs`.

## After pass 3

A lighting note in the prototype README; the decision log if option B or C is chosen.
