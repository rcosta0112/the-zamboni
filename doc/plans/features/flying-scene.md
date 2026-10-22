# Plan: the flying scene (chapter 1), and the landing cutscene into today's scene

**Status:** *approved* (owner, 2026-10-22: "anything not addressed is approved", after three rounds of review the same day). Backlog item 77. **Pass 0 (topics) is first.** The owner's work is in two companion docs: [**the Blender tasks**](flying-scene-blender.md) (the animations, the kit file and how to set it up, the coffee's models) and [**the script tasks**](flying-scene-script.md) (the lines to write, and how the story's Ink is laid out).

## Goal

A new scene **before today's**: the Zamboni flying low across an icy plain, Dr. Green taking a break from the copilot's seat, walking round the ship, talking to the crew, pouring a coffee and carrying it, and going back to her seat. Then **a cutscene** (the landing), and today's scene starts. Every interaction is kept in the save.

## Scope

- **In:** topics in conversations (pass 0); the flying scene's setup (the crew, their loops, the outfits, the flight rules and what she says about them, the ship's noise); the scene's loop and its end (Dr. Ogawa's conversation and the coffee required); **a room she walks into runs a knot** (a new kind of event); the coffee (its own pass); the scenery going by; the kit file and its export; the landing cutscene with the exterior swap; the save.
- **The order of the game for now** (owner, 2026-10-22; no storyline defined yet; [scenes README](../../story/scenes/README.md)): NEW GAME → 1. cutscene 1, the ship flying over the plain ([`01-cutscene-flight.md`](../../story/scenes/01-cutscene-flight.md)) → 2. cutscene 2 ([`02-opening.md`](../../story/scenes/02-opening.md)) → 3. **the flying scene** ([`03-chapter-1.md`](../../story/scenes/03-chapter-1.md)) → 4. cutscene 3, the landing ([`04-cutscene-landing.md`](../../story/scenes/04-cutscene-landing.md)) → 5. the ship has landed (today's prototype). Cutscenes 1 and 2 are **the animatic**; it ends with her in her seat.
- **Out:** making the animatic itself (a stand-in card in its slot, skippable); barks; *make coffee* (the owner's nice-to-have, later); the owner's cutscene tooling in Blender ([game structure](../architecture/game-architecture/game-structure.md), *For the cutscenes*); the landing site's art (today's ground stays); the other terrains' art (the code is ready for them).

## Constraints from the docs

- **Story content is the owner's** (CLAUDE.md rule 1, made precise 2026-10-22): tags and comments for testing or development may be added to the script files; the dialogue's copy is never edited, and no new copy is added unless clearly marked as a comment. A line not written yet shows in the game as a placeholder, marked `[Placeholder]` on screen.
- **The game's structure** ([plan](../architecture/game-architecture/game-structure.md)): scenes are data; anything saved lives in Ink; one set of commands; a cutscene declares its end state, which matches the next scene's setup; no save mid-cutscene; the exterior swap is an event on the landing cutscene's track.
- **Levels** ([levels](../architecture/game-architecture/levels.md)): the ship is never unloaded; the exterior slot holds the travel terrain *or* a landing site; the travel terrain is a kit, the terrain itself generated.
- **Sitting is an animation, like the ladder** (decision log, 2026-10-21; owner, 2026-10-22: option A, animated in Blender).
- **The save rule** (decision log, 2026-10-22): no action repeated unless the story asks.
- **One material per material colour** (decision log; made precise 2026-10-22) and **the pipeline count** ([faster load](faster-load.md): 78): the scenery adds few materials.
- **Gamepad first; 0.0.2 only.**

## What the owner decided (2026-10-22)

**The ship in flight**
- **The flight rules, on every flight scene in the game:** whenever the ship is flying, **the outer doors and hatches** (the cargo ramp, the side door, the roof hatch) and their keypads are locked: *"It's not safe to open that right now."* (one line for all, variations perhaps later); **the jetpacks**: *"I don't need that right now"*; **her parka**: *"it's too warm for that in here"*. The inner doors work as today. Kaufman's and Ogawa's lockers keep their lines. (How: [below](#the-flight-rules).)
- **The viewport** (the window in engineering: its name from now on) is open; its lever works.
- **The pilot sits on the left.** By the cockpit doors' sides, `Seat` (left, Adam Blue's today) is the pilot's and the empty `Seat.001` (right, id `cockpit-seat-pilot` today) is **hers**: its id becomes **`cockpit-seat-copilot`** (pass 1, a script renaming it and every reference). The owner moves Adam.
- **The crew:** Adam Red flying (pilot's seat), Adam Blue in the navigator's seat, Dr. Kaufman reading a book in the crew quarters, Dr. Ogawa in engineering working on **the sensor array** (the contraption on its ceiling). Their jumpsuits are on in 1.22. No penguin yet. Their loops: [the animation list](flying-scene-blender.md#the-animations).
- **Engineering is also the lab** (Dr. Kaufman's work); both names in dialogue, *engineering* everywhere else.
- **The ship's noise:** on. Its two sounds are **mixed into one file** (pass 1: at today's levels, a clean loop seam, from the masters in `resources/` if there; one file in `cues.json`).
- **The rest as today:** the boombox, displays, lights, the sun and the weather. The landing gear isn't seen from inside: nothing in flight (moved by hand for the cutscene if a shot shows it).

**The scene's loop and end**
- She **starts sitting** in her seat; Adam's line, *Get up*, her line; **she gets up** (animated). She walks round, talks to whoever she likes (topics), and must **talk to Dr. Ogawa** and **have a coffee** before she can sit: *"I want to ask Dr. Ogawa about the signal."*; the no-coffee line is the owner's to write. Then **she sits down** (animated) and the landing cutscene plays.
- **Continue in the middle:** she starts standing by her seat, the opening exchange skipped, everything done kept.
- **The landed scene** starts with her where today's prototype puts her, for now (it may change with the landing cutscene).
- **Scene ids:** `chapter-1`; today's test scene `opening` becomes **`landed`** (`opening` is cutscene 2's name).
- **The landing cutscene:** a placeholder from the owner's short description in `04-cutscene-landing.md`.
- **The animatic** (cutscenes 1 and 2): a stand-in card until it exists, skippable, never shown twice.
- **The story's text** goes into a real story file of its own (not the test story, which stays for the checks). **The owner keeps writing in the scene files; the agent copies them into Ink** word for word; after the first scene is ready, the owner judges whether to move to Ink entirely ([the script tasks](flying-scene-script.md)).

## The flight rules

The same on every flight scene, so they belong to **the ship flying**, not to each scene's setup:

- A scene with `travel` (the ship is flying) gets them by itself: the game **locks** the outer doors and hatches, their keypads, the jetpacks and her parka, and sets the Ink variable **`ship_flying`**. Which things they are is one list in the ship's data (by id and kind), written once.
- **`lock` works on any interactable** (today: doors only): while a thing is locked, its `use_<id>` knot runs instead of its action. The jetpack's and the parka's knots then need no condition; the outer doors' knots check `ship_flying` (they can be locked for other reasons).
- `npm run check` learns which kinds `lock` acts on.

## The new kind of event: a room she walks into

**Approved** (owner, 2026-10-22, on condition that the story can tell where she came from: it can).

- **The event:** when her room changes, the game runs **`enter_<room>`** (`enter_crew_quarters`) if the story has one. The rooms: the cockpit, the crew quarters, engineering, the cargo hold (`ROOMS` in `ship.ts`), and **outside**. A room changes only once she's wholly in the next one (no flicker in a doorway).
- **Where she came from:** before the knot runs, the game sets two Ink variables:
  - **`came_from`**: the room she left (`cockpit`, `crew_quarters`, `engineering`, `cargo_hold`, `outside`). That alone tells apart the crew quarters' two ways in (from the cockpit, or up the ladder from the cargo hold).
  - **`came_via`**: the opening she came through, by id (the door, hatch or ladder nearest where she crossed). That tells apart two ways in from the same room: the cargo hold's ramp and side door (both from outside), and the others.
- Ink decides the rest (once only, only before the coffee…) and counts visits for the save. The remark shows **in the dialogue box** (approved).
- **Later, if needed:** trigger boxes from the ship file for spots smaller than a room.

## The coffee (its own pass)

The owner will add details before the pass. **The basics (owner, 2026-10-22):** pour a coffee at the galley; walk round holding the mug; sips at random; **a comment after the first sip**. *Make coffee* (brewing it) is a nice-to-have, later.

- **The coffee maker** is in the galley; **its pot** is the owner's, ready ([Blender tasks](flying-scene-blender.md#the-coffee)). The maker gets an id and a kind (`coffee-maker`).
- **Pour coffee** (the prompt): she pours (the owner's animation), and the mug is in her hand.
- **Holding the mug:** the mug attached to her hand's bone; her arm held by an **upper-body layer** (the owner's *holding* pose, masked to the arm's bones) over her walk, run and idle.
- **Sips at random:** every so often (about 8–20 s, tunable) while she walks or stands, not while she runs, jumps, climbs or talks: the owner's *sip* animation on the same layer.
- **The first sip:** her comment (the owner's line) in the box.
- **The save:** `green_coffee` (`none`, `holding`, later perhaps `finished`) kept with her (`KEPT`), so a reload gives her the mug back. *Had the coffee* for her seat = poured.
- **Flags for the owner's details:**
  1. **The ladder takes both hands.** Options: the mug hidden during the climb (cheap; recommended for now), she can't climb holding it (a line), or a one-handed climb (the owner's animation). Dropping through the floor hatch with the mug is the same question.
  2. **When it ends:** does she keep the mug until she sits (it goes in a cup holder?), or is it finished after some sips (then what: the mug put down, or it vanishes)?
  3. **Which mug:** one of the galley's (`Mug.005`…), or a new one with the pot.
  4. **Talking with the mug:** kept in her hand (proposed).

## How the scenery works

**Option A, a treadmill with a recycled pool** (approved). **The ship never moves:** everything aboard is built in the ship's space; the world moves past it.

- **The ground:** one big plane, its snow pattern scrolled in the shader.
- **The scatter:** a few meshes, each an `InstancedMesh` of many copies; they slide back at the ship's speed, and **one that passes the rear edge is moved to the front** with a new random place, turn and size. Nothing is created or destroyed while the scene runs (no spawn system needed; one-off set pieces later by a `flyby` command, defined only).
- **The look, from the owner's reference video** (`resources/media/Video/The Zamboni 1-04 Cycles-Audio-1.mp4`, frames seen 2026-10-22): a flat white-blue snow plain, **ice boulders** scattered evenly (small faceted chunks, a few bigger), **each with a long, sharp blue shadow** (low sun), the ship flying **low**, a few metres up, its shadow on the snow; a light cyan haze at the horizon; no clouds in the shots.
- **Low, not high** (owner): the numbers don't matter, the look does. Start: the ship's belly about 6 m above the snow, about 40 m/s; both in the tuning panel. Flying low, the near band shows through the windows: the scatter reaches up to and under the ship.
- **Clouds: just above** the ship (owner), sparse, with their shadows on the ground.
- **The boulders' shadows:** the sun doesn't move and the ground is flat, so **each boulder's shadow is its own mesh flattened onto the ground along the sun's direction** (a second instanced draw of the same mesh, dark blue, unlit). Sharp and exact like the video's, at any distance, with no shadow-map cost. The ship keeps its shadow from the shadow map (it's close to the ground).
- **The cost:** one ground plane, two draws per boulder mesh (it and its shadow), a few cloud cards; about two new materials. Measured in pass 4 against the 60 fps target.

### Terrains as data

**More terrains will come** (owner, 2026-10-22): a rocky plain with distant mountains, green plains, the ocean. The treadmill is one piece of code; **a terrain is a data file** (`public/terrain/<id>.json`):

| Layer | What | Icy plain | Rocky plain | Green plains | Ocean |
|---|---|---|---|---|---|
| **Ground** | the surface below, scrolled: one shader per surface type | snow | rock, gravel | grass | water |
| **Scatter** (any number) | pools of instanced meshes (meshes, count, band, sizes, sink), each with its flattened shadow | ice boulders | rocks | bushes, trees, rocks | icebergs, or none |
| **Backdrop** | far shapes passing slowly on the horizon | none | **mountains** | hills? | none |
| **Clouds** | a cloud pool and its shadows | just above | | | |
| **Haze** | colour and distance (hides every edge) | light cyan | | | |

The scene names its terrain: `"travel": { "terrain": "ice-plain" }` (speed and height from the terrain, a scene may override). One file per terrain (`terrain-<id>.glb`), only the current one loaded. A change of terrain on the way is defined, built when a scene needs one. Pass 4 builds every layer and the icy plain only.

### A sway: in the cutscene only

**No sway indoors** (owner, 2026-10-22: not needed; it could make some players nauseous). **Tried in the landing cutscene's placeholder exterior shots** instead: the ship itself rolls a little and rises and falls, slowly, as authored motion on the track (no risk of sickness there). Kept if it looks right.

### Set up in Blender

**A kit file of its own that links the ship** (approved): the file, its collections, the link, the naming and what the export expects are in [the Blender tasks](flying-scene-blender.md#the-kit-file-how-to-set-it-up). The pass after the placeholders builds `npm run export:terrain`.

## The scene in data (a sketch)

```json
{
  "location": "ship",
  "travel": { "terrain": "ice-plain" },
  "player": { "seat": "cockpit-seat-copilot" },
  "setup": [
    { "do": "outfit", "id": "green", "state": "jumpsuit" },
    { "do": "set", "id": "engineering-window-left", "state": "open" },
    { "do": "place", "id": "ogawa", "mark": "engineering-sensor-array", "loop": "ogawa_work" }
  ]
}
```

`travel` turns on the treadmill, the ship's noise and the flight rules. `place` takes a **mark** (an empty in the ship file with an id: the owner places the crew in Blender) and a **loop** (the character's action for the scene). The ids are guesses until built.

## The work, in passes (a stop to assess after each)

A **big task** (CLAUDE.md rule 5): about 20 hours of agent work over seven passes, plus the owner's art and lines. Budget at 7.6% of the weekly limit (2026-10-22); checked before each pass.

**Pass 0: topics in conversations (about 2–3 hours).** As in the [dialogue plan](dialogue.md#topics-owner-2026-10-22) (approved). *Check:* its probe.

**Pass 1: the ship in flight (about 3 hours).** The real story file and its placeholders; the scene `chapter-1`; `opening` renamed `landed`; the seat's id (a Blender script: scratch copy first, the save announced, a backup; `export:ship`); `travel` and the flight rules (`lock` on any interactable, `ship_flying`); the viewport open; the ship's noise as one file; the jumpsuits; the crew at marks with their loops (dialogue pass 3 folded in: the crew export takes one loop per character per scene, and the talk layer; stand-ins until the owner's actions); NEW GAME → the animatic's stand-in → `chapter-1`. *Check:* a probe starts the scene, tries each locked thing and reads its line, reads the ship's noise, the crew's places, her outfit.

**Pass 2: the loop and its end (about 3 hours, with the owner's sitting animations).** Her start in the seat, *Get up*, the stand-up and sit-down played like the ladder's climb; the conversations (the owner's lines, placeholders where none); `enter_<room>` with `came_from` / `came_via`; her seat's refusals in order and the end; the cutscene started (the test one standing in); the save after each step and *Continue* mid-scene. If the animations aren't ready, the rest goes first and the seat last. *Check:* a probe plays the scene through and reloads in the middle.

**Pass 3: the coffee (about 3–4 hours, after the owner's details, pot, mug and animations).** As [above](#the-coffee-its-own-pass). *Check:* a probe pours, walks, waits for a sip, reads the first-sip comment, reloads and finds the mug in her hand.

**Pass 4: the scenery, placeholders (about 3–4 hours).** The treadmill, terrains as data with every layer, the icy plain with boulders made in code, the flattened shadows, the clouds, the haze. *Check:* screenshots through the cockpit windows and the viewport, compared with the reference video's frames; the frame time against today's; the heap steady over a minute.

**Pass 5: the kit from Blender (about 2 hours).** **Remind the owner at the start: their ice-boulder set is ready** (owner, 2026-10-22). The kit file linking the ship, `export:terrain` with its gate, the placeholders replaced. *Check:* the export's summary; the same screenshots.

**Pass 6: the landing cutscene (about 3 hours).** From the owner's description: the ship's sway tried in its exterior shots; the treadmill slowing and the ground rising to the ship (the ship still doesn't move), the exterior swap (travel → today's ground: the stub built), the end state equal to `landed`'s setup, the checkpoint at its end, *skip*. *Check:* a probe plays it, skips it and compares its end with `landed`'s start.

**After all seven:** the smoke script once; the owner plays from NEW GAME to the landed ship.

## Done when

- Each pass: its probe, `npm run check`, `npm run build`; the owner plays it at http://localhost:5202/.
- The whole: NEW GAME → the animatic's stand-in → in her seat → get up → walk round, the outer doors refused, the coffee remark → coffee, held, sipped → Ogawa → sit → the landing → the landed scene; a reload at any point keeps what she's done.

## Still open (none blocks pass 0)

- **The owner's:** the lines ([script tasks](flying-scene-script.md)); the animations and models ([Blender tasks](flying-scene-blender.md)); (settled 2026-10-22: Adam Blue navigating, Dr. Kaufman reading on the couch, Dr. Ogawa standing at the sensor array); the coffee's details (the four flags above); the landing cutscene's description.
- **For later:** what the animatic is in the game (video, stills, in-engine).

> **Story lever** (CLAUDE.md rule 5): the landing cutscene hides the swap from the travel scenery to the landing site. Today's ground costs nothing to load; a landing site with its own models would need the flying scene to cover its download (about 10 s on a slow connection: one conversation does). If the scene ever becomes very short, the download shows.

## After

- `features/` pages for what exists: the flying scene (the treadmill, terrains, flight rules), the room event and topics in `features/dialogue.md`, the coffee and `lock` in `features/interaction.md`.
- `architecture/asset-pipeline.md`: the kit file, its link to the ship, `export:terrain`; [levels](../architecture/game-architecture/levels.md): the travel terrain as several terrains, one file each.
- The game structure plan's commands (`travel`, `lock` on any interactable, `place` with marks and loops, `flyby`, the swap built); the code map; `tools/README.md`; the decision log (the treadmill and its flattened shadows; the kit file linking the ship; room events; the flight rules).
- **The viewport** is the name in the docs; the ids (`engineering-window-left`…) keep theirs unless the owner wants them renamed.
