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
- **Buses:** master → music, ambience, sfx, ui, as gain nodes. A volume for each and a mute in the tuning panel (*Sound*). The ui bus came with the start button's click (2026-10-13). No dialogue bus yet: nothing plays on it.
- **Decoded or streamed:** short sounds are decoded at load and kept. Music and the ship's noise are streamed (an `<audio>` element fed into the graph) and fetched when first played, so they cost nothing at load.
- **In the world:** Three's `PositionalAudio`, with one listener on the camera. Falloff is a straight line from full (within `full` m) to nothing (at `gone` m). No low-pass behind a closed door.
- **Loops (the "to verify" above):** not from the file's ends. A streamed loop is two copies of the file played in turn, the end of one fading into the start of the other (`crossfade`, 2 s). An `<audio>` element's own loop leaves a gap, and AAC's padding would too. Checked in Chrome by level, not by ear; not in Firefox or Safari.
- **Starting the sound:** the audio context is resumed on the first key, click or gamepad button. One-shots asked for before that are dropped; the ship's noise follows its switch, so it starts once the sound is on. **A gamepad button counts for the browser; moving a stick doesn't** (owner's play, 2026-10-13: steps were silent until a jump). So the game opens on a start screen with a button ([`start-screen.md`](../design/start-screen.md); before it, the same day: paused on *Press any button*).
- **The start screen's music** (2026-10-13, [plan](../plans/features/start-screen.md)): Part 1's soundtrack (`mus_part1_theme`), streamed, repeating by the same crossfade as the ship's noise, **on the start screen only** (owner): it dies away over 1.5 s when the button is used. A cue that repeats is turned on and off with a fade (`setLoop`) and, like the ship's noise, sounds only once the sound is on. **So on a first visit it isn't heard unless the player presses or clicks something before the button**; a browser that already lets the site play sound (Chrome does after the site has been played on a few times) plays it from the start. A placeholder: the game's music is still the open question below.
- **The first UI sound:** `ui_click`, the start button's, made by the placeholder script.
- **Variations, speed, overlap** (2026-10-13, [plan](../plans/features/interaction-sounds.md)): a cue can be several files, one picked each time and never the same twice running (`files`); it can play slower and deeper (`rate`: the hatches are the latch files at 0.6, the landings are steps at 0.75), with a small random spread each time (`spread`); its sounds can overlap instead of cutting each other off (`overlap`: footsteps); it can fade in (`fadeIn`) and be faded out when stopped (the ramp's motor).
- **Two levels besides the buses** (`group` in the cue's data): *interaction sounds* and *footsteps* in the tuning panel, each scaling its whole set, for finding how quiet "subtle" is.
- **Footsteps** follow the proposal above in part: **a set per surface with random variations**, but the surface isn't read from under her yet: inside the ship or above the ground (its ramps) is the ship's floor, anything else is snow. One step per footfall of the walk/run animation's cycle; inside the ship, where she's slower, the steps keep the frequency they have outside (owner, 2026-10-13), so they don't follow her feet there. Not placed in the world. Code: [`footsteps.ts`](../../app/prototypes/01-walk/src/footsteps.ts).
- **Sounds with no master:** the interactions' sounds are made by a script from tones and noise ([`make-placeholder-sounds.mjs`](../../app/tools/make-placeholder-sounds.mjs)); the recipe in the script is their source, so nothing is in `resources/audio/` for them. The steps in the snow are cut by the same script from Part 1's running loop on grass, which stays in Part 1's project; the steps on the ship's floor are cut the same way from a recording of steps on metal that the owner put in `resources/audio/` (Part 1's rock loop sounded like gravel).
- **Paused:** every sound stops where it is while the game is paused and goes on from there afterwards (owner, 2026-10-13).
- **Triggers so far:** the start screen (its music, its button), every door, the keypads, panels and lever, the ramp, the ladder ([`interaction.md`](../features/interaction.md#sounds)), the boombox ([`interaction.md`](../features/interaction.md#the-boombox)), her footsteps and landings, the jetpack (Part 1's loop while she flies), and a *ship flying* switch in the tuning panel. No Ink tags.
- **Code:** [`audio.ts`](../../app/prototypes/01-walk/src/audio.ts) in prototype 01 (promote on second use).

## Open questions

- **Music:** who makes it, and in what style? Is there a soundtrack, or is music mostly in-world (boombox, radio)?
- **The licensed tracks:** try to license them, or replace them?
- **Sound effects:** libraries only, or some original recording/design?
- **Adaptive music:** simple crossfades between tracks per section, or layers that change with the situation?
