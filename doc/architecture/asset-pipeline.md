# Asset Pipeline

**Status:** *draft*, Step 1. The `resources/` folder and the git split are decided; the export process and naming contract are proposed.

How art gets from Blender into the game, and the naming contract that lets the art drive behaviour.

## Where art lives

Source art stays **outside git** in `resources/` (ignored by the repo); only exported, game-ready files are committed, in `app/assets/`. Decision: [`../decision-log.md`](../decision-log.md).

```
resources/
  models/           The Zamboni 1.18 (ship), The Crew 2.01 Landscape, The Crew 1.09 Dr. Green,
                    The Crew Console 1.02, Cloud + textures/
  models/props/     Characters 3.5, Chess Board, Hugs, Keyboard, Temple 1.02, mavica, height map + textures/
  textures/         copy of the archive's Resources/Textures
  export/           existing .glb/.fbx exports (doors, lever, boombox, galley, fridge, lab window, coffee pot, Dr. Kaufman)
  audio/            music + ambience/SFX masters (see audio.md)
  fonts/  reference/
  media/            visual reference: renders, screenshots and videos from earlier work (copied from the archive's Media folder)
```

Copied on 2026-10-08 from `The Zamboni.archive` (the newest versions only). The texture links in the Blender files broke in the copy and are being relinked by the owner. Left in the archive: both UE projects + zip, renders/screens/media, `tehzamboni.com`, the old Monogatari visual-novel web prototype, older `.blend` versions, `.aep`/`.ai` files.

## Export (proposed)

1. **Blender → glTF (`.glb`)**, one file per area (ship interior, ship exterior, each landing site) and one per reusable prop or character. Export with **Custom Properties** on so the naming contract below reaches the game as glTF `extras`.
2. **Optimise** with [glTF-Transform](https://gltf-transform.dev/): Meshopt or Draco geometry compression, KTX2 textures, deduplication. A script in the repo runs this so it's repeatable.
3. **Output** to `app/assets/`, which is committed.

**Units and orientation:** metres, scale applied, Blender's default glTF export (+Y up).

**Lighting:** interiors get baked lighting (Cycles bake to lightmaps on a second UV set), since the web renderer has no real-time global illumination. The baking workflow is to be worked out in the vertical slice.

**Characters:** source file `models/The Crew 1.09 Dr. Green.blend`. One shared skeleton for the humans, their outfits and Adam; mitten hands. Each human has at least two outfits (indoor jumpsuit with a name tag, outdoor parka), each its own mesh and texture. Adam is a single rigid-block mesh; both bodies share one animation set. Details and file split: [game architecture plan: characters](../plans/architecture/game-architecture/characters.md); they move here once confirmed.

**Ruins:** mostly unique models per landing site (owner, 2026-10-08).

**Collision:** simplified `*_col` meshes, boxes or heightfields, exported with the model they belong to and counted in its download budget.

**Cutscenes:** animated in Blender as a single timeline per cutscene (camera + characters + ship), exported as glTF animations. See [`README.md`](README.md#cutscenes).

## Naming contract (proposed)

Objects are recognised by **name prefix** and configured with **custom properties**. Names are lowercase with underscores in Blender; ids in data files match them.

| Prefix / property | Meaning | Example |
|---|---|---|
| `door_*` | A door | `door_galley`, `door_hatch_cargo` |
| `interact: <verb>` | What the player can do: `pickup`, `use`, `open`, `talk`, `scan`, `sit` | `interact: pickup` |
| `device: <type>` | Device behaviour class | `device: boombox`, `device: lever` |
| `requires: <id>` | Dependency on another object or story flag | `requires: lever_01` |
| `scan_id: <id>` | Entry this object adds to the scanner database | `scan_id: ruin_gate_01` |
| `cuttable: true` | Surface the see-through hull may cut away | hull, walls, bulkheads, ceilings |
| `*_col` | Invisible collision mesh for its parent (simplified geometry) | `galley_col` |
| `zone_indoor_*`, `zone_outdoor_*` | Trigger volumes that switch indoor/outdoor rules | `zone_indoor_cockpit` |
| `boundary_soft`, `boundary_hard` | Outdoor boundary volumes | |
| `spawn_*` | Player and NPC spawn points | `spawn_player_copilot_seat` |
| `mass: <kg>` | Physics mass for pickable objects | `mass: 0.3` |

## Before the next export

> **[Agent note]** Checklist of known issues to handle the next time assets are exported.

- **`Elbow_r` in the character rigs** (`models/The Crew 1.09 Dr. Green.blend`) is an IK pointer, but it's flagged as a deforming bone, so a plain glTF export includes it. Leave it out of the exported skeleton. Flagged 2026-10-08. **Handled** in [`app/tools/export-crew-character.py`](../../app/tools/export-crew-character.py) (first used 2026-10-08 for prototype 01): bones flagged as deforming but carrying no weights are left out and reported. That also catches `Foot_l` and `Foot_r` (unparented, no weights: IK targets). Keep this rule in the production export script.
- **Crew file export quirks** (found 2026-10-08): characters are posed and placed in a layout, so export in the rest pose at the origin with constraints muted; meshes use a mirror modifier, so modifiers must be applied. Both handled in the same script. The glTF exporter still writes an odd rest translation for the `Body` root bone of the scaled armature; skinning is unaffected, but worth a look when the production export is written.
- **Scale:** Dr. Green is about **0.75 m tall** in the crew file (armature scaled 0.826), against Part 1's 1.23 m. Is 1 Blender unit meant to be 1 metre in the Zamboni files? The game's movement speeds, camera and physics all depend on it.

## Open questions

- Should levels be laid out entirely in Blender, or should some placement (props, triggers) live in data files?
- Which existing exports in `resources/export/` are still current, and which need re-exporting from the latest `.blend`?
- Lightmap baking: Blender's own bake, or a dedicated tool?
