# Plan: Exports that don't break when the file is worked on (item 48)

**Status:** *draft, saved for later* (owner, 2026-10-19: "save this plan for now, no action"). The owner is weighing an architectural answer instead (a component model of the ship: see *The owner's direction* at the end); this plan may be superseded by it.

## Why

Every export break on 2026-10-19 had one cause: **the export trusted the file's working state.** Collections switched off (most props lost), objects hidden (`Hull_Merged` left the collider, the galley doors' hinges at the origin), pose mode (the crew and player exports stopped), a hatch rotated out of the way for the ladder animation (the trapdoor opens the wrong way in the game). Each is normal while working in Blender; each changed the game silently. Already handled the same day: the collections table (`export-collections.json`), hidden objects shown in memory, object mode.

## The work, in two passes

**Pass A (about an hour):**
1. **A recorded closed pose for every moving part** (the 17 doors, both hatches, the ramp, the lever, the window, the bulkhead doors), in the export list, taken from the last good export (1.19's, ×1.4856). The export puts each in that pose, in memory, whatever the file has, and notes it when the file differs (`Hatch.002: rotated 90° from its closed pose: exported closed`).
2. **The game's files are replaced only when nothing is flagged**, or with the changes accepted; otherwise the export stays in `app/.export/` with its summary.

**Pass B (about an hour):**
3. **A baseline of every exported object's place.** The export flags what moved since the last accepted export; `npm run export:ship -- --accept` takes the moves as meant.
4. **A check after every export** (about 20 s, in the browser): the doors open and close, the collider covers the hull, the crew are in their seats, the ladder's foot is clear.

**A habit (the owner's call):** animation work in its own `.blend` that links the ship from the reference file, so posing, hiding and moving things for an animation never reach the export.

## Options

- Closed poses at export (recommended) or at the game's load: the same data either way; at export the game's files are right and the game stays simple.

## Done when

The trapdoor exports closed from 1.21 as it is (rotated), with a note; an export with a moved prop doesn't replace the game's files until accepted; the post-export check passes.

## The owner's direction (2026-10-19)

> **[Agent note]** The owner's view: this is a question of architecture, not of process or data. Each element of the ship (a door, a hatch, a locker, the ladder, the rack) would be a **component with its own properties and default states**, defined in the game, with the mesh and animation data only one part of it; then a door's state could never come from how the file happens to be posed. Patterns named in the answer of 2026-10-19: Entity–Component, Prototype/prefab, Type Object, State. Conflicts with the decision log's *The ship's reference file* (2026-10-12: behaviour from tags in the file): planned on its own: [`../architecture/game-architecture/components.md`](../architecture/game-architecture/components.md) (saved 2026-10-20).
