# The ship's names (pass 0 of the game's structure)

**Status:** *approved* (owner, 2026-10-20, with the answers at the end). Part of [the game's structure](game-structure.md), pass 0. Edit the *Proposed name* column freely; the id is written from it (`Cockpit Door Left` → `cockpit-door-left`).

> **[Agent note]** Made from the last ship export (`The Zamboni 1.21.blend`): every object the game finds by tag or by name, or that another object names. Static scenery isn't here: it needs no id. **Sides** are as seen facing the cockpit (the ship's front; +x in Blender is left). **Numbers** go top to bottom, then left to right as you face the objects. Kinds are a first guess: pass 1 settles them.

## Doors, hatches, the ramp, the window

| Current name | Kind | Room | Proposed name | Why |
|---|---|---|---|---|
| `Door` | hinged door | cargo hold, right side | **Side Door** | |
| `Door Cargo` | ramp | cargo hold, back | **Cargo Ramp** | |
| `Door Cockpit` | sliding door (half) | between crew quarters and cockpit | **Cockpit Door Right** | slides to the right |
| `Door Cockpit 2` | sliding door (half) | the same | **Cockpit Door Left** | |
| `Door Engineering` | sliding door (half) | between cargo hold and engineering | **Engineering Door Right** | |
| `Door Engineering 2` | sliding door (half) | the same | **Engineering Door Left** | |
| `Lab Window` | sliding window (half) | engineering, front | **Engineering Window Left** | slides to the left |
| `Lab Window.001` | sliding window (half) | the same | **Engineering Window Right** | |
| `Level` | lever handle (moves) | engineering | **Engineering Window Lever Handle** | "Level" is a typo for lever |
| `Hatch.002` | hatch | crew quarters floor, over the ladder | **Floor Hatch** | owner: not "Trapdoor" |
| `Top Hatch` | hatch (half) | roof | **Top Hatch Upper** | |
| `Top Hatch Bottom` | hatch (half) | roof | **Top Hatch Lower** | |
| `Galley Door.001` | hinged door | galley | **Galley Door 1** | back |
| `Galley Door` | hinged door | galley | **Galley Door 2** | middle |
| `Galley Door.002` | hinged door | galley | **Galley Door 3** | front |
| `Locker Door` | hinged door | cargo hold | **Cargo Locker Door** | |
| `Locker Door.003` | hinged door | crew quarters, back wall | **Crew Locker Door 1** | left as you face them |
| `Locker Door.001` | hinged door | crew quarters, back wall | **Crew Locker Door 2** | right; carries the Gojira poster |

## What opens them

| Current name | Kind | Opens | Proposed name |
|---|---|---|---|
| `Door Panel - Side door` | keypad | Side Door | **Side Door Keypad** |
| `Door Panel - Cargo Ramp` | keypad | Cargo Ramp | **Cargo Ramp Keypad** |
| `Door Panel - Cockpit` | panel | Cockpit Door | **Cockpit Door Panel Front** (cockpit side) |
| `Door Panel - Crew Quarters` | panel | Cockpit Door | **Cockpit Door Panel Back** (crew quarters side) |
| `Door Panel - Engineering` | panel | Engineering Door | **Engineering Door Panel Front** (engineering side) |
| `Door Panel - Cargo Hold` | panel | Engineering Door | **Engineering Door Panel Back** (cargo hold side) |
| `Level Panel` | lever | Engineering Window | **Engineering Window Lever** |

## Other things the game uses

| Current name | Kind | Room | Proposed name |
|---|---|---|---|
| `Ladder Cargo Bay` | ladder | cargo hold → crew quarters | **Cargo Hold Ladder** |
| `Jetpack.003` | jetpack | cargo hold, rack, upper shelf | **Jetpack 1** |
| `Jetpack.004` | jetpack | the same | **Jetpack 2** |
| `Jetpack.001` | jetpack | rack, lower shelf | **Jetpack 3** |
| `Jetpack.002` | jetpack | the same | **Jetpack 4** |
| `Jetpack Rack` | rack (shelf) | cargo hold | **Jetpack Rack Upper** |
| `Jetpack Rack.001` | rack (shelf) | cargo hold | **Jetpack Rack Lower** |
| `Boombox.001` | boombox | crew quarters | **Boombox** |

## The crew (ids only, no renames in pass 0)

| Character (its `character` tag) | Proposed id |
|---|---|
| Dr. Kaufman | `kaufman` |
| Dr. Ogawa | `ogawa` |
| Adam (Red), Unit 1 | `adam-red` |
| Adam (Blue), Unit 2 | `adam-blue` |

> **[Agent note]** Their objects have confusing names (`Dr. Ogawa - Dr. KaufmanMesh.013`, `Adam (Red) - Droid.002`), but the crew are exported and animated in other ways too, so renaming them belongs with the crew's own export. Tell me if you want them in pass 0 anyway.

## Answered (owner, 2026-10-20)

1. Room word: **Cargo Hold**.
2. The galley doors stay **Galley Door 1–3** (one is a fridge; kept simple).
3. Meshes: one used by a single object takes its name; one shared takes the kind's (`Galley Door`, `Jetpack Rack Shelf`). Yes.
4. The hatch over the ladder: **Floor Hatch** (owner: Deck Hatch or Floor Hatch; *Floor* chosen, as *Deck* could be read as the roof's hatch).
