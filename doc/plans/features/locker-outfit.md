# Changing clothes at the locker (item 72)

**Status:** *draft*, 2026-10-21, for the owner's review: what the feature does, before any build plan. Nothing built.

## Goal

Using a crew locker switches Dr. Green's clothes: the indoor **jumpsuit** for the outdoor **parka**, and back (owner, 2026-10-21).

## What exists

- **Her model in the game is the parka** (`public/test/green-parka.glb`, from the armature `Dr. Green Parka` by `npm run export:player`), with the jetpack and the hood's `jetpack` shape key. The file also has **`Dr. Green Jump suit`** (scaled with the parka in item 46), never exported.
- **The lockers:** `Crew Locker Door 1` and `Crew Locker Door 2` (crew quarters) and `Cargo Locker Door` (cargo hold) open and close ([interaction](../../features/interaction.md)). **Three parkas hang in the crew quarters** (`Parka.001`–`.003`, props in the ship export).
- One skeleton for every outfit: a swap keeps every animation ([characters](../architecture/game-architecture/characters.md#outfits)).

## Constraints and a conflict

- **Conflict:** [characters](../architecture/game-architecture/characters.md#outfits) says *"Characters change outfit off-screen or in a cutscene, at the moment the story needs it (before going outside)."* The locker makes it the player's action. I'd update that line to say the player changes at the locker (the crew still change off-screen); **your call** (question 1).
- **Anything saved is in Ink** ([game structure](../architecture/game-architecture/game-structure.md#who-owns-each-piece-of-state)): what she wears is an Ink variable (`green_outfit`), so *Continue* and the story agree on it (a scene can require the parka, a line can comment on it).
- **Owner, 2026-10-15:** clothes are among the costly parts (her outfits exported, swapped on the character, her materials). Measured cost below.
- **Gamepad first;** the prompt follows item 56's placement.

## The features to define

1. **Which locker.** Her own crew locker only (which one is hers?), any crew locker, or the cargo locker too.
2. **The prompt.** On the open locker, a second prompt beside the door's: *Put on parka* / *Put on jumpsuit* (recommended: opening the door stays a door). Or the locker's only action becomes *Change*.
3. **The change itself.** (a) **A short fade to black** (about 0.4 s out, swap, 0.4 s in) with a rustle sound (recommended: no animation needed, hides the swap); (b) an instant swap; (c) an animation you make in Blender (a turn into the locker and back), played like the ladder's.
4. **The parka on the hanger.** Hers hangs in the locker while she wears the jumpsuit, and is gone while she wears it (one of `Parka.001`–`.003` shown or hidden), or the hanging parkas stay decoration.
5. **Rules on wearing.** None for now (recommended), or: the jetpack only over the parka; going out without the parka gives a bark (*"Too cold out there"*) and turns her back; a scene can force the parka. Each later rule is a line in Ink or a scene, not code, once the outfit is a variable.
6. **What she starts in.** The jumpsuit in the ship, the parka from the opening's landing; set by each scene's setup (`outfit: parka`) when the story needs it.
7. **The jetpack over the jumpsuit.** The parka's hood has a shape key for it; the jumpsuit may need a small fit for the jetpack straps in Blender.

## How it would be built (outline, for sizing only)

- `export:player` exports both armatures (`green-jumpsuit.glb` beside `green-parka.glb`), each checked for scale like today.
- `model.ts` loads both at start, sharing one skeleton, mixer and the retargeted clips; swapping shows one mesh and hides the other (no reload). The see-through, her fade and the low-res rules take both meshes' materials.
- A command `outfit` (`set` for Green: `parka` | `jumpsuit`), usable from scenes, Ink and cutscenes; the locker's action runs it and sets `green_outfit`.

**Cost (estimates):** about 0.2–0.5 MB more to download; a few more shader pipelines at load (both outfits' materials, through the see-through and the fade: perhaps 4–8, a fraction of a second; item 50 counts them); about 4–5 hours over two passes (the export and the swap; then the locker, the prompt, the fade and Ink), plus Blender work on your side if the jumpsuit needs a fix (straps, single-sided faces).

## Open questions for the owner

1. The conflict: the player changes at the locker, and `characters.md` changes to say so?
2. The seven features above: your choices (my recommendations are marked).
3. Is `Dr. Green Jump suit` ready to export as it is, or will you work on it first (announced as usual)?

## After

A build plan in passes (in this file) once these are settled; then `features/interaction.md` (the lockers), `characters.md` (*Outfits*), the code map, the backlog.
