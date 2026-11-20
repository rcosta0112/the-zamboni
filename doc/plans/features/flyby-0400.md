# The flyby (0400), and 0500 as its own scene

**Status:** built 2026-11-20 (owner: "let's build 0400"; then the camera: an orbit from 0100's middle frame, 90°). The owner's look pending.

## Goal

0400 plays between chapter 1 (0300) and *What's that?* (0500). The scene file has one line, *"The ship flies over the frozen plains."*, and says 0400 is **a duplicate of cutscene 1 for now** (owner, 2026-11-07). Nothing exists for it yet. Without the [0500 split](scene-0500-split.md) (SC-173, waiting on 0400) it has no place in the game, so that plan is built in the same pass.

## Scope

- In: 0400 as an exterior cutscene with its own id (`flyby`); the 0500 split as its plan describes, with `flyby` as the `whats-that` scene's `intro`; `?scene=0400`.
- Out: new shots or animation for 0400 (the owner's, later: a re-run of the script swaps them in); the light column (not seen in 0400, owner 2026-11-10); 0500's copy and cameras; the landing (0600).

## Constraints from the docs

- The scene file and the scenes README: 0400 is a duplicate of cutscene 1 for now. The flyby goes between 0300 and 0500.
- [0500 split plan](scene-0500-split.md): 0500 isn't interactive; scene numbers map to their scenes (`SCENE_NUMBERS`).
- Cutscenes are written by `tools/flyby-cutscene.py` from a `.blend` (never saved); they go in `public/cutscenes/`.

## The work (one pass)

1. **`public/cutscenes/flyby.json`**: written by `flyby-cutscene.py -- flyby` from the 1.10 fly-by file, the same as cutscene 1 but under its own id. When the owner animates a real flyby, it's one re-run with the new file.
2. **The 0500 split**, steps 1–7 of [its plan](scene-0500-split.md): the `whats-that` scene (in flight, all five seated, the column), `intro: "flyby"`, the conversation in its `begin`, then `scene landed`; *Sit down* goes to `whats-that`; landed loses `before`; the `WHATS_THAT` workaround and `dropBegin` go.
3. **`?scene=0400`** → `whats-that` with the flyby; **`0500`** → the same scene, no flyby. Skipping the flyby starts 0500.
4. **Checks**: a probe for the chain (sit down → flyby → 0500 → landing); the probes that went through *Sit down* or `whats-that` follow the new route; check, build, smoke once.

**Agent build:** ~45 min, checks included. **Review rounds:** 1, short (watch 0300 → 0700 once).

## Options

- **0400's shots.** A: **cutscene 1's camera and ship, as the scene file says (recommended for now)**: free, swapped later by a re-run. B: you animate a flyby in Blender first: the hook-up waits for it. C: the agent makes a camera path by script, like the landing (~30 min more; a placeholder all the same).

## Done when

- Agent: in chapter 1, sitting back down plays the flyby, then 0500 seated, then the landing and the landed scene; `?scene=0400` and `0500` start where they should; probes and smoke as above.
- Owner: watches http://localhost:5202/?scene=0400, and once from http://localhost:5202/?scene=0300 (sit back down).

## Open questions

- Answered 2026-11-20: neither option A nor a replay; an orbit from 0100's middle frame, 90° (owner).

## As built (2026-11-20)

- **The shots (owner, replacing the options):** the flyby's middle frame is 0100's middle frame; the camera orbits the ship left to right as it flies, **90° in all**, at an even rate, about the vertical through the ship's origin (the ship stays where that frame has it). `tools/flyby-orbit.mjs` writes `flyby.json` from `cutscene-1.json` (not from Blender).
- **The split:** `public/scenes/whats-that.json` (`intro: "flyby"`, `begin`: `watch whats-that` with `then: "landed"`); the `watch` command's new `then`; landed's `before` and `SceneDirector.dropBegin` removed; `goTo(id, withIntro)` also fetches the conversations its `begin` watches. `?scene=0400` → `flyby`.
- **Checks:** `landed-probe.js` 19/19 (new route), new `flyby-probe.js` 3/3 from 0400 and 0500, `coffee-probe.js` 21/21 (skips the flyby); check and build pass.
- **Update (owner, 2026-11-20):** the shot starts and ends at the owner's frames (`START` 2 s, `END` 9.5 s into the orbit; 7.5 s, the rest cut), and the ship is centred vertically (each key's pitch aims at its centre, `SHIP_CENTRE`).
- **Actual time:** about 40 min.

## After

Scenery and dialogue feature docs (the new chain), code map, tools README, the 0500 split plan marked built, current.md, tasks.md (SC-173 closed).
