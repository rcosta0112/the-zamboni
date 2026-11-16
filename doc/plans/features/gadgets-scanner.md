# Gadgets: the scanner

**Status:** draft 2026-11-16 (two passes). **Passes 1 and 2 built 2026-11-16** (owner: "continue", taken as the go for pass 1; then "the scanner ray is not visible and there's no sound", taken as the go for pass 2; the open questions answered by their recommendations: still open for the owner to change). Follows the [binoculars](gadgets-binoculars.md); [what exists](../../features/gadgets.md).

## Goal

A second gadget, the **scanner** (owner, 2026-11-16, added to `The Zamboni 1.22.blend`). Out, she holds it in the clip's single pose; **R1 / right mouse button held** switches it on: her body and head turn randomly as if scanning, the ray shows from the lens, its sound plays. Let go: off.

**Keys (owner):** D-pad up / **1** binoculars (was B), D-pad left / **2** scanner. R1 is a hold for the scanner, still a toggle for the binoculars. Choosing a gadget while the other is out swaps them (the old one put away at once).

## What's in the file (read 2026-11-16)

- **`Scanner`**: mesh, 7 materials, in `Player`, parented to the bone **`Body`** (not a hand), scale 0.876. Hidden until taken out, as the binoculars are.
- **`Scanner Ray`**: child of `Scanner`, a 16-face cone, **its origin at the apex (the lens)**, 0.83 m long; material **`Scanner Ray.001`** (magenta). An unused cyan `Scanner Ray` material is also in the file.
- **`Dr. Green - Scanner`**: one frame. Keys the arms' IK targets, `Body` and `Head`; **`Body` and `Head` turn about Y with a Noise modifier each** (size 100 frames, strength 1, the head's offset 25 frames).
- **The ray's material:** emission colour = base (0.8, 0, 0.26); emission strength = a 4D noise (scale 2, no detail, its W driven by `frame/20`) mapped to 1–10; alpha = a ramp along the cone's length: 0.21 at the lens, 0 at 84% of the way out. Blended, both sides.

## Pass 1: the scanner in her hands, the scan's movement

1. **Export:** `Scanner` and `Scanner Ray` with her model (hung on `Body`), the clip's frame baked **with the noise modifiers muted** (else frame 1's noise is baked into the hold). `npm run export:player`.
2. **Gadgets:** `gadgets.ts` takes a second gadget (no raise clip, no first person, *use* is a hold); `input.ts` the keys above. Out: the hold pose blended in as the binoculars' first frame is.
3. **The scan's movement, the easiest way (owner):** while R1 is held, a smooth random turn (summed sines, not the file's noise) on `Body` and `Head` about the vertical, eased in and out, written after the mixer as `look.ts` does the heads. Size and strength as in the file to start; a **Scanner** folder in the tuning panel (strength, speed).
4. **Prompt:** *Hold R1 to Scan* (as the binoculars' *R1 to Use*).

**As built (2026-11-16):** as above. `--still` in `export-crew-character.py`; the export also drops Blender's `[Action Stash]` NLA track (the scanner's action has no fake user: it was being written as an animation). Found on the way: three's mixer writes a bone only when its value changes, so the turn written after it piled up (171°) while the pose was still; the bones are put back before each mixer update. `scanner-probe.js` 14/14, `binoculars-probe.js` re-run with 1. [What exists](../../features/gadgets.md#the-scanner).

## Pass 2: the ray and the sound

1. **The ray:** a TSL material (`scanner-ray.ts`) replacing the exported one, unlit: the colour × a brightness from 3D noise drifting in time; alpha from the cone's length as in the file. No depth write, one draw call, 16 faces.
2. **On/off:** shown only while scanning: it fades in and grows out of the lens (scaled from its origin, ~0.25 s), the reverse on release.
3. **The sound:** `u_c3u7ozdc09-fmri-scanner-noise-269152.mp3` from `resources/audio/` encoded by `encode-audio.mjs` → `public/test/audio/sfx_scanner.m4a`, looped while scanning, a short fade at each end; volume in `cues.json`.
4. **Docs:** `features/gadgets.md`, code map, decision log (*Update* on the gadget controls), the probe extended.

**As built (2026-11-16):** as above, the brightness copied as the file's (1–10) instead of remapped: drawn premultiplied as Blender mixes it (emission × alpha over what's behind), it shows as there, the tone mapping rolling off the top; `scannerRayStrength` (panel) scales it. The sound raised 16 dB (it peaked at −20 dB). Probe 18/18; smoke 83 pass, the 4 known fails.

## Pass 3: aimed at the closest interaction point (owner, 2026-11-16)

While she scans, the scanner turns gently toward the **closest interaction point within reach** (`interactReach`, as the prompt; every kind, scanner-only points later), up and down too; the player keeps her heading, movement and the camera.

1. **Targets:** `Interaction` lists the items within reach (in her room, not hidden) each frame, with a point (a door's handle; a character's middle). The closest the turn can reach is aimed at; it keeps the aim unless another is closer by `scannerAimHold`.
2. **The turn:** `Body` turned in the world (about the vertical, then about her right) so the ray's axis passes through the point (solved in three steps: the scanner is off `Body`'s pivot), limited to `scannerAimYawDeg` / `scannerAimPitchDeg`; out of that, no target. The legs turned back so her steps stay on her path (as `look.ts` seated). Eased (`scannerAimEase`); the random scan kept on top, smaller (`scannerAimWobble`). Nothing in reach: the random scan as before.
3. Panel *Scanner*; the probe extended; docs.

**As built (2026-11-16):** as above; the solve needed up to six steps (three missed by 6 cm at 0.45 m), stopping once a step is under a tenth of a degree. Probe `tools/scanner-aim-probe.js` 9/9 (the ray within 1.1 cm of the keypad's point); `scanner-probe.js` 18/18.

Owner: "do it" after the questions (every interaction point; only while scanning; reach as the interaction's; a little of the random scan kept). *Agent build:* ~30 min.

## Issues to flag

- **Her skeleton has no spine:** a turn on `Body` turns her legs too. Standing it reads as scanning; **walking it would twist her off her path.** *Recommended:* `Body`'s share fades out as she moves (the head keeps scanning). Alternative: the whole turn always.
- **4D noise:** three's TSL noise is 2D/3D only. 3D noise drifting through time looks close (it slides rather than boils in place). Two 3D samples cross-faded would look closer, at twice the cost: not worth it here.
- **Emission 1–10:** with no bloom (SC-136), anything above ~1 clips to the same magenta. The flicker is mapped into the range that shows (brightness ~0.4–1.5, to tune) instead of copying the numbers.
- **The ray's lit part** (base colour, roughness 1) is dropped: next to the emission it barely shows.

## Done when

Check and build pass; the probe: 2 takes it out, R1 held shows the ray and turns her, released hides it, 1 swaps to the binoculars; screenshots; smoke once at the end. **Owner:** on the pad at http://localhost:5202/: D-pad left, R1 held, standing and walking.

## Open questions

1. `Body`'s turn while walking: faded out as she moves (recommended), or always?
2. Can she use things (doors, talk) with the scanner on? *Recommended:* yes, as with the binoculars in her hands.

*Agent build:* pass 1 ~40 min, pass 2 ~30 min. *Review rounds:* 1–2 each (the turn's size, the ray's look), ~10 min.
