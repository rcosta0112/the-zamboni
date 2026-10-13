# Plan: audio from the UE prototype (backlog pass 4.5)

**Status:** *built* 2026-10-13 (approved the same day, with the owner's answers folded in: *Decided*, 6 to 9, and the boombox's one action in stage 6). What exists: [`audio.md`](../../architecture/audio.md#what-exists-prototype-01-2026-10-13), [`interaction.md`](../../features/interaction.md#the-boombox). What differs from the plan, and what wasn't checked: *As built*, below. Backlog item 24, pass 4.5 of [`../backlog-passes.md`](../backlog-passes.md). The inventory it's built on: [`../../reference/ue-prototype.md`](../../reference/ue-prototype.md#audio-read-2026-10-13).

## Decided (owner, 2026-10-13)

1. **Where the prototype's sound belongs to something that can't be used in the game yet, the interaction is added** (the boombox).
2. **The two plane sounds are the ship's background noise**, for when the ship is flying.
3. **Every file is a placeholder.** Licensing isn't raised again until a production-ready build; then the owner is reminded of everything that was missed.
4. **There are no better copies** of the 22 kHz, 8-bit files: they're used as they are.
5. The Starter Content sounds and the Mixkit sounds are kept in `resources/audio/`, each in a folder of its own. They have no event in the prototype, so they aren't in the game.
6. **The two plane sounds are meant to be mixed into one ship noise**: the idea was a single file, later. Until then the game plays both together.
7. **The boombox has no *Stop***, and no interaction in the game has more than one option. The agent was asked for an alternative, and the owner approved it: one action that steps round a ring with *off* in it (stage 6).
8. **The boombox is listed by name in the code** for now, and tagged at the next export.
9. **The flight sound is streamed whole.**

## Goal and scope

Prototype 01 plays what the UE prototype played, from the same events.

- **In:** eight sounds (door, cassette, four boombox tracks, the two that make the ship's noise); the code that plays them (cues, buses, sounds placed in the world); the boombox as something she can use; a way to hear the flight sounds.
- **Out:** anything UE didn't have: footsteps, the hinged doors, the keypads, panels and lever, the ladder, UI sounds. A volume screen for the player. Sound muffled by a closed door. The ship actually flying.

## Constraints from the docs

- [`audio.md`](../../architecture/audio.md) is *open for discussion*. This plan follows it where it can and turns three of its proposals into things that exist: the file format, cue ids in data, mix buses. Its *to verify in the first audio step* (loops in compressed files) is stage 2.
- **Conflict: [`audio.md`](../../architecture/audio.md) says "nothing ships without an entry" in a license register**, and prototype 01 is deployed. Settled by *Decided*, 3. A list of each file's source is still kept (stage 1): it's what the reminder will be made from.
- **Test-only assets go in `app/assets/test/`** (workspace rules): placeholders are test assets, so the files go in `app/assets/test/audio/`, not `app/assets/audio/`.
- **Promote on second use:** the audio code stays in prototype 01 (`src/audio.ts`).
- **Art drives behaviour through tags, not name checks** ([`architecture/README.md`](../../architecture/README.md)): the boombox needs `interact` and `device: "boombox"` on `Boombox.001`. See *Options*, B.
- **Gamepad first:** see *Risks*, the first one.
- **Masters live in `resources/audio/`**, outside git ([`audio.md`](../../architecture/audio.md)). Its "48 kHz, 24-bit" can't be met by these files.

## Already done (2026-10-13, no game code)

- **The plane sounds were extracted from their `.uasset` files**: mono, 22 kHz, 16-bit, 1:34 and 7:05. UE keeps the imported wav inside the asset, compressed with Oodle; the library comes with UE 5.7.
- UE's own copies of the door, cassette and music files are the same 8-bit sound widened to 16-bit with a broken header: nothing gained, so the archive's wavs are used.
- Copied into `resources/audio/`: `ue-prototype/` (the eight sounds), `ue-starter-content/` (birds, two winds), `mixkit/` (arctic winds, rocket turbine). The eight wavs that were at the folder's top, identical to these, are deleted (owner).

## The work

1. **Files.** A script (`app/tools/encode-audio.mjs`, with ffmpeg) turns the eight masters into game files in `app/assets/test/audio/`, named as [`audio.md`](../../architecture/audio.md) proposes, with a `SOURCES.md` beside them (file, where it came from, author where known).

   | Game file | From | Kind |
   |---|---|---|
   | `sfx_door_slide.m4a` | `244491416_nw_prev_01` | mono, one-shot |
   | `sfx_boombox_cassette.m4a` | `cassette-ffww-cassetera-96765_01` | one-shot |
   | `mus_boombox_01.m4a` … `_04.m4a` | the four tracks, in the order UE's Blueprint lists them | stereo, streamed |
   | `amb_ship_noise_a_loop.m4a` | `plane_cessna152_flight-52790_01` (7:05) | mono, loop, streamed |
   | `amb_ship_noise_b_loop.m4a` | `plane-landing-23118_01` (1:34) | mono, loop, streamed |

   AAC, about 64 kbit/s for the music (the source is 22 kHz): roughly 7 MB for the four tracks, in git.
2. **Loops.** Check that the two `amb_ship_noise` files repeat with no gap or click in Chrome, Firefox and Safari's engine if one can be tested. If AAC adds silence at the ends, the loop points go in the cue's data instead of relying on the file's ends.
3. **`audio.ts`.** One `AudioListener` on the camera. Buses as gain nodes: master → music, ambience, sfx. `cues.json` maps a cue id to its file, bus, volume, loop and, for sounds in the world, its falloff. `play(cue, at?)` and `stop`. Short sounds are decoded once and kept; **music is streamed** (an `<audio>` element fed into the graph) and fetched when first played, so the tracks cost nothing at load. Sounds in the world use Three's `PositionalAudio`. A *Sound* folder in the tuning panel: a volume per bus, and mute.
4. **Starting the sound.** Browsers keep audio off until the player does something. The context is resumed on the first key, click or gamepad button; sounds asked for before that are dropped, loops start once it's on.
5. **Doors.** When a bulkhead door or the engineering window **starts to move**, opening or closing, `sfx_door_slide` plays at the door, from 0.1 s into the file (as UE does). One sound per door, not per leaf. The hinged doors stay silent, as in UE.
6. **The boombox.** `Boombox.001` (crew quarters shelf) becomes a target, listed by name in `interaction.ts` until the next export tags it. **One action, no *Stop*** (the agent's proposal, approved by the owner, 2026-10-13): each use moves it one step round a ring: **track 1 → 2 → 3 → 4 → off → track 1**. The prompt names the step it will take, as a door's does: *Play* when it's off, *Next track* while one plays, *Turn off* on the fourth.
   - Every use plays the cassette sound first; a track starts from 0.1 s when that ends.
   - A track that ends by itself goes on to the next; the fourth ends in *off*.
   - Not taken: a ring of the four tracks only, with no *off* (the music would never stop once started).
   - While a track plays the boombox shakes by a small random amount each frame (*vibration*, tuning panel).
   - The sound comes from the boombox and falls off with distance. UE's falloff values aren't readable: a starting guess (full within 1.5 m, gone at 12 m) in the tuning panel.
7. **The ship's noise.** One cue, `amb_ship_noise`, made of the two files **looping together** (owner: they're to be mixed into one file later; the game does the mixing until then). A *ship flying* checkbox in the tuning panel, off at the start (in prototype 01 the ship stands on the ground): on, both fade in; off, both fade out. A level for each of the two in the *Sound* folder, so the owner can find the mix. Not placed in the world: it's heard everywhere, quieter outside the ship than inside.
8. **Checks** in `smoke-01.mjs`: the audio context runs after a key press; passing a bulkhead door starts the door cue; using the boombox starts the cassette cue, then a track; using it again moves to the next step of the ring; *ship flying* starts both noise loops. (The script can tell what's playing, not what it sounds like.)

## Options (both settled: *Decided*, 8 and 9)

**A. The flight loop's length.** The file is 7 minutes.

| Option | Cost | Against |
|---|---|---|
| **Streamed whole, like the music** *(chosen)* | About 2.5 MB, nothing held in memory | A streamed loop can click where it repeats: stage 2 tells |
| Cut to a 60 s loop, decoded | About 0.4 MB, loops exactly | The cut has to be chosen by ear, and it's the agent's ear |

**B. How the boombox becomes a target.**

| Option | Cost | Against |
|---|---|---|
| **Listed by name in the code, tagged at the next export** *(chosen)* | None now | A name check, against the rule, until that export (as the roof hatch was) |
| Tagged in 1.19 now, then a re-export | A save of the owner's file, an export, the comparison | A whole export for two tags |

## Risks

- **A gamepad button may not count as "the player did something"** for the browser. If so, a player with only a gamepad hears nothing until a key or a click. To test; if it's so, the *press any button* moment needs a click or a key, or a start screen.
- `Boombox.001` is exported as a prop. If props are merged or instanced in the game, it has to come out of that to be aimed at and shaken: to look at in stage 6.
- Two streamed loops of different lengths, each of which may click where it repeats: stage 2 tells. If they do, they're decoded instead (about 40 MB of memory for the long one) or cut shorter.

## Done when

- `check`, `build` and `smoke` pass.
- In the browser, by the agent: no console errors; each cue is reported as playing at its event. **The agent can't hear**: levels, falloff, the loop's seam and whether the right file is on the right event are the owner's to judge.
- By the owner: the door sound at both bulkhead doors and the window; the boombox plays, moves on, shakes and gets quieter with distance; *ship flying* on and off, and the mix of its two sounds; a gamepad alone starts the sound.

## As built (2026-10-13)

> **[Agent note]** `check`, `build` and `smoke` pass (11 new checks). **Nothing was listened to**: the agent can't hear.

- **Stage 2, loops: a streamed loop is two copies of the file, the end of one fading into the start of the other over 2 s** (`crossfade` in the cue's data), not the file's own ends. An `<audio>` element's loop leaves a gap in most browsers, and these two files are recordings, not loops: their ends don't match their starts, so a cut would be heard however exact. Checked in Chrome only, by level: around the hand-over the quietest moment is 54% (flight) and 39% (landing) of the mean level, so no silence. **Firefox and Safari weren't tested.** The cost: four `<audio>` elements for the ship's noise instead of two.
- **Stage 4: a key or a click turns the sound on; Shift by itself didn't** in the scripted check (Q did). **A gamepad button is tried too, but whether the browser counts it is still not known** (no controller in the test browser).
- **Stage 6: the boombox's name is listed in `interaction.ts`** (`UNTAGGED`), and its behaviour is in a file of its own, `boombox.ts`. It was already a separate object in the export (a prop with four materials): nothing to take out of a merge. It can be aimed at and used from the floor with the normal reach.
- **Stage 6, the falloff is a straight line** from full (within 1.5 m) to nothing (12 m), **measured from the camera**, where the listener is: with the camera 3.5 m behind her, the boombox is never at full volume. UE's falloff was *natural sound* (a curve). Both for the owner to judge.
- **Stage 1: the order of the four tracks** is the order of the inventory's table. Whether that's the order of the Blueprint's list isn't readable from the `.uasset`.
- **The sound keeps playing while the game is paused.**
- Files: 9.2 MB in `app/assets/test/audio/` (the four tracks 6.2 MB, the ship's noise 3.1 MB), fetched only when first played, except the two short sounds (28 kB, at load).

## Open questions

None open.

Answered 2026-10-13: the boombox's one action is the ring with *off* in it (stage 6); the eight wavs at the top of `resources/audio/` were duplicates and are deleted (each checked against its copy in a sub-folder first); the ship's noise is both sounds together; the boombox has no *Stop*.

## After

- [`audio.md`](../../architecture/audio.md): what exists (format, cues, buses, where the files are), still marked open where it is.
- [`interaction.md`](../../features/interaction.md): the boombox; the doors' sound (its *Not built* line).
- [`ue-prototype.md`](../../reference/ue-prototype.md): done already for the inventory and the extraction.
- [`asset-pipeline.md`](../../architecture/asset-pipeline.md): the boombox's tags in *Before the next export*; `device: boombox` in the naming contract.
- Decision log: placeholder audio and licensing put off (owner, 2026-10-13); audio code in prototype 01 with AAC, cues as data, three buses.
- Prototype README and code map (`audio.ts`); `backlog.md`, `current.md`.
