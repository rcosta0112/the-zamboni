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

> **[Agent note]** **Pass 1 as built (2026-10-20), in two halves.** **1a:** [`add-ids-pass1.py`](../../../../app/prototypes/0.0.2/tools/add-ids-pass1.py) set `id` and `kind` on the 33 objects (saved into 1.21, backup kept); kinds: `door`, `hatch`, `drop-door` (the side door), `ramp`, `sliding-door`, `sliding-window`, `lever-handle`, `lever`, `keypad`, `door-panel`, `ladder`, `jetpack`, `jetpack-rack`, `boombox`. The crew's ids come with pass 2, from the crew export (their `character` tag is written by it). The gate: `ID:` lines, an id gone or changing kind stops the export, a duplicate stops it, a used object without an id is a `NOTE:`, new or renamed ids are flagged; `tools/ids.json` written when taken. The export with the ids differed from the game's file only by the 66 `id`/`kind` tags. **1b:** `src/entities.ts` (entities by id, components, `Openable`: open, amount, paused), `src/kinds.ts` (the kinds; the door kinds' defaults: hinge or slide, sound, to the ground, automatic); each door is its entity's component and takes its behaviour from its kind (the tags still give axis, angle and slide, and the game warns if their copy of the behaviour disagrees: none does); the ramp gets a thin `Openable` over its existing state (`settings.cargoRampOpen`, `rampAmount`); `paused` stops a door or the ramp (the cutscene hook); `__entity('<id>')`. **Not done (owner, 2026-10-20: agreed):** the game taking the rest poses from `rest-poses.json`; they stay with the export. The export already puts every moving part at rest from it and the gate stops on a pose change, and the game can't apply Blender's local transforms safely (compression moves node origins: the game builds hinges from the `hinge` tag). `startOpen` (the floor hatch) stays a tag until pass 2's scene setup.

**Pass 2: scenes and the commands (about 2 hours).** The scene data format and a scene director that applies a setup; the command set (state, enable / disable, place a character, sound; *swap the exterior* as a stub); two test scenes in the ship (*opening*: everything at defaults; *later*: the ramp open, Dr. Kaufman moved); a dev switch to start in either. *Check:* a probe starts each scene and reads the doors' states and her position.

> **[Agent note]** **Pass 2 as built (2026-10-20).** The crew export writes each character's `id` (`kaufman`, `ogawa`, `adam-red`, `adam-blue`) and `kind: character` on its pieces (taken: only those tags and the deleted `Tape.003` differed); the game groups a character's pieces under one root at its feet, an entity with a `Placement`. `src/commands.ts`: `set` (`state: open | closed`), `enable` / `disable` (an interaction, by any of its objects' ids), `place` (feet in the ship file's Blender coordinates, `turn` in degrees from as exported: the export doesn't record a facing to measure from), `sound`; `swap-exterior` and `cutscene` warn. `src/scenes.ts`: the scene file (`public/test/scenes/<id>.json`: location, her start, the setup), the director (every door and the ramp closed, every interaction on, the crew home; then the setup; the doors snapped; her start). **`opening` reproduces today's start** (the ramp and the floor hatch open: the floor hatch's `startOpen` tag is no longer read), so the plan's *later* differs: the ramp **closed**, the side door open, Dr. Kaufman moved to the cargo hold, the ramp's keypad off, her start in the cargo hold. Dev switch: `?scene=later`; `__director().start('<id>')`. Check: [`scenes-probe.js`](../../../../app/prototypes/0.0.2/tools/scenes-probe.js), 14 checks pass. Seen: in the cargo hold the crew are hidden (the existing lower-deck rule), so Dr. Kaufman's move shows only from upstairs.

**Pass 3: Ink in the game (about 2 hours).** `inkjs`; a test story in `public/test/` that keeps a variable (`lab_door_unlocked`); a door locked until the variable is set, read when the scene starts; a keypad that sets it through the commands; Ink able to call the commands. *Check:* a probe uses the keypad, then reloads the scene and finds the door unlocked.

> **[Agent note]** **Pass 3 as built (2026-10-20).** `inkjs` 2.4.0 (pinned). The test story [`public/test/story.ink`](../../../../app/prototypes/0.0.2/public/test/story.ink), compiled to `story.json` by `npm run ink` ([`tools/ink.mjs`](../../../../app/prototypes/0.0.2/tools/ink.mjs), the compiler's errors printed; the compiled file is in git). The ship has no lab and both keypads have a job, so the slice locks **the side door** in a third test scene, **`locked`** (`?scene=locked`), and the variable is `side_door_unlocked`. `src/story.ts` (`GameStory`): loaded before the first scene; `get` / `set` a variable; `run(knot)` (its lines to the console: no dialogue yet); the external function `command(name, id, value)` runs one of the commands (set, lock, unlock, enable, disable, sound, cutscene; `value` is a `set`'s state or a `sound`'s cue). The commands gain **`lock` / `unlock`** (`Openable.locked`: she can't open it, from it or its keypad; scenes and Ink still can; an automatic door stays shut), **`story`** (run a knot) and, on any command, **`if` / `unless`** an Ink variable (a scene's setup reads the story when it starts: `{ "do": "lock", "id": "side-door", "unless": "side_door_unlocked" }`). **Using something locked** (`respectLocks`, interaction.ts): its knot `use_<id>` (dashes as underscores) if the story has one, prompted by the knot's `# verb:` tag, run through the `story` command; otherwise *Locked*. Story state is in memory only until pass 4 (the save). Check: [`story-probe.js`](../../../../app/prototypes/0.0.2/tools/story-probe.js), 11 checks pass. Not done: `npm run check` checking the ids named in Ink against `ids.json` (the *Ids* section): with pass 4 or 6.

**Pass 4: the checkpoint save and *Continue* (about 2 hours).** IndexedDB with persistent storage; the save format (format and game versions, checkpoint id, Ink's state, empty mission-data and chat slots); a save at each scene start; *Continue* on the start screen (gamepad), restoring in the order of the model. *Check:* a probe saves in *later*, reloads the page, continues, and finds the scene, the door and Ink as they were, and the props reset.

> **[Agent note]** **Pass 4 as built (2026-10-20).** [`src/save.ts`](../../../../app/prototypes/0.0.2/src/save.ts): one save in IndexedDB (database `zamboni`, store `saves`, key `checkpoint`); persistent storage asked for at the first save (Chrome grants it or not by itself, no prompt). The format: `format` (1; a newer one is ignored, an older one would be brought up to date in `readSave`), `game` (the version, `__VERSION__`), `checkpoint` (a scene's id), `location` (`ship`), `story` (Ink's whole state, `GameStory.state()`), `missionData` and `chat` (empty), `savedAt`. **Saved at every scene start once the game has begun** (`SceneDirector.onStarted`), and when the start button is used; not for the scene under the start screen. **At load the save is read; if there is one, its scene is started under the start screen** with the story restored (so the view behind the screen is what *Continue* gives), and the screen offers **CONTINUE** (chosen first) above **NEW GAME**; with no save, **START** as before. NEW GAME resets the story and starts `opening` (the save is overwritten, no confirmation). Restoring follows the model: the story's state, then the scene (kind defaults → setup, which reads Ink → her start). Choosing: the arrows or W / S, the D-pad or the left stick (`Input.menuStep`); any other pad button, Enter or Space uses it. The second button's place (20 below the first) isn't in the mockup: a placeholder. `?scene=<id>` (dev) still wins over the save under the screen; CONTINUE then starts the save's scene when used. Dev hook `__save` (`read`, `clear`); `__start().shown`. Check: [`save-probe.js`](../../../../app/prototypes/0.0.2/tools/save-probe.js) then [`save-probe-after.js`](../../../../app/prototypes/0.0.2/tools/save-probe-after.js) (the probe's new `--reload <file>`: the page reloaded, storage kept, the start screen's Enter used again), 15 pass; NEW GAME with a save and the two buttons seen in one-off probes. Not done: the save export / import (the safety net in [saving](saving.md)); the ids named in Ink checked against `ids.json` (with pass 6).

**Pass 5: a tiny cutscene (about 3 hours).** The cutscene player: tracks by id, the timeline owning what it animates, the event track (commands, the see-through per shot), the declared end state, *skip*, the hand-back to the player generalised from the ladder, a checkpoint at its end. The cutscene: the camera moving while the ramp opens, then control back. Its animation: made by the owner in Blender, or by an agent script as a placeholder (owner's choice). *Check:* a probe plays it, skips it, and compares its end with the next scene's setup.

**Pass 5's cutscene (owner, 2026-10-20): a placeholder, three shots, 9 s.** Replaces *the camera moving while the ramp opens* above.

1. **The ship from outside, far away in the distance;** the camera slowly pans right. 3 s.
2. **Cut to the cockpit,** the camera outside, showing both pilot seats and the navigation and signal stations. 3 s.
3. **Cut back to the first shot,** still panning right. 3 s.

**Approved as the agent reads it below (owner, 2026-10-20):** "this is just a placeholder, use your best judgement"; the ship partly hidden by the haze is fine, and so is the glass making the cockpit shot a bit dark. The agent's open choice, settled: **nothing visible on the event track** beyond the per-shot settings (see-through off, the camera's far plane): no door moves, no sound.

> **[Agent note]** How the agent reads it, and what it builds:
> - **"Pans" = the camera turning** (yaw) from a fixed spot, not sliding sideways. Slowly: about 2° a second (a guess, tunable).
> - **Shot 3 picks up where shot 1 ended** (the pan's seconds 3–6, as if it had kept going off screen it would be seconds 6–9: say if you'd rather have that).
> - **Shot 2 looks in through the cockpit's front windows** from just outside the nose, framing the two pilot seats, the navigation station and the signal receiver (`Signal Receiver.001`); the camera holds still (nothing was said about movement). The see-through off in all three shots (the camera is authored: plan, *Cutscenes*).
> - **The placeholder is data written by a script, not a Blender file:** a small track file (`public/test/cutscenes/<id>.json`: the shots, each a camera's keys in the ship file's Blender coordinates, the cuts, the event track) in the shape the player will also read from a `cs-<id>.glb` when you author one. Id: `test-ship-shots`.
> - **When it plays:** from the test story (the side door's keypad knot in `locked` calls `command("cutscene", "test-ship-shots", "")` after unlocking), and `__cutscene()` in dev builds. At its end: control back to her where she stood, the camera behind her as before, and a checkpoint (the scene's, with the story as it is then). *Skip*: any pad button or Esc/Enter jumps to the end state.
> - **Its end state** changes nothing in the ship (no door moves in these shots), so the check compares the end with the scene as it was. If you want the event track exercised by something visible (e.g. the ramp opening during shot 1, or a sound at the cut), say so.
> - **Possible snags:** the far shot depends on the camera's far plane and the haze (the ship may fade or clip at distance: they'd be set per shot); the cockpit glass may draw dark or reflect from outside.

> **[Agent note]** **Pass 5a as built (2026-10-20).** [`src/cutscene.ts`](../../../../app/prototypes/0.0.2/src/cutscene.ts): the track (`Track`: `duration`; `shots`, each with camera keys `{ t, at, heading, pitch, fov }` in the ship file's Blender coordinates (heading in degrees about Blender's Z, from +X), eased linearly, a `far` plane and `seeThrough: "off"`; `events` `{ t, command }`; `end`, the commands of its end state) and `CutscenePlayer` (`play(id)`, `update`, `skip`, `onEnded`). **It draws through its own camera,** so the game's camera stays behind her and the hand-back is that camera again (no move, no snap). While one plays (main.ts): she isn't simulated (no input reaches her), nothing can be used, the see-through is off (cut in and out at once, no fade), the crew are shown. **Skip** (`Input.consumeSkip`): any pad button but Start and View; Enter, Esc, E, Space, C (Esc also releases the mouse, so the game pauses as well); a press made before the cutscene starts doesn't count. The `cutscene` command now plays one (it was a stub). The track: [`tools/test-cutscene.mjs`](../../../../app/prototypes/0.0.2/tools/test-cutscene.mjs) → `public/test/cutscenes/test-ship-shots.json`: shot 1 from about 78 m off the ship's left front quarter (fov 35, far plane 300), **the camera circling the ship at that distance, looking at it, moving to its right at 2°/s** (owner, 2026-10-20; it first turned on the spot), a key every 0.25 s; shot 2 from 1.5 m off the nose looking in (fov 50), held still; shot 3 the pan's seconds 3–6. Dev hook: `__cutscene()` (`play('<id>')`, `skip()`, `time`, `playing`). Check: [`tools/cutscene-probe.js`](../../../../app/prototypes/0.0.2/tools/cutscene-probe.js), 9 pass. **Not built yet (pass 5b):** the trigger from the test story, the checkpoint at its end, the end state compared with the scene's. **Not built (nothing in this cutscene needs it):** the timeline owning (pausing) the components it animates: these tracks animate only the camera.

**Pass 6: the rest of today's kinds (about 3 hours).** Keypads and panels, the lever, the engineering window, ladders, the jetpack rack, the boombox, the crew; the remaining tags and name lookups (`UNTAGGED`) retired. *Check:* the smoke script, unchanged.

Passes 1–5 are the slice. Pass 6 can come later without blocking anything.

## Done when

- Each pass: its probe, `npm run check`, `npm run build`; the smoke script once at the end of each pass; the owner plays the result.
- The slice: from the start screen, play *opening*, unlock the door, watch the cutscene, quit, reload, *Continue*, and find the story where it was with the props reset.

## Open questions for the owner

1. ~~The id in the file~~: B, after pass 0's names (owner, 2026-10-20).
2. ~~Pass 5's animation~~: a placeholder (owner, 2026-10-20), the three shots above.
3. Pass 6 straight after the slice, or later?

## After

- `architecture/README.md`: principle 3 and the *Content and data* table (kind and id in the file; behaviour in definitions), the systems (scene director, components, cutscene player), the folder layout.
- `asset-pipeline.md`: the naming contract (`id`, `kind`), the gate's id checks.
- [saving](saving.md) (the "story state in Ink" rule; the format as built), [levels](levels.md) (locations vs scenes; manifests with the setup), [code](code.md).
- `features/interaction.md`, the code map, `tools/README.md`; the decision log's update notes.
