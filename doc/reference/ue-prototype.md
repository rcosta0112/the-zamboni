# UE 5.7 Prototype

The first prototype of The Zamboni, built in Unreal Engine 5.7. It's being replaced by the Three.js version (see [`../decision-log.md`](../decision-log.md)) and is kept as a reference for layout, look and behaviour.

## Key facts

- **Location:** `C:\Users\31658\Desktop\The Zamboni.archive\the_zamboni 5.7\`. Not under version control, so work only on copies.
- **First-person, Blueprint-only** (no C++), built from UE's First Person Blueprint template + Starter Content.
- **Startup map:** `/Game/FirstPerson/Maps/FirstPersonMap` (One File Per Actor, about 290 external actors).
- **Rendering:** Lumen GI and reflections, virtual shadow maps, DX12/SM6.
- **Plugins:** ModelingToolsEditorMode, USDImporter. The models came from Blender; the latest `.blend` sources are in `resources/models/` (see [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md)).

## Contents

The inventory below is from file and folder names only. `.uasset` files are binary, so **the Blueprint logic itself hasn't been read yet**.

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
