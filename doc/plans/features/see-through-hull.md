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
