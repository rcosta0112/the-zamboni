# The flying scene: the Blender tasks

**Status:** *approved* with the [flying scene's plan](flying-scene.md) (2026-10-22). The owner's work in Blender for it, in the order the passes need it. Each line says what the game needs, not how to do it in Blender. **Tracked in Linear** (since 2026-10-22): each row links its issue, assigned to the owner; its status there is the one that counts.

## The ship file (`The Zamboni 1.22.blend`)

| | Task | For pass | Note |
|---|---|---|---|
| [SC-13](https://linear.app/eigodojo/issue/SC-13) | **Move Adam:** Adam Red into the pilot's seat (left, `Seat`), Adam Blue into the navigator's seat | 1 | The crew export takes their new places |
| [SC-14](https://linear.app/eigodojo/issue/SC-14) | **Marks** for the crew's places in this scene: an empty per character, where their feet go, facing their way | 1 | The agent can make them at today's places by a script (ids `mark-…`), for the owner to move |
| [SC-15](https://linear.app/eigodojo/issue/SC-15) | **Dr. Kaufman's book** (a prop she holds while reading) | 1 | With her reading loop |
| — | Her seat's id `cockpit-seat-pilot` → `cockpit-seat-copilot` | 1 | **The agent's** (a script, the save announced first, a backup) |

## The animations

Named `<character>_<what>`, in the file each character is exported from. Stand-ins until each exists.

| | Who | Animation | Loop? | Where | For pass | Stand-in |
|---|---|---|---|---|---|---|
| [SC-21](https://linear.app/eigodojo/issue/SC-21) | Dr. Green | **sitting** in her seat (the scene starts on it) | loop | `cockpit-seat-copilot` | 2 | her idle, in the seat |
| [SC-22](https://linear.app/eigodojo/issue/SC-22) | Dr. Green | **getting up** from the seat to the corridor (starts on the sitting loop's pose, ends on her idle's) | once | the seat → the corridor | 2 | none: the seat waits for it |
| [SC-23](https://linear.app/eigodojo/issue/SC-23) | Dr. Green | **sitting back down** (the reverse, at the scene's end) | once | the corridor → the seat | 2 | none |
| [SC-25](https://linear.app/eigodojo/issue/SC-25) | Dr. Green | **pouring** the coffee at the coffee maker | once | the galley | 3 | the mug appears in her hand |
| [SC-26](https://linear.app/eigodojo/issue/SC-26) | Dr. Green | **holding the mug**: the arm's pose, layered over walk, run and idle (only the arm's bones are read) | pose | | 3 | none |
| [SC-26](https://linear.app/eigodojo/issue/SC-26) | Dr. Green | **a sip** from the mug (the same arm) | once | | 3 | none |
| [SC-16](https://linear.app/eigodojo/issue/SC-16) | Adam Red | flying the ship | loop | the pilot's seat (left) | 1 | today's pose |
| [SC-17](https://linear.app/eigodojo/issue/SC-17) | Adam Blue | navigating (owner, 2026-10-22) | loop | the navigator's seat | 1 | today's pose |
| [SC-18](https://linear.app/eigodojo/issue/SC-18) | Dr. Kaufman | reading a book, on the couch (owner, 2026-10-22) | loop | the crew quarters | 1 | today's idle |
| [SC-19](https://linear.app/eigodojo/issue/SC-19) | Dr. Ogawa | standing, working on the sensor array on engineering's ceiling (owner, 2026-10-22) | loop | engineering | 1 | today's pose |
| [SC-20](https://linear.app/eigodojo/issue/SC-20) | Each of the crew | talking: a nod, layered on top of their loop | while their line types | | 1 | a nod made in code |
| [SC-30](https://linear.app/eigodojo/issue/SC-30) | The ship | the landing gear lowering (no rig: moved by hand) | once | the landing cutscene | 6 | only if a shot shows it |

**Getting up and sitting down** play like the ladder's climb: she slides to the animation's start, the animation moves her (root motion), and control comes back where it ends. So, as with the ladder: the root moves with her, the start and end poses match her idle, and the seat's place is fixed in the file.

## The coffee

| | Task | For pass |
|---|---|---|
| [SC-28](https://linear.app/eigodojo/issue/SC-28) | **The coffee pot** on the coffee maker in the galley (ready, owner) | 3 |
| [SC-27](https://linear.app/eigodojo/issue/SC-27) | **The mug** she carries: one of the galley's (`Mug.005`…), or a new one | 3 |
| [SC-27](https://linear.app/eigodojo/issue/SC-27) | **Where the mug sits in her hand**: the mug parented to her hand bone in a pose, or an empty marking the grip | 3 |
| — | The coffee maker's id and kind (`coffee-maker`) | 3, **the agent's** (a script) |

## The kit file: how to set it up

**`resources/models/Flight Kit 1.0.blend`**, a file of its own. **Remind the owner at pass 5: their ice-boulder set is ready.**

- **A collection per terrain:** `Ice Plain` now; later `Rocky Plain`, `Green Plains`, `Ocean`. A `Shared` collection for what several terrains use (clouds). Each terrain collection exports to one game file, `terrain-<id>.glb` (`terrain-ice-plain.glb`).
- **Inside a terrain collection**, a collection per layer: `Scatter` (the boulders: one object per kind of boulder), `Backdrop` (far shapes: the mountains, later), and the ground's colours as a material on a plane named `Ground` (the game draws the ground itself; it reads the colours).
- **Each boulder:** its own object, origin at its base (where it meets the snow), sitting on the plane at z = 0, at its real size (1 unit = 1 m). The game turns, sizes and scatters them; how much bigger or smaller one may get is a property on it if the owner wants it (`scale: [0.5, 2]`), otherwise the terrain's data says.
- **Materials:** one per material colour (the project's rule), few: each new one is a pipeline at load. Flat colours, as the ship's; no textures unless needed.
- **No shadows to model:** the game makes each boulder's shadow from its mesh.
- **The ship, linked** (not appended) from `The Zamboni 1.22.blend`, in a `Ship (linked)` collection, for scale and framing only. The export skips anything linked, so the ship never ends up in a terrain file. **When the ship file's version changes** (1.22 → 1.23), the link is pointed at the new file, or the ship stays linked to a copy with a fixed name: the owner's choice when it happens.
- **Exported by `npm run export:terrain`** (built in pass 5), with a summary and a gate like the ship's: new, renamed or missing objects flagged.
- **The landing cutscene,** if the owner authors it in Blender later, links the ship and the kit the same way (`cs-<id>.glb` holds the animation only).

## When the owner has done one

Move its issue to Done (or say so); the agent compares the file with the last version before working from it (CLAUDE.md, *Keeping the work cheap*, rule 4).
