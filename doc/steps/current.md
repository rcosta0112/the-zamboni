# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-12 (end of the pass 3 session).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01.
- **Tracker:** [`../plans/backlog.md`](../plans/backlog.md), one line per item with its pass and status.
- **Passes 1 and 2 are done** (owner, 2026-10-12: "1 and 2 are ok"; single-sided stays for now) and pushed.
- **Pass 3 (lighting, item 10) is built, committed and pushed**, with a re-export from the owner's updated 1.19 (the keypad move, item 2). `npm run smoke`: 29 of 29 checks pass.
- **Next: pass 4** (bulkhead doors, the engineering window: items 6, 7, 8). **It needs its own plan first**, reviewed by the owner.

## Waiting on the owner

- **One tag to fix in 1.19:** `Door Panel - Side door` has `controls` = `Door Cargo` (copied with the duplicate); it should be `Door`. The export of 2026-10-12 was made with it corrected in memory only (`--python-expr`, see the command below): **the file itself still has the wrong value.** The agent isn't allowed to save the owner's file.
- **Light leaks and stepped shadow edges:** fixed (both faces cast, 4096 shadow map) and confirmed by the owner, 2026-10-12.
- **Pass 3, to judge in the game** (tuning panel → Look): *sun through glass*, *world light indoors* (0.5), *warm light: crew q., cockpit* (0.6), *metal reflections* (0.5). If the tint is right, set the markers' `lightColor` in Blender (or add markers at the windows) and the tint setting goes.
- **Camera distances:** 3.5 m indoors and 4.5 m outdoors are still placeholders.
- **The highlight:** the prompt is approved, so the slider and its shader code can go (`highlight` in `settings.ts`, `tuning.ts`, `cutaway.ts`, `setHighlight` in `interaction.ts`): not done yet.

## For pass 4's plan

- **In 1.19 already (owner, 2026-10-12):** `Door Panel - Cockpit`, `- Crew Quarters`, `- Engineering`, `- Cargo Hold` (one per room: each flips the state of its bulkhead door, together with open-on-approach) and `Level Panel` (the window's lever). Untagged: exported as props for now. `Door Frame Cockpit` is new too (a part).
- From the plan: sliding doors, a proximity trigger, a door with two panels, a lever with its own moving part; the four doors need colliders (tagged `collider: "none"` today); the UE Blueprints (`BP_Door_Internal`, `BP_Engineering_Window`, `BP_Lever_Panel`) are the reference; one open point: what a panel does to a door that also opens by itself.

## Found, not fixed

- About 7 fps when she's teleported onto the sled in the middle of the cargo bay (old assets too). Reachable on foot?
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections: only see-through materials do.
- Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.

## Known traps

- **The export command, until the tag is fixed:** `blender -b "resources/models/The Zamboni 1.19.blend" --python-expr "import bpy; bpy.data.objects['Door Panel - Side door']['controls'] = 'Door'" --python app/tools/export-ship.py -- --out <raw>/ship.glb --collider-out <raw>/col.glb`, then resize, dedup, meshopt (prototype README).
- **Never save the owner's `.blend`** (a write was refused, 2026-10-12): report what to change instead.
- **The `Game` collection is excluded in 1.19**; the export includes it for itself. If "lights: 0, collision pieces: 0" shows in the export's last line, that broke.
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools** (`.claude/settings.json`). Blender scripts read it; inspection scripts go in the scratchpad. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **The ship is turned half a turn in the world:** Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time.
- **Screenshots from a script:** wait 2 s after moving her before capturing, or the shot shows the view before.
- **`scene.environment` needs a texture at least ~256 px wide** (three's PMREM); it's not used: metals have their own `envNode`.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__THREE`.
- **No gamepad in the test browser.** Headless Chrome isn't paused; frame rate is capped at 60 unless Chrome gets `--disable-frame-rate-limit --disable-gpu-vsync`.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export); after it, `node tools/compare-glb.mjs` against the last raw export.

## How to verify

In `app/`: `npm run check`, `npm run build`, `npm run smoke` (about two minutes, PASS / FAIL lines). Then `npm run dev:01` (http://localhost:5201) and each pass's *Done when* list in the plan. New checks go in `app/tools/smoke-01.mjs`. Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
