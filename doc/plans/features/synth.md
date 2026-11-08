# Synthesized sounds, and a page to tune them

> **[Agent note]** Written 2026-11-08. The owner asked to build straight away ("let's try the webaudio option… build a separate page"), so this plan was written and built in the same session; review it with the result.

## What

1. **A small synth in plain Web Audio** (no library; owner, 2026-11-08), reusable for later effects: `src/synth/synth.ts`.
   - A **patch**: wave (square by default), low-pass cutoff (Hz) and resonance (0..1, the owner's synth's slider), ADSR, reverb (length, wet mix), volume.
   - A **pattern**: notes held for as long as it plays (`C4`), and a line of notes stepping every *n* seconds, looping (`G4 A4 B4 A4`). The line's notes either re-trigger (release, then a new attack) or slide (legato, with a glide time).
   - A **light input** (0..1) each frame: the volume dips by *depth* at the light's darkest, optionally the cutoff too.
2. **A page with sliders**: `synth.html` (http://localhost:5202/synth.html), lil-gui as the tuning panel. Play / stop; a simulated light shaft (the game's pulse and flicker, the same settings) with a bar showing it; *Copy patch* puts the patch as JSON on the clipboard; the patch is remembered in the browser between reloads.
3. **First patch: the temple chord** (owner): middle C held; G, A, B, A over it, 5 s each, looping; square; cutoff 6400 Hz, resonance 0.43; A 0.1 s, D 0.28 s, S 0.68, R 0.36; reverb.

## How

- Resonance 0..1 maps to the filter's Q as 0.707 × 2^(5r) (0: flat; 0.43: Q ≈ 3.1, a moderate peak; 1: Q ≈ 23, close to ringing). Web Audio takes a low-pass Q in dB, so the page converts. The page shows the Q it uses.
- The reverb is a convolver with a reverb tail made in code (decaying stereo noise), rebuilt when its length changes.
- Notes are scheduled on the audio clock a little ahead (a 100 ms timer looking 0.3 s ahead), so the 5 s steps don't drift.

## Not in this pass

- **The temple in the game** keeps its recorded hum. Next pass, once the patch sounds right: the synth replaces `sfx_temple_hum`, placed at the temple through `PositionalAudio.setNodeSource`, with the same falloff and the shaft's real light.
- Gamepad control of the page: it's a dev tool, like the tuning panel.

## Done when

- `npm run check` and `npm run build` pass; the page plays the chord with no console errors; the owner has tuned the patch by ear.
