# Plan: The game's structure (scenes, state, saving, cutscenes, components)

**Status:** *approved* (owner, 2026-10-20: "everything else is approved"; pass 0 added and started the same day: "add pass 0 and go"). Part of the [game architecture plan](README.md). Takes in item 49 ([components](components.md)) as one of its parts. Backlog item 54.

## Goal

Decide how the whole game is organised across the storyline (several scenes with different assets, one story state, saving and continuing), and how the ship's things as components fit into it, then prove the chain in 0.0.2 with a small slice: two scenes in the ship, doors as components, Ink driving a door, a checkpoint save and *Continue*, and one tiny cutscene.

## Scope

- **In:** the model below (locations and scenes, who owns each piece of state, ids, the shared commands, components, cutscenes); the slice in 0.0.2, in passes.
- **Out:** landing sites and the exterior swap (the command is defined, not built: no site exists yet); the asset manager's preloading ([loading](loading.md)); the comm, mission data and chat history (empty slots in the save); the offline app; the owner's cutscene tooling (*For the cutscenes*, below: noted for later); story content (the slice uses a test story of placeholder lines, never the owner's script).

## The model

### Locations and scenes

- **A location is a set of assets:** the ship (always loaded) plus what's in the exterior slot (travel terrain or one landing site), as in [levels](levels.md). Its things are **entities made of components**, each an instance of a **kind** defined in the game.
- **A scene is a story beat:** which location, where the crew stand, which doors start open or locked, which interactions are on, which cutscene opens or closes it. It's a small data file that refers to instances by id, e.g. `{ "cargo-ramp": { "state": "open" } }`. Scene manifests ([levels](levels.md#manifests)) gain this setup.

### Who owns each piece of state

| Layer | Example | Lives in | Saved? |
|---|---|---|---|
| Kind default | a door starts closed, swings 90°, has these sounds | TypeScript definitions | no (code) |
| Instance | this door's axis, rest pose, id | the file + `rest-poses.json` | no (assets) |
| Scene setup | the ramp is open when this scene starts | scene data | no (assets) |
| Story state | the lab door has been unlocked | **Ink** | **yes** |
| Live state | the door is half open right now | the component | **no** (resets) |

- **Anything that must survive a save is in Ink**, never only in a component. A component reads Ink when its scene starts and reports what the story cares about (used, opened, scanned) as Ink variables or calls. Props and doors stay out of the save ([saving](saving.md), owner, 2026-10-08).
- **Loading a checkpoint:** load the location → kind defaults → the checkpoint scene's setup → what Ink says → the player at the spawn point.

### Ids (owner, 2026-10-20)

Every instance the game, a scene, Ink, a cutscene or another object (a keypad naming its door) needs to name has a **stable id**, unchanged when the file is reworked. A renamed or missing id is caught by the export gate, not found in play. Static scenery (`Cube.010`) never gets one: about 40 objects need one today.

- **Readable, never parsed:** `cargo-ramp`, `cockpit-door-left`, `floor-hatch`. The game reads nothing from the id's words; what a thing is comes from its `kind` property, so the id doesn't repeat the kind.
- **Clean names first (pass 0), then the id once:** the id is written from the corrected Blender name (`Cockpit Door Left` → `cockpit-door-left`) and kept when the object is renamed later; `ids.json` shows the two side by side.
- **Unique within a location:** in full `ship/cargo-ramp`; inside a location's own data, the short form.
- **Changing an id is deliberate:** a script renames it and every scene, Ink line and cutscene naming it; the gate shows the references first.
- **Names:** room, thing, then a side or a number. **Sides** as seen facing the cockpit (left, right, front, back; upper, lower). **Numbers** only for interchangeable things, from 1, no padding, never Blender's `.00x`: rows top to bottom, then left to right as you face them.
- **Finding them:** in Blender, the `id` and `kind` properties (and a search panel that selects by id, if the owner wants one); in the game, `userData.id`, `__entity('<id>')` in dev builds and the target's id in the tuning panel; between the two, `ids.json` written by each export (id, kind, Blender name, collection). `npm run check` checks every id named in scene data, Ink and cutscene tracks against it.

### One set of commands

Scene setups, cutscene event tracks and Ink all say the same things through one small set of commands addressed by id: *set state*, *place a character at a mark*, *play a sound*, *enable / disable an interaction*, *swap the exterior* (defined only), *start a cutscene*. One vocabulary, three users.

### Components

As in [components.md](components.md): plain TypeScript classes, kinds with defaults, a small state per component (closed / open / moving / locked), no ECS, no editor. Blender stays the tool for meshes, animation and placement; the file carries each instance's kind and id. The mode machine ([`architecture/README.md`](../../../architecture/README.md#game-modes)) decides which components update.

### Cutscenes (in-engine)

- **Tracks target instances by id**, so the cutscene file (`cs-<id>.glb`, animation only) drives the objects already loaded. The export gate checks every id it names exists.
- **While a cutscene plays, the timeline owns what it animates;** those components pause and take control back when it ends.
- **Each cutscene declares its end state** (doors, characters' marks, Ink). That one declaration covers the hand-back (no snap), *skip* (jump to the end state), the checkpoint after it (*Continue* matches what the player last saw), and a check that its last frame matches the next scene's setup.
- **No save mid-cutscene;** checkpoints fall at cutscene ends. An in-engine cutscene can't hide the loading of its own assets ([loading](loading.md)); the exterior swap is an event on the landing cutscene's track.
- **The camera is authored:** no camera collision; the see-through gets a per-shot setting in the event track (off, follow her, follow another target).
- **The ladder climb already works this way in miniature** (slide to the start, the animation owns her, handed back where it ends): pass 5 generalises it.

### For the cutscenes (owner, 2026-10-20: noted for when we get to them)

- **The game's camera in Blender:** a rig that replicates the game's camera controls, with the see-through hole's radius and the clipping distance shown and adjustable, so each shot can be framed as the game will draw it. Its values travel with the shot to the event track.
- **The game's lighting in Blender:** a replica of the game's lighting setup (sun, sky, the room lights, the indoor rules), so shots are set up under the light they'll have in the game.
- **Cinematic effects:** depth of field at least, set per shot. Its cost goes into the shot's budget ([performance](performance.md)).

## Constraints from the docs

- **Conflict (approved, to record):** [`architecture/README.md`](../../../architecture/README.md), principle 3 (*Art drives behaviour through names*) and its *Content and data* table, and the decision log's *The ship's reference file* (2026-10-12), put behaviour in the file's tags. Here the file carries kind and id; behaviour is in the game's definitions. Decision-log entry 2026-10-20; the docs change as each pass is built.
- **Ink is the single source of truth for story state** ([`architecture/README.md`](../../../architecture/README.md#systems)).
- **Saving:** checkpoints, props reset, IndexedDB ([saving](saving.md), [`platform.md`](../../../architecture/platform.md)).
- **Story content is the owner's** (CLAUDE.md, rule 1): the slice's Ink is a test story in `public/test/` with placeholder lines.
- **Gamepad first:** *Continue* and *skip* work from the pad.
- **0.0.2 only;** 0.0.1 stays frozen.

## Options

**The id in the file:** B, an `id` property (owner, 2026-10-20), written from the names corrected in pass 0.

| Option | Cost | Risk |
|---|---|---|
| **A. The object's name is its id** | nothing to add | a rename in Blender breaks every scene, cutscene and Ink line that names it (the gate catches it, but every rename is then a fix) |
| **B. An `id` custom property** (and `kind`), set once by a script on today's objects (recommended) | one script; the owner sees two properties on each instance | a duplicated object keeps its properties (a known trap), so the gate flags duplicate ids |

Names stay free for the owner; the gate checks ids are present and unique. Kinds come from today's tags (`interact: door` → `door`).

## The work, in passes (a stop to assess after each)

**Pass 0: the names (about 1½ hours, owner's review in the middle).** (a) The rename table of the objects that need an id: current name, kind, room, proposed name ([`ship-names.md`](ship-names.md)); the owner edits and approves it. (b) A script, tried on a scratch copy, the save announced and a backup kept, renames them in `The Zamboni 1.21.blend` (meshes too: a mesh used by one object takes its name, a shared one the kind's) and updates what names them today: the tags `opensWith` and `controls`, `ship-export-list.json`, `rest-poses.json`, the code's lookups (`ship.ts`, `interaction.ts`, `ladders.ts`, `wind.ts`, `doors.ts`), `after-export.js` and the smoke script. Old one-off Blender scripts (`tag-ship-pass4.py`, `fit-bulkhead-doors.py`, `build-ship-reference.py`) keep the old names: history. (c) `npm run export:ship`; the gate stops on the renames, as it should; `export:accept -- ship` after checking only names changed. *Check:* the after-export check and the smoke script, unchanged.

**Pass 1: the core and doors (about 3 hours).** A small entity and component base; kind definitions in TypeScript; the `id` / `kind` properties added by a script (tried on a scratch copy, the save announced first); hinged doors, sliding doors, hatches and the ramp moved over, taking their rest poses from `rest-poses.json`; the export gate flags missing or duplicate ids; the pause hook a cutscene will use. *Check:* the after-export check and the smoke script show no change in the game.

**Pass 2: scenes and the commands (about 2 hours).** The scene data format and a scene director that applies a setup; the command set (state, enable / disable, place a character, sound; *swap the exterior* as a stub); two test scenes in the ship (*opening*: everything at defaults; *later*: the ramp open, Dr. Kaufman moved); a dev switch to start in either. *Check:* a probe starts each scene and reads the doors' states and her position.

**Pass 3: Ink in the game (about 2 hours).** `inkjs`; a test story in `public/test/` that keeps a variable (`lab_door_unlocked`); a door locked until the variable is set, read when the scene starts; a keypad that sets it through the commands; Ink able to call the commands. *Check:* a probe uses the keypad, then reloads the scene and finds the door unlocked.

**Pass 4: the checkpoint save and *Continue* (about 2 hours).** IndexedDB with persistent storage; the save format (format and game versions, checkpoint id, Ink's state, empty mission-data and chat slots); a save at each scene start; *Continue* on the start screen (gamepad), restoring in the order of the model. *Check:* a probe saves in *later*, reloads the page, continues, and finds the scene, the door and Ink as they were, and the props reset.

**Pass 5: a tiny cutscene (about 3 hours).** The cutscene player: tracks by id, the timeline owning what it animates, the event track (commands, the see-through per shot), the declared end state, *skip*, the hand-back to the player generalised from the ladder, a checkpoint at its end. The cutscene: the camera moving while the ramp opens, then control back. Its animation: made by the owner in Blender, or by an agent script as a placeholder (owner's choice). *Check:* a probe plays it, skips it, and compares its end with the next scene's setup.

**Pass 6: the rest of today's kinds (about 3 hours).** Keypads and panels, the lever, the engineering window, ladders, the jetpack rack, the boombox, the crew; the remaining tags and name lookups (`UNTAGGED`) retired. *Check:* the smoke script, unchanged.

Passes 1–5 are the slice. Pass 6 can come later without blocking anything.

## Done when

- Each pass: its probe, `npm run check`, `npm run build`; the smoke script once at the end of each pass; the owner plays the result.
- The slice: from the start screen, play *opening*, unlock the door, watch the cutscene, quit, reload, *Continue*, and find the story where it was with the props reset.

## Open questions for the owner

1. ~~The id in the file~~: B, after pass 0's names (owner, 2026-10-20).
2. Pass 5's animation: yours in Blender, or a placeholder from a script?
3. Pass 6 straight after the slice, or later?

## After

- `architecture/README.md`: principle 3 and the *Content and data* table (kind and id in the file; behaviour in definitions), the systems (scene director, components, cutscene player), the folder layout.
- `asset-pipeline.md`: the naming contract (`id`, `kind`), the gate's id checks.
- [saving](saving.md) (the "story state in Ink" rule; the format as built), [levels](levels.md) (locations vs scenes; manifests with the setup), [code](code.md).
- `features/interaction.md`, the code map, `tools/README.md`; the decision log's update notes.
