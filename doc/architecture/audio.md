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

## What exists (prototype 01, 2026-10-13)

> **[Agent note]** The first audio step: backlog pass 4.5, the UE prototype's sounds ([plan](../plans/features/audio-from-ue.md)). It turns three of the proposals above into things that exist (the file format, cues as data, mix buses). The rest of this page is still a proposal.

- **Files:** AAC in `.m4a`, named as proposed, in **`app/assets/test/audio/`** (not `app/assets/audio/`: every file is a placeholder, so a test asset). Made from the masters in `resources/audio/ue-prototype/` by [`app/tools/encode-audio.mjs`](../../app/tools/encode-audio.mjs) (ffmpeg): 22 kHz as the masters are, 64 kbit/s stereo for the music, 48 kbit/s mono for the rest. The masters are 22 kHz and mostly 8-bit: "48 kHz, 24-bit" isn't met.
- **No license register yet** (owner, 2026-10-13: licensing isn't raised until a production-ready build). [`SOURCES.md`](../../app/assets/test/audio/SOURCES.md) beside the files lists each one's master and what's known of its author: the register will be made from it.
- **Cues are data:** [`cues.json`](../../app/prototypes/01-walk/src/cues.json) maps a cue id to its file, bus, volume, where in the file it starts, whether it's streamed, and its falloff if it's in the world. Code plays `sfx_door_slide`, never a path. A cue can be several files that sound together (`layers`: the ship's noise, until its two sounds are mixed into one file).
- **Buses:** master → music, ambience, sfx, as gain nodes. A volume for each and a mute in the tuning panel (*Sound*). No ui or dialogue bus yet: nothing plays on them.
- **Decoded or streamed:** short sounds are decoded at load and kept. Music and the ship's noise are streamed (an `<audio>` element fed into the graph) and fetched when first played, so they cost nothing at load.
- **In the world:** Three's `PositionalAudio`, with one listener on the camera. Falloff is a straight line from full (within `full` m) to nothing (at `gone` m). No low-pass behind a closed door.
- **Loops (the "to verify" above):** not from the file's ends. A streamed loop is two copies of the file played in turn, the end of one fading into the start of the other (`crossfade`, 2 s). An `<audio>` element's own loop leaves a gap, and AAC's padding would too. Checked in Chrome by level, not by ear; not in Firefox or Safari.
- **Starting the sound:** the audio context is resumed on the first key, click or gamepad button. One-shots asked for before that are dropped; the ship's noise follows its switch, so it starts once the sound is on. Whether a gamepad button alone counts for the browser isn't known yet.
- **Triggers so far:** the sliding doors, the boombox ([`interaction.md`](../features/interaction.md#the-boombox)) and a *ship flying* switch in the tuning panel. No Ink tags, footsteps or UI sounds.
- **Code:** [`audio.ts`](../../app/prototypes/01-walk/src/audio.ts) in prototype 01 (promote on second use).

## Open questions

- **Music:** who makes it, and in what style? Is there a soundtrack, or is music mostly in-world (boombox, radio)?
- **The licensed tracks:** try to license them, or replace them?
- **Sound effects:** libraries only, or some original recording/design?
- **Adaptive music:** simple crossfades between tracks per section, or layers that change with the situation?
