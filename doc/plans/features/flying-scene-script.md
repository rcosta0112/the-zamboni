# The flying scene: the script tasks

**Status:** *approved* with the [flying scene's plan](flying-scene.md) (2026-10-22). What the owner writes for the flying scene and its cutscenes, and how the game reads it. The Blender work is in [its own doc](flying-scene-blender.md).

## What to write

| | Where | What | For pass | Until then, in the game |
|---|---|---|---|---|
| ☐ | [`01-cutscene-flight.md`](../../story/scenes/01-cutscene-flight.md) | Cutscene 1's description (the ship flying over the plain) | the animatic | a stand-in card |
| ☐ | [`03-chapter-1.md`](../../story/scenes/03-chapter-1.md) | **Adam Red and Adam Blue:** a conversation each, or one shared *Adam* one; topics; their one-liners | 2 | `[Placeholder]` lines |
| ☐ | | **Dr. Kaufman:** her conversation, topics, one-liner | 2 | `[Placeholder]` |
| ☐ | | **Dr. Ogawa:** the rest of his conversation (the signal is written), other topics, his one-liner | 2 | the written lines, `[Placeholder]` for the rest |
| ☐ | | **Her refusal at the seat without coffee** (Ogawa's is written: *"I want to ask Dr. Ogawa about the signal."*; it comes first) | 2 | `[Placeholder]` |
| ☐ | | **The coffee remark** on entering the crew quarters (once, before the coffee; it can depend on where she came from) | 2 | `[Placeholder]` |
| ☐ | | **Her seat when she can sit:** any line before the cutscene | 2 | none |
| ☐ | | **The coffee:** a line when she pours, if any; **her comment after the first sip**; a line if she tries to pour again | 3 | `[Placeholder]` |
| ☐ | | Her remarks on things in flight (the windows, the viewport, the sensor array, the signal receiver): optional | any | none |
| ☐ | [`04-cutscene-landing.md`](../../story/scenes/04-cutscene-landing.md) | The landing cutscene's description (for its placeholder) | 6 | the test cutscene |

The same list, as it stood on 2026-10-22, is a comment at the end of `03-chapter-1.md`, beside the script.

## How the game reads it

The scene files in `doc/story/scenes/` are where the owner writes. **The game reads Ink:** the agent copies the lines into the story file **word for word** when a pass needs them, and fills what's missing with placeholders marked `[Placeholder]` (shown on screen as such, so they can't pass for the script).

- **The story file:** a real one for the game, `public/story/story.ink` (compiled by `npm run ink`), not the test story (`public/test/story.ink`, kept for the checks).
- **The master copy, for now: the scene files** (owner, 2026-10-22). The owner keeps writing there; **the agent copies every change into the Ink**, word for word, and never edits the lines in the Ink by hand. After the first scene (chapter 1) is ready, the owner judges whether to move to writing in Ink entirely ([decision log](../../decision-log.md), *Ink for dialogue*, update 2026-10-22).

## What the Ink can say (for whoever writes it)

The full reference is in [`features/dialogue.md`](../../features/dialogue.md); what this scene adds:

| Knot | When it runs | Note |
|---|---|---|
| `talk_<id>` | she talks to a character (`talk_ogawa`, `talk_adam_red`) | **Topics** (pass 0): Ink's choices, `*` heard once, `+` always offered, `[…]` the list's text; the example is a comment in `03-chapter-1.md` and in the [dialogue plan](dialogue.md#topics-owner-2026-10-22) |
| `use_<id>` | she uses a thing that has no action, or one that's locked | `# verb:` the prompt (*Sit down*, *Pour coffee*); the flight rules lock the outer doors, the jetpacks and her parka while the ship flies |
| `enter_<room>` | she walks into a room (`enter_crew_quarters`, `enter_cockpit`, `enter_engineering`, `enter_cargo_hold`) | `came_from`: the room she left (`cockpit`, `crew_quarters`, `engineering`, `cargo_hold`, `outside`); `came_via`: the door, hatch or ladder she came through, by id |

**Variables the game keeps up to date:** `ship_flying` (the ship is in flight), `green_outfit`, `green_jetpack`, `green_coffee` (`none`, `holding`…), `came_from`, `came_via`.

**Checking a topic was heard:** a topic with a name, `* (signal) [Can you tell what that signal is?]`, is `talk_ogawa.signal` anywhere in the story: `{ not talk_ogawa.signal: … }`.

**The prompts** (*Get up*, *Sit down*, *Pour coffee*) are game labels, not dialogue: the owner's to change if wanted.
