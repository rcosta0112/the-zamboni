# See-through Hull

**Status:** built in prototype 01 (2026-10-08); owner play-test pending. Plan: [`../plans/features/see-through-hull.md`](../plans/features/see-through-hull.md). Code: [`app/prototypes/01-walk/src/cutaway.ts`](../../app/prototypes/01-walk/src/cutaway.ts).

## What it does

Inside the ship, everything between the camera and Dr. Green (hull, walls, ceilings, furniture) is cut away by a round hole that follows her, so she stays visible while the camera stays outside. Outside the ship there's no cut; the camera collides with things instead.

## How it works

- **The capsule:** from the camera to Dr. Green's chest (0.75 m above her feet). Pixels of cuttable surfaces that fall inside it, between the two, are discarded.
- **Dithered edge:** a band at the hole's edge is broken up pixel by pixel with a 4×4 **ordered (Bayer) dither**. It looks soft without transparency, so there are no sorting problems. (Random per-pixel noise was tried first; the ordered pattern crawls less when the camera moves. Softness 0 gives a hard edge.)
- **Flicker fix (2026-10-08):** the hole flickered even when nothing moved. Cause: the code that eases the hole in and out stepped *away* from its target on every other frame once it had reached it, so the radius alternated between two sizes. Fixed; consecutive frames of a still scene are now identical.
- **Never the ground under her:** upward-facing surfaces (normal within ~45° of straight up) lower than 0.15 m above her feet are never cut. So the floor she stands on stays, even upstairs, where that floor is also the cargo bay's ceiling, and so do walkable surfaces that aren't separate floor objects (the cockpit floor is part of `Dashboard Body`; the pallet; hatches). Everything else is cut all the way down, so furniture leaves no stubs. (Until 2026-10-08 the rule kept *every* surface below that height, which would have left the bottom 15 cm of cut furniture standing.)
- **TSL, r186:**
  - `material.maskNode`: the cut condition (a pixel is discarded where it's false).
  - `material.maskShadowNode = true`: the shadow pass ignores the cut, so the hull keeps its full shadow (checked: the ship's shadow is identical with the cut on and off).
  - Cuttable materials are double-sided, with back faces drawn in one dark colour, so the cut edge reads as a solid cross-section; shadows are cast from back faces only.
- **Copies of materials:** cutting is per material, and what must never be cut (the ramp, Dr. Green) can share materials with the ship, so cuttable meshes use a copy. **One copy per source material**, shared by every mesh that uses it (29 for the ship; until 2026-10-08 it was one per mesh, 159). The copy keeps every property of the source, physical ones included (transmission, specular…).
- **Compiled while loading:** after the ship loads, its shaders are compiled (`renderer.compileAsync`, with view culling off meanwhile so parts outside the view are included) before the ship counts as loaded. This removed a ~0.57 s freeze just after the ship first appeared.

## The rules

| Situation | Behaviour |
|---|---|
| Inside the ship (Dr. Green's chest within the hull's bounds, from just below the cargo floor up: both decks) | Hole on, radius 1.44 m (owner: 20% bigger than the first 1.2 m), edge softness 0.25 m; grows in over 0.3 s when she enters, shrinks over 0.3 s when she leaves. Camera collision off |
| Outside | No cut (owner, 2026-10-08). **Camera collision:** a ray from her chest toward the camera; anything in the way (the ship), the camera moves in front of it (0.25 m short of the hit, but never closer than 1 m), then eases back out when clear. The ground is ignored (the camera is kept above it separately): with the camera tilted up, hitting the ground pulled it into her head |
| The ceiling (upper deck) | Cut by the same capsule only (owner, 2026-10-08). A full cutaway (hiding the ceiling while she's inside) remains an option |

## What's cuttable

**Everything inside the ship** (owner, 2026-10-08): hull, walls, ceilings, furniture, consoles, and props and other characters once there are any. Cutting only the hull and walls left uncut furniture floating in the hole, in the way. **Never cut:** Dr. Green, and objects tagged `cuttable: false`: the cargo ramp and the landing gear (outside the hull; the camera never looks through them from inside). Floors need no tag (see "Never the ground under her" above).

**For the game:** objects that must never be cut are tagged in Blender with the custom property `cuttable: false` (naming contract, [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md)); the exporter passes it through as glTF `extras` and the game reads `userData.cuttable` (on the mesh or any parent). Until the tags are set in Blender, `app/tools/export-ship.py` sets them from its own list (it never overrides a tag already in the file).

## Tuning (prototype panel → *See-through hull*)

On/off, radius, edge softness, target height, cut-edge colour, camera collision.

## Cost

Measured 2026-10-08 on the owner's PC (GTX 1070, headless Chrome, WebGPU, 1280×720), everything cuttable (52,200 triangles, 286 draw calls, 29 cuttable materials):

- **Per frame:** a few instructions per pixel, plus losing the GPU's early depth test on the whole interior and drawing back faces (double-sided). 60 fps (vsync-limited); no frame over 17 ms on first entry. Not yet measured on the MacBook.
- **Loading:** compiling the ship's shaders takes 2.2–2.6 s, during loading. Total stall time while loading is about the same as before (~3 s, which includes the character and scene). The ship appears ~0.7 s later, and the 0.57 s freeze just after it appeared is gone.
- **Draw calls and shadows:** unchanged by the cut (every mesh is its own draw call either way; the shadow pass ignores the cut).

## Not done yet

- Oval or constant-on-screen-size hole, glowing rim (options from the original design notes).
- A real trigger-volume system for "inside" (today: one box, the hull's bounds).
- Tags set in Blender instead of by the export script.
