# The ice and the water from the penguin scene

> **[Agent note]** Status: **both built on a test page, not in a scene** (2026-11-18; the water: "build the shader"; the ice: "continue", read as the go for pass 1). The owner's water look is the default. Source: the owner's `resources/models/Penguins Scene 1.01.blend`, materials `Ice 3` and `Water 4 AO`. Owner, 2026-11-18: the look needn't match exactly, it should look nice and cost little; **the ice's noise textures go** (in Blender they were what cost the most, and they aren't needed); **the water keeps its noise**.

## What

- **The ice:** the file's subsurface scattering gets a cheap stand-in that does what it does in the render: soft shading between the low-poly faces, blue on the faces turned away from the sun and at thin edges, and the rest nearly white.
- **The water:** the file's animated Voronoi web (a thin white line along the cell edges over dark teal water), plus what the file lacks: **a white border where the water meets other objects**.

## Left out (owner, 2026-11-18)

The **ice's noise textures**: the two roughness noises (detail 14, blended by camera distance) and the bump noise. Roughness becomes one value; the faces stay flat. (The water's bump is left out too, but only because its strength is 0 in the file: it does nothing.)

Also left out: real transmission or screen-space blur (an extra render pass each), and baking the lighting (conflicts with the outside's own light, below).

## Constraints from the docs

- **[The outside's own light](../../decision-log.md)** (2026-10-23): outside materials are lit by the game's sun and their own sky light. So both materials use that lighting, with the ice's change written as its own lighting model.
- **Budgets ([optimisation](optimization.md)):** 300 draw calls a view. The water adds one; each material adds one or two pipelines.
- **TSL has no 4D noise/Voronoi** (see `current.md`): the web is written by hand.

## The work

1. **The ice.** A TSL material on the outside's lights, with:
   - wrapped diffuse light, tinted blue where it wraps past the lit side;
   - a blue tint at glancing angles;
   - the file's base colour, metallic 0.38 and teal specular tint, with one roughness value.

   On the tuning panel: the wrap, both tints and the roughness.
   *Build ~30 min; 1–2 review rounds of ~10 min.*

   **As built (2026-11-18):** `src/ice.ts` (`createIce({ lightsNode, look })`): `MeshStandardNodeMaterial` with its own lighting model (three's physical model plus each light's wrapped share past the lit side, tinted, Lambert's 1/π) and the rim as emissive. Defaults: the file's colour and metallic 0.3843, roughness 0.73 (the noise ramp's middle), wrap 0.5, tint (0.2, 0.55, 1) × 1.6, rim (0.3, 0.7, 1) power 3 × 0.2. The file's teal specular tint left out (needs the physical material, a heavier pipeline). On the test page: three icebergs and the submerged blocks, panel *Ice*, *Copy ice look*; `water-shots.mjs` takes it with and without the stand-in (`ice`, `ice-plain`). No backlit glow (SC-182 asks).
2. **The water: the shader, on a test page** (owner, 2026-11-18: "build the shader", not in a scene yet; it's for **a shallow pond** in a scene the owner is making). `src/water.ts` makes the material; a dev-only page, `water-test.html`, shows it on a pond with a sloped bed, rocks and a moving capsule. One plane, semi-transparent (drawn after the solid objects, no depth written). After [Roystan's toon water](https://roystan.net/articles/toon-water/) for the depth, the Blender file for the web. Features:
   1. **Water depth:** the scene's depth under each pixel (as `clouds.ts`) turned into the height of the bed below; depth = the surface's height minus it, **measured straight down**. One read, shared by 2, 3, 6 and 7.
   2. **Depth colour:** shallow → deep over a max depth, optionally in flat bands.
   3. **See-through shallows:** opacity rises with depth.
   4. **The web:** a 2D Voronoi (cell points drifting over time, like the file's W) with F1 and smooth F1 in one loop, subtracted and ramped (0.041–0.068).
   5. **The file's noise bends it** (scale 2.42 on Y): a read of the noise tile `terrain.ts` makes; drifting slowly.
   6. **Lines as caustics:** the web fades with depth.
   7. **Foam:** near the shore the web's cutoff drops so the lines thicken into foam, solid at the edge, broken up by the noise. Characters get it where they cross the surface (no rings or wake: owner).
   8. **Clean edges:** a narrow smoothstep on every cutoff.
   9. **Surface:** the file's metallic 0.69, roughness 0.2, with the sky's reflection (the file's world gradient) by Fresnel; the foam matte.
   10. **Panel** (on the test page): every value above.

   Left out: the normals buffer, vertex waves, refraction. **Into a scene later**, once the owner has made it (then the outside's lights, the panel in `tuning.ts`, the measurements).
   *Build ~1 h; 2–3 rounds of ~10 min.*

   **As built (2026-11-18):** `src/water.ts` (`createWater(noise, { noiseCells, lightsNode, look })`), the page http://localhost:5202/water-test.html (`src/water-page.ts`: a 14 m pond, 0.9 m deep in the middle, a gentle beach and a steep bank, four rocks through the surface, two blocks of ice under it, a capsule walking in and out; lil-gui, the look kept in the browser, *Copy look*), screenshots `node tools/water-shots.mjs`. All ten features in. Found: the noise tile has 32 cells across it, so the noise scales are in noise cells a metre; 5 × 5 cells tried for smooth F1 (as Blender): no visible difference, so 3 × 3. **The owner's look is the default** (2026-11-18: larger slower cells, thinner lines, metalness 0, roughness 0.693, reflection 2). 60 fps (headless Chrome's cap), no console errors; check and build pass (the page isn't in the build). **For a scene later:** pass the outside's `lightsNode`, move the panel into `tuning.ts`, the owner's look as `WATER_DEFAULTS`, measure draw calls and pipelines.

Stop to look after each pass.

## Done when

`npm run check` and `npm run build` pass, there are no console errors, and the draw calls and pipelines are measured before and after (`draw-calls-probe.js`). The owner looks at each pass.

## Open questions

1. **The ice:** do you also want light coming through from behind (three's `MeshSSSNodeMaterial`: the ice glows when the sun is behind it, with a thickness per vertex baked in Blender)? Not in the passes above.

## After

What exists goes in `doc/features/scenery.md`; the decision (ice without subsurface scattering or noise) goes in the decision log.
