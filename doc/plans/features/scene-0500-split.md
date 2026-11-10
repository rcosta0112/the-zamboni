# Scene 0500 (*What's that?*) as a scene of its own, after the flyby (0400)

**Status:** draft 2026-11-10, for review. **Waiting on 0400** (the flyby, being built in another session, owner 2026-11-10): built once it's done.

## Goal

The script's order (scenes [README](../../story/scenes/README.md)) is 0300 chapter 1 → **0400 the flyby** (exterior cutscene) → **0500 *What's that?*** (dialogue cutscene) → 0600 the landing → 0700 the landed scene. In the game today 0500 is not a scene: it's the landed scene's `before` conversation, played on top of chapter 1's state the moment Dr. Green sits back down (main.ts `goTo`). So nothing can go between 0300 and 0500. This plan makes 0500 its own scene, so 0400 plays between them.

**0500 is not interactive** (owner, 2026-11-10): a dialogue cutscene only, no player control from its start to the landing.

## Scope

- In: a `whats-that` scene; chapter 1's *Sit down* going to it through 0400; the landed scene losing its `before`; `?scene=0400` / `0500` starting at their own scene; the `dropBegin` workaround removed; the probes that start from 0500 or the landed scene updated.
- Out: 0400's own shots (the other session's work); 0500's cameras and copy (unchanged: `whats-that` conversation, the owner's cameras); the landing (0600, [its plan](landing-cutscene.md)).

## Constraints from the docs

- **The light column is not seen in 0400** (owner, 2026-11-10: not visible from that camera angle anyway). It is seen in 0500, on the horizon (SC-162, answered 2026-11-07; the placeholder `light-column.ts`).
- Scene ids and the number → scene map in main.ts `SCENE_NUMBERS` (owner, 2026-11-10: every number goes to its scene).
- The script's copy is the owner's; nothing in the conversation changes.
- **Conflict, flagged:** [current.md](../../steps/current.md) said (2026-11-10) the new exterior cutscene goes *between 0500 and 0600*. Wrong: the owner and the README put it between 0300 and 0500. Corrected there.

## The work (one pass)

1. **The `whats-that` scene** (`public/scenes/whats-that.json`): the ship in flight over the ice plain (`travel`, further along than chapter 1, so the column is nearer), all five crew seated (Dr. Green in the copilot's seat, where she sat down), the column. No `getUp`, no `sitDown`: she never gets control.
2. **0400 as its `intro`**: the same mechanism as the landed scene's `intro` (0600): `goTo` fetches the scene and its intro and starts both on the same frame, so the cut from inside chapter 1 to the flyby never shows the new scene's state. How 0400 is played (a cutscene JSON like `cutscene-1.json`, or something else) follows what the other session builds; if it's not a cutscene the `intro` takes, the hook-up adapts to it.
3. **The conversation at the intro's end**: the scene's `begin` plays the `whats-that` watched conversation, and its end runs `scene landed` (the landing, then the landed scene, as now). A command to play a watched conversation from a scene, if none exists yet (the opening is started from main.ts). `begin` today waits for the player to have control: it must run for a scene where she never does (checked in the build).
4. **Chapter 1's *Sit down*** runs `scene whats-that` instead of `scene landed`. **The landed scene** loses `"before": "whats-that"`; keeps `"intro": "landing"`.
5. **`?scene=`**: `0400` → the `whats-that` scene with its intro; `0500` → the same scene without the intro (the conversation at once). The game then goes on as usual (0600, 0700), like every other number. The `WHATS_THAT` branch and `director.dropBegin()` go. *(The 2026-11-10 note "make `?scene=0500` stop at its end" is dropped for consistency, unless the owner wants it.)*
6. **Skipping**: skipping 0400 starts 0500; skipping the conversation goes to the landing (as now).
7. **Checks**: the probes that reach the landed scene through *Sit down* or start at `whats-that` get the new route; scenes-probe gets the new scene; `check-ids` sees the new ids.

**Agent build:** ~30–45 min, checks included. **Review rounds:** 1, short (watch 0300 → 0400 → 0500 → 0600 once).

## Done when

- Agent: sitting back down in chapter 1 plays 0400, then 0500 inside the ship (everyone seated, the column on the horizon, she can't move), then the landing and the landed scene; `?scene=0400` and `?scene=0500` start where they should; check, build, the touched probes, then smoke once.
- Owner: watches the chain at http://localhost:5202/?scene=0300 (sit back down) and http://localhost:5202/?scene=0500.

## Open questions

- None blocking; built when 0400 is done.

## After

The features docs for the landed scene and the dialogue describe the new chain; code map; tools README (probe routes); current.md; tasks.md.
