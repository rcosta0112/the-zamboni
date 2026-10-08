# Architecture

**Status:** *draft*, Step 1 ([`../steps/01-docs-and-architecture.md`](../steps/01-docs-and-architecture.md)). The engine choice is decided; everything else here is the proposed shape of the game, to be confirmed.

How the game is put together: its modes, its systems, where content lives and how the files are laid out. Related: [`platform.md`](platform.md) (delivery, targets, test machines), [`stack.md`](stack.md) (engine and libraries), [`scope.md`](scope.md) (what's in and out), [`asset-pipeline.md`](asset-pipeline.md) (art to engine), [`audio.md`](audio.md) (sound).

## Principles

1. **Everything is text.** Code, story, dialogue, item and scan data are text files the agent can read, change and compare. Binary files are only exported assets (glTF, audio, textures).
2. **Content lives in data, not code.** The owner writes story, dialogue and item data; the code reads it. Adding a scene, an item or a scan target shouldn't need a code change.
3. **Art drives behaviour through names.** Objects exported from Blender are recognised by name and custom properties (`interact: door`, …). See the naming contract in [`asset-pipeline.md`](asset-pipeline.md).
4. **Small playable steps.** Each feature is built, played, adjusted, then the next.

## Game modes

The game is always in exactly one mode. Modes decide what input does and which systems run.

```
            ┌──────────── cutscene ends ────────────┐
            ▼                                       │
Title ─▶ Travelling ──── cutscene: landing ────▶ Cutscene ◀─── story trigger
            ▲                                       │
            └── cutscene: take-off ◀── Landed ◀─────┘
                                         │
             Dialogue / Comm / Pause are overlays
             on top of Travelling or Landed (the world pauses or slows)
```

| Mode | World | Player control | Notes |
|---|---|---|---|
| **Travelling** | Ship interior; the planet scrolls past outside the windows | Walk inside the ship, interact, talk, use the comm | The ship stays still in world space and the terrain, sky and lighting move around it. That avoids running physics on a moving platform |
| **Landed** | Ship interior + a bounded outdoor area | Everything above + walk outside, backpack, scanner | Trigger volumes switch between *indoor* and *outdoor* (camera and see-through hull rules change) |
| **Cutscene** | Any | None (skip, maybe) | Plays an authored timeline. See "Cutscenes" below |

**Outdoor boundary:** a soft ring (crossing it triggers a bark such as *"I shouldn't get too far from the ship"* and a nudge back) and, further out, a hard ring of invisible colliders.

## Systems

| System | Responsibility | Built on |
|---|---|---|
| **Loader** | Loads each area (ship, landing sites) as glTF, progressively, with compressed geometry and textures | Three's `GLTFLoader`, Draco/Meshopt, KTX2 |
| **Player controller** | Third-person character movement, stairs, ladders, collisions | Rapier kinematic character controller |
| **Camera** | Third-person follow camera, collision, indoor/outdoor rules, cutscene takeover | `three-mesh-bvh` raycasts |
| **See-through hull** | Cuts away what hides the character from the camera: walls and other decks by a hole, furniture only while it hides her | TSL material node. Doc: [`../features/see-through-hull.md`](../features/see-through-hull.md); next: [rules plan](../plans/features/see-through-rules.md) |
| **Interaction** | Finds what the player is looking at or near, shows a prompt, runs the verb: *pick up*, *use*, *open*, *talk*, *scan* | Data from glTF custom properties |
| **Physics objects** | Small objects that can be picked up, carried, dropped, thrown | Rapier rigid bodies |
| **Devices** | Objects with their own behaviour: boombox, doors, lockers, levers, ship controls, screens | One small class per device type, configured from data |
| **Dialogue** | Runs the Ink story; hands lines and choices to a presenter | `inkjs` |
| **Presenters** | Show dialogue in the right form: VN box (face-to-face), comm chat, barks (one-liners above the character), subtitles (cutscenes) | Svelte UI overlay |
| **Comm** | The in-world smartphone: a home screen with app icons. Apps: chat (runs dialogue), mission data (wildlife, ruins and artifacts), camera (nice-to-have); room for more | Svelte UI overlay + Dialogue + Mission data |
| **Scanner + mission data** | Scanning ruins and artifacts adds entries to the mission data (a store of what has been documented, read by the comm's mission data app) | Data files + story state |
| **Backpack** | The jetpack used outside: camera-relative flight, as prototyped in Part 1 (see [`../reference/big-moon-tiny-moon.md`](../reference/big-moon-tiny-moon.md)) | Player controller extension |
| **Cutscenes** | Plays authored timelines: camera and character animation from Blender, plus events (dialogue lines, sounds, mode changes) | Three's `AnimationMixer` + event track from data |
| **Story state** | Flags and progress (what's been scanned, who's been talked to, chapter) | Ink variables are the single source of truth; the world reads them |
| **Audio** | Music, ambience, positional sound effects, UI sounds, mix buses | Web Audio. See [`audio.md`](audio.md) |
| **Save** | Checkpoint saves: story state, mission data, chat history; props reset on reload ([`platform.md`](platform.md)) | Ink state JSON in IndexedDB. Scope: see [`scope.md`](scope.md) |
| **Input** | Actions (move, look, jump/fly, interact, comm, pause…) mapped to the **gamepad (primary)** and keyboard/mouse (secondary); button prompts follow the last device used | Gamepad API, browser events |

> **[Agent note]** For the Camera system, from the owner (2026-10-08): **most of the game is spent in the ship, so every camera angle there should look good and interesting**, even if it takes a lot of extra work and exceptions. Bad angles will happen in a third-person game; mitigate them as much as possible. The see-through rules ([plan](../plans/features/see-through-rules.md)) handle what's cut; the camera itself avoiding bad angles (sliding along walls, not passing behind lockers, preferred angles per room) is still to be planned.

> **[Agent note]** For the Interaction system, from the owner (2026-10-08), to work out when Interaction is planned: **Dr. Green turns her head to look at interesting objects and people** as she walks past them. What counts as "interesting" is still to be defined, probably a per-object checkbox decided case by case (a custom property, e.g. `lookAt: true`). Objects she's looking at, inside her field of view, should be fully visible: the see-through rules keep a protected "look target" slot for this ([rules plan](../plans/features/see-through-rules.md)). If a look target hides her, she wins and the target is cut.

## Cutscenes

**Preferred: in-engine.** Each cutscene is animated in Blender (camera, characters, ship) as actions on a single timeline and exported to glTF; the engine plays it with `AnimationMixer`. A small data file per cutscene lists timed events: dialogue lines (shown as subtitles), sounds, music cues, and the mode to return to. In-engine cutscenes match the game's look, cost nothing in download size and can be re-cut quickly.

**Fallback: pre-rendered video** for shots the engine can't do well (very large vistas, heavy effects). Played full-screen as an `<video>` element. Costs download size and a visible change in look, so use sparingly.

## Content and data

| Content | Format | Authored by | Read by |
|---|---|---|---|
| Story script (human-readable) | Markdown, [`../story/scenes/`](../story/scenes/README.md) | Owner | People; the source for the Ink files |
| Dialogue and story logic | Ink (`.ink`), compiled to JSON at build | Owner + agent | Dialogue system |
| Items, devices, scan targets, tuning values | JSON (or YAML) | Owner + agent | Game systems |
| Levels and placement | Blender → glTF, custom properties for behaviour | Owner | Loader, Interaction |
| Cutscenes | Blender animation → glTF + JSON event track | Owner + agent | Cutscene player |

**Story docs vs runtime dialogue:** the scene Markdown files are the authored script, with stage directions and notes. The Ink files are what the game runs. When a scene is written in Markdown and then implemented, it's converted to Ink, and the Ink file becomes the version that counts for exact wording. *(Proposed: confirm whether Markdown or Ink is the master once dialogue is being implemented.)*

## Folder layout

```
The Zamboni/              git repo root; resources/ is ignored
  CLAUDE.md               instructions for the AI agent
  app/                    the code: one npm workspace (see prototypes.md)
    packages/ui/          the design system's code version (Svelte 5)
    packages/…            shared code, promoted from prototypes on second use
    prototypes/NN-<slug>/ one Vite app per prototype
    game/                 the main game (later)
    assets/               production assets: exported glTF, textures, audio
  resources/              source art, not in git (see asset-pipeline.md)
  doc/                    this documentation
```

How the code inside the game will be organised (core, world, player, interaction, dialogue, comm, scanner, cutscenes, audio, render, ui; content in Ink and JSON) is outlined in the [game architecture plan](../plans/architecture/game-architecture/code.md) and will be documented here once the game itself is started. Workspace rules and naming: [`prototypes.md`](prototypes.md).

## Open questions

- Markdown or Ink as the master copy of the dialogue once implemented?
- Does the travelling ship need to visibly move relative to its interior (turbulence, banking)? The "ship stays still, world moves" approach handles gentle motion with camera shake; bigger motion needs more thought.
