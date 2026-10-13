# Current work

> **[Agent note]** The state of the work in progress, for picking it up in a new session.
> **Rewritten at the end of every session, not appended to. 60 lines at most.**
> History is in git, the plans and the decision log.

*Updated 2026-10-13, second session (**everything is committed and pushed**: the pause changes, the start prompt, the interactions' sounds and the footsteps, the lever and its delay, the door sound at 0.8).*

## Now

- **Plan:** [`../plans/backlog-passes.md`](../plans/backlog-passes.md), approved 2026-10-12. Six passes, all in prototype 01. **Tracker:** [`../plans/backlog.md`](../plans/backlog.md).
- **Passes 1 and 2 are done**; **pass 3 (lighting) is built and committed**, then opened again by the owner and **set aside** (owner, 2026-10-13: "ignore any of the lighting stuff for now"). The direction is in the [decision log](../decision-log.md), 2026-10-12 update: the same world light indoors and outdoors, more light sources, **the owner places the lights in the blend file**.
- **Passes 4 and 4.5 (bulkhead doors, panels, window, lever; the UE prototype's audio) and the displays' materials (item 25) are built and committed.** The owner played 4 and 4.5: "edits on pass 4 and 4.5 are good" (2026-10-13). What exists: [`../features/interaction.md`](../features/interaction.md), [`../architecture/audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13). `Polaroid` is a child of `Locker Door.003` in 1.19. **Licensing: don't raise it** until a production-ready build (owner); the list for then is `app/assets/test/audio/SOURCES.md`.
- **Built this session, small:** the sound stops while the game is paused and goes on from where it was (`GameAudio.setPaused`); the gamepad's Start / Options pauses (`pausePressed` in `input.ts`; any button resumes).
- **Built this session, item 26: placeholder sounds for every interaction, and footsteps.** Plan, with the owner's answers and *As built*: [`../plans/features/interaction-sounds.md`](../plans/features/interaction-sounds.md). What exists: [`../features/interaction.md`](../features/interaction.md#sounds). **In short:**
  - Files by `node tools/make-placeholder-sounds.mjs` (in `app/`): everything is **made from tones and noise** (the recipe is in the script) but the lever and **the steps, cut from recordings**: snow from Part 1's running loop on grass (`C:\Users\31658\Projects\Big Moon Tiny Moon\Assets\Audio\Run Grass.mp3`), the ship's floor from the owner's `resources/audio/freesound_community-metal-footsteps-14727.mp3`.
  - Code: `cues.json` (new fields: `files`, `rate`, `spread`, `overlap`, `fadeIn`, `group`), `createDoorSounds` and `motorSound` in `doors.ts`, the devices' sounds from `act` in `interaction.ts`, `rungs` in `ladders.ts`, **`footsteps.ts`** (footfalls of the walk/run cycle; ship floor when inside or above 0.15 m, else snow). Tuning panel, *Sound*: *interaction sounds* and *footsteps*, a level for each set.
  - **After the owner listened** (same day): the game **opens paused on *Press any button*** (a stick alone can't turn the sound on: her steps were silent until a jump); **steps inside the ship come as often as outside** (a cycle of their own in `footsteps.ts`: not her feet's); **the ship's steps are cut from the owner's metal footsteps file** (Part 1's rock loop sounded like gravel). **The lever:** the owner's recording (`resources/audio/freesound_community-lever-action-cocking-2-39680.mp3`, its first sound, trimmed), and **the window starts 0.6 s after the lever is used** (`leverDelay` in the tuning panel; `waitsFor` in `doors.ts`), so its sound no longer covers the lever's.
  - **The agent heard nothing.** `check`, `build` pass; `npm run smoke`: all checks pass (12 new ones: which cue starts at which event), run again after the three changes below.
- **Start here:** the owner listens (list below); fix what comes back. **Then pass 5** (see-through, fifth pass: items 11, 13, 14, 15), which **needs its own plan first**: a *fifth pass* section in [`../plans/features/see-through-rules.md`](../plans/features/see-through-rules.md).

## Waiting on the owner

- **To listen to, item 26:** the ship steps from the metal footsteps file (which four steps: `STEPS` in `make-placeholder-sounds.mjs`, `--steps` lists all 145) and their frequency; the rest wasn't commented on. A sound that isn't wanted is one line out of `cues.json`.
- **Not said in "good", so still open:** the boombox's falloff measured from the camera, never full; the order of its four tracks; whether the ship noise's repeat is heard. Loops in Firefox and Safari: not tested.
- **1.19 was saved three times by the agent on 2026-10-13** (owner's go-ahead each time): pass 4's tags, the side-door keypad's `controls`, the polaroid's parent, and the doors' fit (the four leaves scaled 1.02 across and up, closed edge to edge: the owner had found them not completely closed, with a gap at the frame). Three copies of the file as it was are next to it (`… (before pass 4 tags, 2026-10-13).blend`, `… (before door fit, 2026-10-13).blend`, `… (before polaroid parent, 2026-10-13).blend`): delete them once 1.19 has been opened and looked at.
- **A closed bulkhead door hides her from a camera in the next room**: not answered; it's settled with pass 5 (options in [`../features/interaction.md`](../features/interaction.md#open-questions)).
- **Lighting:** reference images and the lights in the blend file. The export reads marker objects (`lightRoom`, `lightColor`, `lightEnergy`); the game ignores `lightEnergy` and has four on at once. For pass 4's sake too: daylight in engineering from the ramp, a light for the open window (UE fades one with it).
- **Pass 3, still to judge:** *sun through glass*, *metal reflections* (0.5). **Camera distances:** 3.5 m indoors, 4.5 m outdoors are placeholders.
- **The highlight:** the prompt is approved, so the slider and its shader code can go (`highlight` in `settings.ts`, `tuning.ts`, `cutaway.ts`, `setHighlight` in `interaction.ts`): not done yet.

## Found, not fixed

- **Walking into the trapdoor's opening from the ladder's side, she comes down on the ladder's top end**, 1.2 m above the cargo floor (two times in three in the check, before it was moved to the other side). From the cockpit bulkhead's side she falls through. **Pushing on after the ladder leaves her, she walks into the edge of the cockpit doorway** (the ladder's top is beside it).
- About 7 fps when she's teleported onto the sled in the cargo bay (old assets too). Reachable on foot?
- `Tape.003` is in both exported files as a stray object; the front thrusters' collision mesh may lack geometry-nodes instances.
- Metal on parts that are never cut (landing gear, cargo ramp) gets no reflections. Crew materials shared with the ship are single-sided in 1.19: check the placed crew at the next crew export.
- The ship's triangle count fell by 74 when the panels and lever went from props to parts: not looked into (they look right in the game).

## Known traps

- **Exporting:** `npm run export:ship` / `export:crew` (in `app/`): Blender, resize, dedup, Meshopt and the comparison in one go, with a short summary; raw files and Blender's log in `app/.export/` (not in git). Every script: [`app/tools/README.md`](../../app/tools/README.md).
- **Saving the owner's `.blend` is allowed** (owner, 2026-10-13), but **say so first, every time**: the owner may have it open. Check Blender isn't running (`tasklist`), save a copy next to the file, then save. For bigger changes a script the owner runs is also fine.
- **The `Game` collection is excluded in 1.19**; the export includes it for itself. If "lights: 0, collision pieces: 0" shows in the export's last line, that broke.
- **Doors in the file must be closed, and not animated.** A duplicated object keeps its tags.
- **`resources/` can't be read with the file tools**, nor named in a shell command. Blender scripts read it; a node script run from the project root reaches it through `process.cwd()`; scripts go in the scratchpad. **ffmpeg** and **Python 3.11** are on the PATH. **Blender 5.2** is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on the PATH); two add-ons print tracebacks at start: harmless.
- **`.uasset` files:** names are readable as plain text (runs of printable characters), numbers aren't. See [`../reference/ue-prototype.md`](../reference/ue-prototype.md).
- **The ship is turned half a turn in the world** and scaled 1.486: Blender (x, y, z) is `ship.object.localToWorld(x, z, -y)`.
- **In checks:** she turns in an arc when she sets off (face her first, or she misses a doorway); teleported into a closed door she's stuck; several spots 2.5 m into engineering and the cockpit are inside furniture.
- **Flipping the single-sided switch rebuilds the shaders:** frames stall for seconds. In checks, wait on a value, not on a time.
- **Screenshots from a script:** wait 2 s after moving her before capturing. The indoor camera is 3.5 m behind her: in a small room it's behind the bulkhead (set `cameraDistanceIndoors` lower for the shot).
- **In the Bash tool, heredocs with apostrophes fail:** write the script to the scratchpad with the Write tool, then run it.
- **A dev server may already be running on 5201** (the owner's): the smoke script uses it.
- **Dev hooks** on `window` in dev builds: `__settings`, `__character`, `__physics`, `__ship()`, `__view`, `__scene`, `__world`, `__interaction()`, `__ladders()`, `__audio` (`started`, `playing()`), `__boombox()`, `__THREE`.
- **No gamepad in the test browser.** Headless Chrome is capped at 60 fps unless it gets `--disable-frame-rate-limit --disable-gpu-vsync`. **Sound in a check:** the page's own simulated keys don't turn it on; a key sent through DevTools (`Input.dispatchKeyEvent`, not Shift) does: the probe always sends one (the game starts on it). **A gamepad in a check:** replace `navigator.getGamepads` in the page with a made-up pad.
- **Before any export:** read *Before the next export* in [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).

## How to verify

In `app/`: `npm run check`, `npm run build`; one thing: `npm run probe -- <file.js>` (20 s); the whole check, **once at the end**: `npm run smoke` (three and a half minutes). Then `npm run dev:01` (http://localhost:5201). New checks go in `app/tools/smoke-01.mjs`, tried out with the probe first. **Small fixes: no plan, no record script, no new check** (CLAUDE.md, *Keeping the work cheap*). Code map: [`app/prototypes/01-walk/CODE-MAP.md`](../../app/prototypes/01-walk/CODE-MAP.md).
