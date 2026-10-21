# The dialogue system (item 71)

**Status:** *draft*, 2026-10-21. Reviewed twice by the owner the same day: the questions answered, the flags settled, the animation setup agreed, the prompt's wording, the box's button prompt and a handheld camera added. **Pass 1 for approval.** Nothing built.

## Goal

Characters talk to Dr. Green, and she to them, from the Ink story: a face-to-face conversation in a VN-style box at the bottom of the screen, with choices; her remarks when she uses some objects; short barks above a character while she walks around; subtitles during cutscenes. All text, no voices. Built in passes in 0.0.2, with placeholder lines.

## Scope

- **In:** the dialogue runner (Ink → lines, speakers, choices, tags); the **box** (typewriter, gamepad first); **talking to the crew**; **her remarks on objects** (the pilot's seat first); lines from someone not there (*over the comms*); the **save** (no conversation twice unless the player wants it); the crew's **idle and talk animations**, mixed in code; **barks**; **subtitles**; the fade of other characters near the camera (item 59).
- **Out, its own plan later:** the **comm** and its **chat app** (reuses this runner). Also out: portraits (name only for now, owner); converting the owner's scenes to Ink (only when asked, rule 1); a leave-conversation button (owner: choices inside the conversation do it, and conversations are short); localisation.

## The owner's decisions (2026-10-21)

> **Update, 2026-10-21 (after trying pass 1's first part):** **the camera isn't locked** during a conversation (decision 2: with the box this small it isn't needed); she still stops. **The box sits higher**: 30 units from the bottom, not 10. **Sounds:** a custom typewriter key (`ui_type`, three variations made from noise only, subtle: the first try, with tones, rang like a xylophone, owner; Eigodojo has no typing sound to reuse) every 2 characters typed, not on spaces (`settings.dialogueTypeEvery`); a click like the hinged doors' latch (`ui_interact`) on **every interaction in the game** (owner: on top of a door's or a panel's own sound) and every press in the box. Built in part A: talking needs its own reach (`talkReach`, 1.6 m: Kaufman across the table) and a seat within 0.6 m doesn't hide its sitter (Adam Blue in the front seat). The handheld orbit (pass 1b) is to be reconsidered now that the player keeps the camera. **Later the same day:** the thing acts (and makes its own sound) only once the click has finished (a door opens about 0.17 s after the press); a `use_<id>` knot tagged `# instead` runs in place of the action, locked or not: Dr. Kaufman's locker (`crew-locker-door-2`) and Dr. Ogawa's (`cargo-locker-door`) get her remark and stay shut.

> **Update, 2026-10-21 (pass 1, part B built):** the pilot's seat is `Seat.001` (the empty front seat; Adam Blue sits in `Seat`), tagged `id: cockpit-seat-pilot`, `kind: seat` by `tools/add-seat-id.py` (tried on a scratch copy, saved into 1.21, the file as it was next to it; the export differed by those two tags only, taken). `kind: seat` is a *story kind* (`STORY_KINDS`): a target only while `use_<id>` exists, its `# verb:` the prompt (*Look at pilot's seat*, a placeholder), running the knot. Check: `tools/seat-probe.js`. **Pass 1b (the handheld orbit) is dropped** (owner, 2026-10-21: the camera isn't locked any more, so it isn't needed). Pass 1 is done but for the box compared at two window sizes and a mouse glyph. What exists: [`features/dialogue.md`](../../features/dialogue.md).

1. **Ink is the master copy** of the wording once a scene is in Ink (decision log, *Ink for dialogue*, update).
2. **The camera keeps its position** during a conversation: to interact, the player has already put the target on screen. On top of it, **a little handheld effect, orbiting slowly around the person she's talking to**, nothing fancy (second review: to try; flagged if it takes long).
3. **Name only** for the speaker, no portraits for now.
4. **The box, a placeholder:** a solid white rectangle at the bottom of the screen, rounded corners, no drop shadow, the font scaling with the viewport (consistent sizes: the game is for desktop landscape), the main menu's font (Afacad). **Not big:** about the size of the owner's marks on the screenshots of 2026-10-21, centred, low (below).
5. **No way to leave** a conversation other than what it offers.
6. **Typewriter** (reference: the Design Challenge's `Typewriter.svelte`: every character laid out from the start, the untyped ones transparent, so line breaks never move; 35 ms a character there). **Click, E or the gamepad's interact button shows the whole line at once; pressing again goes to the next line** (or ends the conversation after the last).
7. **A small button prompt in the box's bottom right corner,** saying what the button does now (*Skip*, *Next*, *End*).
8. **The prompt names the person:** *Talk to Dr. Kaufman*.
9. **The talk animation plays while their line types**, then back to idle.

## Constraints from the docs

- **Ink is the single source of truth for story state**; one Ink story drives dialogue, chats and barks (decision log). The runner extends `src/story.ts` (`GameStory`).
- **Characters talk by nodding** the `Head` bone, a talk animation layered over what they're doing; the head turns toward the player when a conversation starts ([characters](../architecture/game-architecture/characters.md#talking)). Action names `<name>_idle`, `<name>_talk`; animations live apart from the character files (`anim-<name>.glb`) in the game, with the crew export for now.
- **Minimal branching** ([overview](../../overview.md)); **gamepad first**; UI in Svelte over the canvas, from `packages/ui` ([design](../../design/README.md)).
- **Saving:** checkpoints, Ink's state in the save, props reset, no save mid-cutscene ([saving](../architecture/game-architecture/saving.md)).
- **Ids:** a thing named by Ink or a scene has an `id` in the file, checked by `npm run check`. **The pilot's seat has none yet** (see pass 1).
- **Story content is the owner's:** crew lines in the passes are placeholders in `public/test/story.ink`; *"It's not time to go yet."* is the owner's line.

## UI/UX standards, and the flags

Common practice in visual novels (Ren'Py's defaults) and RPGs (Pokémon): the same button completes the line, then advances; a **"line done" marker** (Pokémon's bouncing ▼, Ren'Py's click-to-continue icon); the **speaker's name in a name box** at the box's top left; **2–3 lines of text** at most per box; a **text speed setting** (Pokémon: slow / mid / fast; Ren'Py: a slider, *instant* included); a **history** of past lines (Ren'Py's log, rollback); **auto-advance** and **skip read text** (Ren'Py); hide the UI to see the scene (Ren'Py, H). Pokémon also lets **B advance** like A.

Flags raised, and how the owner settled them (second review, 2026-10-21):

1. **The press that ends a conversation could start it again** (interact both advances and starts talking, and the target is still in reach). **Settled:** the prompt is hidden for a second after a conversation ends; presses only (never a held key's repeat).
2. **No "line done" marker.** **Settled:** the button prompt in the box's corner (decision 7) says *Skip* while the line types and *Next* / *End* when it's done: that's the marker.
3. **A quick double press skips a line unread.** **Settled:** presses debounced (one ignored within ≈ 0.15 s of the last). No history screen: the lines are short (owner).
4. **The box could hide the person talking.** **Settled:** the box is small (decision 4); wider if needed, not taller.
5. **A white box over the snow** outdoors. **Settled:** the owner fixes it in the Figma design.
6. **Text scaled with the viewport** at extreme sizes. **Settled:** it scales, unclamped, so it's consistent; the game is for desktop landscape.
7. **Two fonts on the start screen.** **Settled:** Afacad.
8. **Accessibility:** a text speed (with *instant*) in the tuning panel for now, the settings menu later; *reduced motion* turns the typewriter off. **Agreed.**
9. **Mouse:** the camera doesn't take the mouse during a conversation, so a click anywhere advances (as Ren'Py). No conflict.

## How it works

### In Ink

Conversations are knots, named by convention like `use_<id>` today:

| Knot | Run when | Prompt |
|---|---|---|
| `talk_<id>` | she uses a character (`talk_kaufman`, `talk_adam_red`) | *Talk to Dr. Kaufman* (owner): *Talk to* and the character's display name (Dr. Kaufman, Dr. Ogawa, Adam for either body), from the speaker table |
| `use_<id>` | she uses a thing with no action of its own (the pilot's seat), or a locked thing (as today) | the knot's `# verb:` tag (*Look*, …) |
| `bark_<name>` | a scene, a trigger or a cutscene runs it (pass 5) | none |

A character or thing gets its prompt only if its knot exists. Lines name their speaker before a colon, the way the script is written:

```ink
=== talk_ogawa ===
Ogawa: Got a heading on the signal. # comms
Green: How far?
* [Ask about the engine]
    Green: Is engine 2 all right?
    Ogawa: Burned capacitor. I'll replace it when we land.
* [That's all]
- -> DONE
```

- **Speakers:** a small table from the name to a character id (`Green` → her, `Ogawa`, `Kaufman`, `Adam Red`, `Adam Blue`, `Adam` → the body in the scene). No name: narration. `npm run check` checks the names.
- **Tags:** `# comms` (said over the radio: nobody nods), `# wait: <s>`; commands as today (`command(…)`).

### The box

- **Placeholder (owner):** solid white, rounded corners, no shadow, dark text in Afacad. **Size, from the owner's marks (screenshots of 2026-10-21, 1507 × 867):** centred, about 45% of the screen's width and 17% of its height, its bottom edge about 1% above the screen's; widened if a line needs it, never taller. Every size in the start screen's `--ui-unit` (one mockup pixel of a 1440 × 1024 frame; unclamped: flag 6): about 790 × 170 units, 10 from the bottom. The speaker's name in the box's top left.
- **The button prompt, bottom right (owner):** the glyph of the last device used (E, the pad's interact button, or a mouse click) and what it does now: **Skip** while the line types, **Next** when it's done and more follows, **End** on the last line. It's also the "line done" marker (flag 2).
- **The help text at the bottom of the screen** (the controls' list) sits where the box goes: hidden while the box is up.
- **Typewriter:** as the Design Challenge's (all characters laid out, the untyped ones transparent, line breaks fixed from the start); about 35 ms a character, tunable; a soft typing tick on the `ui` bus every few characters (a placeholder sound).
- **Input:** click, E / Enter, or the pad's interact button: complete the line, then the next line, then end. Presses only, debounced (flag 3). After the end, the interaction prompt stays hidden for a second (flag 1). Choices (pass 2): D-pad / stick / arrows and the same button, as the start screen's menu.
- `DialogueBox.svelte` in `packages/ui`.

### During a conversation

- **The camera keeps its position** (owner); look input does nothing until it ends. **The handheld effect (pass 1b, to try):** the camera orbits slowly around the person she's talking to (for her remarks, the thing she's looking at), a few degrees each way, with a little drift on its aim, like a hand-held camera; it eases in at the start and back to where it was at the end, so the player's framing is what they get back. It moves within the camera's existing collision (it stops at walls as it does now). Nothing to author per conversation. **About 1½ hours;** flagged if it goes past 2 (the orbit and the collision fighting in tight rooms is the likely cost).
- **She stops;** movement, jumping, the jetpack and the prompts are off. She doesn't turn her body; the heads turn (pass 3, below).
- **The world keeps running** (the crew's loops, doors, sounds). Nothing pauses.

### The save: never a conversation twice, unless the player wants it

- **Ink remembers** what has been said: every knot's visit count and every variable are in Ink's state, and Ink's state is in the save.
- **The save is written after every conversation ends** (and after a `use_<id>` knot that changed a variable), not only at scene starts: the same checkpoint scene with Ink's new state. A reload starts the checkpoint's scene again (her at its start, props reset) with the story as it was after the last conversation. *Today* a reload goes back to Ink's state at the scene's start, so a conversation since then would be offered again: this is the gap it closes.
- **What a conversation changes in the world must be in Ink** (a variable a scene's setup reads with `if` / `unless`), never only a command, or a reload loses it. `npm run check` warns about a `talk_` knot that runs a `set` / `lock` / `unlock` command without setting a variable.
- **Talking again:** the knot decides, from its visit count: the first time the conversation; later, a short line (*"Anything else?"*) and, if the owner wants, a choice to hear it again (*"Say that again?"*): that's *unless they want to*. A pattern, written once in the test story for the owner to copy.
- **A reload mid-conversation** starts that conversation over (no save inside one; they're short).

### The crew's animations (owner: you make them in Blender, we mix them in code)

**How Eigodojo does it** (`Lesson 1 - Cafe 1.06 - 24FPS.blend`, read 2026-10-21): each character has an `Idle` action (Noise modifiers on Body, Head, hands, no keys of note) and a `Talk` action that **is the idle plus a Noise modifier on `Head` X rotation** (Alex: scale 10, strength 0.25; the idle's own noise kept, same offsets, so it continues seamlessly). NLA strips of `Talk` set to *Replace* cover the stretches where they speak.

**For the game, the recommended setup:**

*In Blender, per character, on the shared skeleton:*
- **`<name>_idle`:** the full-body loop, made as you like (Noise modifiers are fine). **About 10 s long.**
- **`<name>_talk`:** **only the `Head` bone's X rotation**: one key at 0 and a Noise modifier, **blend type *Add*** (not *Replace*), so it means a nod *added to* whatever the head is doing. Hands too if you want them to move while talking (also *Add*). **About 4 s long.** Nothing else in the action.
- Both as actions in the crew file (or stashed in the NLA, as Eigodojo does); the crew export takes them by name. Noise modifiers don't exist in glTF: the exporter **samples** the animation, which bakes them into keys. Nothing to bake by hand.
- **Loop seams:** noise doesn't repeat, so the last frame doesn't match the first. You can ignore it: the game crossfades each loop's end into its start (0.3 s). Or, for the talk action, turn on the modifier's *Restricted Frame Range* with a blend in and out of a few frames, so it starts and ends at rest.

*In code (three.js `AnimationMixer`):*
- The **idle** plays, looping, at full weight; it's their base (later: sitting, working at a station, any scene loop).
- The **talk** clip is made **additive** (`AnimationUtils.makeClipAdditive`, relative to its first frame) and plays on top, at weight 0. **While their line is typing out, its weight eases to 1 (0.15 s); when the line is complete, or when someone else is speaking (her included), it eases back to 0** (owner: the nod lasts as long as the line types). The nod sits on top of whatever the idle does with the head, so the idle never stops: no snap between the two.
- **Facing each other (owner's question): done in code, likely no change to the models.** After the mixer, each of the two turns toward the other: the `Head` bone up to about 60° of yaw and 20° of pitch, the `Body` bone a third of it, eased in over 0.4 s and back when the conversation ends; past the limits they turn only that far (no whole-body turn: their feet would slide, and the seated ones can't). **Exceptions (owner, 2026-10-21):** where a character can't turn to face her, they **only move their head a little** toward her side. The first case: **someone in the pilot's or co-pilot's seat** (she talks to them from behind or beside the seat): the head about 15° of yaw at most, no `Body`. The limits come **with the pose**, not the character: a scene's `place` command (or later the idle it sets, *sitting in a cockpit seat*) carries a `turn` level (*full*, the default standing; *small*, the seated exceptions; *none*, if one turns up that shouldn't move at all), so the same person standing in the galley turns fully. When she's behind them, a *small* turn goes toward the side she's on, never through the back of the seat. It's added on top of the idle and the talk, so all three play together. What the models need, checked in pass 3 before building: the `Head` bone's pivot at the base of the head (neck), and the same axes on every character (one skeleton, so it should be). If a character fails either, that's a fix in Blender, the only possible model change. A neck bone isn't needed.
- **Dr. Green** gets the same: a `green_talk` on her model while her line types (later, when you make it).

*Why not Eigodojo's Replace strips:* the game doesn't know when a line starts or how long it is until it's played, so the mix has to happen live; an additive talk layer works over any base pose (sitting, working) without a talk copy of every idle.

*Until your actions exist:* a procedural nod in code (a small eased X rotation) stands in, so pass 3 can be built and played; your `_talk` action replaces it per character with no other change.

## The work, in passes (a stop to assess after each)

**Pass 1: one line from each crew member, and her remark on the pilot's seat (about 3 hours).**
- The **pilot's seat gets an id**: the empty seat at the front (owner); I find the object and name it by the id rules (`cockpit-seat-…`), with a kind `seat`, by a Blender script tried on a scratch copy, **the save announced first**, a backup kept; then `npm run export:ship` (the gate flags the new id, `export:accept` after checking).
- A thing with no action of its own gets a prompt when the story has `use_<id>` (its `# verb:`, *Look*); the crew get *Talk to Dr. Kaufman* (and so on) when `talk_<id>` exists. Prompts above the crew's heads.
- `GameStory` hands out one line at a time (speaker, text) instead of printing it.
- `DialogueBox.svelte`: the placeholder at the owner's size, the typewriter, the speaker's name, the button prompt (*Skip*, *End*). Input: complete, then end (one line per knot in this pass); presses debounced, the prompt hidden for a second after the end (flags 1, 3); the help text hidden while the box is up.
- During it: the camera keeps its position, she stops, prompts off.
- Test story: `talk_kaufman`, `talk_ogawa`, `talk_adam_red`, `talk_adam_blue` with one placeholder line each; `use_<the seat's id>` with *Green: It's not time to go yet.*
- *Check:* a probe talks to each crew member and the seat (key presses: complete, end), checks the camera didn't move, her control is back, and a second press right after the end doesn't start it again; screenshots of the box at two window sizes, compared with the owner's marks.

**Pass 1b: the handheld camera (about 1½ hours; flagged if past 2).** The slow orbit around the person she's talking to, as above. *Check:* screenshots at the start and a few seconds in; the camera back where it was at the end.

**Pass 2: conversations (about 2½ hours).** Several lines and speakers, choices (pad, keys, mouse), `# comms`, the speakers checked by `npm run check`; **the save after each conversation** and the "talk again" pattern; a text speed in the tuning panel. *Check:* a probe has a conversation with a choice, reloads, continues, and finds it remembered (the short line instead).

**Pass 3: the crew's animations (about 3 hours, after your actions, or with the stand-in nod first).** The crew export takes `<name>_idle` / `<name>_talk`; the idle loop with the seam crossfade, the additive talk weighted by who's speaking, the head turn. *Check:* a probe reads the `Head` bone moving only while a crew member's line types; screenshots.

**Pass 4: the fade on the crew (item 59) (about 1½ hours).** Her fade applied to every character when the camera comes close.

**Pass 5: barks and subtitles (about 2 hours).** Barks over the head; the `line` event on the cutscene track.

**Then:** the comm and its chat, its own plan.

Each pass ends with `npm run check`, `npm run build` and its probe; the smoke script once, at the end of the last pass of a session. About 13½ hours in all; roughly 1½–2 % of the weekly budget per pass at this week's rate (a guess; the hook's figure checked before each).

## Done when

- The agent: each pass's probe, `npm run check`, `npm run build`, the smoke script with no new failures, screenshots.
- The owner: talks to each crew member and tries the pilot's seat on the gamepad at http://localhost:5202/ (pass 1); later passes as above.

## Open questions for the owner

All answered (two reviews, 2026-10-21): the pilot's seat is **the empty seat at the front**; the flags as settled above; the nod **as long as the line types**; the animation setup **agreed**; facing each other: in code, the models checked in pass 3. **Left: the go-ahead for pass 1** (and 1b after it).

## After

- `doc/features/dialogue.md` (new): what exists, and the Ink conventions (knots, speakers, tags, the "talk again" pattern) for whoever writes the story.
- `architecture/README.md`: the Dialogue and Presenters rows; the Markdown-or-Ink question closed.
- `characters.md` (*Talking*, *Animation files*), `audio.md` (the typing cue), `design/README.md` (the box), [saving](../architecture/game-architecture/saving.md) (the save after each conversation).
- `features/interaction.md` (talk, remarks), the code map, `tools/README.md`, the backlog (items 59, 71).
