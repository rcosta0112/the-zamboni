# UE 5.7 Prototype

The first prototype of The Zamboni, built in Unreal Engine 5.7. It's being replaced by the Three.js version (see [`../decision-log.md`](../decision-log.md)) and is kept as a reference for layout, look and behaviour.

## Key facts

- **Location:** `C:\Users\31658\Desktop\The Zamboni.archive\the_zamboni 5.7\`. Not under version control, so work only on copies.
- **First-person, Blueprint-only** (no C++), built from UE's First Person Blueprint template + Starter Content.
- **Startup map:** `/Game/FirstPerson/Maps/FirstPersonMap` (One File Per Actor, about 290 external actors).
- **Rendering:** Lumen GI and reflections, virtual shadow maps, DX12/SM6.
- **Plugins:** ModelingToolsEditorMode, USDImporter. The models came from Blender; the latest `.blend` sources are in `resources/models/` (see [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md)).

## Contents

The inventory below is from file and folder names only. `.uasset` files are binary, so **the Blueprint logic itself hasn't been read**, except for the three Blueprints under *What was read* below.

### Ship areas (`Content/Models/`)

| Area | Contents |
|---|---|
| Cockpit | Seats, yoke, D-pad, dials, monitors, nav display, fire extinguisher |
| Crew Quarters (~150 files) | Bunks, boombox, cassettes, chess set, books, coffee, Braun KF20 coffee maker, comms |
| Engineering | 3D printer, centrifuge, bench, cabinets, crates, lab window |
| Cargo Bay | Lockers, jetpacks + rack, sledge, pallets, ladder, chests |
| Hull | Bulkheads, floors, galley, couch, doors, landing gear |
| Crew | One character: "Dr. Kaufman" |

About 80 materials, mostly flat colours and emissives, which suits a web renderer.

### Gameplay Blueprints (`Content/Blueprints/`)

- `BPI_Interact`: an interaction interface, presumably shared by the interactables
- Doors: `BP_Door` base plus Fridge, Galley, Hatch, Internal, Locker, Locker_Cargo variants
- `BP_Boombox`: 4 music tracks, cassette sound, custom sound attenuation
- `BP_Ladder`, `BP_Lever_Panel`, `BP_Engineering_Window`
- UI: `W_HUD`, `W_HUD1`, `W_Crosshair`
- Ambient audio: wind, birds, Cessna flight/landing loops

### What was read (2026-10-13)

For the bulkhead doors and the engineering window ([`../features/interaction.md`](../features/interaction.md)). A `.uasset` holds its names as plain text: components, variables, events, timeline tracks. Listing every run of readable characters in the file gives the shape of the logic. **The numbers aren't readable this way** (timeline lengths, distances, the trigger box's size).

| Blueprint | What it has | So |
|---|---|---|
| `BP_Door_Internal` | Meshes `Door_Left`, `Door_Right`; a `Collision Box` with *begin overlap* and *end overlap* events; one timeline with tracks *Position Left* and *Position Right*, played forward and in reverse; `isOpen`; a sound (`Audio/Doors/244491416_nw_prev_01`) | The leaves slide apart when she enters a box around the doorway, and back when she leaves it. No interaction: the UE door has no panel |
| `BP_Engineering_Window` | Meshes `Lab_Window_Left`, `Lab_Window_Right`; a `ToggleWindow` event; a timeline with *Position Left*, *Position Right* and *Light Intensity*; a rect light; `isOpen`; the same sound | Two sliding halves, toggled from outside; a light fades in as it opens |
| `BP_Lever_Panel` | Meshes `Lever_Panel`, `Lever`; the `BPI_Interact` interface; a timeline with *Position Y* and *Position Z*; `isOn`, `IsAnimating`; calls `ToggleWindow` | Using it slides the lever to its other position and toggles the window; presses are ignored while it moves |

### Audio (read 2026-10-13)

For pass 4.5 ([`../plans/backlog-passes.md`](../plans/backlog-passes.md)). Read the same way: names, not numbers. Volumes, the attenuation box's size and which sounds loop **aren't readable**. Node titles are stored with every letter shifted by one (`BvejpDpnqpofou;Qmbz` is `AudioComponent:Play`), which gave the calls and a few pin values.

**Sounds that are played** (`Content/Audio/`; wav sources in `The Zamboni.archive/Resources/Audio/`):

| Sound | Length | Source wav | Played by |
|---|---|---|---|
| `Doors/244491416_nw_prev_01` | 1.9 s | mono, 22 kHz, 8-bit | `BP_Door_Internal` (two in the level) and `BP_Engineering_Window`: one `Door Sound` component each, `Play` from 0.1 s whenever the door starts to move, opening or closing |
| `Boombox/cassette-ffww-cassetera-96765_01` | 1.8 s | stereo, 22 kHz, 8-bit | `BP_Boombox`, when it's used |
| `Boombox/Anamanaguchi_-_Helix_Nebula_01` | 2:50 | stereo, 22 kHz, 8-bit | `BP_Boombox`, a track |
| `Boombox/Anamanaguchi_-_My_Skateboard_Will_Go_On_01` | 3:50 | stereo, 22 kHz, 8-bit | `BP_Boombox`, a track |
| `Boombox/2NRO8OT_-_Crash_Of_The_First_Interstellar_Channel_01` | 3:03 | stereo, 22 kHz, 8-bit | `BP_Boombox`, a track |
| `Boombox/2NRO8OT_-_Ugol_Padeniya_01` | 3:13 | stereo, 22 kHz, 8-bit | `BP_Boombox`, a track |
| `Ambient/plane_cessna152_flight-52790_01` | 7:05 | **none in the archive** (22 kHz in UE; imported from `Downloads`) | An `AmbientSound` actor in the level, with its own volume. **The ship's background noise in flight** (owner, 2026-10-13) |
| `Ambient/plane-landing-23118_01` | 1:34 | **none in the archive** (same) | An `AmbientSound` actor in the level (`AmbientSound2`), with its own volume. The ship's noise too |

**`BP_Boombox`** has five audio components (the four tracks and the cassette sound), all with `SoundAttenuation_Boombox` (box shape, *natural sound* falloff). Variables: `isPlaying?`, `Track Number`, `Vibration Intensity`. Nodes: `Interact`, `Play` (tracks from 0.1 s, the cassette sound from 0), `Stop`, a switch on `Track Number`, *increment* and a *greater than* test, `Random Integer`, a binding to the cassette sound's *on audio finished* (`Sound Effect is Done`), and on tick a random offset to the mesh's location and rotation, scaled by `Vibration Intensity`. Most likely reading (the wiring between nodes isn't readable): using it plays the cassette sound, then the track when that finishes; using it again stops it and moves to the next track, back to the first after the last; the mesh shakes while a track plays. What `Random Integer` feeds isn't known.

**In the project, never played:** `Ambient/Starter_Birds01`, `Starter_Wind05`, `Starter_Wind06` (copies of Starter Content, referenced by nothing); the rest of `StarterContent/Audio/`; two redirectors in `Audio/` left from moving the plane sounds.

**In the archive, never imported:** `mixkit-arctic-winds-1154.wav` (39 s) and `mixkit-space-rocket-full-power-turbine-1720.wav` (9 s), both 44.1 kHz stereo, in `Resources/Audio/` and again in `Assets/`.

**Getting the wavs out (2026-10-13).** A SoundWave `.uasset` keeps the imported wav whole, as a compressed buffer: magic bytes `B7 75 63 62`, a 64-byte header (big-endian: method, block size, block count, raw size), the blocks' sizes, then the blocks, compressed with Oodle. `oo2core_9_win64.dll` is in `C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\DotNET\AutomationTool\`; Python's `ctypes` calls its `OodleLZ_Decompress` per block. The Starter Content sounds are stored uncompressed. Results:

- The two plane sounds came out as valid wavs: mono, 22 kHz, 16-bit.
- UE's copies of the door, cassette and music files are 16-bit with an invalid format tag, and hold the 8-bit samples widened, not better sound: the archive's 8-bit wavs are the ones to use (the owner has no better copies).
- All of it is now in the project's `resources/audio/`: `ue-prototype/` (the eight played sounds), `ue-starter-content/` (birds, two winds), `mixkit/` (the two never imported).

**Nothing else makes a sound:** the hinged doors (`BP_Door` and its fridge, galley, hatch and locker variants), `BP_Ladder`, `BP_Lever_Panel`, the character (no footsteps), the HUD.

### Not worth porting

- Template rifle, projectile, weapon component and `IMC_Weapons` (probably unused)
- Duplicate game modes (`BP_FirstPersonGameMode`, `_`, `_2`), `BP_Door_Locker` vs `BP_Locker_Door`, `W_HUD` vs `W_HUD1`
- Starter Content and its sample maps
- Plane audio duplicated in `Audio/` and `Audio/Ambient/`

### ⚠ Licensing

The boombox tracks are by **Anamanaguchi** ("Helix Nebula", "My Skateboard Will Go On") and **2NRO8OT**. A public web build counts as distribution, so the licenses must be confirmed before shipping them. See [`../architecture/audio.md`](../architecture/audio.md).

## Extracting the logic

The logic is small (doors, interaction, ladder, lever, boombox) and easy to rebuild; the blocker is reading it.

**Preferred method:** in each Blueprint's Event Graph, select all nodes (Ctrl+A), copy (Ctrl+C) and paste into a `.txt` file; UE copies nodes as readable text. Save them as `app/ue-reference/blueprints/BP_Door.txt` etc. Fallbacks: written descriptions of each behaviour, or short gameplay videos for timing and feel.

**Alternative: Unreal MCP.** Epic's official Unreal MCP plugin (`ModelContextProtocol` + "All Toolsets") needs **UE 5.8**, not 5.7 ([docs](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor)). As of 2026-10-08, `C:\Program Files\Epic Games\UE_5.8\` contains `Engine/`, `Templates/` and `ToolComplete.txt`, so the install looks complete (untested). Steps if used:

1. Upgrade a **copy** of the project to 5.8 (the original has no version control).
2. Turn on the plugins.
3. Start the server with `ModelContextProtocol.StartServer`.
4. Run `ModelContextProtocol.GenerateClientConfig ClaudeCode`, which writes a `.mcp.json` pointing to `http://127.0.0.1:8000/mcp` (HTTP, loopback only, no authentication).

Given the move off UE, this matters only as a way to extract information from the prototype.
