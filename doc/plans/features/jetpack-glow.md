# The jetpack's exhaust glow (item 38)

**Status:** approved 2026-10-14 (owner): option A, the sprite; constant size on screen; with an analog R2 it scales as the jet sound does, **and vibrates on its own as well**; the jetpack has **two nozzles** at its bottom: the agent places them from the video, and if that doesn't work the owner marks them on the model.

## Goal and scope

The owner (2026-10-14): *"on the big moon tiny moon project, the jetpack produces a little glow effect out of its exhaust as the player flies. I would like to replicate that effect."*

- **In:** the glow, as Part 1 made it, on both player models; shown while she flies and while the auto-parachute fires (the times the jet sound plays).
- **Out:** bloom (see option B), a light cast by the glow, smoke or trails, the ship's own thrusters.

## What Part 1 did

Read from Part 1's Unity project: the `JetPack Particles` object in `Assets/Scenes/Main.unity` (the same values as `Assets/Models/Characters/JetPack Particles.prefab`), `Assets/Materials/Jet.mat`, `PlayerMovement.cs`.

| | Part 1 |
|---|---|
| Where | A child of the player: 0.205 m up, 0.107 m behind her origin, aimed down and back (tilted 15°) |
| When | `Play()` while *Fly* is held, `Stop()` when it's let go (the last particle finishes) |
| Particles | 20 a second, each lives **0.05 s**: about **one at a time**, a new one every 3 frames at 60 fps |
| Over a particle's life | Size grows from 0 to full; opacity falls from 1 to 0. It moves 1 cm (0.2 m/s in a 25° cone): it barely leaves the nozzle |
| Size | 0.01 m in the world, but the renderer keeps every particle **at least 3 % of the screen's height** (at most 10 %): in practice a dot of constant size on screen |
| Look | Unity's soft round default particle texture; cyan (`0, 1, 1`), with an HDR emission of cyan × 135; alpha-blended, no shadows |
| The glow | The halo comes from the camera's **bloom** (threshold 0.5, intensity 1, scatter 0.7): the dot is far brighter than the threshold |

**What the owner's video shows** (`Big Moon Tiny Moon 2021-12-25 19-52-10.mp4`, flying at 2–6 s; frames at 60 fps, looked at one by one):

- A **white-hot round core with a cyan halo**, at the bottom of the jetpack, over the small of her back. Seen from behind at Part 1's camera distance, core and halo together are about as wide as her body: roughly **10 % of the screen's height** (the core alone about half that). Bigger and much whiter than the particle values alone suggest: the bloom makes it.
- It's drawn **over her** (it sits behind her, toward the camera) and over her legs below it.
- **Almost steady:** the first frame after she takes off is small and faint; after that it barely changes from frame to frame, a slight flicker in size. The 20 Hz grow-and-fade is mostly hidden by the bloom.

So the effect is a bright white-cyan ball of light at the nozzle, with a soft cyan halo, nearly steady, with a slight flicker.

## Constraints from the docs

- **Bloom** is planned in [`../../architecture/stack.md`](../../architecture/stack.md) (three's TSL bloom node, for emissives and CRTs) and budgeted in [`architecture/game-architecture/performance.md`](../architecture/game-architecture/performance.md) (half or quarter resolution, off on the low tier). It doesn't exist yet. The glow must not depend on it: on the low tier there would be no glow at all.
- **Gamepad first:** nothing to press; it follows flying.
- The jetpack is shown only while she wears one ([`../../features/interaction.md`](../../features/interaction.md#the-jetpack-rack)); Part 1's model always has its own.

## Options

- **A. One sprite with the halo drawn into it (recommended).** A single camera-facing quad at the nozzle, additive, its texture made in the shader (TSL): a white core and a soft cyan halo falling off around it, i.e. Part 1's dot *and* what bloom added to it, painted in, matched to the video. A slight random flicker in size and brightness (not Part 1's 20 Hz pulse, which the video doesn't show); a fast fade in on take-off. Constant size on screen (about 10 % of its height with the halo). Cost: one draw, a few pixels; one material, no shader rebuilds elsewhere. Hidden behind walls like any object.
- **B. Part 1's dot plus real bloom.** Closer to how Part 1 built it, and the bloom would also serve the displays later. But it's a full-screen pass every frame, it changes the look of every glowing material in the ship (the displays were tuned without it), and it belongs with the lighting work (pass 3, set aside). Too big for this item; when bloom comes, option A's halo can be turned down.
- **C. A particle system (many sprites).** Part 1 had about one particle alive at a time; a system adds code for nothing seen.

## The work (option A)

1. **`exhaust.ts`** (new): the sprite and its TSL material; `update(dt, on, nozzle)` fades it in fast when `on`, adds the flicker, and fades it out in about 0.05 s (Part 1's last particle finishing).
2. **Where the nozzle is:** below the jetpack mesh, at the middle of its bounding box's bottom, a little back (computed once from the mesh, so it works on both models). If the owner adds an empty named `JetpackExhaust` under the jetpack in the ship file's `Player` collection, it's used instead.
3. **`main.ts`:** called after her animation, on when `character.flying || character.parachuting` and she wears a jetpack (or is Part 1's model).
4. **`settings.ts` / `tuning.ts`** (*Jetpack* folder): on/off, core and halo colours, size on screen (10 %), core size, flicker.
5. **A probe check:** the sprite is visible while flying and hidden on the ground; a screenshot of her flying from behind, next to the video's frame at 2.5 s, for the owner.

## Done when

- `npm run check`, `npm run build`; the probe above; one screenshot flying indoors and one outdoors; the whole `npm run smoke` once at the end.
- Side by side with the video's frames, the size, whiteness and halo match.
- **The owner** flies and compares with Part 1.

## Open questions

1. **Option A** (the halo painted in, no bloom)? Recommended.
2. **Constant size on screen** as in Part 1, or a size in metres (smaller when the camera is further)? The camera distances are fixed (3.5 m indoors, 4.5 m outdoors), so they'd look almost the same; recommended: as Part 1. Indoors, at 10 % of the screen, it will be large in the small rooms: the tuning panel's size is there to try.
3. **With an analog R2**, should the glow follow the trigger (smaller and dimmer when hovering lightly), as the jet sound can (`jetSoundFollowsTrigger`)? Recommended: yes, under the same switch.
4. **The nozzle:** the bottom of the jetpack mesh, or an empty `JetpackExhaust` in the file (the owner's to place)?

## As built (2026-10-14)

- **Two sprites, one per nozzle**, overlapping into one glow at the usual camera distances; 12 % of the screen's height each at full (10 % looked smaller than the video next to it: the painted halo fades sooner than bloom does). Halo brightness 1.6.
- **The nozzles:** the middle of each ring of `Jetpack_Mesh002` (two octagonal rings, 8 cm apart, facing down and back at 45°), as shares of the jetpack group's height, so the same numbers fit Part 1's model. About 0.5 m above her feet: the small of her back, where the video has it. Empties named `JetpackExhaust…` under the jetpack would be used instead.
- **Moved (owner, 2026-10-14, "away from the backpack and down", with a screenshot):** `exhaustOut` 0.14 m down and back at 45°, in the jetpack's space: the glow's centre is now below the jetpack's bottom and behind its back edge. The first offset (along the rings' own axis) had pointed up; the rings don't face the way the exhaust goes.
- **R2:** size and brightness both follow the sound's curve (the trigger squared) down to 35 %. Measured: hover 0.53 of full size, the bottom 0.39.
- **The flicker** replaces Part 1's 20 Hz grow-and-fade: a new size 30 times a second (±15 %), and a shake of up to 4 mm.
- **Checked:** the probe (hidden on the ground, shown flying, the R2 sizes); screenshots outdoors and in the cargo hold; a smoke check (*the jetpack's exhaust glow shows while she flies, and goes*). Not checked: a real gamepad; the auto-parachute's glow (it uses the same switch as the sound).

## After

- [`../../features/interaction.md`](../../features/interaction.md): the glow under the jetpack (remove "No jet particles yet").
- `CODE-MAP.md`: `exhaust.ts`. `backlog.md`: item 38. `../../steps/current.md`.
