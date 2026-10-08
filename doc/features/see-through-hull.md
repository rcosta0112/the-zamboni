# See-through Hull

**Status:** built in prototype 01 (2026-10-08); owner play-test pending. Plan: [`../plans/features/see-through-hull.md`](../plans/features/see-through-hull.md). Code: [`app/prototypes/01-walk/src/cutaway.ts`](../../app/prototypes/01-walk/src/cutaway.ts).

## What it does

Inside the ship, the hull, walls and ceilings between the camera and Dr. Green are cut away by a round hole that follows her, so she stays visible while the camera stays outside. Outside the ship there's no cut; the camera collides with things instead.

## How it works

- **The capsule:** from the camera to Dr. Green's chest (0.75 m above her feet). Pixels of cuttable surfaces that fall inside it, between the two, are discarded.
- **Dithered edge:** a band at the hole's edge is broken up pixel by pixel with a 4×4 **ordered (Bayer) dither**. It looks soft without transparency, so there are no sorting problems. (Random per-pixel noise was tried first; the ordered pattern crawls less when the camera moves. Softness 0 gives a hard edge.)
- **Flicker fix (2026-10-08):** the hole flickered even when nothing moved. Cause: the code that eases the hole in and out stepped *away* from its target on every other frame once it had reached it, so the radius alternated between two sizes. Fixed; consecutive frames of a still scene are now identical.
- **Never below her feet:** nothing lower than 0.15 m above her feet is cut, so the floor she stands on stays, even upstairs, where that floor is also the cargo bay's cuttable ceiling.
- **TSL, r186:**
  - `material.maskNode`: the cut condition (a pixel is discarded where it's false).
  - `material.maskShadowNode = true`: the shadow pass ignores the cut, so the hull keeps its full shadow (checked: the ship's shadow is identical with the cut on and off).
  - Cuttable materials are double-sided, with back faces drawn in one dark colour, so the cut edge reads as a solid cross-section; shadows are cast from back faces only.
- **Copies of materials:** cutting is per material, and the ship's materials are shared (the hull's teal is also on the turbines), so each cuttable mesh gets its own copy.

## The rules

| Situation | Behaviour |
|---|---|
| Inside the ship (Dr. Green's chest within the hull's bounds, from just below the cargo floor up: both decks) | Hole on, radius 1.44 m (owner: 20% bigger than the first 1.2 m), edge softness 0.25 m; grows in over 0.3 s when she enters, shrinks over 0.3 s when she leaves. Camera collision off |
| Outside | No cut (owner, 2026-10-08). **Camera collision:** a ray from her chest toward the camera; anything in the way (the ship), the camera moves in front of it (0.25 m short of the hit, but never closer than 1 m), then eases back out when clear. The ground is ignored (the camera is kept above it separately): with the camera tilted up, hitting the ground pulled it into her head |
| The ceiling (upper deck) | Cut by the same capsule only (owner, 2026-10-08). A full cutaway (hiding the ceiling while she's inside) remains an option |

## What's cuttable

Tagged in the ship file by the export script (`cuttable: true`, read as `userData.cuttable`): the hull, windshield, walls, ceilings, bulkheads, doors, tall furniture (bunks, lockers, galley, cabinets, the Contraption, ladders, the head) and the **engine pods** (they hang outside the hull at deck height and blocked the view into the lower deck; first planned as never cut). Never cut: floors, low furniture (seats, couch, table, benches), the ramp, landing gear, characters, props.

**For the game:** objects are tagged in Blender with the custom property `cuttable: true` (naming contract, [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md)); the exporter passes it through as glTF `extras` and the game reads `userData.cuttable`. Until the tags are set in Blender, `app/tools/export-ship.py` sets them from its own list (it never overrides a tag already in the file).

## Tuning (prototype panel → *See-through hull*)

On/off, radius, edge softness, target height, cut-edge colour, camera collision.

## Cost

A few instructions per pixel on cuttable surfaces only, plus losing an early-depth optimisation on those materials on some GPUs. 60 fps (vsync-limited) on the owner's PC; not yet measured on the MacBook.

## Not done yet

- Oval or constant-on-screen-size hole, glowing rim (options from the original design notes).
- A real trigger-volume system for "inside" (today: one box, the hull's bounds).
- Tags set in Blender instead of by the export script.
