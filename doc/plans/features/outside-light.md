# The outside's own light (the flying scene's scenery)

**Status:** approved 2026-10-23 (owner: *"write the plan and run it"*); **built 2026-10-23**: [what exists](../../features/scenery.md#the-outsides-own-light). Retuned against the owner's reference frame: the fly-by's ice colour, no glow, the outside's sun at 0.65, reflections 0.5. The haze was enough (no change). Then the glass (owner): nearly invisible, its highlights kept, the view about 5% darker from inside (`cutaway.ts`, the panel's *glass* values).

## Goal and scope

The sky, the ice and the rocks look like three separate things; in Blender (the fly-by, `resources/models/The Zamboni 1.10 - fly by animation.blend`) they sit together: the world's blue fills the shadows, the yellow sun the lit faces. Give the outside materials their own light, as Blender's, **without touching the interior's**.

- **In:** the terrain's materials: the ice, the shadows flattened on it, the rocks (the scatter and backdrop pools). A panel folder to tune that light.
- **Out:** the hull's outside (owner, 2026-10-23: considered with the exterior cutscenes and the landed scenes); the landed snow (`world.ts` floor); the sky's background; the colour transform (ACES here, Filmic High Contrast in the fly-by: flagged before, unchanged).

## What the fly-by has (read 2026-10-23)

- **World:** the blue gradient (light cyan at the horizon, `(0.205, 0.834, 1)`, to `(0, 0.21, 1)` overhead), strength 1. **Sun:** `(0.993, 1, 0.377)`, strength 7.5, 13.4° up, 0.5° wide. View transform Filmic High Contrast.
- **No atmosphere:** no mist (intensity 0), no volume, the compositor only denoises and adds a glare. **Its blue in the distance is the ice reflecting the sky** (metalness 0.384: at grazing angles it shows the horizon's light cyan), and its camera stops at 1 km.
- **The game already uses the same world and sun** (Part 1's values, `world.ts`). What differs on the outside: **the world's blue is halved while she's inside** (`worldIndoors` 0.5; in the flying scene she's always inside), **the sky's reflection on the ice is halved** (`metalReflections` 0.5), and 4a's material fixes (the ice's blue glow, the rocks' tint) made up for both.

## Constraints from the docs

- **The interior's light stays as it is** (the owner, 2026-10-12: the world's blue made the rooms too blue → `worldIndoors`).
- **One sun, inside and outside, always** (owner, 2026-10-23): the outside uses the game's own sun light (the same object): its direction, and the shadow map that puts the ship's shadow on the ice, are shared.
- Placeholders until the kit file (flying scene plan, pass 5): the outside light must apply to any terrain's materials, not only these.

## The work

1. **The outside's lights** (terrain.ts): every terrain material gets `lightsNode = lights([sun, outsideSky])`: the game's sun (unchanged) and **its own sky light**, a hemisphere light kept out of the scene (so nothing else gets it): Blender's world as `world.ts` computes it (the gradient's cosine-weighted average overhead, the cyan below), at the world's strength, **never dimmed indoors**.
2. **The sun's colour on the outside only:** the materials' `receivedShadowNode` returns the sun's shadow times a tint (white: unchanged): three multiplies the sun's light by it, so the tint keeps the ship's shadow. The flattened shadows keep returning 0 (wholly in shadow).
3. **The sky's reflection on the ice:** its own strength (Blender's: 1), not the metals' 0.5.
4. **Tuning:** a panel folder *Flight: outside light*: sky strength, sky colour overhead, below, sun tint, sun strength (a share), reflections; *print* for the record. Values in `settings.ts`.
5. **Look and retune:** screenshots from the cockpit and outside before and after; the ice's glow and the rocks' tint from 4a probably come down (they made up for the halved blue): retuned on the panel and written into `ice-plain.json` if so.

## Options (decided)

- **Outside lights per material** (chosen, owner) vs a colour ramp in the materials, a masked grading pass, one grade for the whole picture (discussed with the owner 2026-10-23); the others stay possible on top.
- **The ship's shadow:** the outside keeps the game's sun (chosen, owner: *"the second"*), tinted per material; not a second sun with its own shadow map (a second map's cost).

## The haze

The owner: the colours should tilt to the sky's blue in the distance; the haze should be enough. **The game's haze is already in the horizon's colour** (the fly-by's light cyan), from 800 m, full at 1.8 km. Check on the screenshots: if the distance still doesn't read as the fly-by's, the haze's start and colour are tuned; a different curve (the fly-by gets it from reflection, which builds faster near the horizon) would be flagged.

## Done when

- Type-check; the scenery probe; a probe: the outside materials have the two lights, the ship's shadow still on the ice, the sun's direction the same object's; the frame time unchanged.
- Screenshots: the cockpit and outside, before and after, beside a fly-by frame.
- The owner: looks, tunes on the panel.

## After

`doc/features/scenery.md` (the outside's light, the panel); the decision log (an entry: the outside's own light); `doc/steps/current.md`; Linear (SC-10, an owner task to look).
