# The scanner's sound: a second synth page

> **[Agent note]** Written 2026-11-16; owner: "build it". Built the same day: what exists is in [audio.md](../../architecture/audio.md) (*Sounds made in code*). **In the game the same day** (owner's patch: "use this for the scanner sound"; a small change, no plan of its own).

## What

A page for the scanner's sound, **http://localhost:5202/scanner-synth.html**, made from the temple's synth (`src/synth/synth.ts`). It already has two oscillators, the low-pass filter, the envelope and the reverb; this pass adds the **vibrato**.

- **One note, chosen from a list** (C1 to C7, sharps included), with the octave, semitone and detune controls each oscillator already has.
- **Play by holding** the button (or Space), like R1 in the game: the attack when it's pressed, the release when it's let go. There's also a *latch* box that keeps the note on while you tune.
- **Vibrato**: rate (Hz), depth (cents) and a fade-in (s), so it can start steady and then wobble. One LFO moves both oscillators' pitch.
- The panel has the same Save, Copy and preset controls, with the presets in their own file, `src/synth/scanner-patches.json`. There's no line of notes and no light.

## How

- The vibrato goes into the patch (`vibratoRate`, `vibratoDepth`, `vibratoDelay`). Its depth defaults to 0, so the temple chord sounds the same.
- The new page, `src/synth/scanner-page.ts`, reuses the patch type and the synth; its patch has `held` set to the chosen note and an empty `line`. The `vite.config.ts` gets a second preset endpoint (`/__synth/scanner`).

## Not in this pass

- **Putting it in the game** (replacing `sfx_scanner_loop`, played while R1 is held). That's the next pass, once the patch sounds right.

## Done when

- `npm run check` and `npm run build` pass, the page plays with no console errors, and the temple page sounds as it did. Then you tune it by ear.
