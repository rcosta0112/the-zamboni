# Gadgets

**Status:** passes 1 and 2 of the [binoculars' plan](../plans/features/gadgets-binoculars.md) built 2026-11-16: the binoculars in her hands, raised to her eyes, first person through them with the zoom. Pass 3 (the remaining rules, the far view) to come. **The scanner, passes 1 and 2 of [its plan](../plans/features/gadgets-scanner.md)** built 2026-11-16: in her hands; R1 held scans (her body and head turn, the ray, the sound). Decision: [gadget controls](../decision-log.md).

## Controls

| Action | Gamepad | Keyboard / mouse |
|---|---|---|
| Binoculars out into her hands / away (a toggle) | **D-pad up** | **1** (B before 2026-11-16) |
| Scanner out into her hands / away (a toggle) | **D-pad left** | **2** |
| Scan (the scanner on while held) | **R1** held | **right mouse button** held |
| Use the gadget that's out: the binoculars raised to her eyes, then first person / back to her hands, third person (a toggle) | **R1** | **right mouse button** |
| Zoom in / out (first person) | **L1** / **L2** (held) | **mouse wheel** (a step a notch) |
| Look (first person) | right stick | mouse |

The default for every gadget (owner, 2026-11-16): the D-pad brings one out (a direction each), R1 uses it (a toggle or a hold, the gadget's own); interact stays interact. Choosing one while another is out puts that one away at once.

## The binoculars

- **Out:** they come into her hands over a quarter of a second, held as in the clip's first frame (`Dr. Green - Binoculars`, frames 1–12 of the ship file). **Used (R1):** she raises them to her eyes over half a second (the clip), R1 again lowers them back to her hands (the clip backwards). Held or up, she can stand, walk, run, jump and fly. **Away:** lowered first if they're up, then out of her hands; hidden at the end.
- **Put away at once** (no clip) while she's seated, climbing, in a conversation, or a cutscene or watched conversation plays.
- **On her upper body only:** her arms, hands and head (`model.ts` `UPPER_BODY`; her skeleton has no spine, `Body` stays the movement's). Each movement clip is split in two at load; the upper halves hand over to the binoculars' clip as they're raised (eased), the legs' halves play as before.
- **The binoculars themselves** (`Binoculars.001`, on `Hand_r.IK` in the file) hang on her right hand's bone in the game; their own turn (the file's `Binoculars` action) is baked by the export into her clip, so the two never drift apart.

## First person

- Once the raise ends: the camera at the binoculars (at her eyes), looking where the third-person camera looked; she's hidden. **Nothing of hers is held** (owner, 2026-11-16): she walks, runs and jumps (forward is where she looks, the stick camera-relative as in third person) and the jetpack answers (R2 / Space: she can hover and look at once); opening or closing the binoculars never changes the jet. Standing, she turns with the view; moving, toward where she goes. The camera rides on the binoculars, so it bobs with her head: 4.6 cm walking, 12 cm running (measured), moving, not tilting; no prompts, no see-through, no help text.
- **The zoom:** magnification from the panel's *zoom: widest* to *zoom: narrowest* (2× and 10× to start), starting at the widest each time; L1 / L2 held change it steadily (L1 in, L2 out; 1.5 doublings a second fully pressed), a wheel notch by 1.25×. The look is slowed by the zoom. Pitch ±80°.
- **The zoom's sound** (owner, 2026-11-16): a super-8 camera's zoom motor (`sfx_binoculars_zoom_in`) while the magnification moves in, the same file reversed (`sfx_binoculars_zoom_out`) while it moves out; from its start each time it sets off, cut (faded over 0.08 s) when it stops, at either end or let go; a wheel notch sounds 0.18 s of it. 4 s long: an L2 pressed lightly enough to take longer than that across the range goes quiet before the end. Placeholder, `public/test/audio/`; volume 0.5 in `cues.json`.
- **No overlay** (owner, 2026-11-16: the placeholder removed).
- **The prompt** (owner, 2026-11-16), bottom right, as the interaction prompt looks: **R1 to Use** while they're out (the mouse's right button on the keyboard); looking through them, two: **R1 to Close** over **L1 / L2 to Zoom** (the mouse's right button, the wheel); the last device's buttons, as icons (the pad's shoulders and triggers drawn as their outlines with the name inside, 22 × 22 px as the face buttons' icons, the outline centred on the text line, `pad-glyph.ts` `shoulderGlyph`; the mouse's right button and wheel). Where the cutscene's skip prompt goes (never both: a cutscene puts them away).
- **Leaving it** (R1, or B to put them away): the camera cuts back to third person at once while she lowers them.
- **The tuning panel** shows only its *Binoculars* folder while this is built (`tuning.ts` `ALL_FOLDERS = false`; the other folders' code kept, skipped). Back to `true` when the feature is done.

## The scanner

- **Out** (D-pad left, 2): it comes into her hands over a quarter of a second, held as in its clip (`Dr. Green - Scanner`, one frame: her hands on it at her chest). The scanner hangs on her `Body` bone in the file and in the game, so it needs no clip of its own. The prompt: **Hold R1 to Scan** (the right mouse button on the keyboard).
- **R1 held: on** (owner, 2026-11-16: not a toggle). Over 0.3 s her **head and body turn about the vertical**, back and forth, as she scans; let go, they settle back over 0.3 s. The file does it with a Noise modifier on `Body` and `Head` (size 100 frames, strength 1, the head's 25 frames later); the game copies it loosely (owner: "the easiest way"): two sines each, written after the mixer (`model.ts`). **Her body turns only while she stands**: her skeleton has no spine, so turning `Body` walking or in the air would turn her legs off her path; the head scans always. Panel *Scanner*: *turn: at most* (25° each way), *turn: speed* (1).
- **The ray** (`Scanner Ray`, the scanner's child, its origin at the lens): shown only while she scans, **fading in and growing out of the lens** (scaled from its origin) over the scan's 0.3 s, the reverse on release. Drawn with a copy of the file's `Scanner Ray.001` (`scanner-ray.ts`): magenta emission × a noise mapped 1–10 (moving 1.2 a second, as the file's `frame / 20` driver), alpha 0.21 at the lens fading to 0 at 84% of its length; mixed as Blender does (the emission × alpha added over what's behind). Differences: TSL's noise is 3D, so it drifts instead of boiling in place (the file's is 4D); the lit part (base colour) is left out. One draw call, 16 faces, no shadow. Panel *Scanner › ray: brightness* (×1: the file's).
- **The sound** (owner, 2026-11-16): an fMRI scanner's noise (`sfx_scanner_loop`, 5 s, raised 16 dB), looped from when R1 goes down, faded out over 0.2 s when it's let go. Placeholder, `public/test/audio/`; volume 0.5 in `cues.json`.
- **The export** bakes the clip's one frame with its Noise modifiers muted (`--still`), so the hold has no stray turn in it.
- Nothing is blocked while it's out or on: she walks, runs, jumps, flies and interacts.

## What the binoculars block

- **Out** (in her hands or raised, third person): nothing.
- **Looking through them:** interacting (A / E: doors, keypads, lockers, talking, the ladder's *Climb*), with its prompts and dots; the help text; the see-through. Everything else works.
- **They're put away at once** when she sits, climbs, talks or a cutscene plays, and their button does nothing then.

## Files

`src/scanner-ray.ts` (the ray's material, its fade and growth), `src/gadgets.ts` (the state: which gadget is out, how far it's held and raised, `firstPerson`), `src/binocular-view.ts` (the zoom, the prompt), `src/camera.ts` (`firstPerson`), `src/model.ts` (the upper-body layer), `src/input.ts` (`consumeGadget`, `consumeGadgetUse`, `consumeZoom`), main.ts (puts it away while her hands are taken; first person: the camera, her facing, what's off). Export: `export-crew-character.py --action "<action>=<object>:<its action>:<bone>"`. Check: `node tools/probe-01.mjs tools/binoculars-probe.js --shots .export/binoculars` (39 checks, about 75 s); `node tools/probe-01.mjs tools/scanner-probe.js --shots .export/scanner` (18 checks, about 30 s). Export: `--still "<action>"` bakes an action with its curves' modifiers muted.
