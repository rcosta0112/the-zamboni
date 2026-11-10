# The planet shot

> **[Agent note]** What exists. The plan and its history: [`plans/features/planet-cinematic.md`](../plans/features/planet-cinematic.md); the decision: *The planet shot procedural, tuned on its own page* in the [decision log](../decision-log.md).

A shot to play **before cutscene 1**: the planet in space, the lens zooming 20 → 180 mm in one 30 s shot, the camera orbiting. **Built: the planet, its atmosphere, the stars and the tuning page (2026-11-09); the shot in the game as scene 0050 (2026-11-10, below).**

## The planet (`src/planet/planet.ts`)

From the owner's `resources/models/props/planet.blend` (material *Planet - Mixed*), as a TSL shader on a low-poly icosphere (162 vertices, smooth shaded; owner: it stays low poly).

- **Height:** fBm noise; a noise vector pushes its position (Blender warps its 4D noise's W instead; TSL has no 4D noise). Up to 16 octaves; **the number follows the pixel's size on the surface** (*detail bias* adds or removes octaves), so it's cheap far away and doesn't shimmer up close.
- **Land or sea:** a step at *sea level* (below: land), softened over *coast softness* pixels.
- **Colours:** the sea from the blue ramp. On land, a latitude band (broken up by a second noise) picks the green ramp, else the white → cyan → blue one. That colour is the base colour (plus Blender's Fresnel, added as white) and the emission (0.1).
- **Seed:** moves the noise, so each seed gives a new planet.
- **Lighting:** Lambert (Blender's IOR 1: no specular on the planet). Blender's sun: strength 7, from the front, up and right.
- **Coast bump:** at 0. The land is raised (fixed 2026-11-10: it had the sea high). Blender's 0.2 draws stair-steps along the coasts here; it would cost three times as much done Blender's way.
- **Frames:** Blender's Z-up frame inside `root`; `body` has Blender's tilt; `spin.rotation.z` turns the planet about its own axis.
- **Cost:** about 4–5 ms a frame with the planet filling a 1080p screen at 180 mm (headless Chrome, this machine).

## The atmosphere (`planet.ts`, preset `atmosphere`)

Blender's *Atmosphere*: the same mesh at 1.024, turning with the planet. Blue, see-through by Blender's Fresnel (IOR 1.07) plus 0.2 × a cloud noise. Specular (roughness 0.1, IOR 1.5): **the sun's glint is on it**, as in Blender.

## The stars (`src/planet/sky.ts`, preset `sky`)

Blender's world *Stars* on the view direction, drawn after the planet (what the planet covers costs nothing):
- **Stars:** two layers (Blender: Voronoi scale 80 and 200), one star per cell. Each has a colour from a stepped ramp (yellow, red, blue, white), picked by a random value per star (*tint spread*).
- **Brightness:** everything times a large noise's ramp × 2 (patchy brightness; *patches: black at* / *white at* are Blender's ColorRamp.001 stops, 0 and 1; raise *black at* to about 0.45 and lower *white at* to about 0.7 for clear dark patches), plus the very faint nebula noise. No Crab Nebula (owner).
- **Found 2026-11-09:** TSL turns a value shared between `If()` blocks into a variable where it's first used; inside a skipped block it stays unset. The patches read a wrong direction, so they hardly showed; the shared values are now made variables before the star layers.
- **Same size on screen** at every focal length: radius in pixels of a 1080-line screen (layer 1: 3 px, layer 2: 1.9 px; Blender's at 50 mm).
- **Same density on screen** (owner): as many as Blender at 50 mm (*reference*). Finer layers fade in, one per doubling of the focal length, each keeping a random share of its stars; the coarser ones stay and spread apart.
- **Speed:** a star is looked for in the 8 cells round the pixel (Blender's Voronoi: 27).
- **Cost:** 2–5 ms a frame for the planet and sky together, 20–180 mm (headless, 1080p).

## The grain (`src/planet/grain.ts`, preset `grain`)

Like the noise in the owner's EEVEE render (owner, 2026-11-10: tried in the shaders, option A; a full-screen pass would come with the post-processing). The planet, the atmosphere and the sky each multiply their final colour (as seen, after tone mapping) by 1 + a random value per pixel, new each frame: black stays black, the darks get more (*more in the darks*). Panel *Grain*: amount (*Blender*: 0.12), size (px of a 1080-line screen), more in the darks, colour (0: grey), new each frame. Costs next to nothing.

## Presets (`src/planet/presets.json`)

Named sets of every value; `default` is the one the page and the game load. *Blender* is the file's values, translated (Three's noise isn't Blender's, so the continents differ). Any scene can show the same planet by naming its preset.

## The tuning page (`planet.html`, dev only)

http://localhost:5202/planet.html: Blender's camera (8.54 m away, 36 mm sensor) and sun, a lil-gui panel.
- **Dragging on the planet turns it** (owner, 2026-11-09): sideways spins it about its own axis (the *spin* slider follows); up and down tips it towards or away from the camera, for viewing only. Double-click resets the tip. It turns slower when zoomed in.
- *View*: focal length (20–180 mm), spin, exposure, sun strength.
- *Continents*: seed and *New seed*, the height noise, warp, sea level, coast softness, detail bias.
- One folder per colour ramp (each stop's colour and position), the band, *Atmosphere*, *Stars*, shading.
- *Save as default*, *Save as new preset…* (written to `presets.json` through the dev server), *Copy preset*, *Load preset* (copied into the panel's own values, so every slider stays linked). The last values edited are kept in the browser between reloads; values added to the page since are filled in from the default preset (found 2026-11-10: a kept preset without the patch stops crashed the panel, a black page).

## Scene 0050: the shot in the game (`src/planet/shot.ts`)

The owner's scene 0050, *Spaaaace* (2026-11-10). **A new game plays it first**, then cutscene 1; in dev, http://localhost:5202/?scene=0050.
- **One shot, 20 → 180 mm**, the camera at Blender's 8.54 m. **The zoom eased in** (owner: faster at the end; eased more 2026-11-10 so the planet stays clear of the title's third line): its progress is (t / length)^3.5 on an even-to-the-eye scale, so it hardly moves for the first half and does most of its work in the last few seconds (`SHOT.ease`; 1 would be even, 2 was the first).
- **The camera orbits** the planet about the screen's vertical, **sped up with the zoom** (owner, 2026-11-10: at a steady 12° over the shot it looked stopped once zoomed in, the zoom swamping it): 0.4°/s at 20 mm, times the focal length's ratio to 20 mm, so 3.6°/s at 180 mm (sped up with the zoom: the same path), about 23.5° in all since the stronger ease (31° before; the speed follows the lens) (`SHOT.orbitSpeed`, `orbitFollowsZoom`), **ending on the planet page's camera**. The sun stays, so the light moves across.
- **The last frame** (owner, 2026-11-10: "end with the planet at this position"): the planet posed as on the planet page with *spin* −54.6° and the drag's tip −11.5° (`SHOT.endSpin`, `endTip`; the owner's numbers from the page's console, `__planet.view.spin` and `__planet.planet.root.parent.rotation.x`), seen from the page's camera at 180 mm.
- **Length: the zoom's, 30 s** (owner, 2026-11-10: 20% faster than the first 36 s; the title's times unchanged). The lens at 12 s is 22 mm, at 20 s 34 mm, at 24 s 55 mm, at 28.5 s 125 mm.
- **The title, three lines, one at a time** (`#title-card`; owner, 2026-11-10, the scene file's text: *BMTM-640 B*, *Status: unexplored* and *A signal of unknown origin was detected.* (owner's lines 2 and 3, 2026-11-10); `TITLE` in `shot.ts`): Afacad (the text font), white, 3.6% of the screen's height, centred across. Each line is typed (0.09 s a letter, a 0.5 s pause after a colon (`SHOT.titleColonPause`), **the dialogue's key sound** `ui_type` per letter), held 3 s, **deleted from the end as with a quick backspace** (0.035 s a letter, no sound, no fade); **the next starts 2 s after** (`SHOT.titleGap`). Lines at about 1.5–5.6 s, 7.6–13.3 s, 15.3–23.1 s (the third longer since the owner's line). Each line, up and down, **halfway between the planet's lowest point and the top of the bottom bar**, **placed for each line** from the planet as it is when that line starts (owner, 2026-11-10); it stays put while it's up. The planet keeps growing; with the stronger ease it reached the third line's spot (16:9) only as its last letters were deleted; the owner's longer third line stays up 1.3 s more, so the planet reaches its height in the last half-second of the deleting, beside the letters left (checked at 2.2:1, 2026-11-10).
- **The black bars** as in every cutscene (owner, 2026-11-10: the mock-up left them out by mistake); the skip prompt as in every cutscene; a skip goes on to cutscene 1. The ship's noise silent meanwhile. **The wind starts 2 s before the end** (owner, 2026-11-10; main.ts `WIND_BEFORE_CUT`) and fades in on through the cut into cutscene 1 (one fade, `windIn`, over the usual 3 s: about 2/3 up at the cut, full 1 s into cutscene 1); every exterior cutscene's wind fade uses the same `windIn` now (before: its clock, which restarted when the black after NEW GAME lifted). Skipped before its last 2 s, cutscene 1 fades the wind in from silence as before.
- **The look:** the planet page's default preset (`presets.json`, imported: saving a preset there reloads the game page); its own scene and camera, drawn instead of the ship (ACES, exposure 1, as the page); compiled at load, so it starts smoothly. 60 fps headless.
- The timings are `SHOT` at the top of `shot.ts`. Checked by `tools/planet-shot-probe.js`.

