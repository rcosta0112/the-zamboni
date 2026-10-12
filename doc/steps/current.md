# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-12 (end of the pass 1 session).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01.
- **Tracker:** [`../plans/backlog.md`](../plans/backlog.md), one line per item with its pass and status.
- **Pass 1 is built** (items 3, 4, 5, 9, 16, 17, 22, 23) and **not committed**. `npm run smoke`: 20 of 20 checks pass.
- **Next: the owner's play-test of pass 1, then pass 2** (the reference `.blend` and one re-export: items 1, 2, 12, 18, 19, 20). Pass 2 needs Blender and writes to `resources/` (a new file only).

## Waiting on the owner

- **Play-test of pass 1**, with a gamepad (the agent has none). To judge: where the prompt sits; where she's put at the top of the ladder; the two camera distances.
- **Camera distances:** indoors 3.5 m and outdoors 4.5 m are placeholders (Camera folder in the tuning panel). The owner gives the values.
- **The highlight:** off by default. Once the prompt is approved, the slider and its shader code are removed (`highlight` in `settings.ts`, `tuning.ts`, `cutaway.ts`, `setHighlight` in `interaction.ts`).
- Play-tests still pending on everything built on 2026-10-09 (door push, ship contents, see-through fourth pass).

## What pass 1 found

- **Ramp bug (9), cause:** the ship file has the ramp lying open (`Door Cargo` turned 88° since the export of 2026-10-09) and the game took the file's pose for "closed": 4° of travel. Fix: `closedAngle` in `ship.ts` (closed = the door object with no rotation of its own).
- **Ladder bug (4), cause:** not `findExit` returning nothing (it always found a spot). It put her in a corner between the cargo bulkhead and the open trapdoor, where two ways were walls and the other two re-attached her to the top of the ladder. Fix: the most open spot, and no attaching from above (item 5).

## Where to look (pass 2)

Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md). Export: `app/tools/export-ship.py`. Pipeline doc: [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md).

| Item | Where | Note |
|---|---|---|
| 1 reference file | `export-ship.py` (tag lists, `MODELLED_OPEN`, `DOORS`, `PANELS`) | The lists become custom properties in `The Zamboni 1.19.blend` |
| 22 follow-up | `OPEN_TOGETHER` in `interaction.ts` | Becomes a tag (`opensWith`) at this export |
| 18 single-sided | `makeCuttable` in `cutaway.ts` | A switch in the tuning panel; frame time both ways |
| 19, 20 collision boxes | `export-ship.py` (the collider) | Clear of the ramp and the side door |

## Known traps

- **Doors in the file must be closed** (or handled like the ramp): any door exported open is taken as closed by `doors.ts`. Pass 2, stage 1 closes them in the reference file; `closedAngle` then returns 0 for the ramp and still works.
- **Test teleports:** putting her inside furniture leaves her floating and unable to move (something stands in the middle of the cargo bay, about 0.6 m in from the ramp's hinge). Use spots from the smoke script.
- **Headless Chrome isn't paused** (no pointer lock change), so simulated keys work: `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))`.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view` (`.distance`, `.yaw`, `.pitch`), `__interaction()` (`.target`, `.items`, `.promptAt`), `__ladders()` (`.state`, `.list`), `__THREE`.
- **No gamepad in the test browser:** gamepad behaviour is never verified by the agent.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).
- [`../plans/prototypes/01-walk.md`](../plans/prototypes/01-walk.md) (a built plan) still lists wheel and D-pad zoom: history, not the current controls.

## How to verify

In `app/`: `npm run check`, `npm run build`, `npm run smoke` (headless Chrome, about a minute, PASS / FAIL lines; uses the dev server on 5201 if one is running). Then `npm run dev:01` (http://localhost:5201) for anything the script doesn't cover, and each pass's *Done when* list in the plan. New checks for a pass go in `app/tools/smoke-01.mjs`.

## After pass 2

Update [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md) (the reference file, the checklist, the naming contract), [`../features/see-through-hull.md`](../features/see-through-hull.md) and the decision log; list the `PERF:` materials to the owner.
