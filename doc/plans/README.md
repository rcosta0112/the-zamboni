# Plans

A plan is written **before** each project step: what will be built, how, in what order, and how we'll know it's done. Plans are reviewed by the owner before work starts.

**Plans are not part of the final documentation.** Once the project is built, the documentation describes what exists (`doc/architecture/`, `doc/features/`, …); the plans that led there are left out. Keeping them in their own folder from the start makes that separation easy. Some folder names repeat between `plans/` and the rest of `doc/` (e.g. `plans/architecture/` and `architecture/`); that's intended.

## Layout

```
plans/
  README.md          this file: index + plan format
  architecture/      plans for building the project's structure (repo, workspace, tooling)
  prototypes/        one plan per prototype
  features/          plans for building game features (added as needed)
```

## Index

Open items: [`backlog.md`](backlog.md), the tracker (one line per item, with its pass and status). The state of the work in progress: [`../steps/current.md`](../steps/current.md).

| Plan | For step | Status |
|---|---|---|
| [Game architecture (levels, loading, budgets, characters, performance, saving, offline)](architecture/game-architecture/README.md) | [Step 1](../steps/01-docs-and-architecture.md) | Draft, for review |
| [Repo and prototype workspace](architecture/repo-and-prototypes.md) | [Step 2](../steps/02-first-prototype.md) | Done |
| [Prototype 01: walk](prototypes/01-walk.md) | [Step 2](../steps/02-first-prototype.md) | Built; frozen as 0.0.1 (2026-10-20) |
| [Low-resolution rendering (was prototype 02)](prototypes/low-res.md) | [Step 2](../steps/02-first-prototype.md) | Set aside 2026-10-20; its features later (item 52) |
| [See-through hull](features/see-through-hull.md) | [Step 3](../steps/03-see-through-hull.md) | Built; owner play-test pending |
| [See-through rules (what gets cut, and when)](features/see-through-rules.md) | [Step 3](../steps/03-see-through-hull.md) | Built (four passes); fifth pass drafted 2026-10-14, for review; rule table later |
| [The rest of the ship (props, interior lights, Dr. Kaufman)](features/ship-contents.md) | Prototype 01 | Built; owner play-test pending |
| [Basic interaction (doors, hatches, lockers, the cargo panels, ladders)](features/interaction-doors.md) | Prototype 01 | Built; owner play-test pending |
| [Doors and the character (getting in the way, getting trapped)](features/interaction-clearance.md) | Prototype 01 | Built; owner play-test pending |
| [The backlog, in six passes](backlog-passes.md) | Prototype 01 | In progress: passes 1 and 2 done, pass 3 built (lighting open again, set aside); pass 4 built; pass 5 next (own plan) |
| [Bulkhead doors and the engineering window (backlog pass 4)](features/bulkhead-doors.md) | Prototype 01 | Built; owner play-test pending |
| [Audio from the UE prototype (backlog pass 4.5)](features/audio-from-ue.md) | Prototype 01 | Built 2026-10-13; the owner's to listen to |
| [The displays' materials (what glows, exported as Blender shows it)](features/display-materials.md) | Prototype 01 | Built 2026-10-13; the owner's to look at |
| [Placeholder sounds for the interactions, and footsteps](features/interaction-sounds.md) | Prototype 01 | Built 2026-10-13; the owner's to listen to |
| [The start screen (progress bar, start button, click, Part 1's soundtrack)](features/start-screen.md) | Prototype 01 | Built 2026-10-13; the owner's to look at and listen to |
| [Moving through the ship, and the ladder both ways](features/movement-and-ladder.md) | Prototype 01 | Built 2026-10-13; the owner's to play, then the boxes go into the ship file |
| [Taking a jetpack from the rack (Dr. Green's model from the ship file)](features/dr-green-jetpack-model.md) | Prototype 01 | Built 2026-10-14; the owner's to play |
| [The auto-parachute: the jetpack slows a long fall (item 34)](features/auto-parachute.md) | Prototype 01 | Built 2026-10-14; the owner's to play |
| [The jetpack's exhaust glow, as in Part 1 (item 38)](features/jetpack-glow.md) | Prototype 01 | Done 2026-10-14 |
| [The jetpack with momentum: hover, flight, glide and skid (item 39)](features/jetpack-hover-and-flight.md) | Prototype 01 | Done 2026-10-14 |
| [Collision boxes for medium and small objects (item 42)](features/collision-boxes.md) | Prototype 01 | Built 2026-10-16 |
| [One scale for the ship file and the game (item 46)](features/scale-normalization.md) | Prototype 01 | Built 2026-10-19 |
| [The ship's things as components (item 49)](architecture/game-architecture/components.md) | Game architecture | Taken into the game's structure (item 54) |
| [The game's structure: scenes, state, saving, cutscenes, components (item 54)](architecture/game-architecture/game-structure.md) | 0.0.2 | Approved 2026-10-20; passes for review |
| [Exports that don't break when the file is worked on (item 48)](features/robust-exports.md) | 0.0.2 | Done 2026-10-20 |
| [The ladder with a climbing animation (item 44)](features/ladder-climb-animation.md) | Prototype 01 | Draft; pass 2, after the owner re-keys the animation |
| [A faster load, and a bar that tells the truth (item 50)](features/faster-load.md) | Prototype 01 | Stages 2 and 3 built 2026-10-20; stage 4 (unused UVs out of the export) built 2026-10-21 |
| [A second collision pass: every place she gets stuck (item 55)](features/collision-pass-2.md) | 0.0.2 | Upper deck built 2026-10-21; set aside by the owner (lower deck not started) |
| [The camera close to her, and her fade (item 41: the camera in a locker)](features/camera-close-fade.md) | 0.0.2 | Done 2026-10-21 (grain: item 58) |
| [The prompt beside the handle (item 56, pass 1)](features/prompt-placement.md) | 0.0.2 | Built 2026-10-21; the owner's to play |
| [Archive prototype 01 as 0.0.1, start the next as 0.0.2 (item 51)](prototypes/archive-01-start-02.md) | Prototypes 01 and 02 | Built 2026-10-20 (four passes); Vercel for 0.0.2 with the owner |

## Plan format

Each plan has:

- A **status** line: *draft*, *approved*, *in progress*, *done*, *superseded*, with dates.
- **Goal** and **scope**: what's in and what's explicitly out.
- **Constraints from the docs**: anything in `doc/` the plan must respect, with links. Conflicts are flagged, not silently resolved.
- **The work**, in numbered stages, each small enough to check on its own.
- **Options** where there's a real choice: each with its cost, and a recommendation.
- **Done when**: how the result is checked, by the agent and by the owner.
- **Open questions** for the owner.
- **After**: which docs get written or updated once the work is done.
