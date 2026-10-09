# Plan: The rest of the ship (props, interior lights, Dr. Kaufman)

**Status:** *built*, 2026-10-09 (approved with changes by the owner the same day); owner play-test pending. In prototype 01, like the ship so far.

## Decided (owner, 2026-10-09)

1. **Optimise what's simple now, skip anything complicated.** Done at export: **small props** (under ~0.4 m in game: books, mugs, jars, test tubes, chess pieces…) are **merged per room collection** into one object (one draw call per material per room); big props stay separate objects; identical materials are deduplicated (`gltf-transform dedup`). The palette material stays for later (complicated).
2. **Lights: 1 or 2 ambient lights per room; flag the rest.** Cargo bay, engineering, crew quarters: two each, taken from the file's strongest lights in that room; the cockpit has none in the file, so it gets one new light. The other file lights are listed below as flagged, not imported. The **4 nearest her** are on at a time (the budget: four real-time lights *switched on*, the ones nearest the player, so the room she's in is lit; they're not lights on the character), with a switch to turn all of them on.
3. **Props collision:** big props only (≥ ~0.4 m), as proposed; to be reviewed with the object interaction features.
4. **Other characters:** pull in the ones in the scene; they have no idle animations (static poses). **All characters are visible all the time** (never cut), to adjust later if needed.

> **[Agent note]** "In the scene": the file has three alternative arrangements of the crew: `Crew` (excluded; Dr. Kaufman with her animation is here), `Crew.001` (visible, inside the `Cockpit` collection: both Adam bodies, Dr. Ogawa, a copy of Dr. Green in the jumpsuit) and `Crew.002` (excluded, Dr. Ogawa in engineering). Imported: Dr. Kaufman (from `Crew`) and the visible `Crew.001`, minus Dr. Green's copy (she's the player). Importing all three would put three Dr. Ogawas and two of each Adam body on the ship.


## Goal

Bring in everything still missing from `The Zamboni 1.18.blend`: the small props, the interior lights, and Dr. Kaufman sitting on the crew quarters couch with her idle animation (owner, 2026-10-09).

**In:** the props in the room collections, the 15 area lights, Dr. Kaufman (`Dr. Kaufman.002`, jumpsuit, with her mug and `Dr. Kaufman.002Action`).
**Out:** the `Temple`, `Archive` and `Hidden` collections (owner, 2026-10-08); the ground and rubble; the boolean cutters; the cameras; the other crew in the file (Adam, Dr. Ogawa, Dr. Green's jumpsuit). Baked lighting (its own step).

## What's in the file (measured 2026-10-09)

- **Props:** 194 objects not exported yet, in Crew Quarters (13), Stuff (12), Galley (15), Shelf (18), Table (37, mostly the chess set), Engineering (70), Cargo Bay (21), Cockpit (6), plus 2 grates. About **40,000 triangles**, about **490 draw calls** as they are (one per material per object), **52 materials** (several new, some with image textures: screens, a photo, the ramen cup, coffee beans, keyboards). Includes one text object (`KEEP CLEAR`, cargo bay) and a cable curve.
- **Lights:** 15 area lights, all inside the hull: ceiling panels in the crew quarters, cockpit and cargo bay (1–20 W), two side lights in the cockpit (20 and 50 W), the laptop screen's glow (parented to the laptop) and a dim blue fill. All 1 × 1 m squares.
- **Dr. Kaufman:** `Dr. Kaufman.002` in the excluded `Crew` collection: the 16-bone crew skeleton, a 511-triangle jumpsuit mesh (mirror and geometry-nodes modifiers), a mug, and one action of 321 frames at 24 fps (13.4 s), on the couch.

## Constraints from the docs (conflicts flagged)

- **Budgets** ([`budgets.md`](../architecture/game-architecture/budgets.md), proposed numbers): ≤ **300 draw calls**, ≤ **30 unique materials**, **1 shadowed sun + ≤ 4 small unshadowed lights near the player**. The ship already uses 286 draw calls and 29 materials. **All three would be exceeded** by importing everything as it is (≈ 780 draw calls, ≈ 60 materials, 15 lights). The budget conventions (one palette material, merged geometry) are meant to fix this but aren't built yet (they belong to the measurement prototype).
- **Lighting** ([`asset-pipeline.md`](../../architecture/asset-pipeline.md)): interiors get baked lighting later; real-time lights here are a stand-in.
- **Export checklist** ("Before the next export"): crew rigs carry deforming bones with no weights (`Elbow_r`, IK targets): leave them out, as `export-crew-character.py` does; modifiers must be applied (mirror); report double-sided materials as `PERF:` and list them to the owner.
- **glTF can't carry area lights** (`KHR_lights_punctual` has point, spot and sun only), so the lights travel as marked empties with their settings as custom properties.
- **See-through:** props are furniture by default (cut only when they hide her); new cockpit props join "everything in the cockpit is always visible"; props touching a bulkhead behave like it (already automatic).

## Options

**1. Draw calls (the main decision)**

| Option | Draw calls | See-through | Cost |
|---|---|---|---|
| **A. Import as they are** | ≈ 780 | Per object, as now | Simplest. Over budget ×2.6: measure the frame time on the owner's PC; likely fine there, unknown on the MacBook |
| **B. Merge props into clusters at export** (the books on a shelf, the jars in a cabinet, the chess set, the things on a bench: joined per material) | ≈ 350–400 *(estimate)* | Per cluster (a shelf of books fades together) | Medium. A cluster list in the export script |
| **C. The palette material** (budget convention: flat colours into one shared material + a palette texture), then merge each room's props | ≈ 300 or less | Per cluster | Large: a step of its own (it's the measurement prototype's work) |

*Recommendation:* **A now**, measured; B or C as the next step if the numbers say so. This step is about seeing the ship full; the optimised pipeline is already planned elsewhere.

**2. Lights**

| Option | Look | Cost |
|---|---|---|
| **All 15 as area lights** (three's `RectAreaLight`) | Closest to Blender | 15 lights shading every pixel: likely heavy |
| **All 15 as point lights** | Softer approximation | Lighter, still ×4 the budget |
| **The 4 nearest her, as point lights** (budget) | Rooms she's not in go darker | Within budget |

*Recommendation:* the 4 nearest as point lights by default, with tuning-panel switches for *all 15* and *area lights* to compare look and cost; one brightness multiplier (Blender watts don't map one-to-one to three's units). Unshadowed. The sky fill (hemisphere light) stays, tunable.

**3. Collision for props:** small props (books, mugs, tubes…) get none; big ones (crates, chests, power cells on the floor, the microscope…: anything over ~0.4 m in game) go into the collider as convex hulls. *Recommendation:* that threshold, tunable in the export script.

## Result (2026-10-09)

- **Props:** 58 big props as separate objects (with colliders), 136 small ones merged into 8 room objects. Identical materials deduplicated. The ship file: **2.58 MB** (was 1.53), collider 171 KB.
- **Draw calls:** the ship's primitives went from 286 to **547** (≈ 780 without merging). Rendered, with the sun's shadow pass: **743–941** per view (props don't cast shadows: inside the hull the sun doesn't reach them; that saved ~270). **60 fps** steady on the owner's PC. Still over the 300 budget: the rest needs the palette material. Furniture not casting shadows either would bring a view to ~560 (not done: furniture shadows show in the sunlit cargo bay).
- **Materials:** 54 after dedup (budget 30). **Shader build at load: ~8 s** (was ~2.5 s) on the owner's PC: more materials, and the four room lights in every shader.
- **Lights:** 7 markers: two each in the cargo bay, engineering and crew quarters, one new in the cockpit. **Flagged, not imported:** `Area.004`, `Area.005`, `Area.006`, `Area.008`, `Area.009` (crew quarters ceiling panels, 1–2 W), `Area.010` (dim blue fill), `Area.011` (the laptop's glow), `Area.012` (3 W, crew quarters), `Area.014` (20 W side light, crew quarters). The 4 nearest her are on; *all* turns on the 7 (rebuilds every shader once, a stall of a few seconds).
- **Crew:** Dr. Kaufman on the couch with her 13.4 s loop (her unweighted bones `Elbow_r`, `Foot_l`, `Foot_r` left out, and the animation tracks for them dropped at load); both Adam bodies and Dr. Ogawa as static poses in the cockpit. 152 KB. Box colliders; never cut.

> **[Agent note]** The merged cargo bay props touch the cargo bulkhead, so the whole cluster behaves like the bulkhead (always visible on its deck). Small props rarely hide her; if it matters, split that cluster.

## The work

1. **Export (props and lights):** `export-ship.py` exports every render-visible mesh, curve and text object in the room collections (instead of only its lists), minus the excluded sets above; text and curves become meshes. Lights become empties named `light_*` with `light: {type, size, color, energy}` custom properties. Big props go into the collider. Re-export (checklist first), Meshopt.
2. **Export (Dr. Kaufman):** a new `export-kaufman.py` (or a mode of the crew script): the armature, mesh and mug as posed in the ship, modifiers applied, unweighted deforming bones left out, her action as one looping clip → `app/assets/test/kaufman-sitting.glb`.
3. **Game: lights** (`ship.ts` + new `lights.ts`): build lights from the markers; nearest-N selection each frame (her position); switches and brightness in the tuning panel.
4. **Game: Dr. Kaufman** (`crew.ts`): load, place her in the ship's space (same transform and scale), loop her clip with an `AnimationMixer`; a capsule collider so Dr. Green can't walk through her. **See-through:** she's furniture (owner: other characters are cut too); for the "hides her" rays she uses a simple box around her (rays against a skinned mesh are costly and wrong), and her cut copies of materials must be skinning-aware.
5. **See-through tags:** the new cockpit props join the cockpit's always-visible list; attachment to bulkheads is automatic.
6. **Check:** check and build; screenshots of each room (cargo bay, engineering, crew quarters with her animating, cockpit); draw calls, triangles and frame time from the stats readout (with *all 15* lights and with 4); download size of the ship file.

## Done when

- **Agent:** the above, no console errors, the numbers reported against the budget.
- **Owner:** play-test; picks the light setup; decides on option B/C for draw calls.

## Open questions

1. Draw calls: **A** (as they are, measure) for now? *(recommended)*
2. Lights: nearest 4 as point lights with switches to compare? *(recommended)*
3. Props collision: big props only, threshold ~0.4 m? *(recommended)*
4. Only Dr. Kaufman from the crew, or the others in the `Crew` collection too (Dr. Ogawa, Adam, Dr. Green's jumpsuit)?

## After

- `features/` doc for the ship's lights (or a section in a ship doc), `asset-pipeline.md` (light markers, prop collision rule, the Kaufman export), budgets measured, the prototype README, a decision-log entry (lights and the draw-call choice).

## Performance pass (owner, 2026-10-09)

*Status: shadow caster and crew sizes built, 2026-10-09; the rest to decide.*

- **Audit** (1920×1080, frame rate uncapped, headless Chrome on the owner's PC): ~9–11 ms per frame, almost all of it CPU time preparing draw calls (half resolution changes nothing). Main offenders in the crew quarters (~10.9 ms): **the see-through materials, ~5 ms** (any custom material, a mask or a per-object value, adds ~10 µs of three.js work per draw, × ~500 draws; plain materials render the same scene in 4.9 ms); **props, ~3–3.5 ms** (160–210 draws, mostly the 58 big ones); **the sun's shadow pass, ~0.7 ms** in draws (~310); characters ~0.8 ms; room lights ~0.5 ms. Removing the chess pieces wouldn't help (they're merged into the table's props object, ~0.3 ms in all).
- **Owner's numbers:** Chrome a solid 60 fps; **Firefox at 1080p a bit under 30 fps**. Firefox is set aside for now (owner: drop it unless there's an easy fix; to look into later).
- **Built now:** **one merged shadow caster** for the static ship (all its shadow-casting meshes joined, positions only, on a layer only the sun's shadow camera sees); the ship's own meshes stop casting; the ramp, Dr. Green and the crew keep their own shadows.
- **Crew sizes** (owner: the new characters were too big; Dr. Kaufman is shorter than Dr. Green, Dr. Ogawa about the same): scaled at export around their hips, to the crew file's proportions.
- **Measured after the merged caster** (1920×1080, uncapped, same views): crew quarters 835 → 556 draws, 14.9 → 9.9 ms; outside 385 → 119 draws; cargo bay 879 → 587 draws (time about the same). The ship's shadow looks identical (screenshots compared from the same spot). Making every transparent material opaque made no difference (owner asked: the glass and test tubes can stay).
- **Correction (same day): some crew quarters numbers above were inflated.** The test placed her inside the couch, where the physics character controller spends ~20 ms per step trying to push her out (and ~200 ms in one spot in engineering, which read as 1 fps). Not reachable in play: at every clear floor spot a controller step averages 0.1 ms (worst 1.8 ms). The comparisons above were made in the same spot, so they still hold as differences. **From clear spots** (1920×1080, uncapped): crew quarters 9.7 ms median (95th 11.9), engineering 6.1 ms (7.5), cargo bay 11.1 ms (12.9): above 60 fps everywhere in Chrome, matching the owner's play-test. The props' convex hulls in the ship collider make the controller's cost much higher *when she's embedded* (≈ ×4); if she ever gets pushed into something (the moving ramp), that would show as a stall.
- **Next, to decide:** see-through materials only where something is being cut (plain copies elsewhere, swapped per frame), the biggest win; merging big props into their room's object (owner: worried props fading together hurts interaction; test before deciding).
