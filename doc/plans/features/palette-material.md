# One palette material for the ship's colours (SC-180, step 2)

> **[Agent note]** Step 2 of the [optimisation plan](optimization.md), after the textures as WebP (owner, 2026-11-18). The palette image is lossless and not blurred by mipmaps (see there).

> **[Agent note]** **Pass 1 built 2026-11-18** (see *As built*: two changes from the text below, OK'd by the owner the same day: "no issues on step 2"). **Pass 2 (measuring) done the same day: step 2 is done.**

> **[Agent note]** Written 2026-11-18 after the owner asked how much work it is and what it gains (chat). Reviewed. The owner's message was cut off ("make a plan. let…"); the defaults below are recommendations, see *Open questions*.

## What

The ship's flat colours (Black, the Grays, the Teals, the Browns, White, Red…) become **one material, `Palette`**, that reads its colour from a small palette image. Exceptions keep their own materials: glass and anything transparent, textured materials (screens, keyboards, maps, floor tiles, grate), anisotropic metal, and materials the code looks up by name.

- **Done at export, not in the `.blend`** (recommended): `export-ship.py` builds the palette in memory, in the same Blender session that already merges the props. You keep editing named colour materials in Blender; every export rebuilds the palette. Nothing is saved to the file.
- **Why:** the ship has 60 materials and 660 drawn primitives (meshes × materials). With the palette, ≈ 364 (main colours) or ≈ 316 (metals and emission colours too). Measured from `public/test/zamboni-ship.glb`, 2026-11-18. This also makes merging static objects per room possible later, which is where the bigger draw-call cut is (≈ 100–150; not in this plan).

## How

**Pass 1: the export (Blender).**
1. A list of the palette's materials in `tools/` (the colour names), not guessed: a material joins only if it's opaque, untextured and not used by name in the code (`Floor Tiles`, `Grate` in `ship.ts`; `Teal Dark` on the jetpack in `exhaust.ts`: either kept out or the code changed to find the rings another way).
2. The palette image: one 4×4 px square per colour (base colour), plus a second image with the same squares for **roughness and metalness**, so each colour keeps its look. Specular level, if they differ, goes in a third (glTF's specular texture), or is unified if the screenshots show no difference.
3. For each exported mesh: faces of a palette colour get all their UVs on their square's centre (no unwrap needed); their slots become one `Palette` slot. Textured faces keep their UVs. Linked meshes are edited once.
4. Emission colours (White, Blue, Red Emission) in a second material, `Palette Emission`, with an emission image (if option B).
5. Tried on a scratch copy first. The export's summary line gets the palette's counts (colours, materials before → after).

**Pass 2: the game and measuring.**
1. `npm run see-through` screenshots of every room, compared with today's; anything different shown to the owner.
2. `pipelines.ts`: the palette meshes now have UVs (fine; its layout rules already handle it). Check the console's pipeline count.
3. Load timed cold and warm (as in faster-load), draw calls counted per view, before and after.

## Options

- **A. Main colours only** (≈ 23 materials → 1; 660 → ≈ 364 primitives). Least risk to the look.
- **B. A, plus the plain metals (via the roughness/metalness image) and the 3 emission colours** (≈ 316 primitives, ≈ 31 materials). **Recommended**: within the 30-material budget, little more work.

## Estimates

- **Agent:** pass 1 about one session, pass 2 a short one. **Owner:** one look at the screenshot comparison, then the game.
- **Export time:** +5–15 s on today's 22–37 s.
- **Load:** download +50–150 KB (UVs back on ≈ 132,000 vertices, which compress very well); shader compile 0 to −1 s; overall about the same to slightly faster.
- **Frame rate:** no change on the GTX 1070 (already 60 fps); less CPU per frame, to measure on the MacBook.

## Done when

- The see-through screenshots match today's (within run-to-run noise), or the differences are approved.
- The after-export check passes; draw calls and materials counted before and after, the load timed; `npm run check`, `npm run build`, the smoke once.

## Open questions

Answered by the owner 2026-11-18: **at export**; **option B**; no colour is animated or changed in the game so far.

## After

`asset-pipeline.md` (the palette step, the rule for what joins it), `tools/README.md`, `budgets.md` (the new counts), a decision-log entry (extends *One material per colour*, 2026-10-21).

## As built (pass 1, 2026-11-18)

- **Two changes from the plan, flagged to the owner:**
  1. **A step after Blender, not in `export-ship.py`:** [`tools/palette.mjs`](../../../app/prototypes/0.0.2/tools/palette.mjs), run by `export.mjs` after `resize` (`resize, palette, dedup, uvs, webp, meshopt`). Same result (in memory, nothing saved to the `.blend`), with exact control over the glTF's specular, IOR and sampler. Which materials join is a rule, not a list (opaque, single-sided, untextured, no extension but specular / IOR / emissive strength; `KEEP_APART` for names the code reads); the summary lists what joined and why the rest stayed apart.
  2. **`Palette` and `Palette Metal`, not `Palette` and `Palette Emission`:** emission fits in the same material (an emission image, black for the colours that don't glow), but the game gives the sky's reflection per material, to metalness 0.5 and above (`cutaway.ts`): one material made every colour reflect (lighter everywhere, seen in the screenshots). So the split is by metalness: 25 colours in `Palette`, 5 in `Palette Metal` (`Metal`, `Gray Metal`, `Orange Metal`, `Black Mirror`, `Red Emission`).
- **Exact values:** base colour, emission × strength (the material's strength the largest, 5; images scaled), roughness, metalness (`Palette`'s factor its highest, 0.29), specular intensity (three uses it for F90 too) and specular colour, corrected for the IOR (palette 1.45; materials without the IOR extension had 1.5). Four images, 128 × 64 px, 16 px squares, lossless, sampled nearest.
- **1.22:** 30 colours joined (also `Screen 1`, `Lime Green`, `Shiny`: untextured emission); 60 → 32 materials; 613 → 284 primitives in the meshes; the file 2.07 → 1.90 MB. Kept apart: `Black Metal` (anisotropy), glass and transparent ones, textured ones, 4 double-sided ones (`Receiver Dial Marks`, `Receiver Tag`, `Radio Dial`, `Color Palette Emission`), `Floor Tiles`, `Grate`.
- **Two consequences in the game, fixed:** a node with one material now loads as a mesh, not a group: (a) the see-through's hull-gap fill copied its mesh's `userData`, so the engineering window's fills became two extra doors (*Open window* / *Open door* targets): `cutaway.ts` now gives the fill only the four cut values; (b) `see-through-views.js` found `Pallet` and `Seat` by a group's child names: it now finds the node (`Seat001` for the cockpit).
- **Checked:** the gate saw only materials differ (194 objects, 91,119 triangles, unchanged); the after-export check passes; screenshots of the cargo bay, engineering and the crew quarters match step 1's within noise (mean difference ≤ 0.7 / 255). **The cockpit had no current baseline** (the script had missed it since before step 1; its old shots are from October): looked at, nothing wrong seen. `npm run check`, `npm run build`; smoke: 82 pass, 5 fail (the 4 known, SC-168, and the boombox's, SC-51, now and then); no console errors.
- **Not done (pass 2):** draw calls per view, the load timed, the pipeline count.

## As built (pass 2, 2026-11-18)

- **Measured by** [`draw-calls-probe.js`](../../../app/prototypes/0.0.2/tools/draw-calls-probe.js) (headless Chrome, `?test`, the landed ship with its shadows; draw calls per frame averaged over 30 frames, every pass counted). The step-1 file loaded by a new dev-only switch, `?ship=<name>` (`.export/<name>.glb`, `ship.ts`). Outputs: `.export/draw-calls-before.txt`, `-after.txt`.
- **Draw calls about halved in every view** (before → after): the start view and outside 895 → 458; the crew quarters 782 / 376 / 587 → 415 / 217 / 327; the cockpit 386 / 593 / 360 → 228 / 326 / 216; the cargo bay 445 / 340 / 576 → 219 / 175 / 278; engineering 359 / 487 / 290 → 186 / 232 / 161. Triangles unchanged (188k with everything in view). **Still over the 300 budget** from outside and in the crew quarters' and cockpit's wider views: step 3 (merging per room) is where that falls.
- **Pipelines** 100 → 98 (the vertex and fragment programs unchanged, 82 / 55): the palette's colours already shared their shaders, so **the compile hardly moves**: cold 15.2 → 14.4 s, warm (a reload) 3.0 → 2.1 s (one run each: the cold figure is within run-to-run noise). The first load's compile is still the largest load cost.
- **Not measured:** the frame time (60 fps capped on this PC either way; the gain is CPU per frame, for the MacBook).
