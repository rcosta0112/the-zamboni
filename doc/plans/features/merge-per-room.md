# Static objects merged per room (SC-180, step 3)

> **[Agent note]** Step 3 of the [optimisation plan](optimization.md). Written 2026-11-18 after a talk with the owner: **the game must not look or work differently in any way**; the old see-through rules mode (per-object fades, unused) may stop working (owner: "we don't need the previous shader mode"). **Approved 2026-11-18, per room** (owner: "do it per room"). **Passes 1 and 2 built and checked 2026-11-18** (see *As built*); the owner's look and play to come.

## What

At load, the game joins the ship's static meshes into **one mesh per room and material**, so each room costs a few dozen draws instead of a few hundred. The file, its names, tags and see-through units are not touched: the merge happens in memory, the way the ship's shadow is already merged (`mergeShadowCasters`).

- **Measured 2026-11-18** (scratch probe): 372 visible ship meshes; 257 are static and in a see-through unit → about **45–60** merged draws; 55 move (doors, landing gear, turbines); 60 are in no unit (the hull-gap fills and others: to be sorted, some may merge too).
- **Estimate:** outside 458 → 150–200 draw calls; rooms 161–415 → 80–180. Inside the 300 budget everywhere.
- **Not helped:** the first-load shader compile (about 14 s cold). The merge adds a little to the load (a few hundred ms, to be measured).

## How

**Pass 1: the merge and the see-through.**
1. `src/merge-rooms.ts`: for each room (`Ship.roomsOf`, the bulkheads' places) and material, the static meshes' geometry baked to the ship's space and joined; the originals stay in memory but aren't drawn (the see-through's BVH rays, the colliders and the probes still use them).
2. **Left out:** anything that moves (doors and what's inside their hinges, the ramp, landing gear, turbines), anything shown, hidden or swapped (jetpack rack, her locker's clothes, the boombox, the coffee mug, animated screens), interaction points' objects, glass if it sorts. A list in the code, its reason per line.
3. **The see-through** (*hull only*, the mode in use): the only value that differs per object is "never cut on her deck" (`keepOnDeck`, `cameraWall`). It becomes a per-vertex attribute (its deck, its kind); the shader compares it with a uniform for her deck and the bulkhead setting. The hole, the dither and the cut edge stay as they are.
4. Each merged mesh keeps its own bounds, so rooms off-screen are still skipped.
5. **Once, when the ship loads**, before the start screen's warm-up frames: never at a scene's start (a frame drop, as the old shader stalls were). Any new shader variant (the per-vertex attribute) is built in that warm-up; the probe's pipeline count shows it.

**Pass 2: checking that nothing changed.**
1. `npm run see-through` screenshots of every room, compared with today's (differences only the dither's noise).
2. `tools/draw-calls-probe.js` before and after; load timed cold and warm.
3. Every door, ladder, prop and interaction tried by the smoke script; the probes for the scanner, binoculars and jetpack rack.

## Options

- **Per room (chosen, owner 2026-11-18)** or the whole ship as one set (fewer draws, ≈ 40; but nothing is skipped off-screen, and from inside the ship every room is drawn).

## Done when

The screenshots match, the smoke run has only the known failures, and draw calls are inside 300 in every view.

## Estimates

Two passes, a stop between them. The owner: a look at the screenshot comparison and a short play.

## Open questions

1. ~~Per room or the whole ship?~~ Per room.
2. **Loading times** (owner: "performance and loading times"): step 3 doesn't help them. Add a step to the optimisation plan: measure what the first load's 14 s is spent on, then cut it?

## As built (2026-11-18)

- `src/merge-rooms.ts`, called once in `loadShip` after the shadow's merge (the merged meshes don't cast; the shadow comes from the originals as before). `?merge=0` (dev) skips it. The hull gap's fill split out of `fillBackFaces` as `addHullGapFill` (cutaway.ts) for the merged hull parts. `watched.ts` (the camera's clear view) counts merged originals as drawn.
- **No shader change:** a group's key holds room, material, vertex layout, deck, `keepOnDeck`, `cameraWall`, drawn and hull part, so every original in a group gets the same see-through values; the merged mesh reads them from its first.
- **Vertices stored as the file's** (16-bit positions, 8-bit normals, interleaved), with a uniform scale and offset per merged mesh: the first try (plain floats) made 8 new pipelines (98 → 106) and squeezed positions into the quantized range. Measured against the originals: positions within 0.06 mm, normals within 0.33°.
- **Left apart** (diagnostic `userData.mergeApart`): entities 48 (keypads, seats, jetpack rack, ladder, door panels, props: shown, hidden or looked up by the game), alone in their group 37 (textured screens, keyboards, the floors' own materials, bulkhead frames), glass 18, shell 17. 25 merged meshes.
- **Measured** (`draw-calls-probe.js`): outside 458 → **304**, rooms 161–415 → **122–276**; pipelines 98 (unchanged); the merge 70–150 ms at load; compile ≈ 13 s cold, 1.9 s warm (as before, within run-to-run spread). Less than the plan's estimate (150–200 outside): the entities and the crew (34 draws, step 4) stay apart.
- **Checked:** every room's screenshot (`see-through-views.js`) merged against `?merge=0`: differences of the same size as two unmerged runs (single edge pixels, her close-up fade grain, random per frame); `npm run check`, `npm run build`; smoke 83 pass, the 4 known failures (SC-168), no console errors; `scanner-probe` 18/18, `scanner-aim-probe` 9/9, `binoculars-probe` 39/39.
- **Further, if wanted:** static entities (keypads, seats, the rack) merged too (`interaction.ts` `shown` would count merged originals as shown): about 20 draws; step 4 (the crew in the palette): about 20–25.
