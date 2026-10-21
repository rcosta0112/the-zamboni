# The camera close to her, and her fade (item 41: the camera in a locker)

**Status:** approved 2026-10-21 (the recommendations: her shadow stays whole, 1.0 m to 0.5 m; the values in the tuning panel, owner); **built 2026-10-21**.

## Goal

The camera never goes through what's behind her. It used to stop at least 1 m from her focus point, even when something was closer than that, which put it inside the lockers when she stood with her back to them (feet 3.612, 3.461, −13.92: the lockers' box was hit at 0.39 m, but the camera stayed at 1 m). Now it comes as close as the obstacle needs, and **she fades out** when it is too close to show her. The owner chose this (2026-10-21) over the camera rising over her: it never moves by itself, and it should help in later scenes too.

**In:** the camera's minimum distance; a fade of her model (body, hair, the jetpack she wears, anything under her model); settings in the tuning panel.
**Out:** the crew (only her fades); the camera rising or colliding with the ceiling (set aside); the see-through rules (unchanged).

## Constraints from the docs

- **The player must never lose track of her** (owner, see-through notes in `doc/steps/current.md`). The fade breaks this in tight spots, on purpose: the owner chose it. It only shows when the camera is closer than about 1 m.
- **The camera moving by itself stays minimal** (owner): kept; the camera only comes closer, as now.
- **Shaders built at load** (faster-load plan, stage 2): flipping a material's settings during play rebuilds its shaders (a stall of seconds). So the fade is built into her materials at load and only a number changes during play.

## The work

1. **The camera** (`camera.ts`): drop the 1 m floor. The camera stops `hit − 0.25` from the focus as now, but never closer than 0.15 m (the near plane is 0.1 m). It still snaps in and eases back out.
2. **The fade** (`model.ts` or `character.ts`, where her models are set): every material under her models gets a dithered opacity driven by one shared value, set before the shaders are built. Three's own `alphaHash` does it: pixels are dropped in a fine noise pattern as the value falls, with no sorting issues (unlike real transparency, where a half-faded body shows its own inside).
3. **The value** (per frame in `main.ts`, after the camera): from the camera's distance to her focus point. 1 at `cameraFadeStart` (1.0 m) or farther, 0 at `cameraFadeEnd` (0.5 m) or closer, smooth in between. Both are in the tuning panel. During cutscenes she is fully shown.
4. **Her shadow** stays whole while she fades (see the question below).
5. **The jetpack's exhaust glow** fades with her (it sits on her back).

## Options

- **Dither (recommended) or real transparency.** Dither: built in, no sorting issues, grainy mid-fade (brief, since the band is 0.5 m). Transparency: smooth, but her body shows its own back faces through itself, and it needs a separate draw order. Dither.

## Done when

- Agent: `npm run check`, `npm run build`; a probe at the locker spot: the camera in front of the lockers' face, her fade at 0, a screenshot; a probe in an open room: fade 1, nothing changed. The smoke check once at the end.
- Owner: walk with her back to the lockers, bunks, walls and doors, and turn the camera round her in tight spots.

## Open questions

1. **Her shadow while she's faded:** keep it whole (recommended: she's still there, and it helps keep track of her), or let it fade with her?
2. **The fade band:** start 1.0 m, gone at 0.5 m. Fine as a start? (Tunable in the panel.)

## After

- `doc/features/` camera notes (indoors camera, see-through-hull.md's camera section): the minimum distance and the fade.
- Backlog item 41: the camera in a locker done; the ceiling set aside.
- Decision log: *The camera comes close and she fades* (over rising over her).
