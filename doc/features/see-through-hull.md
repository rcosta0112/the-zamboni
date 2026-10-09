# See-through Hull

**Status:** built in prototype 01 (2026-10-08); owner play-test pending. Plans: [`see-through-hull.md`](../plans/features/see-through-hull.md), [`see-through-rules.md`](../plans/features/see-through-rules.md). Code: [`cutaway.ts`](../../app/prototypes/01-walk/src/cutaway.ts) (the shader), [`visibility.ts`](../../app/prototypes/01-walk/src/visibility.ts) (which furniture is cut).

## What it does

Inside the ship, what hides Dr. Green from the camera is cut away, so she stays visible while the camera stays outside. The hull, walls and ceilings are cut by a round hole that follows her; furniture near her is cut only while it actually hides her (owner: cut only what hides something the player needs to see). Outside the ship there's no cut; the camera collides with things instead.

## How it works

- **The capsule:** from the camera to Dr. Green's chest (0.75 m above her feet). Pixels of cuttable surfaces that fall inside it, between the two, are discarded.
- **Dithered edge:** a band at the hole's edge is broken up pixel by pixel with a 4×4 **ordered (Bayer) dither**. It looks soft without transparency, so there are no sorting problems. (Random per-pixel noise was tried first; the ordered pattern crawls less when the camera moves. Softness 0 gives a hard edge.)
- **Flicker fix (2026-10-08):** the hole flickered even when nothing moved. Cause: the code that eases the hole in and out stepped *away* from its target on every other frame once it had reached it, so the radius alternated between two sizes. Fixed; consecutive frames of a still scene are now identical.
- **Never the ground under her:** upward-facing surfaces (normal within ~45° of straight up) lower than 0.15 m above her feet are never cut. So the floor she stands on stays, even upstairs, where that floor is also the cargo bay's ceiling, and so do walkable surfaces that aren't separate floor objects (the cockpit floor is part of `Dashboard Body`; the pallet; hatches). Everything else is cut all the way down, so furniture leaves no stubs. (Until 2026-10-08 the rule kept *every* surface below that height, which would have left the bottom 15 cm of cut furniture standing.)
- **TSL, r186:**
  - `material.maskNode`: the cut condition (a pixel is discarded where it's false).
  - `material.maskShadowNode = true`: the shadow pass ignores the cut, so the hull keeps its full shadow (checked: the ship's shadow is identical with the cut on and off).
  - Cuttable materials are double-sided, with back faces drawn in one dark colour, so the cut edge reads as a solid cross-section; shadows are cast from back faces only.
- **Copies of materials:** cutting is per material, and what must never be cut (the landing gear, Dr. Green) can share materials with the ship, so cuttable meshes use a copy. **One copy per source material**, shared by every mesh that uses it (29 for the ship; until 2026-10-08 it was one per mesh, 159). The copy keeps every property of the source, physical ones included (transmission, specular…).
- **Compiled while loading:** after the ship loads, its shaders are compiled (`renderer.compileAsync`, with view culling off meanwhile so parts outside the view are included) before the ship counts as loaded. This removed a ~0.57 s freeze just after the ship first appeared.

## What gets cut (2026-10-08, second pass)

| Group | What | Rule |
|---|---|---|
| **Structure** | Tagged `structure: true`: hull, windshield, walls, ceilings, bulkheads, floors, doors, hatches, ceiling lights, engine pods, lab windows. **And furniture on the deck she isn't on** | The hole, **only while something solid hides her** (glass doesn't count): through the windshield there's no hole |
| **Furniture on her deck** | Everything else: tables, consoles, seats, bunks, lockers, ladders; props and other characters later | **Near the camera** (the first half of the way to her, tunable): cut by the hole **above her waist** only, so low furniture near the camera stays. **Near her:** whole, unless it hides **her head** or **more than a third of her** (coverage, tunable); then cut (by the hole, or a whole-object fade: switchable), fading in and out |
| **Exceptions** | `seeThrough: "keep"`: the 3D printer (owner: its frame and ray let her show through, and it frames the shot). `seeThrough: "solid"` (owner's test): every piece of furniture in the cockpit (seats, consoles, dials, monitors), the engineering ceiling machine (`Contraption`), the red sled. `divider: true`: the bulkheads and their doors, the crew quarters' inner walls, and **objects attached to a bulkhead** (found at load: within 3 cm of its surface) | *Keep:* never cut for hiding her; still cut on the other deck and above the waist near the camera. *Solid:* never cut on her deck, not even near the camera; cut on the other deck. **Bulkheads always visible** (toggle, on by default): the bulkheads, their doors and what's attached to them behave as *solid*. *Dividers:* **while the camera is inside the ship, solid unless they hide her** (owner: from inside, a divider is a wall of the room or a doorway that frames the shot); then, and from outside, the hole, or (toggle) cut as a whole |
| **Protected** | Dr. Green; the ground under her; while she walks, a point 1 m ahead of her feet (counts for furniture taller than her waist); look and interaction targets (a hook for Interaction, empty for now) | Never cut. **She always wins:** a look target that hides her is cut |

- **Coverage:** her silhouette is sampled with 12 points (3 across, ±0.2 m sideways as seen from the camera, × feet, hips, chest, head). Low furniture covering only her legs stays (the cockpit chair back, the crew-quarters table); something covering half of her is cut (lockers).
- **"Hides":** rays from the camera against each object's real triangles (bounding boxes alone were too coarse: `Dashboard Body` holds the whole cockpit floor). Each ship mesh has a **BVH** (`three-mesh-bvh`), built at load; rays are tested in each mesh's own space (cached inverse matrix; the ship doesn't move), after a cheap bounding-sphere rejection. **0.2 ms per frame** on the owner's PC. (Plain three.js raycasts took 15 ms once the structure was tested too: the hull and the Contraption are dense.)
- **Camera inside the ship:** no hull between the camera and her chest (the same BVH rays). Through the windshield counts as inside. "Unless they hide her" was added in testing: with the camera trailing behind an inner wall, a solid divider filled the whole screen.
- **The hole's own timing:** it eases open (0.3 s) as soon as something solid hides her and shuts after 0.3 s clear. Furniture cuts have their own size, on whenever she's inside, so they work while the hole is shut.
- **Fading:** each piece of furniture has a fade value (0 whole, 1 cut) that eases over 0.2 s; it starts fading out as soon as it hides her and comes back only after 0.3 s clear, so objects at the edge don't flicker.
- **Two looks** (tuning panel, owner: try both): **hole** (the same hole, only on furniture that hides her) and **whole-object fade** (the object dithers out, down to a *minimum visibility*: 0 = gone, e.g. 0.25 = a ghost).
- **Cut surface:** the inside of a cut is drawn in the surface's own colour, darkened (35%), or in one colour (toggle). Seen at the cockpit bulkhead, the dark slabs there are mostly the bulkhead's own black material, not the cut surface; cutting the **bulkheads as a whole** (toggle) removed them in that view.
- **Decks:** her deck from her feet height; an object's from the bottom of its bounds, against the upper floor's height. Objects spanning both decks (the cargo bay ladder) go by their bottom.
- **Per object, shared material:** group, fade and "cut whole" reach the shader as per-object uniforms (TSL `uniform().onObjectUpdate`, reading each mesh's `userData.cutStructure`, `cutFade`, `cutWhole`), so materials stay one copy per source material.
- **Objects:** a glTF node is one object (a Blender object with several materials loads as several meshes; they're grouped back by GLTFLoader's node associations). Its tags come from the nearest tagged node up its parents.

## The rules

| Situation | Behaviour |
|---|---|
| Inside the ship (Dr. Green's chest within the hull's bounds, from just below the cargo floor up: both decks) | Hole on, radius 1.44 m (owner: 20% bigger than the first 1.2 m), edge softness 0.25 m; grows in over 0.3 s when she enters, shrinks over 0.3 s when she leaves. Camera collision off |
| Outside | No cut (owner, 2026-10-08). **Camera collision:** a ray from her chest toward the camera; anything in the way (the ship), the camera moves in front of it (0.25 m short of the hit, but never closer than 1 m), then eases back out when clear. The ground is ignored (the camera is kept above it separately): with the camera tilted up, hitting the ground pulled it into her head |
| The ceiling (upper deck) | Cut by the same capsule only (owner, 2026-10-08). A full cutaway (hiding the ceiling while she's inside) remains an option |

## What's cuttable

**Everything inside the ship** (owner, 2026-10-08) may be cut: hull, walls, ceilings, furniture, consoles, and props and other characters once there are any (cutting only the hull and walls left uncut furniture floating in the hole, in the way). *When* each is cut follows the groups above. **Never cut:** Dr. Green, and objects tagged `cuttable: false`: the landing gear (outside the hull). **The cargo ramp** (owner, 2026-10-09) is structure while **closed or moving**: closed, it's the cargo bay's back wall, and the hole cuts through it; **fully open** it lies on the ground as the way in and is never cut. It moves, so its raycast data is refreshed whenever it does. Floors need no tag (see "Never the ground under her" above).

**For the game:** the structure group is tagged in Blender with `structure: true` (untagged = furniture, the safer default for props added later); exceptions with `seeThrough: "keep"` and `divider: true`; objects that must never be cut with `cuttable: false` (naming contract, [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md)); the exporter passes it through as glTF `extras` and the game reads `userData.cuttable` (on the mesh or any parent). Until the tags are set in Blender, `app/tools/export-ship.py` sets both from its own lists (it never overrides a tag already in the file). Two objects mix groups in the file: `Dashboard Body` (cockpit floor + console: furniture, its floor kept by the ground rule) and `Walls and seat.001/.002` (structure).

## Tuning (prototype panel → *See-through hull*)

On/off, radius, edge softness, target height, cut edge in own colour (and its brightness) or one colour, hole only when hidden, bulkheads cut as a whole; furniture look (hole / whole-object fade), fade minimum visibility, furniture fade time, time clear before it comes back, way-ahead distance, the near-camera part and the waist height above which it applies, coverage, a debug tint for furniture being cut; camera collision.

## Cost

Measured 2026-10-08 on the owner's PC (GTX 1070, headless Chrome, WebGPU, 1280×720), everything cuttable (52,200 triangles, 286 draw calls, 29 cuttable materials):

- **Per frame:** a few instructions per pixel, plus losing the GPU's early depth test on the whole interior and drawing back faces (double-sided). 60 fps (vsync-limited); no frame over 17 ms on first entry. Not yet measured on the MacBook.
- **Loading:** compiling the ship's shaders takes 2.2–2.6 s, during loading. Total stall time while loading is about the same as before (~3 s, which includes the character and scene). The ship appears ~0.7 s later, and the 0.57 s freeze just after it appeared is gone.
- **See-through rules:** 0.2 ms per frame for the rays (12 per piece of furniture, 5 against the structure), with a BVH per mesh; no change in frame time. BVHs are built at load.
- **Shadows (2026-10-09):** the ship's meshes don't draw themselves into the sun's shadow map any more: one merged, positions-only copy of the static ship does (on a layer only the shadow camera sees). Drawn with the see-through materials, every mesh took three.js's slow path in the shadow pass (a custom material per draw); the merged caster is one draw. The ramp, Dr. Green and the crew cast their own shadows.
- **Per-draw cost (audit, 2026-10-09):** any custom material (the mask, a per-object value) adds ~10 µs of three.js CPU work per draw; with ~500 ship draws that's ~5 ms per frame. The next win is using the see-through material only where something is cut (plain copies elsewhere).
- **Draw calls and shadows:** unchanged by the cut (every mesh is its own draw call either way; the shadow pass ignores the cut).

## Not done yet

- Oval or constant-on-screen-size hole, glowing rim (options from the original design notes).
- A real trigger-volume system for "inside" (today: one box, the hull's bounds).
- Tags set in Blender instead of by the export script.
