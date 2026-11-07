# The temple and its light shaft in the landed scene

**Status:** *approved 2026-11-07 (owner: "plan is good"), with the answers below. Both passes built 2026-11-07 (agent notes at the end); the temple 3 times the file's size (owner, after pass 1).*

**The owner's answers (2026-11-07):** the haze may affect the shaft (issue 3: it keeps its fog); the shaft's width stays as it is (SC-160: the core never under 2 px, the glow gives it width); **a point light inside the temple, the shaft's colour, really bright** (SC-161); **tinted by the Blackbody node** (1,500 K: the export turns it into a colour, 1, 0.145, 0 linear, a deep orange); cutscene 3 seeing it from the air: later (SC-162). **The scale applied** to every object in the collection (the 3° turn too: the meshes didn't move).

The owner (2026-11-07): *"I activated the temple collection. I want to add it to the landing scene. Place it 200 meters in front of the ship in a place where it doesn't overlap with any of the boulders. The light shaft mesh should go up all the way into the sky. Flag any issues. It should have a strong bloom effect. Figure out a way to do it without using post-processing."*

## What's in the file (`The Zamboni 1.22.blend`, saved 2026-11-07 19:35)

The `Temple` collection, switched on, four objects, all at the same origin (Blender 3.38, −38.92, 0.28: 39 m ahead of the ship), material `Rock` (grey 0.67) unless said:

| Object | Size | Notes |
|---|---|---|
| `Temple` | 12.9 × 12.9 m, 8.9 m tall (floor at z 0.87) | 4,720 vertices; scale 1.486, turned 3° |
| `Temple Steps` | 17 × 17 m, 3.8 m tall, under the floor | 72 vertices; scale 1.40, 1.40, 1.53 |
| `Plynth` | 2.7 m across, 1.1 m tall, on the floor at the centre | `Rock` and `Portal` (white, no emission) |
| `Light Shaft` | **15 cm across**, 179 m tall, from the floor up | a box (8 vertices); `White Emission 100` (Emission 5, a Blackbody node) |

Nothing else in the file changed that I'd look for here; the ship export keeps the `Temple` collection out (decision 2026-10-08; `export-collections.json` leaves it off), so it needs a file of its own.

## The spot (worked out, probe in the scratchpad)

**Straight ahead along the ship's axis, 200 m from the ship's centre** (192 m from its nose), keeping the file's turn relative to the ship. Found with the landed scene's own rocks (`Treadmill.nearRocks`, their vertices in the world):

- **The nearest boulder is 69 m from the temple's centre** (its closest vertex): the one 25° to the left, 249 m from the ship, 116 m across. The temple's steps reach 12 m from its centre: 57 m of clear ice. No other rock within 80 m.
- **The ground under it rises and falls 3.8 m** over a 24 m square (the hills: 37 × 74 m cells, 12.3 m high). The steps reach 3.8 m below the floor, so the floor goes at the highest ground under the steps' 17 m square, and the steps reach down into the ground everywhere. If a corner still shows a gap, **4° to the right** (14 m sideways) the ground varies 1.6 m and the nearest rock is 83 m off: the fallback.
- Nothing at 200 m is in the haze (it starts at 500 m).

## Issues (flagged)

1. **The shaft is 15 cm across.** At 200 m that's under one pixel (0.8 px at 1080p, the cockpit's lens): drawn as is, it shimmers and breaks up as the camera moves, and doesn't read as the script's *"giant column of light"*. The plan keeps the mesh and draws its core **at least 2 px wide** whatever the distance; the glow (below) gives it its visible width. **Or widen it in Blender** (a metre or two would read as a column from the cockpit): your call (SC-160).
2. **"All the way into the sky".** The game stretches the shaft from the floor up to **2,500 m** (top seen at 85° from the cockpit, inside the camera's far plane, 3,600 m landed). From right under it (she walks or flies to the temple), its top would be an end in the sky: **it fades out over its top third**, so there's no end to see.
3. **The haze would grey it.** Fog fades everything by distance; 2,500 m up is past the full haze, so the shaft would turn haze-coloured as it rises. ~~The shaft and its glow take no fog~~ **Owner: the haze may affect it** (kept, with the fade at the top).
4. **Painted glow vs real bloom:** real bloom bleeds over whatever is in front of the light; a painted glow is cut by it (the windshield's frame, a rock, the ship's hull in an exterior shot) with a hard edge. The glow at the base can also meet the temple's stone in a visible line where its card goes through the walls. Kept small and placed above the plinth to keep that out of sight; tell me if it shows.
5. **Glow isn't light.** Nothing near the shaft gets brighter (the plinth, the floor, the steps). Options: the `Portal` material made emissive (free), or a real point light at the plinth (every lit material in the scene recompiles once with one more light, a little more per pixel). Not in the plan unless you want one (SC-161).
6. **The temple's shadow:** real-time shadows reach 150 m from her while landed (`shadowRangeLanded`), so from the ship (200 m) the temple casts none; it gets one when she's near. Its steps sink into the ground, so it won't look like it floats. A flattened shadow for it (as the rocks had in flight) is possible later.
7. **Cutscene 3 (*What's that?*) sees it before landing.** The script has the crew looking at the temple and the column from the air; during that conversation the ship is still flying over the moving plain, where the temple doesn't exist. **Story lever (your call, not touched):** if cutscene 3's shots stay on the crew, nothing more is needed; if the windows should show it, the temple and shaft would have to appear in the flying scenery on the way in (another step, SC-162).
8. **Size:** the temple is 13 m wide and 9 m tall, the steps 17 m (the objects carry scale 1.486, the old units' factor: probably scaled to match 1.21's). Say if that isn't the size you meant.

## How

**Pass 1: the temple in the landed scene.**
- **`npm run export:temple`:** a new job in `export.mjs` and `tools/export-temple.py`: the `Temple` collection (switched on in memory, as the other exports do), its objects relative to `Temple`'s origin, → `public/scenery/temple.glb`, the same pipeline (Meshopt, the comparison with the last export, a summary). The shaft is tagged by its exact name `Light Shaft` (for pass 2).
- **The scene file places it:** `landed.json` gets `"landmarks": [{ "file": "temple", "ahead": 200 }]` (along the ship's axis from its centre, `side` in metres for the fallback). The game moves it there, keeps the file's turn, and puts its floor at the highest ground under the steps (`Treadmill.groundY` over the steps' square). Loaded with the scene; shown only while parked; only in the landed scene.
- **Rocks:** at load, warns in the console if any `nearRocks` vertex is within the steps' reach plus 10 m (the scatter is fixed, so this only fires if the spot or the rocks change).
- **A collider:** the temple and its steps as a static triangle collider (she can walk 200 m to it, or fly with the jetpack). The shaft has none.
- Shadows: casts and receives as the rocks do.

**Pass 2: the shaft and its glow (no post-processing).** `src/light-shaft.ts`, three parts drawn after the opaque scene, additive, not writing depth (as the jetpack's exhaust glow, 2026-10-14: the halo painted in):
- **The core:** the file's box, stretched to 2,500 m, unlit white well above 1 (the tone mapping turns it pure white), no fog; widened in the vertex shader to at least 2 px across (from its distance to the camera), so it never breaks up.
- **The glow around it:** a vertical ribbon on the shaft's axis, turned about the vertical to face the camera; its brightness across falls off as bloom does (a bright narrow part and a long faint tail). **Its width is in pixels** (as bloom's is: the same on screen near or far) with a world-size minimum, so it reads close up and at 200 m. Faded over the top third (issue 2).
- **The flare at the base:** a camera-facing card above the plinth, a round falloff, also sized in pixels.
- **The point light (owner, 2026-11-07):** a `PointLight` inside the temple, above the plinth, in the shaft's colour (the Blackbody's), really bright; it lights the temple's stone, the steps and the ice round it (the outside's light list: the rocks', the ground's and the temple's materials recompile once with it). No shadow of its own (a point light's shadow is six maps).
- Settings on the tuning panel (*Temple*): glow width (px), strength, colour, the core's minimum width, the flare's size, the light's intensity and range. Cost: 3 draws, a dozen triangles; the glow's screen area is a narrow strip.

## Check

`temple-probe.js` (`--query scene=landed`): the temple is loaded, 200 m ahead (±1 m), its floor above the ground at the steps' corners and the steps' bottom below it; no rock within its reach; she can't walk through a wall (`physics.fits`); the shaft reaches 2,500 m and has no fog. Screenshots: from the cockpit, from the landing shot, from outside at 50 m and from the steps looking up. `npm run check`, `build`; landed and scenes probes; the smoke once at the end.

## Estimate

Agent build: pass 1 about 40 minutes, pass 2 about 40 minutes (the glow's look will need a round of tuning). Owner review: one round per pass, plus SC-160…162.

> **[Agent note]** **Pass 1 built 2026-11-07.** `npm run export:temple` (`tools/export-temple.py`, a `temple` job in `export.mjs` writing to `public/scenery/`): 0.17 MB; the first export stopped as a new file always does (and the three materials double-sided: drawn single-sided in the game), taken with `export:accept -- temple`. `src/landmarks.ts`; `landed.json` has `"landmarks": [{ "file": "temple", "ahead": 200 }]`; main.ts places it in `onTravel` once the terrain is parked. **Where it stands:** 200.0 m along the ship's axis (world −z), floor at y −2.71 (the ground under the steps −5.35 to −2.71; the steps reach −6.52: no gap), nearest rock 69 m from its centre. The shaft, for now, is the file's box unlit in the Blackbody's colour at strength 5 (the tone mapping shows it yellow-orange; under a pixel from the ship, as flagged: pass 2). From her seat the temple is dead ahead, behind the Adams' heads in the default camera. `temple-probe.js` 7/7; the landed probe 15/15 (14 on the first run: its *the plain going by* check, flaky); `check`, `build` pass. Smoke not run.

> **[Agent note]** 2026-11-07, from the cutscene 3 session: **SC-162 answered by the owner**: the column must be visible on cutscene 3's horizon (opening shot from behind her seat, ahead and about 6° right). A placeholder is built: `src/light-column.ts` (a camera-facing additive ribbon 3 km ahead, no fog, shown while `watched.column`; one `update` line in `main.ts` after `treadmill?.update`). When pass 2's shaft exists, show it there instead and delete the placeholder.

> **[Agent note]** **3 times bigger (owner, 2026-11-07, after pass 1: *"make the temple 3x bigger. make sure the steps stay at the ground line"*):** the scene's entry takes a `scale` (`"scale": 3`; the .blend untouched). The temple 37.5 m square and 26.6 m tall, the steps 51 m square and 11.4 m deep; the ground under them falls 6.3 m (−6.07 to 0.27), the floor at its highest point, so the steps meet the ground all round (nowhere a gap; on the low side up to 6.3 m of steps show). The nearest rock 69 m from its centre, the steps reaching 36 m: 33 m clear.

> **[Agent note]** **Pass 2 built 2026-11-07.** `src/light-shaft.ts`, made by `landmarks.ts` from the file's box (hidden) once placed: its foot on the floor, its width ×3 (0.45 m), the Blackbody's colour. **The core** a camera-facing ribbon, never under 2 px; **the glow** 160 px across (at least 3 m), bloom's fall-off; **the flare** a round card low in the temple, 140 px; all to 2,500 m, the top third faded, the haze fading them (owner). **Changed from the plan:** all three are drawn as orange laid over the sky (normal blending, see-through by their shape), not added: added onto the bright blue sky, the orange came out pink-white and the core pure white, losing the Blackbody's tint. The across-coordinate is worked out per pixel from the world position (the uv over the tapered rows' triangles skewed the glow off the vertical). **The point light:** 20,000 cd, range 150 m, a third of the way up the temple, in the Blackbody's colour; added to the outside's light list (`Treadmill.setOutsideLight`): the stone, the steps, the ice and the hull's outside recompile once when the landed scene shows it. Panel: *Temple* (heights, widths, opacities, the light). `temple-probe.js` 9/9 (shots from her seat, the cockpit, 60 m ahead of the ship, near the temple, the floor looking up); landed probe 14/15 (its flaky *no ship's noise*); smoke 83 passed, the 3 known failures; `check`, `build` pass. **Seen meanwhile:** another session added `light-column.ts`, a placeholder column on the horizon for cutscene 3 (SC-162), not this shaft.
