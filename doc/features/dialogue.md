# Dialogue

**Status:** passes 1 and 2 built in 0.0.2 (2026-10-21, 22): talking to the crew, her remarks on things, the box, whole conversations remembered by the save. **Topics** (Ink's choices) built 2026-10-22, the flying scene's pass 0 (owner: needed for the script). Plan and later passes (the crew's animations, barks, subtitles): [`../plans/features/dialogue.md`](../plans/features/dialogue.md).

## What exists

- **Talking to the crew:** *Talk to Dr. Kaufman* (and so on) on a crew member while the story has their `talk_<id>` knot. The prompt sits above their head; the reach is longer than a thing's (`talkReach`, 1.6 m: Kaufman across the crew quarters' table), and the seat they're in doesn't hide them.
- **Her remarks on things:** a thing with no action of its own (kind `seat`, `STORY_KINDS` in `kinds.ts`: today the pilot's seat, `cockpit-seat-pilot`, the empty front seat) is a target only while the story has its `use_<id>` knot, with that knot's `# verb:` as the prompt (*Look at pilot's seat*). A thing that has an action (a locker) runs its knot in place of the action when the knot is tagged `# instead`, or while it's locked.
- **The box** (`DialogueBox.svelte` in `packages/ui`): at the bottom of the screen, 30 units up; the speaker's name, the line typed out, a key sound (`ui_type`) every 2 characters typed (not on spaces). A press (E, pad B, Enter or a click) completes the line, the next goes on, the last ends it. Presses are debounced, and the prompt stays hidden for 1 s after the end, so the same press doesn't start it again.
- **During a conversation** she stops (`input.hold()`), the prompts are off, **the camera stays the player's** (owner, 2026-10-21: no lock, no orbit).
- **Every interaction clicks** (`ui_interact`), the box's presses too.
- **A conversation happens once** (pass 2): Ink remembers each knot's visits, and the save keeps Ink's state. The test story's `talk_kaufman` is four screens the first time, a one-liner after.
- **Topics** (owner, 2026-10-22): after the last line before Ink's choices, the next screen is **in the box, under *Dr. Green***: **her lines** to choose from, the first selected (▸); shown at once, not typed. **Up / down:** the pad's D-pad or left stick, W / S, ↑ / ↓; no wrap. **Pick:** the box's button (E, pad Circle, Enter, Space, a click: the click picks the selected one, as the mouse is the camera's while the game runs, so there's no hover). The corner prompt reads **Choose**. The line picked isn't said again: **the next screen is the answer**. The topics come back without the one heard; a leave topic ends it. Three fit the box; a fourth makes the text a little smaller. Which topics were heard is in Ink's state, so the save keeps it (written when the conversation ends; closed mid-conversation, its topics are offered again).
- **The save** is written again after each conversation ends (a knot that says nothing: at once), and when her clothes or the jetpack change; never during a cutscene. Owner's rule (2026-10-22): the player never repeats an action unless the story asks; what's kept of her is in `KEPT` (main.ts), each an Ink variable (`green_outfit`, `green_jetpack`); doors and music reset.

## For whoever writes the story (Ink)

**A watched conversation** (owner, 2026-10-22: cutscene 2, the opening in the cockpit, after NEW GAME and cutscene 1): not interactive; **the camera is fixed on whoever speaks and cuts with each line**; **each line moves on by itself** 1.5 s after it has typed out, so the player can just watch; a press completes or skips a line as usual. Its data, `public/conversations/opening.json`: the knot (`cutscene_opening`), the wait, and a shot per speaker (Blender coordinates). **The camera is its own, decoupled from her, with a long lens** (owner, 2026-10-22: the cinematic look): a shot's `from` is the side it looks from (the owner's angles for Adam Red and Ogawa, read off the tuning panel); it aims at the speaker's head (or the shot's `look`: Ogawa, over the comms, gets a wide shot of the cockpit) and backs away along that line until a 20° lens frames head and shoulders, outside the ship if need be (owner: fine). Something opaque in the way (glass isn't; their own seat doesn't count): the shot is turned 15° at a time until it sees them through a window. A speaker with no shot (Green, Adam Blue): the pilot's seat's angle, mirrored to their outboard side. **Every cutscene has black bars** (2.39:1; owner, 2026-10-22), sliding in and out, under the dialogue box. `src/watched.ts`.

**Two stories** (2026-10-22, the flying scene's pass 1): **the game's**, `public/story/story.ink` (the owner's lines copied word for word from the scene files in `doc/story/scenes/`, the master copy; `[Placeholder]` where none is written yet), and **the checks'**, `public/test/story.ink` (test lines), loaded with `?test` in the address (dev builds; the probe and smoke scripts use it). Both compiled by `npm run ink`. The test story's header says the same:

- `talk_<id>`: talking to a character (`talk_kaufman`, `talk_adam_blue`).
- `use_<id>` (dashes as underscores): using a thing. `# verb: <prompt>` is the whole prompt, the thing's name included. `# instead` runs it in place of the thing's action.
- A line names its speaker before a colon: `Green`, `Kaufman`, `Ogawa`, `Adam Red`, `Adam Blue`, `Adam`. A line with none is narration.
- The knots call the game through `command(name, id, value)` (set, lock, unlock, enable, disable, sound, cutscene).
- **A conversation once, then a one-liner:**
  ```ink
  === talk_ogawa ===
  { talk_ogawa > 1: -> again }
  Ogawa: First screen.
  Green: Second.
  -> DONE
  = again
  Ogawa: The one-liner, every time after.
  -> DONE
  ```
- **Topics:** Ink's own choices. **The choice's text is her line**, in `[…]` (so Ink doesn't print it again after the pick); the answer is the next line. `*` a topic offered until heard, `+` always offered (the way out); `(name)` to ask later whether it was heard; a condition in `{…}` offers it only once something has happened. Four at most fit the box. The pattern, as in the test story's `talk_ogawa`:
  ```ink
  === talk_ogawa ===
  { talk_ogawa.signal and talk_ogawa.feeling: -> again }
  { talk_ogawa > 1:
      Ogawa: Anything else?
  - else:
      Green: Got a minute?
      Ogawa: Sure.
  }
  - (topics)
  * (signal) [What can you tell me about that?]
      Ogawa: His answer.
      -> topics
  * (feeling) [How are you?]
      Ogawa: His answer.
      -> topics
  * {talk_kaufman} [Her line, once she's talked to Dr. Kaufman]
      Ogawa: His answer.
      -> topics
  + [That's all for now.]
      -> DONE
  = again
  Ogawa: The one-liner, once every topic is heard.
  -> DONE
  ```
  Elsewhere the story asks `{ talk_ogawa.signal: … }`.
- `npm run check` fails on a knot naming an id that doesn't exist, and on a speaker name the game doesn't know; it warns about a list of more than four topics.

## Code

`story.ts` (running a knot up to its topics, `choose`; lines with speakers), `dialogue.ts` (the typewriter, presses, cooldown, the topics' selection), `input.ts` (`consumeChoiceStep`), `interaction.ts` (`crewInteractables`, `storyInteractables`, `respectLocks`). Checks: `tools/dialogue-probe.js` (the crew), `tools/seat-probe.js` (the pilot's seat), `tools/conversation-probe.js` with `--reload tools/conversation-probe-after.js` (a conversation, the one-liner, the save), `tools/topics-probe.js` with `--reload tools/topics-probe-after.js` (topics).
