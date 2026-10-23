# The exterior shots' look (the ice, the hull, the glass)

**Status:** approved 2026-10-23 (owner: *"run the next pass"*; the reference: **frame 240, the F12 render**; "too dark" means the ship's contact shadows, which the outside's light should fix). **Pass 1 done** (agent note below). **Pass 2b done** (agent note under it). **Pass 2, the grain, done** (agent note under 2b). **Pass 4 done** (agent note under it): **all passes built; the owner looked, 2026-10-23: no issues.** **Pass 3 done** (agent note under it; the order changed with the owner: 3 first, then 2b, the grain, 4).

## Goal and scope

Make cutscene 1, and later the other exterior shots, look like the owner's fly-by in Blender (`resources/models/The Zamboni 1.11 - fly by animation ACES.blend`: ACES 1.3, world strength 2). The owner, comparing a Chrome screenshot with Blender, 2026-10-23:

1. The shadows are still far too dark, and the ship lacks the blue tint that Blender's global illumination gives it.
2. The glass is completely transparent: exterior shots need a second glass material.
3. The ice isn't blue enough, and its roughness pattern is too strong.

- **In:** the ice; the hull's outside and its glass, **during exterior cutscenes only** (the cutscene player's shots while the ship flies, as the thrusters' flames).
- **Out:** the interior's light, the cockpit view and the landed scenes (unchanged); the colour transform (ACES, as in the reference); the rocks' shapes and the scatter.

## What we know (measured 2026-10-23)

- **The reference isn't settled yet.** The owner's Blender screenshot is the viewport in *Material Preview* (scene world and lights on). It isn't the same moment as their Chrome screenshot: the ship is about three times larger in it. My background render (F12) of frame 330 gives paler ice than their screenshot:

  | | Ice | Rock shadows |
  |---|---|---|
  | Owner's Blender screenshot | `#8ec5e6` | `#46ace6` |
  | My F12 render, frame 330 | `#b2d8ef` | — |
  | Game now, frame 330 | `#b3d8ed` | `#80c7ec` |

  The F12 render uses ray tracing and fast GI; *Material Preview* doesn't.
- **The game's ice already copies the fly-by's material exactly:** colour, metalness 0.384, and roughness from two noises (scales 10 and 1000) through a 0.452–1 ramp. In Blender, the fine noise (cells of about 1 m) averages out across a pixel's samples. In the game it reads as a grain.
- **The hull's outside is lit by the scene's lights** (flagged in *The outside's own light*): the interior's, with the world's blue turned down. In Blender, the world (×2) and the light bouncing off the blue ice tint every face, the shaded ones most.
- **The fly-by's glass:** material *Glass*, a grey metal (base 0.8, metalness 1, roughness 0.2) at **alpha 0.3**, blended: a 30% mirror of the blue sky laid over what's inside. The game's glass is tuned to be nearly invisible from inside (owner).

## Passes (a stop to look between each)

**Pass 1: the reference (about 20 min).** The owner names the frames, and whether the target is the viewport (*Material Preview*) or F12. I render or capture them, and take the game at the same moments: the images to match, with measured colours (ice, rock shadows, the hull's lit and shaded faces).

> **[Agent note]** **Pass 1, the reference (2026-10-23).** Frame 240 of `The Zamboni 1.11 - fly by animation ACES.blend`, rendered (F12) at 1264 × 711; the game at the same moment (cutscene 1 at 9.958 s). Images in `app/prototypes/0.0.2/.export/exterior-look/` (not in git): `blender-240-f12.png`, `blender-240-no-blur.png` (the same without motion blur, the ground at its viewport subdivision: the same colours), `game-240.png`. Measured:
>
> | | Blender F12 | Game |
> |---|---|---|
> | Ice (median) | `#b2d8ef` | `#b4d8ed` |
> | Rock shadows | `#7ec8ef` | `#81c7ec` |
> | Hull, darkest quarter | `#005070` | `#111111` |
> | Hull, middle half | `#00658a` | `#001f3d` |
> | Hull, lightest quarter | `#297893` | `#195754` |
>
> **The ice and the rock shadows already match the F12 render; the hull is the gap** (pass 3). The owner's earlier Blender screenshot (ice `#8dc4e6`) is from another view: the ship is about three times larger in it, and a steeper look at the ice shows less of the sky's reflection, so it reads bluer. It isn't a target for these numbers. Pass 2's colour work may not be needed; its grain and pass 2b's hills remain.

**Pass 2: the ice (about 1 hour).** Its colour and saturation: the outside's sky light and reflections, measured against pass 1. The grain: the fine noise faded out by distance, or left out, as Blender averages it. Tuned on the panel *Flight: outside light*; the values written into `settings.ts` / `ice-plain.json`. *Check:* the measured colours within a few points; the owner's look.

**Pass 2b: hills and valleys on the treadmill's ice (about 2–3 hours).** Owner, 2026-10-23: the fly-by's ground has a displacement that *"accounts for a lot of the variation in light and dark on the ice"*; something like it, not an exact copy, even with far fewer vertices. **The fly-by's ground:** one quad (800 × 3200, scale 2 along) subdivided (levels 4 in the viewport, 2 for renders), displaced along its normal by a Voronoi texture (strength 2, mid level 0.5), mirrored twice: about 2,100 vertices, broad facets tens of metres across, 0 to 8.7 units high (about 13 m in the game's metres). The light and dark come from the facets' slopes against the low sun. **In the game:**
- A coarse grid under the camera, lifted by a height function (a Voronoi-like noise, from a tile as the roughness is) in its vertex shader, normals from the same function. The ground scrolls under a still ship, so **the grid moves with the terrain by whole cells** (otherwise the hills slide through it and the facets ripple).
- **The rocks** sit at their spot's height. **Their flattened shadows** are projected onto the slope under each rock (its height and tilt there), not onto the flat plane. This lifts the flat-ground constraint noted in the flying scene plan and in [scenery.md](../../features/scenery.md).
- The ship's shadow falls on the hills through the shadow map, unchanged. The haze and the far fade are unchanged.
- The roughness grain judged again after (the hills may be enough variation).
- A cheaper first step, if wanted: the slopes in the ice's normals only (about 1 hour), with nothing moved. It loses what real hills do with a low sun (one hiding and shading another).

- **Every flying scene gets it** (the treadmill is one ground): chapter 1's view from the cockpit and windows too (owner asked, 2026-10-23). Seen nearly edge-on from there, the hills read as shapes, so real displacement matters more than in the cutscene. The grid coarsens with distance, out to where the haze hides it (full at 3 km).

*Check:* screenshots against pass 1's frames, **and from the cockpit in chapter 1**; the frame time (`flight-perf-probe.js`); rocks on the slopes neither floating nor buried; `scenery-probe.js`, `scenery-cells-probe.js`.

> **[Agent note]** **Pass 2b, built 2026-10-23.** As planned (`terrain.ts`: `hills` in the terrain's file; the ground's grid moved by whole cells; the rocks at `heightAt`; their shadows projected onto the hills). **The values:** the fly-by's F12 ground (points 149 x 297 m apart, 7.4 m of range) changed almost nothing: the broad light and dark at frame 240, measured as the spread of a blurred ice, was 203-210 in Blender's F12, 203-210 in the flat game and 203-209 with those hills. The light and dark the owner sees is the viewport's (level 4): **points 37 x 74 m apart, 12.3 m of range, now in `ice-plain.json`**: 201-212, broad bands of light and dark, the rocks sitting on them. Frame time: flying 17.9 ms with them, 20.2 ms flat on the same run (noise). `scenery-probe.js` 6/6. Not checked by a script: that the hills don't ripple as they go by (the owner's look).
>
> **Pass 2, the grain (2026-10-23):** the ice's colour already matched (pass 1), so only the grain. The fine noise's share is now 0.25 (`groundFineAmount`). Measured at frame 240 as the mean |image - its 3 px blur| on the ice: Blender F12 0.22 (without motion blur 0.44); the game at 1: 0.50, 0.5: 0.31, **0.25: 0.24**, 0: 0.19.

**Pass 3: the hull in exterior shots (about 2–3 hours).** While an exterior cutscene plays, the hull's outside materials use the outside's lights: the sun, the blue sky from above, and the ice's blue from below (Blender's bounce, as the hemisphere light's ground colour). Changing a material's lights rebuilds its shader, and that stalls frames (a known trap). So **exterior copies of the hull's materials are built and compiled at load**, and swapped in at the cut. The copies cost load time and memory: measured and reported. The see-through cut is off in these shots (`seeThrough: 'off'`), so the copies needn't be cuttable. *Check:* the hull's shaded and lit faces measured against pass 1; the load time and frame time before and after.

> **[Agent note]** **Pass 3, built 2026-10-23.** `exterior.ts`: the outer parts (`SHELL` in ship.ts: the hull, the outer doors, the hatch, the ramp, the turbines; and the landing gear) get a copy of their material lit by the outside's lights (`Treadmill.lightOutside`: the sun and the outside's sky; metal reflects the sky at `outsideReflections`); the glass is left out (pass 4). **When (owner, during the pass: *"the external hull should always use the exterior lighting … as long as that doesn't affect the interior lighting"*): whenever the camera drawing is outside the ship** (outside `ship.interior`, the hull's box), in every scene, cutscene or play; with it inside, the interior's materials, so the rooms are unchanged (the doors, the hatch and the ramp have inner faces). The outside light is now tuned every frame, landed too. The copies are compiled at load: **437 ms more**. Frame 240, the hull: middle half `#005987` (Blender `#00658a`), lightest quarter `#027b9f` (`#297893`); its darkest quarter is still `#111111`: the cockpit glass showing the dark interior (pass 4). Cutscene 1 at 60 fps; its probe 14/14. **Watch:** the hull's box is a little larger than the hull, so a camera hugging the hull from outside may count as inside (the old light) and switch as it crosses.

**Pass 4: the exterior glass (about 1 hour).** In exterior shots, the glass becomes the fly-by's: a sky-reflecting metal at 30% over the interior (the sky's gradient as its reflection, as the ice has). It's swapped in with pass 3's copies. The inside's glass is unchanged. *Check:* screenshots against pass 1; the cockpit's view from inside unchanged.

> **[Agent note]** **Pass 4, built 2026-10-23.** With the hull (`exterior.ts`): whenever the camera is outside the ship, the glass in the outer parts (3 panes: the windshield and the engineering windows) becomes **the fly-by's *Glass***: base 0.8 grey, metallic 1, roughness 0.2, 30% opaque, the outside's lights, the sky's reflection. From inside it stays nearly invisible (unchanged). **Its reflection's strength** is its own (`exteriorGlassReflections`, panel *Flight: outside light*): at the outside's (1) it read dark teal-grey against Blender's pale, sky-lit windshield; 2, 4 and 6 compared at frame 240, **6** the closest (the fly-by's world is at 2, which doubles its reflections). Cutscene 1's probe 14/14 (twice; a third run had one visibility check fail, as once before: SC-127). **The smoke script: 83 passed, 3 failed, the 3 known** (feet under the hull, a thruster, the receiver's single-sided materials).

## Constraints from the docs

- **The interior's light stays as it is** (owner, 2026-10-12) and **one sun, inside and outside** (owner, 2026-10-23): pass 3 adds lights to copies of the materials, not to the scene.
- **No shader rebuilds during play:** the copies are compiled under the loading screen.
- The flying scene plan's pass 6 (the landing cutscene, exterior shots) will reuse pass 3 and 4's copies.

## Done when

Each pass: its measurements against the reference, `npm run check`, `npm run build`, cutscene 1's probe; the owner looks at http://localhost:5202/ (`?scene=cutscene-1`). After pass 4: the smoke script once.
