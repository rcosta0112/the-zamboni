# Steps

The project is broken into steps. The list is open-ended: new steps are added as the project goes, numbered in the order they're started. Each step has its own file with its goal, deliverables, status and open questions.

| # | Step | File | Status |
|---|---|---|---|
| 1 | Documentation structure and project architecture (stack, scope) | [`01-docs-and-architecture.md`](01-docs-and-architecture.md) | In progress |
| 2 | Repo setup and first prototypes (walking on a plane; low-resolution rendering) | [`02-first-prototype.md`](02-first-prototype.md) | In progress |
| 3 | See-through hull | [`03-see-through-hull.md`](03-see-through-hull.md) | Built; play-test pending |

## Candidate next steps

Not steps yet, just the likely order once Step 1 is done. Promote one to a numbered step when it starts.

- **Extract the UE prototype's logic.** Copy each Blueprint's Event Graph as text into `ue-reference/blueprints/`. See [`../reference/ue-prototype.md`](../reference/ue-prototype.md).
- **Vertical slice.** One room (cockpit or crew quarters) with baked lighting, third-person controller and camera, the see-through hull, one working door, the boombox with positional audio, one dialogue.
- **Check the music licenses** (Anamanaguchi, 2NRO8OT) before anything is published.
