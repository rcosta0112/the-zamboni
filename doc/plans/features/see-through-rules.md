# Plan: See-through rules (what gets cut, and when)

**Status:** *built*, 2026-10-08 (approved the same day); owner play-test pending (look A vs. B, tuning). Follows [the see-through hull plan](see-through-hull.md) (built). Step 3 ([`../../steps/03-see-through-hull.md`](../../steps/03-see-through-hull.md)).

## Goal

Cut only what hides something the player needs to see. Today everything inside the capsule from the camera to Dr. Green's chest is cut, so furniture that doesn't hide her is cut too (the bench beside her in the cargo bay, the table in the crew quarters, the cockpit's front panels). The owner first described the cases as exceptions ("waist-high", "close to her", "in her field of view"). They all come down to one rule: **does it hide her (or something else the player needs to see) from the camera?**

**In:** the three groups and their rules, the occlusion test, fading, two looks for furniture to compare (hole vs. whole-object fade), the tags.
**Out:** the look-at / head-turn system (Interaction, later; see [`../../architecture/README.md`](../../architecture/README.md)). This plan only leaves a hook for its targets.

## Constraints from the docs

- [`features/see-through-hull.md`](../../features/see-through-hull.md): everything in the ship is cuttable except `cuttable: false`; upward-facing surfaces below her feet are never cut; one material copy per source material; shaders compiled while loading. All kept.
- Naming contract ([`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md)): `cuttable: false`. This plan adds one tag (below).
- The "inside" test is still one box (the hull's bounds), until trigger volumes exist.

## The rules

| Group | What | Rule |
|---|---|---|
| **Structure** | Hull, windshield, walls, ceilings, bulkheads, doors, ceiling lights, engine pods, hatches. **And every object on a deck she isn't on** | The capsule hole, as today (radius 1.44 m, dithered edge). It gives context: you see into the room |
| **Furniture on her deck** | Everything else: tables, consoles, seats, bunks, lockers, ladders, props, other characters | Fully visible, **unless it hides a protected target**; then it's cut (look A or B below), with a fade |
| **Protected** | Dr. Green; the ground under her; the way ahead; her look target and interaction target (hooks, empty for now) | Never cut |

- **She always wins** (owner, 2026-10-08): if a look or interaction target hides her, it's cut like any furniture.
- **The way ahead:** while she moves, a point about 1 m ahead of her feet in her walking direction is protected, so furniture hiding the floor she's about to walk onto is cut.
- **Ground:** the existing rule (upward-facing surfaces below her feet + 0.15 m are never cut) applies in every mode, so a fading object that contains floor (the cockpit's `Dashboard Body`) keeps its floor.
- **Decks:** "her deck" comes from her feet height; an object's deck from the bottom of its bounding box. Two decks, from the two floor objects. Ladders and anything spanning both decks: by their bottom (cargo bay ladder = lower deck).

## How it works

- **Occlusion test, every frame, on the CPU:** for each furniture object on her deck, does its bounding box (in its own space, slightly enlarged) cross a line from the camera to a protected point? Her points: head, chest, hips, feet; plus the way-ahead point and any look/interaction target. About 40 objects × 5–6 lines of ray-box tests: microseconds.
- **Fading:** each object has a fade value (0 = whole, 1 = cut) that eases toward its target over ~0.2 s (tunable). **Hysteresis:** it starts fading out as soon as it hides a target, and comes back only after it has been clear for ~0.3 s (tunable), so objects at the edge don't flicker.
- **Per object, shared material:** the fade value reaches the shader through a per-object uniform (TSL `uniform().onObjectUpdate`, available in r186), so materials stay shared (one copy per source material).
- **Two looks for furniture, switchable in the tuning panel (owner: try both):**
  - **A. Hole:** the capsule hole applies to the object only while it hides a target, its radius scaled by the fade.
  - **B. Whole-object fade:** the whole object dithers out (the same 4×4 ordered pattern as the hole's edge), down to a *minimum visibility* slider (0 = gone; e.g. 0.25 = a faint ghost that keeps the room readable).
- **Structure** keeps today's behaviour, including the cut-edge colour on back faces.

## Tags

- New custom property **`structure: true`** for the structure group (glTF extras → `userData.structure`). Untagged = furniture, so props and characters added later are furniture by default (the safer default: they're only cut when they hide her).
- Set by `export-ship.py` from a list until it's set in Blender, never overriding a tag already in the file (as with `cuttable: false`).
- Proposed list: `Hull_Merged`, `Windshield`, `Door`, `Top Hatch`, `Top Hatch Bottom`, `Hatch.002`, `Floor Bottom`, `Floor Top.001`, `Bulkhead Cargo`, `Bulkhead Cockpit`, `Crew Quarters Ceiling`, `Crew Quarters Sitting Area Walls`, `Walls and seat.001`, `Walls and seat.002`, `Door Boolean.001`, the interior doors, the ceiling lights, the four engine pods, `Lab Window`, `Lab Window.001`.

> **[Agent note]** Two objects mix groups in the Blender file: `Dashboard Body` holds the **cockpit floor** and the console body, and `Walls and seat.001/.002` hold walls and seats. They work as they are (the ground rule keeps the floor; the walls-and-seats go with structure). If the cockpit floor and the console were separate objects, the console could be furniture and the floor structure, which is cleaner. Owner's call, in Blender.

> **[Agent note]** Changed while building: (1) "hides" is tested with rays against the object's triangles, not its bounding box (`Dashboard Body`'s box covers the whole cockpit floor, so she'd always be inside it). (2) Added a **near-camera rule**: furniture on the first half of the way from the camera to her (tunable) is cut by the hole anyway. The first test showed near-camera furniture (a bunk end, a wall cabinet) staying whole and filling the view, though it hid nothing protected.

## The work

1. **Export:** `structure: true` tags in `export-ship.py`; re-export (checklist in `architecture/asset-pipeline.md` first).
2. **Groups and decks** (`ship.ts`): list the furniture objects with their local bounding boxes and deck; deck heights from the two floors.
3. **Occlusion and fade** (new `visibility.ts`): protected points, ray-box tests, fade with hysteresis, written to each object's `userData`.
4. **Shader** (`cutaway.ts`): structure as today; furniture by look A or B from its per-object fade; the ground rule in both.
5. **Tuning panel** (*See-through hull* folder): furniture look (hole / fade), minimum visibility, fade time, hysteresis, way-ahead distance; a debug toggle that tints furniture currently hiding a target.
6. **Check** in the browser: the screenshot case (bench beside her: whole), the crew-quarters table and cockpit panels (whole with the camera behind her, cut with the camera in front of her), furniture upstairs while she's downstairs (cut in the hole), frame time.

## Done when

- **Agent:** check and build pass; screenshots of the cases in step 6 with both looks; no console errors; frame time unchanged.
- **Owner:** play-test with the gamepad; picks look A or B (or keeps the switch); tunes fade time and minimum visibility.

## Open questions

- None blocking. Look A vs. B is answered by the play-test.

## After

- `features/see-through-hull.md` (the three groups, the rules, the chosen look, cost), the naming contract (`structure: true`), the prototype README, a decision-log update.

## Second pass (owner play-test, 2026-10-08)

*Status: built, 2026-10-08 (approved by the owner: "write the plan and run it as is; we'll figure out the exceptions after"); owner play-test pending.*

> **[Agent note]** While building: the structure rays made plain three.js raycasts cost 15 ms per frame (the hull and the Contraption are dense), so `three-mesh-bvh` (already in the stack) was brought in, with cached per-mesh inverse matrices and a bounding-sphere rejection: 0.2 ms. Furniture's cuts got their own size, separate from the hole's, so they still work while the hole is shut.

The owner's play-test found seven edge cases (screenshots in the conversation of 2026-10-08). Most come from one weakness: "hides her" was any one of four points on a single line through her middle, so low furniture covering only her legs was cut, and a locker covering half of her wasn't.

**Principle (owner):** most of the game is spent in the ship, so **every camera angle there should look good and interesting**, even if that takes extra work and exceptions. Bad angles will happen in a third-person game; they're mitigated as much as possible.

| Case | Fix |
|---|---|
| Chair back in front of her (cockpit), centre table (crew quarters): should stay | **Coverage rule** (below): they only hide her legs |
| Lockers covering half of her (cargo bay): should be cut | **Coverage rule**: the wider set of points sees them |
| The 3D printer in front of her: should stay | **Exception** (owner): tagged `seeThrough: "keep"`. Its frame and ray let her show through, and it frames the shot |
| The bench near the camera (cargo bay): could stay | **Near the camera, cut only above her waist** |
| The hull around the windshield (camera in front of the cockpit): should stay | **The hole opens only when something solid hides her**; glass doesn't count. Controls: decided after seeing it |
| The cockpit bulkhead's cut looks strange (black slabs) | **Cut surface in the object's own colour, darkened**, and a toggle to cut bulkheads **as a whole** instead of by the hole |

**The rules after this pass:**

1. **Coverage:** her silhouette is sampled with 12 points (3 across, at ±0.2 m sideways from the camera's view, × 4 heights: feet, hips, chest, head). Furniture is cut if it hides **her head** (the centre head point) or **more than a third of the points** (tunable).
2. **The way ahead** only counts for furniture taller than her waist (low furniture hiding the floor ahead stays: she'd be walking into it anyway).
3. **Near the camera** (the first half of the way to her, tunable), furniture is cut by the hole only **above her waist** (tunable height, default half her height), like a cutaway at waist height. Low furniture near the camera stays.
4. **The hole opens only when needed:** each frame, rays from the camera to her (5 points: head, chest, hips, and the chest ±0.2 m sideways) against the structure. Transparent materials (glass) don't count. If something solid hides her, the hole eases open (0.3 s); if not, it eases shut after 0.3 s clear (no flicker).
5. **Exceptions, `seeThrough: "keep"`:** never cut by the furniture rules (coverage, way ahead). Still cut like structure on the other deck, and above the waist near the camera. First entry: `3d Printer`. Set by the export script from a list until set in Blender.
6. **Cut surface colour:** the inside of the cut is the surface's own colour, darkened (tunable, default 35%), instead of one dark colour. The single colour stays as an option.
7. **Bulkheads as a whole (toggle):** objects tagged `divider: true` (`Bulkhead Cargo`, `Bulkhead Cockpit` and their doors) can be switched from the hole to the furniture rules with a whole-object fade.

**Tags:** `seeThrough: "keep"` and `divider: true`, added to the naming contract.

**Cost:** about 12 rays per furniture object instead of 4, plus 5 rays against the structure (the hull is the largest mesh). Measured before and after; if the structure rays are slow, the fix is `three-mesh-bvh` (already planned in the stack for camera raycasts).

**Out of scope, noted for the camera work:** the camera avoiding bad angles itself (e.g. sliding along walls instead of passing behind lockers). Recorded in [`architecture/README.md`](../../architecture/README.md).

**The work:** export tags and re-export (checklist first); coverage, way-ahead, keep and divider rules in `visibility.ts`; the hole-only-when-needed test; shader: above-waist near-camera cut, own-colour cut surface, whole-fade for dividers; tuning panel; browser check of the seven cases' situations; docs.

**Done when:** check and build pass; screenshots of each case; no console errors; frame time and ray cost measured. Then the owner play-tests and names further exceptions.
