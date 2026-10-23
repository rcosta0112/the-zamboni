# The scenery while the ship flies

> **[Agent note]** What exists (0.0.2, 2026-10-23). The plan and its history: [flying scene, pass 4](../plans/features/flying-scene.md). The decision: [decision log](../decision-log.md), *The scenery: a treadmill that looks like the owner's fly-by*. Code: `app/prototypes/0.0.2/src/terrain.ts`.

## What the player sees

A scene that flies (`"travel": { "terrain": "ice-plain" }` in its file: today `chapter-1`) shows the icy plain going by under the ship, through the cockpit windows and the viewport: white ice with a faint sheen, scattered rubble with long, sharp shadows, the haze at the horizon. The landed ground is hidden meanwhile and comes back when a landed scene starts.

The look is the owner's fly-by (`resources/models/The Zamboni 1.10 - fly by animation.blend`), its numbers ×1.486 (the ship was smaller then). The lighting is the game's.

## How it works

- **A treadmill:** the ship never moves. One group at the ship's centre holds the ground (a plane) and the rubble; the rubble slides back at the ship's speed and a piece that passes the rear edge comes back at the front somewhere new. Nothing is created while it runs.
- **A terrain is a data file** (`public/terrain/<id>.json`) and its meshes (`<id>.glb`). The icy plain: speed 174 m/s, the ship's belly 14 m up; the ice (white, metalness 0.384, a blue glow, its roughness); the rubble (ten pieces of the fly-by's `Rubble`, about 1,700 copies: one per 2,200 m², scaled evenly 0–0.5 up to about 14 m, tipped up to 1 rad, half buried, linear colour (0.8, 0.9, 1), roughness 1); the haze from 800 m, full at 1,800 m. The cameras see to 2.2 km while flying. A backdrop (far shapes moving slower) and placeholder meshes made in code (`boulder`, `peak`) are supported, unused by the icy plain.
- **The rubble's shadows** are its meshes again, flattened onto the ice along the sun in the shader (the part below the ice left out), drawn with the ice's material wholly in the sun's shadow: they look like the ship's own shadow on the ice. Sharp at any distance; no shadow map.
- **The ice's roughness** is the fly-by's: two noises (cells about 119 × 475 m and 1.2 × 4.8 m, stretched along the flight) added and ramped from 0.452 to 1. The noise is a 256 × 256 repeating tile made at load, read at both scales; it moves with the ground.
- **Turning:** `flightHeading` turns the group (the world round the ship); the sun stays where it is. Used next by cutscene 2's exterior shot.
- **Cost:** 21 draws; no GPU cost measurable for the roughness. Building a terrain stalls the first frames (new shaders): hidden under the start screen on a new game.

## Tuning

The tuning panel: *Look* › *flight: speed*, *height*, *heading*; *Flight: ground material* › colour, metalness, glow, the roughness's two ends and its two noises' sizes, and *print for the terrain file* (logs the values as the terrain file writes them). Each flying scene's start loads the file's values.

## Not there yet

- The clouds and their shadows (pass 4b); the frame time against the landed ship; the heap over a minute.
- The fly-by's gently bumped ground (ours is flat: the shadows need it) and its lower sun (13° against 20°).
- The ship's own shadow is about 40 m off at this height: outside the shadow map while she's inside.
- The thrusters' flames (notes for cutscene 1 in the plan).

## Checking it

`node tools/probe-01.mjs tools/scenery-probe.js --shots .export/scenery` (in `app/prototypes/0.0.2/`): 5 checks and screenshots from the cockpit and from outside.
