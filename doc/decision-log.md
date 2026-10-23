# Decision Log

A running record of project decisions: technology, architecture, pipeline, scope, story direction and documentation. Newest first. Each entry is headed `## [YYYY-MM-DD] — Title (area)` and follows **Context → Decision → Alternatives considered → Rationale → Status**. When a decision changes, add an **Update (date):** note under the entry instead of rewriting it, so the history stays visible.

## Index

> **[Agent note]** One line per entry, newest first: read this, then only the entry needed. A new entry gets a new row; an *Update* note that changes a decision changes its row.

| Date | Decision | Area | In one line |
|---|---|---|---|
| 2026-10-23 | The outside's own light | look | The scenery's materials lit by the game's sun (shared: one direction, its shadow map) and their own sky light, never dimmed indoors; the sun tinted there via the received shadow; tuned to the owner's reference (the fly-by's ice, sun share 0.65); the glass nearly invisible, its highlights kept |
| 2026-10-23 | The scenery: a treadmill that looks like the owner's fly-by | look | The ship never moves; the ground and its rubble pass under it (a terrain is a data file and a `.glb`); scale, scatter and materials from the fly-by file (×1.486); shadows are the rubble flattened along the sun, drawn as the ice in shadow; the ice's roughness a noise tile made at load; the lighting unchanged |
| 2026-10-23 | Picking up objects: curated events only | scope | No free pick-up of small objects; objects are picked up only as designed events (the coffee mug, the jetpacks), added case by case; physics props (drop, throw) open, kept for a future interaction |
| 2026-10-22 | The game's story and the checks' story | architecture | The game loads its own story (`public/story/`, the owner's lines copied from the scene files) from `chapter-1`; the checks load the test story from `landed` with `?test` (dev builds), so the checks don't change as the script grows |
| 2026-10-22 | A copy of each character per scene, in Blender | pipeline | A collection per scene (by its id) with a linked copy of each character, placed and animated for it: the copy's place is the mark, its action the loop; Dr. Green's in `Player` › `<scene>`; the game still loads one model per character |
| 2026-10-22 | The work is tracked in Linear, for the owner | process | Linear (team `SC`) shows the owner's next task and how the project goes; one project per big piece of work, *The Zamboni: ongoing* for the rest; the agent keeps it current every session; the repo stays the source of truth |
| 2026-10-22 | Topics in conversations | feature | Ink choices as topics: the player picks what to ask from a list (up/down, the interact button); a heard topic goes, a leave topic stays; reverses pass 2's *no choices* |
| 2026-10-22 | What the save keeps: what the player shouldn't have to do again | architecture | No action repeated unless the story asks for it: most interactions reset on a reload (doors, music); some are saved in Ink (for now her clothes and the jetpack), the list grows as we go; saved after each conversation and when one changes |
| 2026-10-21 | One material per colour: a limited palette | look | One material per material colour (owner, 2026-10-22): `Black`, `Black Metal`, `Black Plastic` fine; `Teal`, `Teal 2`, `Teal.001` not; one `Black`, `Red`, `Blue`…; a different material of the same colour gets its own name (`Black Metal`, `Black Plastic`); no *Flat* materials (they skip the principled shader); `tools/merge-materials.py` merged 17 in 1.22 |
| 2026-10-21 | The camera comes close and she fades | feature | No 1 m floor on the camera: it stops in front of what is behind her (0.15 m from her at least) and she fades out, dithered, from 1 m to 0.5 m; her shadow stays |
| 2026-10-21 | She stays in the corridor | feature | Indoors she walks the corridors only: collision boxes keep her off furniture and out of the cockpit's front; climbing around is out (too many places to get stuck); sitting will be an animation, like the ladder |
| 2026-10-20 | The ladder by button, with the owner's animation | feature | A *Climb* prompt at its foot; the animation moves her (root motion), the camera stays the player's; no climbing down; a shut trapdoor opens at a fixed moment, measured once; doors move through her while she climbs; the free climb kept, not in use |
| 2026-10-20 | The game's structure: scenes, state in Ink, ids, components, in-engine cutscenes | architecture | Locations are assets, scenes are story beats set up by id; anything saved lives in Ink; one set of commands; kinds defined in the game, the file carrying kind and id; cutscenes own what they animate and declare their end state |
| 2026-10-20 | The export puts moving parts at their recorded rest pose; a gate on what reaches the game | pipeline | `rest-poses.json` records each door's local transform; the exports drop the doors' animation, put them at rest and run at the start frame; the game's files are replaced only when nothing differs from the last taken export (exceptions one by one), else `npm run export:accept` |
| 2026-10-20 | Prototypes numbered by version; 01 frozen as 0.0.1; each version isolated | process | Folders, packages, scripts and tags by version; the current one takes the plain script names; each has its own game files, tools and source `.blend` (a frozen one from its packed archive) and Vercel project |
| 2026-10-20 | Fewer GPU pipelines, made at load | tech | Unused UVs dropped, mirrored meshes unmirrored, see-through copies all physical: 116 → 78 pipelines; reloads compile in about 2 s instead of 11 |
| 2026-10-19 | What the ship export takes is a list | pipeline | `ship-export-list.json`, made from what the game had (1.19), not the collections switched on in the file; new or missing objects are flagged |
| 2026-10-19 | One scale: the ship file is the game 1:1 | pipeline | 1 Blender unit = 1 m; Dr. Green 1.23 tall at armature scale 1; the game's proportions kept; no correction factor in any export; the exports stop if her size is off |
| 2026-10-14 | See-through from scratch: the shell only, then the rules one by one | feature | On a branch: every rule removed; only the hull and what closes its openings is drawn, cut by the hole; everything inside hidden on both decks; rules come back one at a time |
| 2026-10-14 | The jetpack with momentum: hover, flight, glide, skid | feature | Her horizontal speed picks hover (R2 sets her height) or flight (thrust where the stick points, forward where the camera looks); R2 let go at speed she glides; jet off on the ground at speed she skids. Replaces pass 6b's R2 rule and Part 1's flight rule |
| 2026-10-14 | The jetpack's exhaust glow: the halo painted in, no bloom | look | Part 1's glow (a particle made big by bloom) as one additive sprite per nozzle with the halo drawn into it; bloom stays for later |
| 2026-10-14 | The auto-parachute: the jetpack slows a long fall | feature | After a fall of 5.5 m or more, wearing a jetpack, it fires near the ground at a fixed braking (0.5 s and about 2.85 m up on the minimum fall since the update; longer and higher for longer falls); she lands at 2 m/s |
| 2026-10-14 | The jetpack is taken from the rack; the player's model comes from the ship file | feature | She takes a jetpack from the cargo hold's rack and puts it back there; she flies only while wearing one, and can jump with it; her model is exported from the ship file's `Player` collection (at the crew file's scale until 2026-10-19; the file's since) |
| 2026-10-14 | The start button is the template for every game UI button | design | `Button.svelte` in `packages/ui`, as drawn in the mockup's *Start Button*: new buttons use it, not a copy |
| 2026-10-13 | The start screen: the design system's first code, the fonts in the repo | design | The start screen is Svelte, on tokens and two components in `packages/ui`; both fonts are files in the repo; Part 1's soundtrack plays on that screen only |
| 2026-10-13 | Materials made with nodes are baked by the export | pipeline | What the glTF exporter can't follow (ramps, mixes, procedural textures before the colour, glow or alpha) is baked to an image by the export scripts; the blend file keeps its nodes |
| 2026-10-13 | Placeholder audio; licensing put off | scope | The UE prototype's sounds are in the game as placeholders; licensing isn't raised until a production-ready build |
| 2026-10-13 | First audio code: AAC, cues as data, three buses | tech | In prototype 01: `.m4a`, a cue file, master → music / ambience / sfx, streamed music, loops by crossfade |
| 2026-10-12 | Lighting inside the ship | look | Sun through the glass, the world's blue light at half strength indoors, warm-tinted lights in the rooms with windows, sky reflections on metal |
| 2026-10-12 | Single-sided materials in the ship | pipeline | Backface culling on in the ship file; the game draws what the file says, with a switch back; no measurable saving |
| 2026-10-12 | The ship's reference file | pipeline | `The Zamboni 1.19.blend` (1.21 since 2026-10-19) is the scene as in the game; tags are custom properties in the file; what's exported is a list since 2026-10-19 |
| 2026-10-12 | Keeping context small between sessions | docs | A state file read first (`steps/current.md`), a backlog tracker, a code map, this index |
| 2026-10-09 | Basic interaction: doors, keypads, ladders | feature | E / Circle uses the target nearest the screen centre within reach, with a prompt next to it; doors toggle on a hinge (a door with a keypad only from the keypad); bulkhead doors slide open when she's near, a panel shuts them; the engineering window from its lever; ladders need no button and go up only |
| 2026-10-09 | The rest of the ship: props, room lights, crew | prototype | Small props merged per room, no prop shadows; one or two lights per room, the four nearest on; the crew placed in the ship |
| 2026-10-08 | Every camera angle in the ship should look good | design | Worth extra work and per-object exceptions |
| 2026-10-08 | See-through hull rules | feature | Inside: a dithered hole from the camera to her chest. Outside: no cut, camera collision. Camera: fixed distance indoors and outdoors, no zoom, pitch from 0 |
| 2026-10-08 | Ink for dialogue | tech | Ink through `inkjs`: one story for dialogue, comm chats, barks and story state; the Ink files are the master copy of the wording (2026-10-21), but while chapter 1 is built the owner writes in the scene files and the agent copies them into Ink (2026-10-22) |
| 2026-10-08 | Inverted Y in prototypes, normal in production | input | As the title says; changeable in settings |
| 2026-10-08 | No spoken dialogue; characters talk by nodding | scope | All dialogue is text; no mouth movement |
| 2026-10-08 | Prototype workspace built; TypeScript 6 | tech | One npm workspace in `app/`; prototypes on port 5200 + NN; TypeScript 6, not 7 |
| 2026-10-08 | Platform, saving and performance targets | scope | Installable web app, playable offline; checkpoint saves; 60 fps on the PC, 30 on the MacBook |
| 2026-10-08 | Gamepad is the main input | scope | Gamepad first; prompts follow the last device used |
| 2026-10-08 | Svelte 5 for the UI | tech | Svelte 5 (runes) with Vite, as an HTML overlay; not SvelteKit |
| 2026-10-08 | A design system in Figma, with a code version | design | One design system for brand, screens and in-game devices |
| 2026-10-08 | `doc/` goes in git: the whole project folder is the repo | pipeline | `doc/` and `app/` versioned together; `resources/` ignored |
| 2026-10-08 | In-world name: comm, not phone | docs | The device and its chat are the *comm* |
| 2026-10-08 | Documentation structure | docs | Overview, decision log, open-ended steps, architecture, features, story, reference, archive |
| 2026-10-08 | Source art stays out of git | pipeline | The repo holds code and production assets only |
| 2026-10-08 | Engine: plain Three.js r186 with TSL | tech | Plain Three.js, `WebGPURenderer`, TSL, pinned to 0.186.1 |

---


## [2026-10-23] — The scenery: a treadmill that looks like the owner's fly-by (look)

**Context:** The flying scene needs the plain going by outside (pass 4 of [the plan](plans/features/flying-scene.md)). The plan approved a treadmill: the ship never moves. The first placeholders (boulders made in code) were rescaled by the owner (50 times bigger, 2026-10-22), then the owner pointed to the reference: *"how the ground, boulders, shadows, etc should look"* (`resources/models/The Zamboni 1.10 - fly by animation.blend`), keeping the game's lighting inside and in the cockpit, and asked for the ice's roughness *replicated in code, optimized for performance*.

**Decision:**
- **A treadmill:** one group at the ship's centre: the ground (a plane) and pools of instanced meshes that slide back and are moved to the front when they pass the rear edge. A terrain is a data file (`public/terrain/<id>.json`) with its meshes in `<id>.glb`; a scene names it (`travel.terrain`).
- **The fly-by's numbers, in the game's units (×1.486):** about 14 m up, 174 m/s; ten of its `Rubble` pieces at its density, scaled evenly 0–0.5, tipped up to 1 rad, half buried. This replaces the 50× scale.
- **Shadows without a shadow map:** each rubble piece drawn again, flattened onto the ground along the sun in the shader (the part below the ice left out), with the ice's material wholly in the sun's shadow: they match the ship's own shadow.
- **Materials fitted, lighting kept:** the ice and the rubble are tuned in the terrain file (and the tuning panel's *Flight: ground material*); the owner set the ice white and the rubble a little blue.
- **The ice's roughness:** the fly-by's two noises (one layer each) added and ramped, from a 256 × 256 repeating noise tile made at load and read at two scales (no measurable cost; its mip levels stop the fine grain shimmering).

**Alternatives considered:**
- **Moving the ship through a world:** physics, the crew, the lights and the cameras would all move with it; the treadmill keeps everything aboard as it is.
- **Real shadows from the shadow map:** it covers 25–50 m around her; the rubble's shadows are seen kilometres off.
- **The roughness baked in Blender:** the noise doesn't repeat over a 3 km plane; noise computed in the shader: two noise evaluations per pixel and shimmer in the distance.
- **The fly-by's colour management (Filmic High Contrast):** would match its blue (the game's AgX tops out lower) but changes the whole game's look: flagged, not done.

**Rationale:** Nothing aboard changes; the look comes from the owner's own file; everything costs a few draws (21) and almost nothing on the GPU; more terrains (rocks, mountains, ocean) are data files.

**Status:** Built (pass 4a), the owner's *good for now* (2026-10-23). The clouds, the frame time against the landed ship and cutscene 2's exterior shot are next. See [the plan](plans/features/flying-scene.md), `app/prototypes/0.0.2/src/terrain.ts`.

**Update 2026-10-23 (pass 4b):** **the clouds are a third pool**, in the air (the terrain file's `clouds`, `lift` 40–60 m: just above the ship, as the owner asked): 14 low-poly cumulus made in code (faceted puffs, flat underneath, 60–140 m across), **their shadows flattened onto the ice the same way as the rubble's** (sharp, the ice in shadow). Alternatives: soft cloud shadows from a coverage texture read by the ice's shader (soft edges, and the rubble could be darkened under them too, but a second system to keep in step with the clouds); camera-facing soft sprites (don't match the faceted rubble and ship). **Measured** (outside, frame rate uncapped): the scenery costs about 3 ms a frame (moving the copies 1 ms on the CPU, the clouds 0.9, the rubble 0.8, the ice 0.6); the heap's low points hold steady over a minute.

**Update 2026-10-23 (owner):** the clouds **smooth-shaded and 20 times bigger** (1.2–2.8 km across; still 40–60 m up), **6 instead of 14** (14 would cover the sky; the 6 cost 0.25 ms), in a band 3.2 km each way; and **faded in, not popped in**: each point's opacity falls with its distance from the ship (whole to 1.2 km, gone at 2 km, before the cameras' far plane), its shadow fading with the point that casts it. Then (owner) **10% opaque, their shadows too; 3 of them; their bases at 200 m**. Then (owner) **removed from the icy plain**: a new solution later; the code (`clouds` in a terrain file) stays; the panel's *Flight: clouds* removed.

## [2026-10-23] — The outside's own light (look)

**Context:** the sky, the ice and the rocks looked like separate things; in Blender (the fly-by) the world's blue fills the shadows and the yellow sun the lit faces. The game already uses the same world and sun, but **the world's blue is halved while she's inside** (`worldIndoors`, owner 2026-10-12: the rooms were too blue), which in the flying scene is always, and the ice's reflections were the metals' (0.5); 4a's white ice and blue glow made up for it (the owner: the ice looked too dark).

**Decision (owner, 2026-10-23):** **the outside materials get their own lights** (`lightsNode`): the game's sun (the same light: **one direction inside and out, always**, and its shadow map, so the ship's shadow on the ice) and their own sky light, Blender's world, never dimmed indoors. The sun tinted and scaled there only through the received shadow. Tuned against the owner's reference frame: the fly-by's ice colour back, no glow, the outside's sun 0.65 (the fly-by's sun is lower: the same light on flat ice), reflections 0.5. The haze unchanged (the fly-by has no atmosphere: its distance blue is the ice's reflection). [Plan](plans/features/outside-light.md).

**Alternatives considered:** a colour ramp in the outside materials; a masked grading pass (Blender's cryptomatte and ramp); one grade over the whole picture (changes the interior); for the ship's shadow, a second sun with its own shadow map (a second map's cost).

**Rationale:** it fixes the light rather than painting over it; no extra pass, no extra shadow map (three keeps one light node per light); any terrain's materials get it.

**Status:** built. The hull's outside stays on the scene's lights: to consider with the exterior cutscenes and landed scenes (owner). **Update 2026-10-23 (owner): the glass** nearly invisible, as in Blender, its highlights kept, the view from inside a bit darker: its highlights added whole, what's behind dimmed by a set share (custom blending), not its dark body laid over the view at its opacity (which also showed the highlights at 30%).

## [2026-10-23] — Picking up objects: curated events only (scope)

**Context:** the scope listed *Pick up small objects (carry, drop, throw)* as core, with physics props as Rapier rigid bodies, under the pillar "everything interactable". The 2026-10-15 notes ([interaction plan](plans/features/interaction-doors.md#notes-for-picking-things-up-and-using-them-owner-2026-10-15)) had already flagged the costs: about 28 to 130 pickable objects, each an object of its own in the export (draw calls, see-through entries), attaching objects in or on other things, and back-in-place vs *throw*. Playtesting shows the interactions as built (doors, lockers, keypads, the boombox, the jetpack rack, the parka, the crew's conversations, remarks) give plenty to do.

**Decision (owner, 2026-10-23):** **the "interact with all the objects" feature is reduced.** Objects the player can pick up remain, but **as curated events**, like the coffee cup: each chosen and designed on its own (prompt, animation, outcome, save state). **Interactions with objects are added case by case.** No free pick-up of any small object. **Physics on objects (dropping, throwing, rigid bodies) stays open** (owner, 2026-10-23: "we may still need the physics system for future interactions"): the docs keep its recommendation (Rapier rigid bodies, the budgets), marked open.

**Alternatives:** the scope as it was (every small object, with physics); every small object picked up and looked at, put back in place on drop (the owner's note of 2026-10-15: no physics, but still the per-object export and attaching costs).

**Rationale:** free pick-ups of random objects create lots of extra work and issues to debug, as we don't have full control of all the outcomes: rigid-body physics is unpredictable. A curated object has one outcome, designed and tested.

**Status:** decided; physics props open. Rapier stays for the character controller, collision and queries, and for physics props if an interaction needs them. Docs updated: [overview](overview.md), [scope](architecture/scope.md), [architecture](architecture/README.md), [stack](architecture/stack.md), [interaction](features/interaction.md#picking-things-up), the asset pipeline's `mass` tag, the game architecture plan's budgets.

---

## [2026-10-22] — The game's story and the checks' story (architecture)

**Context:** the flying scene's pass 1 gives the game a real story file (`public/story/story.ink`, the owner's lines copied word for word from the scene files) and a new first scene (`chapter-1`, the ship flying). The probes and the smoke script were written for the test story's knots (a keypad that unlocks the side door, four-screen test conversations, test topics) and for a game that starts in the landed ship.

**Decision:** **two stories.** The game loads its own and starts NEW GAME at `chapter-1` (after the animatic's stand-in card). **`?test` in the address** (dev builds only) loads the test story (`public/test/story.ink`) and starts at `landed` with no card: the probe and smoke scripts open the page with it; `npm run probe -- f.js --game` opens the game's own. Game scenes go in `public/scenes/`, the checks' only in `public/test/scenes/`; the director looks in both. `npm run check` checks both stories (a game scene's knots and variables must be in both).

**Alternatives:** one story with the test knots in it (test lines in the game's story, and the checks change whenever the owner's script does); rewriting the checks for the real story (they'd break with every script change, and the scene starts in the air until pass 6).

**Rationale:** the checks test the systems with lines that don't move; the game's story belongs to the owner's script.

**Status:** built 2026-10-22 (flying scene, pass 1).

---

## [2026-10-22] — A copy of each character per scene, in Blender (pipeline)

**Context:** the flying scene's plan placed the crew per scene at **marks** (an empty per character in the ship file) with a **loop** (an action) named in the scene's data. The owner asked how to build the animations, and whether copies of the characters, one per scene, could be used instead, as easier to manage.

**Decision (owner, 2026-10-22):** **a collection per scene, named by the scene's id** (`chapter-1`, `landed`), holding **a linked copy (Alt+D) of each character** in that scene, placed and animated for it: the copy's place is the mark, its action (`<character>_<what>`, with a fake user) the loop. **Dr. Green's copies stay in `Player`**, in a collection per scene (`Player` › `chapter-1`), copies of her jumpsuit rig; the originals keep their exact names. The crew export (pass 1 of the flying scene) reads each scene collection and writes **one model per character** with its clips; a copy whose mesh isn't shared is flagged. Details: [the Blender tasks](plans/features/flying-scene-blender.md#a-copy-per-scene).

**Alternatives:** empties as marks and actions on one copy of each character (the plan's: places and animations made in two places); full copies (Shift+D: an edit to a character wouldn't reach its other copies, and the game would load each copy).

**Rationale:** the owner sees and animates each scene as it plays, in one place; the export already had to change in pass 1 for marks and loops, so this costs little; the download stays one model per character.

**Status:** decided; built in the flying scene's pass 1 (SC-14).

---

## [2026-10-22] — The work is tracked in Linear, for the owner (process)

**Context:** open items lived in `doc/plans/backlog.md` (one line each, 77 items) and what waited on the owner in `doc/steps/current.md`. The owner had to ask, or read the docs, to know their next task and how the project was going. The owner set up a Linear workspace (team Studio Cataplasma, `SC`); the main goal: keep track of their manual tasks (owner, 2026-10-22).

**Decision (owner, 2026-10-22):** Linear is the tracker, **for the owner, a human**: their next task (*My issues*, by priority) and an overview, without asking. **The repo stays the source of truth.** The agent keeps it current, as automatically as possible: statuses, a comment on each issue worked on, new owner tasks assigned to the owner, a project update at the end of every session. **One project per big piece of work with an end** (made when its plan is approved, completed at the owner's sign-off; past ones made retroactively), and *The Zamboni: ongoing* for everything small, open or *later*; all labelled *The Zamboni*. The owner's tasks are assigned to them; the agent's are unassigned; an owner task a pass needs *blocks* it. **An issue carries what's needed to work on it:** a doc passage of a paragraph or two is copied into it, a longer one summarized and linked. Backlog items keep their numbers in the titles (`77 · …`); new items are issues only. Plan: [`plans/architecture/linear.md`](plans/architecture/linear.md).

**Alternatives:** the backlog file kept as the tracker (the owner reads Markdown to find their tasks); one Linear project for the whole game (its progress bar meaningless with the finished history in it); a project per area (never finishes); moving the project to another workspace (tried: not possible, and the GitHub connection had issues there).

**Rationale:** the owner sees their own tasks first and each piece of work's progress at a glance; the docs keep the reasons and the details, so nothing is lost if Linear goes.

**Status:** built 2026-10-22: 12 projects, items 1–77 as issues SC-5 to SC-115 (the finished ones *Done*; items of backlog passes 1–4 marked *Built* taken as done), the owner's flying-scene tasks; `backlog.md` an index of items to issues.

---

## [2026-10-22] — Topics in conversations (feature)

**Context:** dialogue pass 2 left choices out (owner, 2026-10-22: the story might not need them). Writing chapter 1's script, the owner wants Dr. Green to pick what to talk about: *"Can you tell what that signal is?"*, *"How are you feeling?"*.

**Decision (owner, 2026-10-22):** conversations can offer **topics**: a list the player picks one from, up and down to move, the pad's interact button (Circle) to pick; on the keyboard W / S or the arrows, and E, Enter or Space. Built first, as the flying scene's pass 0, because the script is written with it. Topics are Ink's choices (`*` heard once, `+` always offered, `[…]` the menu's text, labels to remember one was heard). **Proposed by the agent, for review:** a topic goes once heard; a leave topic, written in Ink, stays (no leave button: owner, 2026-10-21); the list stands above the box, the box keeping its size. Reverses *no choices* in [dialogue pass 2](plans/features/dialogue.md).

**Alternatives:** no choices, every conversation one fixed exchange (pass 2's); topics chosen by walking up to people again (one topic per visit: slower, and the player can't see what's left).

**Rationale:** the player talks to whoever they want about what they want, and the script stays in Ink with no new format: choices are Ink's own, the save already keeps which were taken.

**Status:** decided; the details approved as proposed (owner, 2026-10-22), in the [dialogue plan](plans/features/dialogue.md#topics-owner-2026-10-22).

**Update, 2026-10-22 (owner, after trying the first build: "too complicated"):** the topics are **in the dialogue box, not a separate list**: after the last line, a screen under *Dr. Green* lists **her lines** to choose from; the one picked isn't said again, **the next screen is the answer**. In Ink the choice's text, in `[…]`, is her line. Replaces the list above the box and the separate line she said after the pick.

---

## [2026-10-22] — What the save keeps: what the player shouldn't have to do again (architecture)

**Context:** the save keeps a checkpoint scene and Ink's state; on a reload the props and doors reset ([saving](plans/architecture/game-architecture/saving.md)). With conversations (dialogue pass 2) and things she carries (her clothes, the jetpack), a reload could make the player do them again.

**Decision (owner, 2026-10-22):** the player never has to repeat an action unless it's part of the story. Most interaction events are irrelevant to the save (opening doors, playing music) and reset; some aren't and are saved. **For now: her clothes and the jetpack.** The complete list is made as we go. Conversations that have happened stay happened (Ink's visit counts); the save is written after each conversation and when a saved thing changes, as well as at scene starts.

**Alternatives:** save every prop and door (more state to keep in step with the file, and the checkpoint scene already sets the world up); save only at scene starts (a reload offers a conversation again, or takes off the jetpack).

**Rationale:** what the player did on purpose to move on (talked, got dressed, took the jetpack) shouldn't be lost; what's incidental resets cheaply. Each saved thing is an Ink variable, as the game's structure says (anything saved lives in Ink).

**Status:** decided; built with dialogue pass 2.

## [2026-10-21] — One material per colour: a limited palette (look)

**Context:** The boots in Dr. Green's locker (1.22) came with copies of her model's materials (`Black.001`, `Red.001`…), and the file had more: Blender's `.001` copies of the player's materials, same-colour pairs under two names (`Dark Teal` and `Teal Dark`, `Darkest Teal` and `Teal Darkest`, `Dark Brown` and `Brown Dark`) and *Flat* materials.

**Decision (owner, 2026-10-21):** The game's look is built on a limited colour palette: **one material per colour** (a single `Black`, `Red`, `Blue`…), the version the game uses. Materials of the same colour that really differ get their own names (`Black Metal`, `Black Plastic`). **Materials with *Flat* in their names** bypass the principled shader and go straight into the output: they don't look right in this project; they merge into their closest base material, or are flagged when there is none. Each crew member has their own skin material. Done in 1.22 by [`merge-materials.py`](../app/prototypes/0.0.2/tools/merge-materials.py): 12 `.001` copies into their originals, `Dark Teal` → `Teal Dark`, `Darkest Teal` → `Teal Darkest` (keeping `Teal Darkest`'s lighter colour, owner), `Dark Brown` → `Brown Dark`, `Blue Flat` → `Blue`, `Black Flat` → `Black` (its colour within 0.03); the kept ones single-sided.

**Alternatives considered:** Merging only the boots' copies (the first pass that day): left the near-duplicates in the file. Keeping the player's copies apart because her model is its own file in the game: it keeps the palette's drift.

**Rationale:** The palette is the style; near-duplicates drift apart unseen, and each extra material costs a shader pipeline at load (item 50).

**Status:** Decided. **Update (2026-10-21):** one skin material per skin colour (owner): `Skin White` (was `Skin 2 - White`, Dr. Kaufman) and `Skin Asian` (`Skin 2 - Asian` and `Skin 3 - Asian`, both Dr. Ogawa's, the same colour). Dr. Green's skin is in her baked texture (`Dr. Green Jumpsuit Baked`), not a material of its own.


*Update (2026-10-22, owner): what the rule means.* **One material per material colour:** `Black`, `Black Metal` and `Black Plastic` are three materials and that's fine; a `Teal Metal` would be fine too. What's not wanted: `Teal`, `Teal 2`, `Teal.001`, near-copies of one material: a conflict to address when found.
---

## [2026-10-21] — The camera comes close and she fades (feature)

**Context.** Indoors and out, the camera stopped 0.25 m in front of whatever was between her and it, but never closer than 1 m to her focus point (closer, it was inside her head). With her back less than about 1.25 m from something, the 1 m floor won and the camera went through it: inside the crew quarters' lockers (feet 3.612, 3.461, −13.92; the lockers' camera box was hit at 0.39 m).

**Decision (owner).** The floor goes: the camera comes as close as the obstacle needs (`cameraWallGap` 0.25 m in front of it, `cameraMinDistance` 0.15 m from her focus at least), and **she fades out** as it comes close: fully shown at `cameraFadeStart` (1.0 m) or farther, gone at `cameraFadeEnd` (0.5 m). Dithered (three's `alphaHash` on her materials, set at load; only their opacity changes in play). Her shadow stays whole; the jetpack's glow fades with her; never during a cutscene. All four values in the tuning panel.

**Alternatives considered.** The camera rising over her when there's no room behind (the camera moving by itself, which the owner wants minimal); cutting the lockers (against *never cut on her deck*); real transparency for the fade (her body shows its own inside, sorting).

**Rationale.** The camera never moves by itself, and the fix holds for any tight spot in later scenes. It goes against *the player must never lose track of her*, on purpose and only within about 1 m. Plan: [camera-close-fade.md](plans/features/camera-close-fade.md).

**Status.** Built 2026-10-21; works (owner, 2026-10-21). The grain of the dither: backlog item 58, for later.

## [2026-10-21] — She stays in the corridor (feature)

**Context:** the second collision pass (item 55, plan `plans/features/collision-pass-2.md`) found that she could walk up the cockpit's floor to the dashboard and get trapped there; the plan asked whether she should reach everywhere in the cockpit.
**Decision (owner):** "She should stay in the corridor. We can add more collision boxes if needed. It's fun to climb around stuff, but it creates too many possible places to get stuck." **When she has to sit on a chair, it will be an animation, like the ladder.** In the cockpit she walks up the ramp to the platform behind the front seats (owner, after a first version that ended the corridor where the ramp starts): a wall box up to the ceiling behind the seats, a flat floor box from the doorway to the ramp, walls over the consoles' ridges.
**Alternatives considered:** the whole cockpit reachable, with its floor's steps smoothed; climbing on furniture allowed where it's safe.
**Rationale:** every surface she can reach is a place she can get stuck; boxes are cheap and keep the collider simple (as items 30 and 42).
**Status:** built 2026-10-21 (`add-collision-boxes-3.py`); owner's play-test pending.

## [2026-10-20] — The ladder by button, with the owner's animation (feature)

**Context:** the ladder was climbed with the stick (2026-10-09 to 10-19), with no animation. The owner made a climbing animation (`Dr. Green - Ladder`, 1.20, re-keyed in 1.21 as `x1.25`) and asked for the ladder to play it (backlog item 44; plan `plans/features/ladder-climb-animation.md`).
**Decision (owner):** at the ladder's foot the prompt says **Climb**; pressed, she slides to where the animation starts and it plays, **moving her by its root motion**, so the camera and everything that follows her follow; she ends where its last frame leaves her, upstairs. **Her movement, jump and jetpack do nothing** while it plays (no cancelling); **the camera stays the player's**. **No climbing down**: from the floor above she drops through the opening. **A shut trapdoor opens at a fixed moment of the animation** (owner: "too complicated… fire the trapdoor open animation at the correct frame", and as close to her head as it can): the latest start at which the lid misses her body, two frames earlier, measured once by a probe (`tools/ladder-times.js`), not at run time. **The rung sound** plays as each hand lands, at fixed moments measured the same way. **While she climbs, a door moves through her** instead of stopping (its collider met her capsule, which is bigger than her body, and the lid waited at 0.8 open); the climb's end already moves her clear of the doors. The free climb is kept in the code, not in use.
**Alternatives considered:** the trapdoor's moment worked out at load from the animation (the plan's first version: the owner found it too complicated); rays from her head during the climb; a faster opening or pausing the animation; a *Climb down* prompt playing the animation backwards (owner: no); the doors stopping for her capsule while she climbs (as with the free climb).
**Rationale:** the climb is a fixed animation, so its moments are fixed too: measuring them once keeps the game simple, and the probe is run again if the animation, the ladder or the door's timing changes.
**Status:** built 2026-10-19 (pass 2a: the button, the slide, the animation moving her, the end upstairs) and 2026-10-20 (pass 2b: the trapdoor at 1.0 s, frame 24; the rung sounds at five hand contacts; the smoke script's ladder checks rewritten for the button). *Update 2026-10-20:* played and approved by the owner ("ladder is ok").

## [2026-10-20] — The game's structure: scenes, state in Ink, ids, components, in-engine cutscenes (architecture)

**Context:** the components plan (item 49) answered why exports broke, but not how the whole game is organised: several scenes with different assets, one story state through the storyline, saving and continuing, cutscenes in the engine. The draft game architecture of 2026-10-08 covered loading and memory, not how a scene sets up the world or who owns each piece of state.

**Decision:**
- **Locations are assets** (the ship, always loaded, plus the exterior slot); **scenes are story beats**: small data files that set up a location by instance id (states, characters' marks, interactions on or off, cutscenes).
- **State in layers:** kind defaults (code) → instance (file, `rest-poses.json`) → scene setup (data) → story state (**Ink**) → live state (the component). **Anything that must survive a save is in Ink**; components read it at scene start and report to it. Doors and props reset on reload, as decided on 2026-10-08.
- **Stable ids** for every instance anything else names; the export gate checks them.
- **One set of commands** addressed by id, shared by scene setups, cutscene event tracks and Ink.
- **Components:** kinds with defaults in TypeScript, state per component, no ECS (item 49). The file carries kind and id; behaviour is in the game's definitions. **This changes** principle 3 of `architecture/README.md` and *The ship's reference file* (2026-10-12): those docs change as the work is built.
- **In-engine cutscenes** target instances by id, own what they animate while they play, and **declare their end state** (hand-back, skip, the checkpoint after, a check against the next scene). No save mid-cutscene.

**Alternatives considered:** behaviour kept in the file's tags (every default then comes from the file's current state: the cause of the export breaks); saving component state alongside Ink (two copies of the story; props reset was already decided); a full ECS (complexity with no gain at a few hundred entities); separate formats for scene setups, cutscene events and Ink commands.

**Rationale:** "reset on reload" needs defaults defined somewhere other than the file; one owner per piece of state keeps saves small and consistent; ids and one command set let scenes, Ink and cutscenes name the same things; a declared end state makes skip, hand-back and checkpoints agree.

**Status:** Approved (owner, 2026-10-20); the passes are for review ([`plans/architecture/game-architecture/game-structure.md`](plans/architecture/game-architecture/game-structure.md), item 54). For the cutscenes, later (owner): the game's camera (see-through hole radius, clipping) and lighting replicated in Blender; depth of field.

*Update 2026-10-20 (pass 1):* **the rest poses stay with the export** (owner: yes). The plan had the game take each moving part's rest pose from `rest-poses.json`; instead the export keeps putting them at rest from it and its gate stops on a pose change, as before. Why: the game can't reapply Blender's local transforms safely (compression moves node origins; hinges are built from the `hinge` tag), and the export already guarantees it.

*Update 2026-10-20 (pass 3, Ink; agent's choices, for the owner's review):* **a scene reads the story through its commands' `if` / `unless`** (an Ink variable), not through a knot run at scene start: the setup stays one readable list. **Using something the story cares about runs a knot named after its id** (`use_<id>`, the prompt from the knot's `# verb:` tag), for now only while what it controls is locked; Ink acts back through one external function, `command(name, id, value)`. **The compiled story is made by a script** (`npm run ink`) and kept in git next to its `.ink`, not compiled in the browser (the compiler stays out of the game). Locks are live state (not saved): a scene locks again unless the story says otherwise.

*Update 2026-10-20 (pass 4, the save; agent's choices, for the owner's review):* **one checkpoint save**, written at every scene start once the game has begun (the open question in [saving](plans/architecture/game-architecture/saving.md), slots, stays open). **The save's scene is set up under the start screen at load**, so what shows behind the screen as it fades is what *Continue* gives; **CONTINUE is the chosen button** when there's a save, NEW GAME below it. **NEW GAME overwrites the save without asking** (a confirmation can come with a real menu). The second button's place is a placeholder, not in the mockup.

*Update 2026-10-20 (pass 5b, the cutscene's checkpoint; agent's choice, for the owner's review):* **the checkpoint at a cutscene's end saves the scene it played in** (its id, with the story as it is after the cutscene), as the save format allows only a scene as checkpoint. So *Continue* after it starts that scene again from its setup and her start, not where she stood when it ended; the story makes the difference (here: the side door unlocked). A checkpoint that resumes after a cutscene at its own spot would need the cutscene's end to name a scene (or a mark) to start: possible later, when a real cutscene needs it.

*Update 2026-10-20 (pass 6):* **the tags that name another thing say its id** (owner: option A): `controls` and `opensWith` were rewritten from Blender names to ids in 1.21, and the ship export stops on one naming no id (rather than a table of links in the game's code, option B: everything about an instance stays on it in the file). The game finds everything it uses by `kind` (the `interact` and `device` tags are no longer read; `UNTAGGED` gone); static scenery stays found by name. `npm run check` checks every id named by the scenes, cutscene tracks and Ink against `ids.json` and the crew (`tools/check-ids.mjs`).

---

## [2026-10-20] — The export puts moving parts at their recorded rest pose (pipeline)

**Context:** the game takes a door's pose in the exported file as closed. A door posed in Blender for an animation (the trapdoor, turned out of the way for the ladder, 2026-10-19) reached the game and opened the wrong way; earlier the ramp's single keyframe held it open. The rule "doors closed and not animated in the file" depended on the owner remembering it, and the current frame decided the pose of anything animated.

**Decision:** each moving part's rest pose (local transform, by name) is recorded in `app/prototypes/0.0.2/tools/rest-poses.json`, from 1.21. The ship export drops the moving parts' animation and puts each at rest, in memory; all three exports run at the scene's start frame. Every correction prints a `POSE:` line. A door moved on purpose is taken with `npm run rest-poses -- --accept "<name>"`.

**Alternatives considered:** correcting the pose when the game loads (the same data, but the game's files would be wrong and the game more complex); keeping the rule as a checklist line (it broke twice); the stopgap in `doors.ts` for named doors (removed).

**Rationale:** the export gives the game the ship as it's meant to be whatever state the working file is in; nothing is saved to the `.blend`; the record is what item 49's component definitions will take over.

**Status:** Built 2026-10-20 (item 48, pass A; [`plans/features/robust-exports.md`](plans/features/robust-exports.md), *As built*).

**Update (2026-10-20, pass B):** **a gate on what reaches the game.** The game's files are replaced only when nothing differs from the last taken export (objects, animations, bytes, a new `PERF:` / `NODES:` / `NOTE:` / `POSE:` line, any `STOP:` line; owner: "start broad and add exceptions as we go"); otherwise the files wait and `npm run export:accept -- <what>` takes them, refused if the `.blend` was saved since. Exceptions so far: the frame line, the crew's places, poses and actions (owner). Movement of the crew that makes no sense, a lost animation and a missing part of the player stop it. An after-export check runs on a taken change. *Alternatives:* `export:ship -- --accept` running Blender again (you'd take what you hadn't seen); a tolerance for "moved" above compare-glb's 2 mm (not needed so far). Rules: [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md), *The gate*.

---

## [2026-10-20] — Prototypes numbered by version; 01 frozen as 0.0.1; each version isolated (process)

**Context:** Prototype 01 grew into the whole game so far (the ship, the crew, doors, ladders, the jetpack, sound, the start screen). The next work (the ship's things as components, item 49; robust exports, item 48) changes its architecture. The owner wanted the current state kept working as a reference, with its own link, while the next one is built, and the two unable to affect each other: code, game files, export scripts, checks and source art (backlog item 51).

**Decision:**
- **Prototypes are numbered by version** (`0.0.1`, `0.0.2`…) instead of `NN-<slug>`: folder `app/prototypes/<version>`, package `@zamboni/prototype-<version>`, git tag `v<version>` when frozen, console prefix `[<version>]`, the version at the top of the tuning panel. **The current version takes the plain root scripts** (`dev`, `smoke`, `probe`, `export:ship`…); a frozen one gets a suffix (`dev:0.0.1`, `export:0.0.1:ship`…).
- **Prototype 01 is 0.0.1, frozen** (tag `v0.0.1` on be0ffae; port 5201 kept). Changed only if it stops running; all open work goes to 0.0.2 (port 5202), which starts as an exact copy.
- **Each version is isolated:** its own game files (`public/`) and tools (`tools/`); a frozen one keeps its own copy of shared code (0.0.1: `@zamboni/ui` in `src/ui/`) and exports from **its archive**, the `.blend` at the freeze with its images and font packed (`resources/archive/0.0.1/The Zamboni 1.21 (0.0.1).blend`). Replaces rule 5 of `prototypes.md` (*assets are shared through `app/assets/`*) and the shared `app/tools/`.
- **One Vercel project per version**; a frozen one has the ignored build step `git diff --quiet HEAD^ HEAD -- .`.
- **The low-resolution prototype (02) is skipped:** its plan is `low-res.md`, set aside, backlog item 52.

**Alternatives considered:**
- **Keep `01-walk` and add the version beside it:** no Vercel change, but two naming schemes side by side.
- **Share game files and tools between versions** (as before): no copies, but a change for 0.0.2 (an export, a script) would reach 0.0.1. Git stores identical files once, so the copies cost nothing until they change.
- **0.0.1 exporting from the working `.blend`:** the owner keeps editing it; 0.0.1's export would drift. The packed archive exports byte-identical files (ship, collider, crew).
- **Freeze after building ladder 2b:** not chosen; 0.0.1 is frozen with its 8 known smoke failures, written into its README.

**Rationale:** A working reference that nothing can disturb, at the cost of one copy of the code and files, and the plain commands keep working on whatever is current.

**Status:** Built 2026-10-20 in four passes. Plan: [`plans/prototypes/archive-01-start-02.md`](plans/prototypes/archive-01-start-02.md). See [`architecture/prototypes.md`](architecture/prototypes.md). Waiting on the owner: 0.0.2's Vercel project and 0.0.1's ignored build step.

## [2026-10-20] — Fewer GPU pipelines, made at load (tech)

**Context:** The load took about 18 s, 14 of them the GPU building 116 pipelines. Chrome caches them on disk, but in practice only the first load of a browser session got the cache: reloads, the usual way of working, built everything again (owner's Chrome: 5.5 s, then 11.2 s).

**Decision:** In the game, at load (`pipelines.ts`): UV sets no texture reads are dropped, the rest stored as floats, so the ship has one vertex layout per kind of mesh; mirrored meshes get mirrored geometry instead of a negative scale; every see-through material copy is physical (a standard one is a physical one at its defaults). 116 → 78 pipelines.

**Alternatives considered:** saving compiled shaders in the page's storage (WebGPU gives a page no access to them); fewer materials or applied scales in the ship file (the owner's work, not needed for this); dropping unused UVs in the export (wanted too, for the file's size: later, item 50).

**Rationale:** nothing to change in the file, no visible change (screenshots of every room compared), and reloads went from about 11 s of compiling to about 2 s (the button at 4 s instead of 15).

**Status:** Built 2026-10-20 ([`plans/features/faster-load.md`](plans/features/faster-load.md), *As built*).

---

## [2026-10-19] — What the ship export takes is a list (pipeline)

**Context:** in 1.20 the owner switched off (excluded from the view layer) most of the ship's collections while tidying. The export took only switched-on collections, so it lost most of the props; the same had happened in 1.19 (`Ship` excluded). The owner turns collections on and off all the time while working.
**Decision (owner):** what goes into the game is **a list of the objects**, made from what the game had (the export of `The Zamboni 1.19.blend`): `app/tools/ship-export-list.json` (parts, props with the group each is merged into and its `seeThrough` tag, collision pieces, light markers). Every collection counts, switched on or not. The export flags what doesn't fit: listed but not in the file, or in the file and not listed. Things not imported before (`Archive`, `Ground`, `Temple`, the `Booleans` cutters, the crew's own collections) stay out.
**Alternatives considered:** export everything under `Ship` whatever its switch (the cutters render, so they'd need a tag; moving a prop to a new collection would still rename its merged group and change its `seeThrough`); the owner keeping the collections switched on.
**Rationale:** the file can be organised freely without changing the game; a change to what's in the game is an edit to the list, visible in git.
**Status:** built 2026-10-19 (`ship-export-list.py` made it; `export-ship.py` reads it). Changes from 1.20 put in the list: `Door Boolean.001` renamed `Door Frame Bottom`; `Monitor.004` and `Keyboard.002` replaced by `Signal Receiver.001` and its two dials and two switches. Supersedes "this script holds no list of objects" in *The ship's reference file* (2026-10-12).

## [2026-10-19] — One scale: the ship file is the game 1:1 (pipeline)

**Context:** the owner's ladder animation (1.20) was made with Dr. Green at the ship file's size (armature scale 1.033), but the game showed her at the crew file's (0.826, *Taking a jetpack from the rack*): 0.8 of her size next to the ladder, so the animation didn't fit. The game scaled the ship by her height over her exported model's (1.4856), the player export shrank her armature, the crew export resized each character around their hips.
**Decision (owner):** **the game's proportions are kept** (making her 25% bigger isn't acceptable); the file takes them, and the scale is normalized: **1 Blender unit = 1 m, Dr. Green is 1.23 tall at armature scale 1** ("around 1.2", so gravity and every value in metres stay as they are). No export applies a correction factor; every export **stops** if her armature isn't at scale 1 or she isn't 1.23 (±0.01) tall. The owner re-keys the ladder animation (her rise is now 2.26, floor to floor).
**Alternatives considered:** the game at the file's proportions (she'd be 25% bigger in the ship; the animation would fit as made); her at 1 m tall in the game (every value in metres ×0.813); the export stretching the animation's rise.
**Rationale:** with no factor anywhere, what's made in the file fits the game as made; the check stops a wrong size before anyone animates on it.
**Status:** built 2026-10-19. `app/tools/normalize-scale.py` made `The Zamboni 1.21.blend` from 1.20 (1.20 untouched): everything ×1.4856, her player armatures applied at scale 1, the crew resized around their hips as the export did. The game: the ship at scale 1, no settings changed. Proven: positions in the game the same within 1.5 mm (the probe), the rooms' screenshots the same apart from the owner's 1.20 changes. The other characters' armature scales aren't applied (some share actions at different scales). Updates *Taking a jetpack from the rack* (2026-10-14) on her size.

## [2026-10-14] — See-through from scratch: the shell only, then the rules one by one (feature)

**Context:** pass 5's plan (items 11, 13, 14, 15, in `plans/features/see-through-rules.md`) added four more rules on top of the second pass's. While reviewing it, the owner chose to start over instead, on a branch, since main has a good working version.
**Decision (owner):** on the branch `see-through-from-scratch`, every see-through rule is removed. The first stage draws only the ship's shell (the hull, the windshield, the outer doors and hatch, the cargo ramp, the engineering window, the turbines), cut by the hole while it hides her; everything inside is hidden on both decks: furniture, floors, inner walls, bulkheads, the crew and their shadows. The tuning panel keeps only the settings that still apply. The rules then come back one at a time, each the owner's call.
**Alternatives considered:** pass 5 as planned (more exceptions on top of the existing ones).
**Rationale:** each rule is judged on its own, starting from the simplest view, instead of adding to a set that has grown by exceptions.
**Status:** first stage built on the branch (2026-10-14), for the owner to play. The rules of 2026-10-08 to 10-12 remain in the code behind `settings.seeThroughStage = 'all rules'` (main's behaviour), to take back from; pass 5's draft is on hold.
**Update 2026-10-15 (owner): first stage closed** ("good enough for now"): the hull, its inner parts and floors, the cockpit floor and the crew quarters' walls drawn; the gap between the skins filled with one flat colour on every drawn hull part (switch: black); the camera kept out of the hull's wall indoors (to be kept to a minimum in future work). Next: the hidden objects come back, one group at a time. Clipping into the hull's wall is to be fixed in Blender.
**Update 2026-10-15 (owner): every object back**, the crew quarters' lockers, bunks and galley never cut on her deck with what's on them, and the camera kept in front of them; in the export, props hanging on a part are exported as its children (the clamps and extinguishers, the cabinets' contents, the pallet's lantern).
**Update 2026-10-15 (owner): the camera collides indoors.** It stays inside the hull (its glass and outer doors too; open ones let it through), in front of both bulkheads and their doors, and in front of the crew quarters' furniture (two boxes round the bunks + galley and the back wall, the couch, table and their walls by shape). Replaces 2026-10-14's "only kept out of the hull's wall", where the camera could stand outside the ship. The bulkheads and their doors are never cut while the camera collides with them; the couch corner is never cut on her deck. The hole now ends in a hemisphere closing at her chest (`holeEnd: 'round'`, 0 m past her), after comparing square, vertical and round ends on the owner's views.
**Update 2026-10-15 (owner): never cut on her deck:** everything in the cockpit (its crew too) and engineering, and the cargo hold's sled with its load, pallet and lantern.
**Update 2026-10-15 (owner): stage 2, objects back:** everything in the cockpit, engineering and the cargo hold, and the crew quarters' big furniture and wall parts; drawn and cut by the hole like the hull (no other rule yet).
**Update 2026-10-14 (owner):** the hull's inner parts and the floors are back (structure that isn't a divider: floors, the crew quarters' ceiling, ceiling lights, the two hatches), cut like the shell. Then the cockpit floor (split off `Dashboard Body` at load) and the crew quarters' inner walls.

## [2026-10-14] — The jetpack with momentum: hover, flight, glide, skid (feature)

**Context:** on the controller, flying forward she kept climbing (owner, 2026-10-14). That was pass 6b's rule: an analog R2 set her height and the stick only moved her level; Space and a digital R2 flew by Part 1's rule (one speed along her facing, tilted by the camera; at rest she rose; letting go she fell from a standstill). The owner wanted two modes, hovering and flying where the camera points, chosen by her horizontal speed rather than by the stick, then simplified it: momentum "similar to the ship in Asteroids", a glide when R2 is let go, a skid on the ground.
**Decision (owner, 2026-10-14, the agent's recommendations on the details):** while the jet is on she has a velocity. **Slow, she hovers**: R2 sets her height (pass 6b's bands), the stick's first 60 % drifts her up to 1.5 m/s, past that it thrusts. **Fast, she flies**: from 4 m/s, thrust (12 m/s²) where the stick points, forward where the camera looks, and a drag that holds her top speed at 20 m/s; she leaves flight only below 1.5 m/s with the stick eased off, so reversals don't lift her. **R2 let go** at more than her run speed, she glides (speed falls off, part of gravity cancelled by her speed, a slower fall), then falls; the stick does nothing. **Jet off on the ground at speed** she skids to a stop; off a ledge she glides again. Jet on, the ground slows her a little. **Space and a digital R2** count as R2 held fully. The tuning panel's other R2 modes (*acceleration*, *Part 1's rule*) are gone.
**Alternatives considered:** R2 sets the height and the stick only steers (pass 6b: the climbing complaint); Part 1's rule on the pad (no hover); a blend by the speed she's heading for, without momentum (the agent's first two drafts); braking by pulling back mid-glide (dropped with the Asteroids model).
**Rationale:** one velocity makes reversals, coasting, the glide and the skid follow from one rule instead of special cases; hovering stays precise near things; no damage in the game, so skids and drops are free to be fun.
**Status:** Built 2026-10-14 ([`features/interaction.md`](features/interaction.md#flying); plan: [`plans/features/jetpack-hover-and-flight.md`](plans/features/jetpack-hover-and-flight.md)). **Done** (owner, 2026-10-14: "no issues"). Two things found while building: in flight up and down follow the camera more tightly than the drag (else a hover climb carried her 3 m on up), and a wall takes her speed only after three blocked steps (Rapier's controller now and then stops her for a step or two on open ground).

## [2026-10-14] — The jetpack's exhaust glow: the halo painted in, no bloom (look)

**Context:** the owner asked for Part 1's jetpack glow (item 38). In Part 1 it was a tiny cyan particle at the nozzle (0.05 s life, about one alive at a time, at least 3 % of the screen) that the camera's bloom turned into a white-hot ball with a cyan halo, about 10 % of the screen's height in the owner's video. The game has no bloom yet (planned in `architecture/stack.md`, off on the low tier).
**Decision (owner, the agent's recommendation):** one camera-facing additive sprite per nozzle (the jetpack has two), with the white core and the cyan halo drawn in its shader; a constant size on screen; it follows an analog R2 as the jet sound does and flickers on its own (owner).
**Alternatives considered:** Part 1's particle plus real bloom (a full-screen pass every frame, and it changes every glowing display in the ship: belongs with the lighting work); a particle system (Part 1 had about one particle alive).
**Rationale:** one draw, no new pass, and it looks the same on every quality tier. When bloom comes, the painted halo can be turned down.
**Status:** Built 2026-10-14 ([`features/interaction.md`](features/interaction.md#the-exhaust-glow); plan: [`plans/features/jetpack-glow.md`](plans/features/jetpack-glow.md)). The owner's to look at.

## [2026-10-14] — The auto-parachute: the jetpack slows a long fall (feature)

**Context:** with the jetpack she can let go high in the air, and a long fall ended at full speed (no fall damage, no landing animation). The owner asked for an "auto-parachute": after a fall from a bit under the ship's height, the jetpack fires by itself at her height above the ground and slows her down, including when she lets go of the jetpack while flying.
**Decision (owner, following the agent's recommendations):** the lowest fall is 5.5 m (the ship stands 6.5 m). **The braking is fixed**, set so that a fall of exactly 5.5 m fires at her height (1.23 m); longer falls fire higher (about 6 m for 30 m) and she always lands at 2 m/s. **Only while she wears a jetpack.** "Auto-parachute" is our name for it, not an in-world one.
**Alternatives considered:** firing at her height every time (a 30 m fall would stop at about 47 g in 0.07 s: a dead stop on screen); a burst without a jetpack (it's the jetpack's).
**Rationale:** the same burst at every height reads as one feature, and its one rule ("the minimum fall fires at her height") holds whatever gravity is chosen (still open: Part 1's was 6 m/s², ours is 20).
**Status:** Built 2026-10-14 ([`features/interaction.md`](features/interaction.md#the-auto-parachute); plan: [`plans/features/auto-parachute.md`](plans/features/auto-parachute.md)). The owner's to play.
**Update (2026-10-14):** the owner asked for the burst to last twice as long. Braking evenly, the burst's length is set by where it fires, so it can't both fire at her height and last longer: **it now fires higher** (about 2.85 m on the minimum fall) and brakes about half as hard. The rule is now "on the minimum fall it brakes for `parachuteBurst` seconds" (0.5: twice the 0.22 s first measured, as felt from start to landing), not "it fires at her height". The landing speed (2 m/s) and the minimum fall (5.5 m) are unchanged.

## [2026-10-14] — The jetpack is taken from the rack; the player's model comes from the ship file (feature)

**Context:** the owner added Dr. Green with a jetpack to the ship file (a new collection, now `Player`): the same rig as the player's model from the crew file, plus a jetpack without straps and a shape key that lifts the hood clear of it. The ship's cargo hold already had a rack with three jetpacks (with straps). Until now she could fly anywhere without wearing anything.
**Decision (owner):** she walks up to the rack and takes a jetpack: that one disappears from the rack, hers shows, her little backpack hides, the hood's shape key is applied, and the jetpack controls work. **She takes it off at the rack** (the empty spot). **She can jump while wearing it:** jump and flight have their own buttons since 2026-10-12, which supersedes "no jumping while wearing the backpack" in `scope.md`. **Everything stays at the prototype's scale:** the export sets the armature to the crew file's 0.826 (it's 1.033 in the ship file), so her size and the ship's are unchanged. The player's model is exported from the ship file (`npm run export:player`).
**Alternatives considered:** copying the jetpack and the shape key into the crew file (a Blender session on an older file for the same result); three loose switches (the first version of the plan); taking it off anywhere (then where does it go?); fixing her scale in the blend file (not needed: the export does it).
**Rationale:** the ship file is the one being edited and already read by the other exports; the rack makes the jetpack something she has, not a mode.
**Status:** Built 2026-10-14 ([`features/interaction.md`](features/interaction.md#the-jetpack-rack); plan: [`plans/features/dr-green-jetpack-model.md`](plans/features/dr-green-jetpack-model.md)). The owner's to play.
**Update 2026-10-19 (owner):** her size is in the file now: 1.23 tall at armature scale 1, and the export has no `--scale` (*One scale: the ship file is the game 1:1*). The game's proportions are unchanged.

## [2026-10-14] — The start button is the template for every game UI button (design)

**Context:** the start button's pressed state was reworked with the owner (2026-10-14) until it read as a physical button: the mockup's *Start Button* (Figma, "The Zamboni", node 21-2), whole pixels, and no flash while the body moves down.
**Decision:** "Let's save it as the template for all future buttons on the game UI" (owner). Every button in the game's UI is `Button.svelte` from `packages/ui`, with its look and its states as they are now ([`design/README.md`](design/README.md#components), [`design/start-screen.md`](design/start-screen.md#the-button)). What varies (size, label) becomes props; the states don't.
**Alternatives considered:** a button per screen, styled on its own: drifts apart, and every one would need the same pixel and timing fixes.
**Rationale:** one component keeps the feel the owner approved everywhere, and fixes made once apply to every button.
**Status:** Decided. The size is fixed to the start button's (226 × 55) until a second button needs another.

## [2026-10-13] — The start screen: the design system's first code, the fonts in the repo (design)

**Context:** The owner asked for a start screen from a Figma mockup, with the button's states taken from Eigodojo's design system ([plan](plans/features/start-screen.md)). Until then prototype 01's overlays were plain HTML and CSS, `packages/ui` was empty, and the Zamboni's Figma file has one variable and no components. The mockup uses two fonts that weren't in the repo.

**Decision (owner, 2026-10-13, from the plan's options):**
1. **The button and the progress bar are Svelte components in `packages/ui`**, on tokens in `tokens.css`; the screen itself is a Svelte component in prototype 01. Svelte is now part of prototype 01's build, and its `check` is `svelte-check`.
2. **The title's font, Digital Desolation Plus, is a file in the repo** (`app/assets/ui/fonts/`), and the title is text. Afacad's file is in the repo too, not fetched from Google.
3. **Part 1's soundtrack plays on the start screen only**, and stops when the game starts.

**Alternatives considered:** plain HTML and CSS in prototype 01, redone when the design system starts; the title exported from Figma as an SVG, so no font file ships; the soundtrack through the game, fading while the boombox plays.

**Rationale:** 1 is what [`stack.md`](architecture/stack.md) and [`design/README.md`](design/README.md) already say; the start screen is where it begins. 2 and 3 are the owner's calls. The agent pointed out with 2 that the font file is public with the game, so its licence has to allow web embedding: the owner's to know.

**Status:** built. The tokens are written by hand from the mockup until the Figma file has variables. The assets are in `app/assets/ui/`, as production assets (they're the design); the two sounds are placeholders in `app/assets/test/audio/`. What exists: [`design/start-screen.md`](design/start-screen.md).

---

## [2026-10-13] — Materials made with nodes are baked by the export (pipeline)

**Context:** The owner found the displays gray and washed out in the game (the map table in the cockpit). The glTF exporter only understands an image plugged straight into the Principled BSDF. With nodes in between (colour ramps, a mix, a Voronoi grid) it wrote the image upstream untouched, or a plain value. Nine of the ship's materials and one of the crew's were affected.

**Decision:** The export scripts bake them ([`app/tools/bake_materials.py`](../app/tools/bake_materials.py), used by `export-ship.py` and `export-ship-crew.py`): base colour, emission (with its strength when that's made by nodes too) and alpha are rendered to a 1024 px image (Cycles, Emit) and plugged straight in, in memory. The blend file isn't changed. A material placed by its UVs is baked on the whole UV space; one placed another way (a texture node with nothing in *Vector*) is baked on one object and reused on the others: the one named by the material's `bakeOn` custom property, or else the one with the largest surface in that material. Every case is printed as a `NODES:` line. Roughness, metallic and anything that depends on the view are reported, not baked.

**Alternatives considered:**
- **The owner bakes them in Blender.** No export code, but by hand, again at every change, and the procedural version has to be kept somewhere.
- **Rebuilt as shaders in the game (TSL).** Sharp at any distance and can move; each material written by hand and kept alike in two places. Kept in mind for screens that animate.

**Rationale:** owner's call (2026-10-13), on the agent's recommendation: the materials stay procedural and editable, and every export picks up changes. Unlike double-sided materials (fixed in Blender, 2026-10-12), nothing here is wrong in the file: it's the exporter that can't read it.

**Status:** Decided, built. See [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md#before-the-next-export).

---

## [2026-10-13] — Placeholder audio; licensing put off (scope)

**Context:** The owner asked for the UE prototype's audio files and events in the game (backlog pass 4.5). Four of the eight files are commercial music (Anamanaguchi, 2NRO8OT), the rest are downloads of unknown terms, and prototype 01 is deployed. [`audio.md`](architecture/audio.md) proposes that nothing ships without an entry in a license register.

**Decision (owner):** every file is a placeholder. Licensing isn't raised again until a production-ready build; then the owner is reminded of everything that's unlicensed.

**Alternatives considered:** leaving the music out of the deployed build; replacing the tracks now.

**Rationale:** the owner's call: the prototype is for judging the game, and the sounds will be replaced.

**Status:** in force. The list the reminder will be made from: [`app/assets/test/audio/SOURCES.md`](../app/assets/test/audio/SOURCES.md). The files are in `app/assets/test/`, as test assets.

*Update 2026-10-13:* placeholder sounds for every interaction, and footsteps (owner; [plan](plans/features/interaction-sounds.md)). **The footsteps are cut from Big Moon Tiny Moon's two running loops; everything else is made by a script from tones and noise** (owner: "check the Big moon tiny moon project… Try generating the others"), so there's nothing to license for those. Not taken: downloads from free libraries, picked unheard. Part 1's two files have no recorded source: they're on the list. Later the same day: the ship's steps come from a recording of steps on metal the owner added (`resources/audio/freesound_community-metal-footsteps-14727.mp3`), not from Part 1's rock loop (it sounded like gravel); on the list too.

## [2026-10-13] — First audio code: AAC, cues as data, three buses (tech)

**Context:** Backlog pass 4.5 is the first audio step. [`audio.md`](architecture/audio.md) is a proposal, still open for discussion.

**Decision (agent, in the plan the owner approved: [`plans/features/audio-from-ue.md`](plans/features/audio-from-ue.md)):** follow the proposal where it can be followed. AAC in `.m4a`; cue ids in a data file; buses master → music, ambience, sfx; Three's `PositionalAudio` for sounds in the world; music and long ambiences streamed, short sounds decoded. The code stays in prototype 01 (`audio.ts`) until something else needs it. Added while building: **a streamed loop repeats by crossfading two copies of its file**, not from the file's ends.

**Alternatives considered:** decoding the 7-minute loop (about 40 MB of memory, loops exactly); cutting it to a 60 s loop by ear (the agent can't hear); an `<audio>` element's own loop (a gap where it starts again); a sound library such as Howler (nothing needed it yet).

**Rationale:** the smallest thing that plays the eight sounds and tests the proposal's open points. The crossfade makes the seam independent of the browser and of AAC's padding, and the two files aren't loops anyway.

**Status:** built; **the proposal itself is still open**. Loops checked in Chrome only, by level. Not known: whether a gamepad button alone turns the sound on.

## [2026-10-12] — Lighting inside the ship (look)

**Context:** The crew quarters and the cockpit were too blue (owner): sunlight through the windows should warm them. And metal looked black (owner: "reflective but very dark"). Found: the ship's shadow came from one merged mesh that included the glass, so no sun got in; the blue was the world light (a hemisphere light), which lights the inside of the hull as if it weren't there (with it off the rooms are grey); and metallic materials had nothing to reflect (`scene.environment` gave nothing because three sizes its reflection map from the texture's width, and the sky texture is 8 px wide).

**Decision (agent, for the owner to judge; every value is in the tuning panel):** (A) the glass casts no shadow; (C) the world light is at half strength while she's inside; in place of (B), the lights of the rooms with windows are tinted 60% toward the sun's colour; metallic, non-transparent materials reflect the sky gradient at half strength, through their own environment node.

**Alternatives considered:** (B) as planned, sun-coloured fill lights at the windows from new markers in the ship file: better (light from the window's side), but it needs markers added in Blender and uses the four-light budget; the tint is a stand-in the owner can replace by setting marker colours. `scene.environment` for everything: lights every material a second time and changes the approved outdoor look. Lower metalness in Blender: changes the materials rather than the lighting.

**Rationale:** A alone gives sun patches, not a warmer room: there's no bounced light. The world light indoors is the actual source of the blue, so C does most of the work.

**Status:** Built 2026-10-12; the owner judges the colour. Details: the prototype's [`README`](../app/prototypes/01-walk/README.md).

*Update 2026-10-12 (later the same day): direction changed by the owner; tests made and reverted.* The owner found the interiors still too blue, and the transitions between rooms very noticeable. Tested in the game, then all reverted to the build of commit `71db909` (nothing below is in the code):

1. **Sliders only:** *world light indoors* 0.5 and *warm light: crew q., cockpit* at 2, with the slider's range raised to 5 (up to 1 a tint toward the sun's colour; above 1 the colour stays and the lights are that many times brighter, because a tint past 1 gives a negative blue). Owner: "works for the most part", but only two rooms are warm, so the rooms differ.
2. **A light in engineering for daylight from the open cargo ramp**, fading with the ramp. A spot light, since a directional light here lights the whole scene. Set 1.5 m back in the cargo bay, its cone drew a bright disc on the bulkhead around the door. In the doorway, aimed into the room (wide, soft, unshadowed, decay 1, brightness 4): no disc, a subtle effect. With a shadow (one extra shadow pass, the ship's merged shadow mesh): she and the equipment cast shadows into the room and a closed door would block it, but the disc on the bulkhead is back.
3. **All seven room lights on, not the four nearest:** measured at 2 to 4% of the frame rate on the owner's PC (engineering 116 → 112 fps, upper deck 126 → 125, uncapped). Not tried as a look. It would remove the lights fading in and out as she moves.
4. **No lights inside; the world light warmed indoors instead** (the sun's colour added to it from every direction while she's inside, 0.5 of the world's strength, matched by eye to the crew quarters' lit walls of test 1): every room alike and nothing fades, but flat (no bright and dark sides) and a slightly green grey, not a warm white (sun yellow + sky blue).
5. **Not built, only proposed:** the world light turned down per surface (only surfaces inside the ship), so the snow seen from inside doesn't change as she crosses the ramp; a colour of its own for the warm light.

**Decision (owner, 2026-10-12):** "The best solution will be to have a consistent lighting everywhere and deal with the bluish interiors by adding light sources." No action yet: the owner tests it in Blender and produces reference images. Confirmed by the owner the same day: the world light is the same indoors and outdoors, so *world light indoors* and the tint go, and the rooms get more lights; **the owner places the lights in the blend file.** Known from the tests, for when it's built: the budget is four lights at once and seven on cost little; unshadowed lights go through walls; a light's cone shows on the surface next to it.

## [2026-10-12] — Single-sided materials in the ship (pipeline)

**Context:** 44 of the 57 materials the ship's export uses were double-sided in Blender, and the see-through hull drew every cuttable material double-sided whatever the file said, with back faces in a dark colour so a cut reads as a solid cross-section. The owner asked for every double-sided material to be single-sided, for performance, with any surface that disappears fixed in Blender.

**Decision (owner):** Backface culling is on for every material the ship's export uses, in the reference file. The game draws each see-through material with the side it has in the file; a switch in the tuning panel (*single-sided materials*, on by default) goes back to double-sided with the dark cut surface. The characters stay as they are for now.

**Alternatives considered:** forcing single-sided in the export or in the game (the rule of 2026-10-08 stands: the export keeps Blender's setting, so one material can be made double-sided again in Blender); keeping double-sided only on the see-through materials (the look of 2026-10-08).

**Rationale:** The owner's instruction; the switch is there to measure it and to compare the two looks.

**Status:** Built 2026-10-12, owner play-test pending. **Measured** (owner's PC, headless Chrome, frame-rate limit off, 1264×569): engineering 112 fps single-sided against 109 double-sided, crew quarters 75 against 73, outside about 300 either way. No measurable saving at this size; the look changes (through a cut you see what's behind, not a cross-section). Whether to keep it is the owner's call after playing with the switch. Details: [`features/see-through-hull.md`](features/see-through-hull.md).

## [2026-10-12] — The ship's reference file (pipeline)

**Context:** The game's ship was the owner's Blender file plus about 150 lines of lists in `export-ship.py`: which objects are exported, which are doors and how they open, what's structure, what's removed, where the lights are, how the bulkheads collide. The Blender file and the game had drifted apart (doors modelled open, the ramp keyed open, objects removed only in the export), and one such difference caused the ramp bug of pass 1.

**Decision (owner):** A copy of the file, `The Zamboni 1.19.blend`, is updated to match the scene in the game and is the reference from now on (1.18 is left untouched). Everything that is scene content lives in it: doors closed, removed objects deleted, every tag as a custom property on its object or collection, the room light markers as empties, collision pieces as `*_col` objects. The export script keeps only what is derived (modifiers, baking and merging props, the collider, hinges, the `PERF:` report). The file was built by a script (`app/tools/build-ship-reference.py`), kept as the record.

**Alternatives considered:** keeping the lists in the export script (the drift continues, and the owner can't change behaviour from Blender); a data file next to the `.blend` (a third place to keep in step).

**Rationale:** "Art drives behaviour through names and custom properties" ([`architecture/README.md`](architecture/README.md)) was the rule; the lists were a stand-in. With the tags in the file, a new door or collision box is a change in Blender and a re-export.

**Status:** Done 2026-10-12. Proven before anything else changed: the reference file exported with the new script matched 1.18's export object for object (differences: the ramp, now closed, and the new `opensWith` tag; the collider has the same vertices and surface area). Details: [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md#the-ships-reference-file).
**Update 2026-10-19 (owner):** the reference file is `The Zamboni 1.21.blend` (1.20 at the game's scale), and *what* is exported is a list again (`ship-export-list.json`), not the collections switched on in the file; *how* each thing behaves is still set by tags in the file. See the two entries of 2026-10-19.

## [2026-10-12] — Keeping context small between sessions (docs)

**Context:** Picking up the backlog on 2026-10-12 meant reading about 23 files (roughly 200 KB) before any work: the state of the work was spread over feature docs, built plans, the prototype README and the source. The owner asked for an audit of the project and documentation structure to use fewer tokens.

**Decision (owner):** Five changes, none of which removes anything: (1) [`steps/current.md`](steps/current.md), the state of the work in progress, read first and rewritten at the end of every session; (2) a code map at the top of the prototype's README; (3) [`plans/backlog.md`](plans/backlog.md) as a tracker, one line per item; (4) the index at the top of this log; (5) `.claude/settings.json` stops the agent reading `package-lock.json`, `.glb` files and `resources/`.

**Alternatives considered (proposed, not decided):** one home per fact (behaviour in `features/`, how in the code's comments, why here; the rest links); collapsing built plans to short stubs (changes the "superseded docs move to `_archive/`" convention); a scripted check (`npm run smoke`) in place of screenshots (to come with pass 1 of the backlog); shorter lines in docs.

**Rationale:** A new session should start from one short file, not from re-reading the project.

**Status:** Done, 2026-10-12. The saving hasn't been measured yet.

*Update 2026-10-22:* change (3) is replaced: open items are tracked in Linear, and `plans/backlog.md` is an index of items 1–77 to their issues ([*The work is tracked in Linear, for the owner*](#2026-10-22--the-work-is-tracked-in-linear-for-the-owner-process)). The other four changes stand.

**Update (2026-10-12):** first measurement: the session that built pass 1 of the backlog read about 14 files before its first test, against about 23. The code map moved out of the prototype's README into its own short file, [`CODE-MAP.md`](../app/prototypes/01-walk/CODE-MAP.md) (owner): the README is long, and only the map is needed to start.

---

## [2026-10-09] — Basic interaction: doors, keypads, ladders (feature)

**Context:** The owner asked for the UE prototype's interaction (point at something, press a button): every door in the ship but the bulkhead ones, the two keypads by the side door (ramp, side door), the trapdoor, the roof hatches, fridge and locker doors; and ladders, if quick. The UE prototype was first-person with a crosshair; this game is third-person, gamepad first.

**Decision (owner):** E / Circle (gamepad B) uses the target. **Targeting:** of the objects within her reach (≈ 1 m from her chest, not behind something solid), the one nearest the centre of the screen; no crosshair; the target is lifted toward white and a prompt names the action. **Doors** toggle open/closed on a hinge (as UE's `BP_Door`), **all start closed**; the side door is hinged at the bottom and drops outward to the ground, where its inside is a ladder. **Ladders need no button:** walking into one attaches her, pushing toward it climbs, away descends; walking toward the opening from the floor above attaches her at the top.

**Alternatives considered:** a crosshair ray (exactly UE's, but hard on a gamepad at third-person distance with 0.2 m keypads); her facing only (can't pick between close neighbours); pressing interact to grab a ladder (owner: walking should be enough).

**Rationale:** "pointing" with the camera keeps the UE feel without a crosshair, and is forgiving with a stick. Built in prototype 01, like the see-through hull and the ship's contents.

**Status:** Built 2026-10-09; owner play-test pending. Feature doc: [`features/interaction.md`](features/interaction.md).

**Update (2026-10-13): the bulkhead doors and the engineering window (backlog pass 4).** The bulkhead doors were "not interactive" (2026-10-09). Now (owner, 2026-10-12 and 13): they **slide open when she's within 1.5 m and close when she leaves**, in 0.3 s (at 0.6 s, at a run, she reached the leaves before they were open; at 2 m the cockpit's door stayed open for most of the cockpit; both values are in the tuning panel), as in the UE prototype's `BP_Door_Internal`; a **panel on each side shuts the door and keeps it shut**, and used again makes it automatic again (the UE door has no panel). Considered for the panel: holding the door open or shut until pressed again (the door would never open by itself again after the first press), and flipping it only until she walks away (it could then only shut a door she's standing at). The engineering window's two halves slide apart from a **lever that slides** 0.06 toward the window, as in UE (`BP_Lever_Panel`); "it turns" (owner, 2026-10-12) is replaced. "Near" is a distance in the tuning panel, not trigger boxes in the file. The tags are set by [`app/tools/tag-ship-pass4.py`](../app/tools/tag-ship-pass4.py), which the owner runs in Blender; the export runs it in memory until the file has them. Plan: [`plans/features/bulkhead-doors.md`](plans/features/bulkhead-doors.md).

**Update (2026-10-09):** after the owner's first look: the open side door is a **ramp**, not a ladder (a walkable stand-in slope over its steps, as for the cargo ramp); the trapdoor **starts open** for now (hard to aim at from below); the roof hatch stays out of reach for now (an unfolding ladder later, or not: the crew have jetpacks).

**Update (2026-10-09):** doors no longer trap her: **a moving door pushes her out of its way** (sideways, through her controller), and stops (backing off a little) only when she can't be cleared, is on a ladder, or would be lifted. Chosen over walking her to an interaction point first (more polished, more work; maybe later, for use animations) and stepping her out of the swing before opening. No door is offered while she stands on it. Plan: [`plans/features/interaction-clearance.md`](plans/features/interaction-clearance.md). Plan: [`plans/features/interaction-doors.md`](plans/features/interaction-doors.md).

**Update (2026-10-12): ladders go up only** (owner: "Let the player jump down the hatch. It's way faster"). She attaches at the foot only and climbs while the stick pushes toward the ladder; **at the top she steps off by herself**; pushing away or jump lets go and she drops. Nothing attaches her from the floor above: walking into the opening, she falls through it. This replaces "away descends" and "walking toward the opening from the floor above attaches her at the top". Built in pass 1 of [`plans/backlog-passes.md`](plans/backlog-passes.md); owner play-test pending.

**Update (2026-10-13): ladders go up and down, and nothing moves her off them** (owner). Toward the ladder climbs, away climbs down; at the top she's held until she pushes any way but toward it, then **floats for 0.6 s** and has to walk onto the floor herself; jump is a jump; the ladder doesn't collide while she's above its foot. This replaces "up only", "pushing away lets go" and "at the top she steps off by herself" (owner: the fixed step-off "takes control from the player"; "she may fall back down if the player is not careful but that's acceptable"). Considered: keeping the step-off (what most third-person games do); an invisible floor over the opening; a smaller hatch (the floor would come 0.14 m nearer, and the opening is also the way down). Held at the top instead of let go on arrival: the stick she's still holding points at a wall. Plan: [`plans/features/movement-and-ladder.md`](plans/features/movement-and-ladder.md).

**Update (2026-10-12): a door that a keypad controls isn't offered itself** (owner: the side door opens only from its panel). The cargo ramp already worked this way. Built in pass 1.

**Update (2026-10-12): the prompt sits next to the target, instead of the highlight** (owner). The prompt is placed on screen beside the target's bounds, kept inside the screen's edges. The highlight is off by default; its slider stays until the owner has seen the prompt, then it goes with its shader code. Built in pass 1. *Update (2026-10-14):* the owner approved the prompt; the highlight's slider and shader code are removed.

**Update (2026-10-12): the roof hatch is one target** (owner). `Top Hatch` and `Top Hatch Bottom` were two doors; now aiming at either shows one prompt and one press moves both. The pair is listed in the code for now; a tag (`opensWith`) at the next export. Built in pass 1.

---

## [2026-10-09] — The rest of the ship: props, room lights, crew (prototype)

**Context:** The owner asked for the remaining objects of the ship file, its interior lights and Dr. Kaufman with her sitting idle. Imported as they are, the props would have taken the ship to ≈ 780 draw calls and ≈ 60 materials (budgets: 300 and 30), and the file has 15 area lights (budget: 4 small lights on at once).

**Decision (owner):** optimise what's simple now, skip anything complicated: small props merged per room at export, materials deduplicated, props don't cast shadows. Lights: one or two ambient lights per room (7 in all, one new in the cockpit), the 4 nearest her on; the other file lights flagged. Big props collide, small ones don't (to review with object interaction). The characters in the scene come in (Dr. Kaufman animated; Adam ×2 and Dr. Ogawa static), all visible all the time.

**Alternatives considered:** importing everything as is; the palette material now (a step of its own); all 15 lights; RectAreaLights.

**Rationale:** see the ship full now; the optimised pipeline (palette material) is planned for the measurement prototype.

**Status:** Built in prototype 01. See [`plans/features/ship-contents.md`](plans/features/ship-contents.md). Still over the draw-call and material budgets; shader build at load ~8 s.

---

## [2026-10-08] — Every camera angle in the ship should look good (design)

**Context:** Play-testing the see-through rules turned up edge cases where what's cut, or not, makes a bad picture.

**Decision:** Most of the game is spent in the ship, so every camera angle there should look good and interesting, even at the cost of extra work and per-object exceptions. Bad angles are expected in a third-person game and are mitigated as much as possible: by the see-through rules (what's cut), by exceptions where the rules and taste disagree (first one: the 3D printer stays, its frame and ray let her show through), and later by the camera itself.

**Alternatives considered:** general rules only, accepting some bad angles.

**Rationale:** the ship is where the player spends the game; its framing is part of the art direction.

**Status:** Decided. Applied in [`plans/features/see-through-rules.md`](plans/features/see-through-rules.md) (second pass).

---

## [2026-10-08] — See-through hull rules (feature)

**Context:** Step 3; the [plan](plans/features/see-through-hull.md) asked where to build it, what happens outside the ship, and how to treat the ceiling.

**Decision:**
- Built in prototype 01.
- **Inside** the ship: a capsule-shaped hole from the camera to Dr. Green's chest, dither-edged, through cuttable surfaces only; the ceiling is cut by the same capsule (no full cutaway, for now). Tune the radius to fix issues.
- **Outside:** no cut; normal camera collision.

**Alternatives considered:** cutting outside too, whenever the hull is in the way; hiding the ceiling entirely while inside (cutaway view).

**Status:** Built. See [`features/see-through-hull.md`](features/see-through-hull.md).

**Update (2026-10-08): cut everything inside the ship** (owner). Cutting only the hull, walls and tall furniture left the rest (seats, couch, table, consoles) floating in the hole, in the way. Now everything is cut except what's tagged `cuttable: false` (the ramp, the landing gear) and Dr. Green; props and other characters inside the ship will be cut too. The "never below her feet" rule now protects only upward-facing surfaces, so floors stay and furniture leaves no stubs (tagging floors was proposed first; the cockpit floor is part of a console object, so a name list would have missed walkable surfaces). Alternatives: clipping with the camera's near plane (cuts the floor behind her and slices the whole screen) or a material clipping plane (a dollhouse cutaway: a different look, no cheaper); both declined, the hole stays. Performance: one material copy per source material (29, was one per mesh) and shaders compiled while loading; no per-frame cost measured on the owner's PC, and the freeze after the ship appeared is gone.

**Update (2026-10-08): rules for what gets cut** (owner, planned in [`plans/features/see-through-rules.md`](plans/features/see-through-rules.md), not built yet). Cut only what hides something the player needs to see. Structure (hull, walls, ceilings, and anything on another deck) keeps the hole; furniture on her deck is cut only while it hides a protected target (Dr. Green, the ground under her, the way ahead, her look and interaction targets). **She always wins** over a look or interaction target. Fades with hysteresis instead of popping. Furniture look: a hole and a whole-object fade are both built for comparison. Alternatives: a list of exceptions by height and distance (the owner's first framing; the occlusion rule covers those cases). **Built 2026-10-08**, plus one rule found in testing: furniture *near the camera* (the first half of the way to her, tunable) is cut by the hole whether or not it hides her, because it fills the view.

**Update (2026-10-08): second pass** (owner play-test). "Hides her" became **coverage**: her head, or more than a third of her silhouette (12 points). Near the camera, furniture is cut only **above her waist**. The hole opens **only while something solid hides her** (glass doesn't count). **Exceptions** by tag: `seeThrough: "keep"` (the 3D printer: owner, its frame and ray let her show through and it frames the shot) and `divider: true` (bulkheads, optionally cut as a whole). Cut surfaces in their own colour, darkened. `three-mesh-bvh` brought in for the raycasts (15 ms → 0.2 ms per frame).

**Update (2026-10-08): dividers from inside** (owner). While the camera is inside the ship (no hull between it and her), dividers (bulkheads, inner walls) stay solid: from inside they're walls of the room or doorways that frame the shot. They're still cut when they hide her (added in testing: otherwise a camera trailing behind an inner wall saw only the wall). Next: exceptions move into a rule table in data (outline in the plan; implementation to be discussed).

**Update (2026-10-12): fixed camera distance, no zoom, pitch from 0** (owner). The camera keeps one distance indoors and one outdoors (two values in the tuning panel; starting at 3.5 m and 4.5 m, for the owner to set), eased over about half a second when she crosses the same "inside" test as the hole. Zoom is removed from the mouse wheel and the D-pad. The minimum pitch is 0 (was -10°): the camera never looks up from below her, which the owner found fixes several see-through problems. Built in pass 1 of [`plans/backlog-passes.md`](plans/backlog-passes.md); owner play-test pending.

**Update (2026-10-13): ladders go up and down, and nothing moves her off them** (owner). Toward the ladder climbs, away climbs down; at the top she's held until she pushes any way but toward it, then **floats for 0.6 s** and has to walk onto the floor herself; jump is a jump; the ladder doesn't collide while she's above its foot. This replaces "up only", "pushing away lets go" and "at the top she steps off by herself" (owner: the fixed step-off "takes control from the player"; "she may fall back down if the player is not careful but that's acceptable"). Considered: keeping the step-off (what most third-person games do); an invisible floor over the opening; a smaller hatch (the floor would come 0.14 m nearer, and the opening is also the way down). Held at the top instead of let go on arrival: the stick she's still holding points at a wall. Plan: [`plans/features/movement-and-ladder.md`](plans/features/movement-and-ladder.md).

**Update (2026-10-09): owner's test of exceptions.** Always visible on her deck (`seeThrough: "solid"`): every piece of furniture in the cockpit (first only the chair backs), the engineering ceiling machine, the red sled; still cut on the other deck. Objects attached to a bulkhead behave like the bulkhead (detected at load, within 3 cm). Then, as a test: **bulkheads always visible** while she's on their deck (a toggle, on by default; inner walls keep the divider rules). **The cargo ramp is cut while closed** (it's the cargo bay's back wall), never while open (it was never cut).

---

## [2026-10-08] — Ink for dialogue (tech)

**Context:** The dialogue language was open: Ink was proposed, Yarn Spinner was used in Part 1.

**Decision:** Ink, run in the browser with `inkjs`. One Ink story drives face-to-face dialogue, comm chats and barks, and holds the story state.

**Alternatives considered:** Yarn Spinner (Part 1); its official runtimes target Unity and Godot, and the JavaScript ports are less complete.

**Status:** Decided, after the owner's review of the docs. Still open: whether the Markdown scene docs or the Ink files are the master copy of the dialogue once implemented.

**Update 2026-10-21 (owner):** **Ink is the master copy** of the wording once a scene is in Ink. The scene's Markdown keeps the stage directions and notes. Answered in the dialogue plan's review ([`plans/features/dialogue.md`](plans/features/dialogue.md)).


*Update (2026-10-22, owner): the master copy for now.* While chapter 1 is built, **the owner writes in the scene files** (`doc/story/scenes/`) and the agent copies every change into the game's Ink word for word; the Ink isn't edited by hand. After the first scene is ready, the owner judges whether to write in Ink entirely (which the 2026-10-21 update assumed).
---

## [2026-10-08] — Inverted Y in prototypes, normal in production (input)

**Context:** The owner plays with inverted vertical look.

**Decision:** Prototypes default to **inverted Y**; production builds default to **normal**. Either can be changed in settings (prototypes: the tuning panel or the Y key).

**Status:** Done in prototype 01; rule in `CLAUDE.md` and [`architecture/prototypes.md`](architecture/prototypes.md).

---

## [2026-10-08] — No spoken dialogue; characters talk by nodding (scope)

**Context:** Voice acting was an open question in scope and audio. The owner also answered how characters move while talking.

**Decision:** No spoken dialogue: all dialogue is text. Characters have no mouth movement (no shape keys, no jaw): they talk by rotating their heads on the X axis, like nodding.

**Rationale:** owner's call. It keeps the download and production small, and suits the visual-novel side of the game.

**Status:** Decided. Scope, audio and the [characters plan](plans/architecture/game-architecture/characters.md#talking) updated.

**Update (2026-10-08):** the nod is **hand-animated**, one talk loop per character. A procedural nod (in time with the text box) was proposed; the owner doesn't think it's needed for now.

---

## [2026-10-08] — Prototype workspace built; TypeScript 6 (tech)

**Context:** The owner wants several prototypes built in parallel without affecting the main code ([plan](plans/architecture/repo-and-prototypes.md)).

**Decision:** Git repo at `The Zamboni/`; one npm workspace in `app/` with `packages/` (shared code, promoted on second use; `packages/ui` from the start) and `prototypes/NN-<slug>/` (one Vite app each, port 5200 + NN); shared assets in `app/assets/` (not `app/public/assets/` as first proposed). `CLAUDE.md` at the repo root carries the owner's rules for the agent. **TypeScript is pinned to 6.0.3, not 7**, because `svelte-check` supports only TypeScript 5–6.

**Alternatives considered:** a shared engine package from day one (rejected: guesses at what's shared before it exists); pnpm (an extra tool for no gain at this size).

**Status:** Built. See [`architecture/prototypes.md`](architecture/prototypes.md).

---

## [2026-10-08] — Platform, saving and performance targets (scope)

**Context:** The owner's review of the game architecture plan.

**Decision:**
- **Installable web app, playable offline:** the player can download everything at once.
- **Save / continue is Core:** checkpoint saves; props (books etc.) aren't tracked and reset on reload.
- **Performance targets:** 60 fps on the owner's PC (GTX 1070), **30 fps is acceptable** on the MacBook Pro 13" 2020 (Iris Plus G7). No Steam Deck target.
- **Hosting:** Vercel, probably.
- **Landing scenes:** 6 to 10, with some repeat locations; some have ruins, mostly unique models.
- **Characters:** the humans share a skeleton and some animations; each has several animations (run, walk, talk…).
- **Story levers:** the owner controls the story and script and is open to changing them to relieve performance issues; plans flag where that applies.

**Status:** Decided. Recorded in [`architecture/platform.md`](architecture/platform.md), [`architecture/scope.md`](architecture/scope.md), [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md); details in the [game architecture plan](plans/architecture/game-architecture/README.md).

---

## [2026-10-08] — Gamepad is the main input (scope)

**Context:** [`architecture/scope.md`](architecture/scope.md) listed keyboard and mouse as the input, and gamepad as a *Maybe*.

**Decision:** Gamepad first; keyboard and mouse supported as secondary. Every screen and menu must work with a gamepad, and button prompts follow the last device used.

**Rationale:** owner's call.

**Status:** Decided. Scope, stack, architecture, design and the prototype 01 plan updated.

---

## [2026-10-08] — Svelte 5 for the UI (tech)

**Context:** The UI layer (dialogue box, comm and its apps, menus, device screens) is large and stateful, and it's the code version of a Figma design system.

**Decision:** Svelte 5 (runes mode) with Vite, not SvelteKit, rendering an HTML/CSS overlay above the Three.js canvas. The 3D side stays plain Three.js. The design system's code version lives in a shared `packages/ui`.

**Alternatives considered:** React (most examples, and Figma's design-to-code output defaults to it, but it needs an external store and care to avoid re-renders next to a game loop); plain TypeScript DOM code (messy at this size).

**Rationale:** the owner's Eigodojo design-system pipeline (Figma ↔ Svelte components, gallery, visual tests) is proven; Svelte compiles away and plugs game state straight into reactive state.

**Status:** Decided. See [`architecture/stack.md`](architecture/stack.md).

---

## [2026-10-08] — A design system in Figma, with a code version (design)

**Context:** The game has a lot of interface: the dialogue box, the comm and its apps, menus, the HUD, and the screens of in-game devices (PCs, handhelds, ship displays).

**Decision:** One design system covers brand, game screen, interfaces and in-game devices. It's fully documented in Figma, with a code version the game uses. Workflow as in Eigodojo: Figma for mockups, Figma MCP + Claude Code for automation. Docs in [`design/`](design/README.md).

**Status:** Decided. Open: whether the code version uses a UI framework.

---

## [2026-10-08] — `doc/` goes in git: the whole project folder is the repo (pipeline)

**Context:** The first plan made only `app/` a git repo, which would have left the documentation without version history.

**Decision:** The whole `The Zamboni/` folder is the git repo, so `doc/` and `app/` are versioned together. `resources/` (source art) is ignored. Not initialised yet; that happens at repo setup.

**Alternatives considered:** a separate repo for `doc/`; keeping `doc/` inside `app/`.

**Rationale:** owner's call. One repo keeps the docs and the code they describe in the same history.

**Status:** Decided. Updates the "Source art stays out of git" entry below.

---

## [2026-10-08] — In-world name: comm, not phone (docs)

**Context:** The owner noted that smartphones are called **comms** in the game world (recorded in [`story/world.md`](story/world.md)).

**Decision:** Docs and code use *comm* for the device and its chat feature (`Comm` system, `comm/` code folder). "Comms" also keeps its other meanings in the script (the crew's radio channel); a word with several meanings, by design.

**Status:** Done in the docs.

---

## [2026-10-08] — Documentation structure (docs)

**Context:** The project needs full documentation, modelled on how the owner's Eigodojo project was documented, but without Eigodojo's product-design phases (research, define, ideate…) and without documenting the workflow itself.

**Decision:** The structure in [`README.md`](README.md): a game overview, a decision log, open-ended numbered **steps** instead of fixed phases, `architecture/`, `features/` (one plan per feature), `story/` (overview, cast, storyline, one file per scene), `reference/` for prior work, and `_archive/`. The original `HANDOVER.md` was split into these files and archived; the story document copied from Google Docs (`the-zamboni.md`) was split into `story/`.

**Alternatives considered:** Eigodojo's 10 fixed product phases. Not used: this isn't a product-design process, and the work is open-ended.

**Rationale:** one file per natural unit is easy to find, link and keep current; steps can be added as the project grows.

**Status:** Done.

---

## [2026-10-08] — Source art stays out of git (pipeline)

**Context:** The source art (Blender files, textures, PSDs, reference) is about 1.1 GB and binary.

**Decision:** The git repo (`app/`) holds only source code and production assets (exported glTF, game-ready audio). Source art lives in `art/`, outside git. Material from earlier versions stays in `The Zamboni.archive` and is copied over only when needed.

**Alternatives considered:** Git LFS for source art.

**Rationale:** owner's call: keep the repo for code and what ships.

**Status:** Decided. See [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md).

**Update (2026-10-08):** the owner renamed `art/` to `resources/`. And the repo is now the whole `The Zamboni/` folder, not just `app/`, so `doc/` is versioned too; `resources/` stays out of git (entry above).

---

## [2026-10-08] — Engine: plain Three.js r186 with TSL (tech)

**Context:** The UE 5.7 prototype is Blueprint-only and binary, which works against a workflow where an AI agent writes most of the code. The owner wants the project in text files, web delivery was attractive from the start, and the game needs third-person movement, indoor and outdoor areas.

**Decision:** Plain Three.js (no React Three Fiber) with TypeScript, `WebGPURenderer` and TSL for shaders, pinned to `three@0.186.1` exactly. Upgrades are deliberate, one release at a time, after reading the migration notes.

**Alternatives considered:**
- **Godot 4.** Real visual editor and lightmapping; text scene files. Ranked lower for agent work: Godot 3/4 API mix-ups, error-prone hand edits of `.tscn`, harder for the agent to see the running game.
- **Babylon.js.** More built in (physics, character controller, audio), strong backward compatibility; fewer examples to draw on.
- **PlayCanvas, Needle Engine, Wonderland Engine, Bevy.** Cloud-hosted editor projects, an add-on layer over Three.js, small XR-focused community, or no mature editor and harder for an agent, respectively.

**Rationale:** Three.js has the most training data and examples, everything is code, and the agent can run the game in a browser and check screenshots and console errors itself. TSL is newer and has fewer examples; pinning the version and pointing the agent to the r186 examples in `node_modules/three/examples` (`webgpu_*`) limits the risk.

**Status:** Decided. See [`architecture/stack.md`](architecture/stack.md).
