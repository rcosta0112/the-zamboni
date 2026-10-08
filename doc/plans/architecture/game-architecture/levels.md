# Levels: what's in memory, and how levels are built

Part of the [game architecture plan](README.md).

## The three layers

The game world is always made of three layers:

| Layer | Contents | Lifetime |
|---|---|---|
| **Ship** | Interior + exterior, interactive props, devices | Loaded once, **never unloaded** |
| **Crew** | Characters, the penguin, their animations | Loaded once, never unloaded |
| **Exterior slot** | *Either* the travel terrain *or* one landing site | Swapped. One landing site in memory at a time, plus the next one while it preloads |

The ship is the anchor of the whole game: the player is always in it or near it. Because it never unloads, walking inside ↔ outside is never a load, and neither is anything on board.

## Landing sites

- **6 to 10 scenes, with some repeat locations** (owner, 2026-10-08), so fewer unique sites than landings: perhaps 4–7.
- **Ruins are mostly unique models** per site (owner, 2026-10-08). They're the main cost of a site's download (see [budgets](budgets.md)).
- A site the player returns to downloads once; afterwards it comes from the cache (see [loading](loading.md)).

> **Story lever:** reusing a location costs almost nothing, while every new unique site costs a download (≤ 10 MB) and a preload window. If the total download or the preload timing gets tight, a repeat visit instead of a new site is the cheapest fix. Similarly, ruins that share a "kit" of pieces (columns, blocks, arches) across sites cost far less than fully unique ones.

## The planet surface

Some of the planet is **ice and snow**, some is **rocky** (owner, 2026-10-08). That affects:
- **Travel terrain:** the generated terrain needs both surfaces and the transition between them (blended by height, slope or region). Two material sets in the terrain kit.
- **Landing sites:** each is icy, rocky or mixed.
- **Footsteps:** at least snow, ice and rock surface sounds ([`architecture/audio.md`](../../../architecture/audio.md)).
- **Textures:** `resources/textures/` has 4K photo-scanned sets (ice, snow, rock, ground). Downscaled to 512–1024² and compressed (KTX2) they fit the budget; whether a photographic surface suits the flat-colour look, or the terrain should be stylised too, is an art-direction call.

## Authoring and export units

Source files in `resources/models/`; each exports to its own game file.

| Source | Exports to | Notes |
|---|---|---|
| Ship (`The Zamboni 1.18.blend`, minus the `Temple`, `Archive`, `Hidden` collections) | `ship.glb` + `ship-lod.glb` (low-detail exterior for distant shots) | Interior split into rooms by collection (cockpit, crew quarters, engineering, cargo bay, galley, hull) |
| Characters (`The Crew 1.09 Dr. Green.blend`) | `char-<name>-<outfit>.glb` (mesh + skeleton, one per outfit); animations in `anim-player.glb`, `anim-shared.glb`, `anim-<name>.glb`, `anim-penguin.glb` and per-scene `anim-scene-<id>.glb` | See [characters](characters.md) |
| Prop library | `props-<set>.glb` | Reused props (books, cups, cassettes…), placed by reference |
| Each landing site | `site-<id>.glb` | Terrain, ruins, set dressing, collision meshes, spawn points, triggers |
| Travel terrain | `terrain-kit.glb` + textures | Rock and ice materials, rock meshes for scattering; the terrain itself is generated |
| Cutscenes | `cs-<id>.glb` | Animation only (cameras, actions); references the models above instead of copying them |

**Collision:** each exported file carries its own collision shapes (simplified `*_col` meshes, boxes, or a terrain heightfield), counted in its budget. See [budgets](budgets.md#collision).

## Manifests

Each landing site and cutscene has a small JSON manifest: the files it needs and their sizes, spawn points, ambience and music, story hooks. The export script writes the sizes, so the loader knows how many bytes it's waiting for and the budget check can read them.
