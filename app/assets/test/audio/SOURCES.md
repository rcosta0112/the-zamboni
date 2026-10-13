# Audio: where each file came from

> **[Agent note]** Every file here is a **placeholder** from the UE prototype (owner, 2026-10-13). **None is licensed for a release.** Licensing isn't raised until a production-ready build; this list is what that reminder will be made from. Plan: [`doc/plans/features/audio-from-ue.md`](../../../../doc/plans/features/audio-from-ue.md). Inventory: [`doc/reference/ue-prototype.md`](../../../../doc/reference/ue-prototype.md#audio-read-2026-10-13).

Made by [`app/tools/encode-audio.mjs`](../../../tools/encode-audio.mjs) from the masters in `resources/audio/ue-prototype/` (outside git): AAC in `.m4a`, 22 kHz as the masters are.

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

The boombox's tracks are numbered in the order of the inventory's table. **Not confirmed against the Blueprint:** the order of its track list isn't readable from the `.uasset`.
