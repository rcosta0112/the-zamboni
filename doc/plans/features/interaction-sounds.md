# Plan: placeholder sounds for the interactions, and footsteps

**Status:** *built* 2026-10-13 (approved the same day, with the owner's answers: *Decided*). What exists: [`interaction.md`](../../features/interaction.md#sounds), [`audio.md`](../../architecture/audio.md#what-exists-prototype-01-2026-10-13). What differs from the plan: *As built*, at the end. Backlog item 26. Asked for by the owner on 2026-10-13: "placeholder sounds for every interaction we have where that would make sense. They need to be subtle", then "include audio for steps in the snow and walking in the ship".

## Decided (owner, 2026-10-13)

1. **The footsteps come from Big Moon Tiny Moon's project**; the other sounds are generated (option C).
2. **The cargo ramp: an electric engine and a hydraulic press, not too loud.**
3. **Two tones for the panels.**
4. **No sound when a target comes into reach.**
5. **One floor sound for the whole ship.**

## Goal and scope

Everything she can use makes a small sound, and her steps are heard: one kind on the snow, one inside the ship.

- **In:** the hinged doors, the side door and the cargo ramp, the keypads, the bulkhead doors' panels, the lever, the ladder, footsteps on two surfaces, landing from a jump or a fall. A level for the whole set in the tuning panel.
- **Out:** the bulkhead doors, the window and the boombox (they have their sounds); a sound when the prompt appears (see *Open questions*, 2); the crew; rock as a third surface (there's none in prototype 01); sound muffled by a closed door; UI sounds.

## Constraints from the docs

- [`audio.md`](../../architecture/audio.md): names (`sfx_…`, `_01` for variations), cues as data, sounds in the world through the sfx bus. Its proposal for footsteps is followed: **a sound set chosen by the surface under her, with random variations**.
- **Test-only assets go in `app/assets/test/audio/`**; each file gets a line in [`SOURCES.md`](../../../app/assets/test/audio/SOURCES.md).
- **`audio.md` puts masters in `resources/audio/` as WAV.** With option A below there's no master: the script that makes a sound is its source, and it's in git. Flagged, not a conflict I'd resolve otherwise.
- **Licensing isn't raised** until a production-ready build (owner, 2026-10-13). With option A there's nothing to license.
- [`interaction.md`](../../features/interaction.md) says the hinged doors, panels and lever are silent, "as in UE": that line changes. [`ue-prototype.md`](../../reference/ue-prototype.md) is untouched (UE had none of these sounds).
- Part 1 chose the footstep sound with a ray down that read a surface tag, and played it only while the walk or run animation was on ([`big-moon-tiny-moon.md`](../../reference/big-moon-tiny-moon.md)). Same idea here, without tags: see stage 4.

## The sounds

**Subtle** means here: short (0.05 to 0.3 s, the ramp's motor apart), no high, bright part (everything low-passed), cue volumes around 0.3 where the bulkhead door's is 1, and a short reach (full within 1 m, silent at 8 m). One slider, *interaction sounds*, scales the whole set; another, *footsteps*.

| Cue | Heard when | Sound |
|---|---|---|
| `sfx_latch_open` | A locker, fridge door or the galley cupboard starts to open | A soft click |
| `sfx_latch_close` | One of them reaches closed | A soft, dull knock |
| `sfx_hatch_open`, `sfx_hatch_close` | The trapdoor, the roof hatch (one sound for its two parts) | The same two files, played lower and a little louder |
| `sfx_panel_press` | A keypad, a bulkhead door's panel or the lever's panel is used | A short, quiet beep (two notes: up for *open*, down for *close*) |
| `sfx_lever` | The lever starts to move | A low clunk |
| `sfx_ramp_move` | The side door or the cargo ramp is moving | A low motor hum that lasts as long as the movement, fading in and out |
| `sfx_ramp_stop` | It reaches open or closed | A dull thud |
| `sfx_ladder_grab` | She takes hold of the ladder; then once every 0.35 m climbed | A light tap on metal, three variations |
| `sfx_step_snow_01` … `_04` | A footfall outside | A short crunch |
| `sfx_step_ship_01` … `_04` | A footfall inside the ship (both decks, the ramps) | A soft, low tap on a metal floor |
| `sfx_land_snow`, `sfx_land_ship` | She lands from a jump or a fall | A heavier version of a step |

A door that stops against her and waits makes no sound; it makes its closing sound when it gets there.

## Options: where the sounds come from

| Option | Cost | Against |
|---|---|---|
| **A. Made by a script with ffmpeg** (filtered noise and tones), about 20 small files *(recommended)* | Half a day. No source or licence to track; a sound is changed by changing a number | **The agent can't hear them.** Clicks, beeps, hums and thuds come out right this way; **the snow crunch is the weak one** and may sound like hiss |
| B. Downloaded from free libraries (Freesound CC0, Pixabay, Mixkit) | Sounds like the real thing | The agent picks unheard, by name and description; each file is another line for the licence list; needs the owner to approve fetching from those sites |
| C. A, with the footsteps from the owner's files | The best of both, if the files exist | Needs the owner: Part 1 had footstep sounds (its rock and grass sets), or any pair of recordings dropped in `resources/audio/` |

Whichever is chosen, a file is replaced by putting another with the same name in its place: nothing in the code names a file.

## The work

1. **Files.** `app/tools/make-placeholder-sounds.mjs` (ffmpeg) writes the files into `app/assets/test/audio/`: mono AAC, 48 kbit/s, under 100 kB in all. Lines in `SOURCES.md` and `app/tools/README.md`.
2. **Cues.** Three things added to a cue in `cues.json`, and to `audio.ts`: `files` (variations: one is picked at random, never the same twice running), `rate` (playback speed, so the hatches reuse the latch files lower), and a small random spread of pitch and level for the steps. `play` takes a level, for the two sliders. Steps aren't placed in the world (she's always the same distance from the camera): they play straight to the sfx bus, quieter.
3. **Doors, devices, the ladder.**
   - `createDoorSounds` (`doors.ts`) grows from "a sliding door started to move" to every door: it already watches each door's state once a frame. It reports *started to open* and *reached closed* for the hinged ones; which cue plays is chosen from the door's tags (`slide`, `toGround`) and its size (a hatch: a hinge that isn't vertical). No new tags in the ship file, so **no export**.
   - The ramp isn't a `Door` in the code (`ship.ts`): it reports the same two moments, plus *moving*.
   - Panels, keypads and the lever: the cue plays from `act` in `interaction.ts`, at the device.
   - The ladder: `ladders.ts` reports taking hold and the height climbed.
4. **Footsteps.**
   - **When:** at the two footfalls of the walk/run cycle the model already keeps (`phase` in `model.ts`: the same cycle drives walk and run, so steps come faster at a run by themselves). Only on the ground, moving faster than 0.3 m/s, not on a ladder. Which two points of the cycle are the footfalls is read from the animation once (the lowest point of each foot bone).
   - **Which:** *inside the ship* (the test the see-through hull and the indoor camera already use) gives the ship set; outside, snow. The open cargo ramp and the side door's slope count as ship. A ray down for a surface tag, as in Part 1, waits until there's a second surface outside.
   - **Level:** quieter at a walk than at a run.
   - **Landing:** when `grounded` turns true after a fall of more than about 0.3 m.
5. **Tuning panel**, *Sound*: *interaction sounds* and *footsteps* levels.
6. **Checks**, tried with the probe first, then in `smoke-01.mjs`: each cue starts at its event (a locker opened and closed, a keypad, the lever, the ladder); walking outside starts snow steps and no ship steps, inside the reverse; standing still starts none; steps per second at a run are about twice a walk's.

## Risks

- **Too much.** Fifteen new events where there were two: "subtle" is the owner's to judge, by ear. The two sliders are there to find the level quickly; a cue that isn't wanted is one line out of `cues.json`.
- **Footfalls that don't match the feet.** The model's cycle keeps going at the same rate whether she's Part 1's model or the crew's: the two models may put their feet down at different points of it. Read per model.
- **The snow steps under the ship's noise and the music:** they're on the same sfx bus as the doors, so they follow *sfx* in the mix.
- Steps on the ramp's slope: she's "inside" only past the hull's line, so the surface may change a step late or early. To look at.

## Done when

- `check`, `build`, `smoke` pass; no console errors.
- By the agent: each cue reported as started at its event, and not otherwise. **Nothing listened to.**
- By the owner: every sound in the table, for what it is and how loud; the steps' timing against her feet at a walk and at a run; the change of surface going up the ramp.

## Open questions

None open. Answered 2026-10-13: see *Decided*.

## After

- [`audio.md`](../../architecture/audio.md), *What exists*: variations, rate, the new triggers, footsteps by surface.
- [`interaction.md`](../../features/interaction.md): the *Sound* lines for doors, devices and the ladder.
- A new short section on her footsteps where her movement is described (prototype 01's README).
- `SOURCES.md`, `app/tools/README.md`, the code map, `backlog.md`, `current.md`.

## As built (2026-10-13)

> **[Agent note]** `check`, `build` and `smoke` pass (12 new checks). **Nothing was listened to**: the agent can't hear. Every check is about which cue starts at which event.

- **Part 1 has no single steps:** its two files are 20 s loops of someone running, `Run Grass.mp3` and `Run Rock.mp3`. The script finds the single steps in them by level and keeps four of ordinary loudness from each, brought to the same peak. **Grass stands in for snow, rock for the ship's floor**: neither is the real surface. Which four were taken is printed by the script; others can be named in it (`STEPS`).
- **The lever has its clunk and no tones** (the plan had both): a lever isn't a keypad.
- **The panels' tones are two files**, `sfx_panel_open` (660 then 880 Hz) and `sfx_panel_close` (the reverse), not one cue.
- **The ramp's sound** is one 8 s file (a 110 Hz hum with harmonics and a faint whine, spinning up over a third of a second, over low noise), faded out when the movement ends; the stop is a hiss dying away over a thud. The side door moves in 0.6 s, so its motor is brief.
- **The landings are the step files**, played lower and louder: no files of their own.
- **Footfalls** were read once from Part 1's clips (each foot bone's height through the cycle) and are constants in `footsteps.ts`: 0.4 and 0.9 of the cycle at a walk, 0.5 and 0.925 at a run. The Zamboni model plays the same clips, so they aren't read per model.
- **On the ramps she's on the ship's floor** by height (above 0.15 m), not by the "inside" test, which starts further up the ramp. It holds while the ground is flat.
- **The ladder's taps aren't placed in the world**, like the steps: she's on it.
- **Changed the same day, after the owner listened:**
  - *Snow steps didn't sound on load, only after a jump:* the browser's rule, not the steps. With a gamepad, the sound was off until a button; a stick doesn't count. **The game now opens paused on *Press any button*.**
  - *Ship steps too far apart:* indoors she runs at half the outdoor speed, and the animation's cycle with her. **The steps there now come as often as outside**, on a cycle of their own: they don't follow her feet indoors.
  - *Ship steps sounded like gravel:* not cut from `Run Rock.mp3` any more. First made by the script from tones; then **the owner put a recording of steps on metal in `resources/audio/`** (`freesound_community-metal-footsteps-14727.mp3`, 91 s, a step every 0.6 s), and **four single steps are cut from it**, as for the snow.
  - *The lever's sound was covered by the window's:* **the window now starts 0.6 s after the lever is used** (first 0.3 s, the lever's travel; the owner doubled it), and its sound with it. **The lever's sound is the owner's recording** (`freesound_community-lever-action-cocking-2-39680.mp3`): the first of its two sounds, 0.21 s, the silence cut off.
- Measured in the check: 7 steps in 3 s at a run outside, 4 at a walk.
- Files: 18 new, about 125 kB in all, decoded at load.

