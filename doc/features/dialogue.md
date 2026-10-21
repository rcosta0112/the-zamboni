# Dialogue

**Status:** pass 1 built in 0.0.2 (2026-10-21): one line from each crew member, her remarks on things, the box. Plan and later passes (conversations with choices, the save after each, the crew's animations, barks, subtitles): [`../plans/features/dialogue.md`](../plans/features/dialogue.md).

## What exists

- **Talking to the crew:** *Talk to Dr. Kaufman* (and so on) on a crew member while the story has their `talk_<id>` knot. The prompt sits above their head; the reach is longer than a thing's (`talkReach`, 1.6 m: Kaufman across the crew quarters' table), and the seat they're in doesn't hide them.
- **Her remarks on things:** a thing with no action of its own (kind `seat`, `STORY_KINDS` in `kinds.ts`: today the pilot's seat, `cockpit-seat-pilot`, the empty front seat) is a target only while the story has its `use_<id>` knot, with that knot's `# verb:` as the prompt (*Look at pilot's seat*). A thing that has an action (a locker) runs its knot in place of the action when the knot is tagged `# instead`, or while it's locked.
- **The box** (`DialogueBox.svelte` in `packages/ui`): at the bottom of the screen, 30 units up; the speaker's name, the line typed out, a key sound (`ui_type`) every 2 characters typed (not on spaces). A press (E, pad B, Enter or a click) completes the line, the next goes on, the last ends it. Presses are debounced, and the prompt stays hidden for 1 s after the end, so the same press doesn't start it again.
- **During a conversation** she stops (`input.hold()`), the prompts are off, **the camera stays the player's** (owner, 2026-10-21: no lock, no orbit).
- **Every interaction clicks** (`ui_interact`), the box's presses too.

## For whoever writes the story (Ink)

The story is `public/test/story.ink` (placeholder lines, compiled by `npm run ink`). Its header says the same:

- `talk_<id>`: talking to a character (`talk_kaufman`, `talk_adam_blue`).
- `use_<id>` (dashes as underscores): using a thing. `# verb: <prompt>` is the whole prompt, the thing's name included. `# instead` runs it in place of the thing's action.
- A line names its speaker before a colon: `Green`, `Kaufman`, `Ogawa`, `Adam Red`, `Adam Blue`, `Adam`. A line with none is narration.
- The knots call the game through `command(name, id, value)` (set, lock, unlock, enable, disable, sound, cutscene).
- `npm run check` fails on a knot naming an id that doesn't exist.

## Code

`story.ts` (running a knot, lines with speakers), `dialogue.ts` (the typewriter, presses, cooldown), `interaction.ts` (`crewInteractables`, `storyInteractables`, `respectLocks`). Checks: `tools/dialogue-probe.js` (the crew), `tools/seat-probe.js` (the pilot's seat).
