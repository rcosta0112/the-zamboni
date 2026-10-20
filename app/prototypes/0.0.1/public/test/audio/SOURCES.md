# Audio: where each file came from

> **[Agent note]** Every file here is a **placeholder** from the UE prototype (owner, 2026-10-13). **None is licensed for a release.** Licensing isn't raised until a production-ready build; this list is what that reminder will be made from. Plan: [`doc/plans/features/audio-from-ue.md`](../../../../../../doc/plans/features/audio-from-ue.md). Inventory: [`doc/reference/ue-prototype.md`](../../../../../../doc/reference/ue-prototype.md#audio-read-2026-10-13).

Made by [`app/prototypes/0.0.1/tools/encode-audio.mjs`](../../../tools/encode-audio.mjs) from the masters in `resources/audio/ue-prototype/` (outside git): AAC in `.m4a`, 22 kHz as the masters are.

| Game file | Master | Author, where known | Where it came from | License |
|---|---|---|---|---|
| `sfx_door_slide.m4a` | `244491416_nw_prev_01.wav` (mono, 8-bit) | Not known | Not known (the name looks like a stock library's preview file) | Not known |
| `sfx_boombox_cassette.m4a` | `cassette-ffww-cassetera-96765_01.wav` (stereo, 8-bit) | Not known | Not known (the name looks like a Pixabay download, id 96765) | Not checked |
| `mus_boombox_01.m4a` | `Anamanaguchi - Helix Nebula_01.wav` (stereo, 8-bit) | Anamanaguchi, "Helix Nebula" | Commercial release | **None** |
| `mus_boombox_02.m4a` | `Anamanaguchi - My Skateboard Will Go On_01.wav` (stereo, 8-bit) | Anamanaguchi, "My Skateboard Will Go On" | Commercial release | **None** |
| `mus_boombox_03.m4a` | `2NRO8OT - Crash Of The First Interstellar Channel_01.wav` (stereo, 8-bit) | 2NRO8OT, "Crash Of The First Interstellar Channel" | Not known | **None** |
| `mus_boombox_04.m4a` | `2NRO8OT - Ugol Padeniya_01.wav` (stereo, 8-bit) | 2NRO8OT, "Ugol Padeniya" | Not known | **None** |
| `amb_ship_noise_a_loop.m4a` | `plane_cessna152_flight-52790_01.wav` (mono, 16-bit; taken out of the UE asset) | Not known | Not known (the name looks like a Pixabay download, id 52790) | Not checked |
| `amb_ship_noise_b_loop.m4a` | `plane-landing-23118_01.wav` (mono, 16-bit; taken out of the UE asset) | Not known | Not known (the name looks like a Pixabay download, id 23118) | Not checked |

## The interactions and the footsteps (2026-10-13)

Made by [`app/prototypes/0.0.1/tools/make-placeholder-sounds.mjs`](../../../tools/make-placeholder-sounds.mjs). Plan: [`doc/plans/features/interaction-sounds.md`](../../../../../../doc/plans/features/interaction-sounds.md). **Placeholders too.**

| Game file | Source | Author | License |
|---|---|---|---|
| `sfx_latch_open.m4a`, `sfx_latch_close.m4a` (the hatches play the same files, lower) | Made by the script from tones and noise: no master, the recipe is in the script | The project | Nothing to license |
| `sfx_panel_open.m4a`, `sfx_panel_close.m4a` | The same | The project | Nothing to license |
| `sfx_jetpack_take.m4a`, `sfx_jetpack_return.m4a` | The same (2026-10-14): straps and a buckle, taking a jetpack from the rack and putting it back | The project | Nothing to license |
| `sfx_lever.m4a` | The first of the two sounds in `freesound_community-lever-action-cocking-2-39680.mp3` in `resources/audio/` (added by the owner, 2026-10-13), 0.355 to 0.565 s of it: the silence around it is cut off | Not known (the name looks like a Pixabay download from its Freesound community account, id 39680) | Not checked |
| `sfx_ramp_move.m4a`, `sfx_ramp_stop.m4a` | The same | The project | Nothing to license |
| `sfx_ladder_grab_01.m4a` … `_03.m4a` | The same | The project | Nothing to license |
| `sfx_step_ship_01.m4a` … `_04.m4a` (the landings in the ship play the same files, lower) | Four single steps cut from `freesound_community-metal-footsteps-14727.mp3` in `resources/audio/` (added by the owner, 2026-10-13; before it: Part 1's `Run Rock.mp3`, which sounded like gravel, then steps made by the script) | Not known (the name looks like a Pixabay download from its Freesound community account, id 14727) | Not checked |
| `sfx_step_snow_01.m4a` … `_04.m4a` (the landings on snow play the same files, lower) | Four single steps cut from `Run Grass.mp3` in Part 1's Unity project (`Big Moon Tiny Moon/Assets/Audio/`) | Not known | Not known: where Part 1's file came from isn't recorded |

## The start screen (2026-10-13)

Plan: [`doc/plans/features/start-screen.md`](../../../../../../doc/plans/features/start-screen.md). **Placeholders too.**

| Game file | Source | Author | License |
|---|---|---|---|
| `mus_part1_theme.m4a` | `Background Music.wav` in Part 1's Unity project (`Big Moon Tiny Moon/Assets/Audio/`; 2 min 17 s, 44.1 kHz, 24-bit stereo), whole, by [`encode-audio.mjs`](../../../tools/encode-audio.mjs): 128 kbit/s stereo | Not known | Not known: where Part 1's file came from isn't recorded |
| `ui_click.m4a` | Made by [`make-placeholder-sounds.mjs`](../../../tools/make-placeholder-sounds.mjs) from a tone and noise: no master, the recipe is in the script | The project | Nothing to license |

## The jetpack (2026-10-14)

| Game file | Source | Author | License |
|---|---|---|---|
| `sfx_jetpack_loop.m4a` | `Thrusters.mp3` in Part 1's Unity project (`Big Moon Tiny Moon/Assets/Audio/`; 9.5 s, 44.1 kHz stereo; peaks at -4.5 dB), whole, by [`encode-audio.mjs`](../../../tools/encode-audio.mjs): 64 kbit/s stereo. Part 1 looped it at volume 0.75 with Unity's *normalize* on (peak to 0 dB): the cue's volume, 1.26, is the two together | Not known | Not known: where Part 1's file came from isn't recorded |

## The wind (2026-10-14)

| Game file | Source | Author | License |
|---|---|---|---|
| `amb_wind_loop.m4a` | `Wind-Mark_DiAngelo-1940285615.mp3` in the owner's Islands project (`Islands-29a650/Assets/Audio/`; 29.6 s, 44.1 kHz stereo, 256 kbit/s; no author in its tags), 1 to 26.5 s of it (its fade-in and fade-out cut off), by [`encode-audio.mjs`](../../../tools/encode-audio.mjs): 64 kbit/s stereo. Not a clean loop: crossfaded in the game. (Before it, the same day: UE's starter content's `Starter_Wind05.wav`, under the Unreal Engine EULA; then klankbeeld's `412031__klankbeeld__coast-…wav`, Freesound) | Mark DiAngelo, by the file's name | Not known: where the Islands project got it isn't recorded (the name looks like a SoundBible download) |

The boombox's tracks are numbered in the order of the inventory's table. **Not confirmed against the Blueprint:** the order of its track list isn't readable from the `.uasset`.
