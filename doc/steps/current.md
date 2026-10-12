# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-12.*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01.
- **Tracker:** [`../plans/backlog.md`](../plans/backlog.md), one line per item with its pass and status.
- **Next: pass 1** (code only, no export): items 3, 4, 5, 9, 16, 17, 22, 23, plus a scripted check (`npm run smoke`).
- Nothing in pass 1 is started.

## Waiting on the owner

- Play-tests pending on everything built on 2026-10-09 (interaction, door push, ship contents, see-through fourth pass).

## Where to look (pass 1)

Code map: [`app/prototypes/01-walk/README.md`](../../app/prototypes/01-walk/README.md#code-map).

| Item | File | Start at |
|---|---|---|
| 16, 17 camera distance, pitch, no zoom | `camera.ts`, `input.ts`, `settings.ts`, `tuning.ts` | `FollowCamera.update`, `Input.consumeZoom` |
| 9 ramp doesn't close | `ship.ts`, `doors.ts` | `updateShip`, `advance` |
| 4, 5 ladders | `ladders.ts` | `Ladders.update`, `findExit` |
| 3, 22 side door, roof hatch | `interaction.ts` | `shipInteractables` |
| 23 prompt at the target | `interaction.ts`, `style.css`, `cutaway.ts` (highlight) | `Interaction.update` |

## Known traps

- **Ramp bug (9):** not diagnosed. Reproduce in the browser first.
- **Ladder stuck (4):** likely `findExit` returning nothing at the top; unconfirmed.
- **Dev hooks** for checks, on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__interaction()`, `__ladders()`.
- **No gamepad in the test browser:** gamepad behaviour is never verified by the agent.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`, then `npm run dev:01` (http://localhost:5201) and each pass's *Done when* list in the plan.

## After pass 1

Update [`../features/interaction.md`](../features/interaction.md), the prototype README's controls, and add dated *Update* notes in the decision log (ladders, side door, highlight, roof hatch). Then the owner's play-test before pass 2.
