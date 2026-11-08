# The temple's hologram: hidden, shown by a prompt, fading in

> **[Agent note]** Status: **built 2026-11-08** (owner's answers: the prompt on the plinth, temporary; a toggle; *Show hologram* fine). One pass. See *As built*.

## Goal

The owner's *Temple Hologram* (1.22, `Temple` collection) in the landed scene, with its *Hologram* material's look, hidden until the player uses a prompt; then it fades in.

**Out:** the hologram in the story (an Ink variable, a remark), its sound, the save remembering it (each on request), a painted glow round it.

## The material, as read from 1.22

Two layers added (owner, 2026-11-08: emission strength 10 in both Emission nodes, was 5):

1. **Scan lines over a rim glow.** A Wave texture (Bands, sine) on **Window** coordinates: about 100 horizontal stripes per screen height, **fixed to the screen** (owner, 2026-11-08). Off a stripe: see-through, grey 0.57. On a stripe: Fresnel (IOR 1.04) mixes see-through 0.57 plus a blue glass (facing) with blue emission (0, 0.178, 0.479) × 10 (grazing): a thin bright rim.
2. **Crease glow:** AO over 0.002 m picks the same emission in creases, see-through 0.32 elsewhere. At 2 mm it's see-through 0.32 almost everywhere.

The *Displace* modifier (no texture, strength −0.05, midlevel 0.5) pulls the mesh 2.5 mm in along its normals, so the ruins draw over it where they overlap (owner: against z-fighting). The export applies modifiers.

## Constraints from the docs

- [Scenery](../../features/scenery.md): the temple's loading (landmarks.ts). The stone is lit by the outside, casts shadows and is a collider. The hologram must be **none of these**.
- [Prompt placement](prompt-placement.md), [prompt choice](prompt-choice.md): the prompt and its dot follow the existing rules (reach, sight, aim).
- Gamepad first: the prompt is the usual interact button.
- **A correction to my first take:** the game has **no post-process bloom** (the shaft's bloom is painted). The rim's brightness comes from the material alone; ACES pushes the 10× blue towards a bright cyan.

## The work (one pass)

1. **Export** (`export-temple.py`): *Temple Hologram* taken (out of `LEFT_OUT`), added to `NEEDED`. If the owner places a spot for the prompt (question 1), that Empty is taken and needed too.
2. **Loading** (`landmarks.ts`): the hologram kept out of the stone's handling (no light, no shadows, no collider) and hidden.
3. **Material** (`src/hologram.ts`, TSL, unlit): premultiplied alpha, so what's behind is multiplied by the see-through grey and the emission is added, the same sums as Blender's Transparent + Emission. Stripes from `screenUV.y`. Fresnel from the normal and view (dielectric, IOR 1.04, the back faces with the IOR flipped as Blender does). The glass as a faint blue tint. The crease glow dropped. Double-sided, depth test on, depth write off. If the 2.5 mm inset still flickers against the ruins at a distance (near plane 0.1 m), a polygon offset on the hologram fixes it. No mesh change needed.
   - The file's values are **copied into the code** (constants, with panel sliders under *Temple*: emission strength, stripe count, rim IOR). If the Blender material changes again, the code doesn't follow until it's copied over. Reading it through the export is possible if that would happen often.
4. **The prompt** (`landmarks.ts` → main.ts's interaction list): offered while the temple shows and the hologram is hidden. Its action shows the hologram: one fade from 0 to 1 over `hologramFadeSeconds` (1.5 s, eased, panel *Temple*), scaling both the emission and the darkening together. The prompt then goes (question 2). The interaction's click plays as for everything.
5. **Check** (`temple-probe.js` extended): the hologram loaded and hidden; not a collider; the prompt offered at the spot; used → shown, fully faded in after the fade time. A screenshot of the result.

*Agent build:* about 1 h. *Review rounds:* 1–2 (the look against Blender, the fade), 10 min each.

## As built (2026-11-08)

- **The stripe count was wrong above:** the Wave's Bands along X is 20 × the vector (×5 the Wave's scale, ×20 the Mapping's): about **318 stripes per screen height**, not 100 (`hologramStripes`).
- **The prompt on `Plynth`** (owner), a toggle: *Show hologram* / *Hide hologram*, fading both ways. The words are in `landmarks.ts` (`hologramToggle`), not `labels.ts` (that names the ship's things by id). `Plynth` comes in as a group (one mesh per material): found by name. The prompt always has a first part (a stand-in until the temple shows): the smoke script reads every interaction's first part.
- **The polygon offset is in from the start:** at 200 m with a 0.1 m near plane the depth buffer resolves about 2 cm, so the 2.5 mm inset (3.5 mm at ×1.4) couldn't separate them.
- **Blend:** ONE, ONE_MINUS_SRC_ALPHA (custom blending), the colour the emission, alpha 1 − the see-through grey. The glass's share is a faint blue added (`hologramGlass`, 0.3: a guess, to tune by eye).
- temple-probe 13/13 (four hologram checks, one screenshot at the plinth). *Actual time:* about 45 min.

## Done when

- `npm run check`, `npm run build`, temple-probe pass. A screenshot next to the owner's Blender render.
- The owner, at http://localhost:5202/?scene=landed: walk up, press the prompt, the hologram fades in and looks like 1.22's.

## Open questions

1. **Where's the prompt?** (a) **An Empty the owner places** in the `Temple` collection (e.g. `Hologram Switch`), the prompt within reach of it *(recommended: the story's spot is the owner's)*. (b) The middle of the steps' bottom edge, until (a) exists.
2. **One way or a switch?** Once shown, (a) **it stays and the prompt goes** *(recommended)*, or (b) the prompt becomes *Hide hologram*.
3. **The prompt's words:** *Show hologram* as a placeholder (a UI label in `labels.ts`, not dialogue). Yours to change.

## After

`doc/features/scenery.md` (the hologram), the code map (`hologram.ts`, landmarks), `tools/README.md` if the probe's line changes, `doc/steps/current.md`, `doc/tasks.md`.
