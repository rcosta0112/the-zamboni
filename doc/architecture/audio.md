# Audio

**Status:** *open for discussion*. This is a proposal to talk through, not a decision.

## What the game needs

| Category | Examples | Positional? |
|---|---|---|
| **Music (score)** | Travelling themes, landing-site themes, cutscene cues | No |
| **Music (in-world)** | The boombox and its cassettes, maybe a radio | Yes, comes from the device |
| **Ambience** | Ship hum, engines, wind outside, cockpit beeps | Mostly no; some local loops yes |
| **Sound effects** | Footsteps by surface, doors, lockers, pickups and drops, devices, scanner, backpack | Yes |
| **UI** | Comm notifications, chat typing, dialogue typing, prompts, mission data entry added, camera shutter | No |
| **Dialogue** | **None: there's no spoken dialogue** (owner, 2026-10-08). Text only, with typing sounds | No |

## Proposed workflow

### Sourcing

- **Sound effects:** sound libraries first (e.g. Sonniss's free GDC bundles, Freesound, Mixkit, which the archive already uses), recorded or made by the owner where needed. Every library has different terms; check them per file.
- **Music:** to discuss. Options: the owner composes; a commissioned composer; licensed tracks. The boombox tracks in the UE prototype are by Anamanaguchi and 2NRO8OT. A public web build is distribution, so they need a license, or they get replaced.
- **License register.** Every audio file that ships gets a line in `app/assets/audio/CREDITS.md` (or a JSON file): file, source, author, license, attribution text. Nothing ships without an entry. This is what lets the game's credits be generated and the licenses be checked.

### Files

- **Masters** in `resources/audio/`, outside git: WAV, 48 kHz, 24-bit, edited in any DAW (Audacity, Reaper…).
- **Game files** in `app/assets/audio/`, compressed. Proposed: **AAC (`.m4a`)**, which plays in every current browser. Seamless loops need checking: compressed formats can add a tiny silence at the start, so loop points may need to be set in data rather than relying on the file's ends. To verify in the first audio step.
- **Naming:** a category prefix, then lowercase with underscores: `mus_`, `amb_`, `sfx_`, `ui_`, plus `_loop` for loops and `_01`, `_02` for variations. E.g. `sfx_door_galley_open.m4a`, `amb_ship_hum_loop.m4a`, `sfx_step_rock_03.m4a`.
- **Loudness:** normalise each category to a common target so the mix is set in the game, not in each file. Exact targets to be set when the first sounds go in.

### In the game

- **Mix buses** (Web Audio gain nodes): master → music, ambience, sfx, ui, dialogue. Settings expose volume per bus.
- **Positional sounds** through Three's `PositionalAudio` (distance falloff, maybe a low-pass when a door is between the player and the source).
- **Cues are data.** A JSON file maps cue ids to files, bus, volume, loop, variations and positional settings. Code plays `sfx_door_galley_open`, not a file path.
- **Triggers:** devices and the player controller play their own sounds; dialogue and story beats trigger music and sounds through Ink tags (e.g. `# music: travel_theme`); cutscenes have sound events in their event track.
- **Footsteps** pick a sound set from the surface under the character (as in Part 1), with random variations.

## Open questions

- **Music:** who makes it, and in what style? Is there a soundtrack, or is music mostly in-world (boombox, radio)?
- **The licensed tracks:** try to license them, or replace them?
- **Sound effects:** libraries only, or some original recording/design?
- **Adaptive music:** simple crossfades between tracks per section, or layers that change with the situation?
