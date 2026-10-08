# Plan: See-through hull

**Status:** *built*, 2026-10-08; owner play-test pending. Documented in [`features/see-through-hull.md`](../../features/see-through-hull.md). Step 3 ([`../../steps/03-see-through-hull.md`](../../steps/03-see-through-hull.md)). Design background: [`features/see-through-hull.md`](../../features/see-through-hull.md).

## Goal

In third person, cut a hole in the hull and walls between the camera and Dr. Green, so the camera can stay outside tight spaces and she's always visible. Built in TSL for `WebGPURenderer` and tested on the real ship, where the problem exists today: walking into the cargo bay puts the hull between her and the camera.

## Constraints from the docs

- Three.js r186, `WebGPURenderer`, TSL ([`architecture/stack.md`](../../architecture/stack.md)).
- Only tagged surfaces are cut (hull, walls, bulkheads, ceilings); floors, props and characters stay solid. Naming contract: `cuttable: true` ([`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md)).
- Performance: 30 fps on the MacBook (Iris Plus G7) ([`architecture/platform.md`](../../architecture/platform.md)).

## How it works

For every pixel of a cuttable surface: build a **capsule from the camera to Dr. Green's chest**. If the pixel lies inside it, between the two, it's **discarded**. The edge of the hole is **dithered** (a fixed noise pattern decides pixel by pixel), giving a soft-looking edge with no transparency, so there are no sorting problems.

| Piece | In r186 |
|---|---|
| The cut | `material.maskNode`: a TSL condition; the pixel is discarded where it's false |
| Hull keeps its full shadow | `material.maskShadowNode = true`: the shadow pass ignores the cut (otherwise the hole would also appear in the hull's shadow) |
| Clean edge (the hull looks solid in cross-section) | Cuttable materials double-sided; back faces drawn in one flat dark colour (`frontFacing`) |
| Uniforms (camera position, chest position, radius, softness, on/off) | TSL `uniform()`s, updated every frame |

**Cost:** a few instructions per pixel on cuttable surfaces only. Materials that can discard pixels lose an early-depth optimisation on some GPUs, which is why only the hull materials get it. Measured on the MacBook in the done-when checks.

## Rules (what gets cut, when)

| Situation | Proposed |
|---|---|
| **Inside the ship** | Cut on. Hole radius about 1.2 m, eased in over ~0.3 s when entering |
| **Outside** | **No cut** (owner, 2026-10-08). Instead, **camera collision**: when the hull or anything else gets between the camera and Dr. Green, the camera moves in front of it |
| **Ceiling / upper deck** inside | Cut by the same capsule (it's in the way when the camera looks down into the cargo bay) |

**Inside/outside** comes from a trigger volume: for the prototype, a box around the cargo bay, worked out from the cargo floor's bounds.

## Which surfaces are cuttable (prototype)

`Hull_Merged`, `Floor Top.001` (the cargo bay's ceiling = the upper deck floor), `Bulkhead Cargo`, `Windshield`, `Door` (side door), `Top Hatch`. Not cut: `Floor Bottom` (she stands on it), the ramp, landing gear, turbines.

In the prototype these are a list of names. For the game, the owner tags objects in Blender with a custom property `cuttable: true`; the exporter passes it through (glTF `extras` → `userData.cuttable`), and the game reads that. Nothing hard-coded.

> **Shared materials:** cutting is per material, and the ship's materials are shared between objects (e.g. the hull's teal is also on the turbines). The cuttable objects get their own copies of their materials, so the turbines using the same teal stay solid.

## Camera collision (outside)

Outside, the camera casts a ray (a thin sweep, so it doesn't clip edges) from Dr. Green's chest back toward its ideal position, against the physics colliders (ship, ground). If something is hit, the camera moves in front of it, then eases back out when the way is clear. Inside the ship, camera collision is off: the camera stays outside the hull and the cut makes her visible.

## The work

1. **TSL cut node** (`src/cutaway.ts`): the capsule test, the dither, the back-face colour; a function `makeCuttable(material)` that clones the material and sets `maskNode`, `maskShadowNode`, `side`, `colorNode` for back faces.
2. **Apply to the ship's cuttable objects** after loading.
3. **Inside/outside volume** around the cargo bay; hole radius eases between outside and inside values.
4. **Camera collision outside** (Rapier ray or shape cast against the colliders); off inside.
5. **Tuning panel → *See-through hull*:** on/off, radius, softness (dither width), back-face colour, camera collision on/off.
6. **Checks** (below), then update the docs.

## Options

**Where to build it:** **prototype 01** (owner, 2026-10-08). It already has the character, physics, camera and the ship with the cargo bay. A toggle keeps the old behaviour available.

**Hole shape.** Round (proposed to start). Options for later: oval (wider than tall), a hole that keeps a constant size on screen (radius scaled by camera distance), a faint glowing rim.

## Done when

- **Agent checks:** type-check passes; screenshots from outside the ship with Dr. Green in the cargo bay show her through a clean, round, dithered hole; the floor she stands on stays solid; the hull still casts its full shadow; no console errors; frame time noted.
- **Owner checks:** the feel on the PC and the MacBook (30 fps target): hole size, edge softness, the camera outside the ship.

## Open questions

1. ~~Where~~ Prototype 01 (owner, 2026-10-08).
2. ~~Outside~~ No cut outside; normal camera collision instead (owner, 2026-10-08).
3. ~~Ceiling: capsule or cutaway~~ **Capsule only** for now; tune the radius to fix issues (owner, 2026-10-08). The cutaway stays an option.

## After

- `doc/features/see-through-hull.md` rewritten to describe what was built (TSL version, the rules, the tagging).
- Naming contract: `cuttable: true` confirmed in `architecture/asset-pipeline.md`.
- Decision-log entry for the rules chosen.

## Addition (owner request, 2026-10-08): cut everything inside the ship

*Status: built, 2026-10-08 (approved by the owner the same day); owner play-test pending.*

> **[Agent note]** Changed while building: floors are protected by direction (upward-facing surfaces below her feet are never cut), not by a `floor` tag. The cockpit floor is part of `Dashboard Body`, and the pallet and hatches are walkable too, so a name list would have missed walkable surfaces. Same cost, no tag needed.

**Why:** with only the hull, walls and tall furniture cuttable, the uncut objects (seats, couch, table, consoles, monitors, the 3D printer, racks…) stay whole inside the hole and float in the way.

**Conflict with the docs (flagged):** [`features/see-through-hull.md`](../../features/see-through-hull.md) says "never cut: floors, low furniture, the ramp, landing gear, characters, props". This addition replaces it. The naming contract ([`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md)) tags what *may* be cut (`cuttable: true`); it would flip to tagging what must *not* be cut.

**The rule:** everything in the ship file is cuttable unless tagged `cuttable: false`. Never cut: Dr. Green. Tagged `cuttable: false` by the export script until it's set in Blender: the cargo ramp and the landing gear (outside the hull; the camera never looks through them from inside). Floors need no tag: nothing below her feet + 0.15 m is cut already.

**Measured (ship file as exported 2026-10-08):**

| | Meshes | Draw calls | Triangles | Source materials |
|---|---|---|---|---|
| Cuttable today | 41 | 159 | 31,100 | 21 |
| Not cuttable today | 37 | 127 | 21,100 | 26 |
| Whole ship | 78 | 286 | 52,200 | 29 |

**Performance:**

- **GPU (small):** the cut test is a few instructions per pixel. Two real costs:
  - Surfaces that can discard pixels lose the GPU's early depth test. With everything cuttable, that covers the whole interior.
  - Cuttable materials are double-sided, so the back faces are drawn too (that's what makes the cut edge look solid).
  - At 52k triangles and 286 draw calls the ship is small, so neither should show on the owner's PC. The MacBook is the one to measure.
- **Draw calls and shadows:** unchanged. Every mesh is already its own draw call, and the shadow pass ignores the cut.
- **CPU and loading (the real cost today, and a fix):** each cuttable mesh gets its *own* copy of its material, so there are 159 copies today and there would be 286. Each copy builds its shader nodes the first time it's drawn. That's the ~1 s drop to 11 fps when the ship first appears. The fix:
  - **One cuttable copy per source material**, about 29 in all, shared by every mesh that uses it.
  - **Compiling them while the ship loads** (`renderer.compileAsync`), so the stutter goes into the loading time.
  - With both, "cut everything" should cost less than today's setup.

**The work:**

1. `ship.ts`: every mesh in the ship file is made cuttable unless it or a parent has `cuttable: false`.
2. `cutaway.ts`: cache the cuttable copy per source material (and per floor/not-floor); the height rule only on floor materials.
3. Precompile the ship's materials after loading.
4. `export-ship.py`: write `cuttable: false` on the ramp and landing gear, and `floor: true` on the floors, instead of `cuttable: true` on its list (never overriding a tag already in the file).
5. Re-export the ship (export checklist in `architecture/asset-pipeline.md` first).

**Done when:** check and build pass. In the browser, inside the ship: seats, table and consoles in the hole are cut; floors, ramp and landing gear stay; no console errors. The first-entry frame-time drop is measured before and after (a screenshot with the frame-time readout).

**Answered (owner, 2026-10-08):**

- **Props and other characters inside the ship are cut too** (Dr. Green never).
- **Stubs:** the "never below her feet + 0.15 m" rule exists to keep the floor she stands on (the camera line passes close to it; upstairs, that floor is also the cargo bay's cuttable ceiling). It applied to every cuttable surface, so with furniture cut, its bottom 15 cm would stay as stubs. **Proposed:** the height rule applies to floors only, tagged `floor: true` (by the export script from its list until it's set in Blender). Everything else is cut all the way down. Same cost (one value per material). Approved by the owner; built by surface direction instead (see the agent note above).

**After:** `features/see-through-hull.md` (rules, what's cuttable, cost), the naming contract, and a decision-log entry.
