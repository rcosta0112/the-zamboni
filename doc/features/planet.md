# The planet shot

> **[Agent note]** What exists. The plan and its history: [`plans/features/planet-cinematic.md`](../plans/features/planet-cinematic.md); the decision: *The planet shot procedural, tuned on its own page* in the [decision log](../decision-log.md).

A shot to play **before cutscene 1**: the planet in space, the lens zooming 20 → 180 mm over about 36 s with two jump cuts, the planet turning on the last. **Built so far (2026-11-09): the planet, its atmosphere, the stars and the tuning page.** Not yet: the shot itself, and putting it in the game.

## The planet (`src/planet/planet.ts`)

From the owner's `resources/models/props/planet.blend` (material *Planet - Mixed*), as a TSL shader on a low-poly icosphere (162 vertices, smooth shaded; owner: it stays low poly).

- **Height:** fBm noise; a noise vector pushes its position (Blender warps its 4D noise's W instead; TSL has no 4D noise). Up to 16 octaves; **the number follows the pixel's size on the surface** (*detail bias* adds or removes octaves), so it's cheap far away and doesn't shimmer up close.
- **Land or sea:** a step at *sea level* (below: land), softened over *coast softness* pixels.
- **Colours:** the sea from the blue ramp. On land, a latitude band (broken up by a second noise) picks the green ramp, else the white → cyan → blue one. That colour is the base colour (plus Blender's Fresnel, added as white) and the emission (0.1).
- **Seed:** moves the noise, so each seed gives a new planet.
- **Lighting:** Lambert (Blender's IOR 1: no specular on the planet). Blender's sun: strength 7, from the front, up and right.
- **Coast bump:** at 0. Blender's 0.2 draws stair-steps along the coasts here; it would cost three times as much done Blender's way.
- **Frames:** Blender's Z-up frame inside `root`; `body` has Blender's tilt; `spin.rotation.z` turns the planet about its own axis.
- **Cost:** about 4–5 ms a frame with the planet filling a 1080p screen at 180 mm (headless Chrome, this machine).

## The atmosphere (`planet.ts`, preset `atmosphere`)

Blender's *Atmosphere*: the same mesh at 1.024, turning with the planet. Blue, see-through by Blender's Fresnel (IOR 1.07) plus 0.2 × a cloud noise. Specular (roughness 0.1, IOR 1.5): **the sun's glint is on it**, as in Blender.

## The stars (`src/planet/sky.ts`, preset `sky`)

Blender's world *Stars* on the view direction, drawn after the planet (what the planet covers costs nothing):
- **Stars:** two layers (Blender: Voronoi scale 80 and 200), one star per cell. Each has a colour from a stepped ramp (yellow, red, blue, white), picked by a random value per star (*tint spread*).
- **Brightness:** everything times a large noise × 2 (patchy brightness), plus the very faint nebula noise. No Crab Nebula (owner).
- **Same size on screen** at every focal length: radius in pixels of a 1080-line screen (layer 1: 3 px, layer 2: 1.9 px; Blender's at 50 mm).
- **Same density on screen** (owner): as many as Blender at 50 mm (*reference*). Finer layers fade in, one per doubling of the focal length, each keeping a random share of its stars; the coarser ones stay and spread apart.
- **Speed:** a star is looked for in the 8 cells round the pixel (Blender's Voronoi: 27).
- **Cost:** 2–5 ms a frame for the planet and sky together, 20–180 mm (headless, 1080p).

## Presets (`src/planet/presets.json`)

Named sets of every value; `default` is the one the page and the game load. *Blender* is the file's values, translated (Three's noise isn't Blender's, so the continents differ). Any scene can show the same planet by naming its preset.

## The tuning page (`planet.html`, dev only)

http://localhost:5202/planet.html: Blender's camera (8.54 m away, 36 mm sensor) and sun, a lil-gui panel.
- **Dragging on the planet turns it** (owner, 2026-11-09): sideways spins it about its own axis (the *spin* slider follows); up and down tips it towards or away from the camera, for viewing only. Double-click resets the tip. It turns slower when zoomed in.
- *View*: focal length (20–180 mm), spin, exposure, sun strength.
- *Continents*: seed and *New seed*, the height noise, warp, sea level, coast softness, detail bias.
- One folder per colour ramp (each stop's colour and position), the band, *Atmosphere*, *Stars*, shading.
- *Save as default*, *Save as new preset…* (written to `presets.json` through the dev server), *Copy preset*, *Load preset*. The last values edited are kept in the browser between reloads.
