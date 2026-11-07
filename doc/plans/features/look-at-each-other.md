# Characters look at each other when they talk to Dr. Green

**Status:** *draft, for review* (2026-11-07).

The owner (2026-11-07): *"characters look at each other when they talk. This would only happen when they talk to Dr. Green. Any exceptions would be made explicit. Characters that are seated or can't naturally turn their heads should not do so (for example, if they are sitting at their console and Dr. Green is standing behind them). If the characters are standing (we don't have this situation yet, but will) they should turn to face each other unless there's a reason not to. When in doubt, ask."*

Answers to the agent's questions (same day):
- **Standing:** the **whole body** turns to face the other person (the head leads). There's no turn-in-place animation, so the feet slide a little.
- **Dr. Kaufman on the couch:** her **head turns, and her body a bit**.
- **When a normal head turn isn't possible** (she's behind the seat, out of reach): the head turns **about 15° toward her side, as if listening**. This is the general rule, not an exception.

## Goal and scope

- **In:** whoever Dr. Green talks to and Dr. Green herself turn toward each other during a conversation, as far as their pose allows. They turn back when it ends. Built first for the two rigged characters (Dr. Green, Dr. Kaufman), then for Ogawa and the Adams once the crew export keeps their bones (pass 2).
- **Out:** the talk nod (dialogue plan, pass 3; the owner's SC-146…149); looking at interesting objects as she walks past them (architecture note, later); crew members looking at each other (only when one of them talks to Dr. Green, owner); a turn-in-place animation.

## Conflicts with the docs (flagged)

1. **The dialogue plan's "facing each other" (2026-10-21)** said: head up to 60° and `Body` a third, **no whole-body turn**, and a *small* 15° turn only as an exception for the cockpit seats, carried by the pose (`full` / `small` / `none`). The owner's answers now replace it: standing characters turn their whole body; the 15° *listening* turn is what anyone does whenever a normal turn isn't possible, decided by where she is rather than set per pose. A dated *Update* goes into the decision log and the dialogue plan; the old text stays.
2. **`characters.md` (*Talking*): "the head turns toward the player when a conversation starts."** It becomes "toward Dr. Green, as their pose allows", with a link here.

## What each one does

Who turns: in a `talk_<id>` conversation, Dr. Green and `<id>`. In a watched conversation (cutscene 2), nobody, unless a line says who it's addressed to (pass 2's tag, below).

| Pose | Dr. Green within reach (about 70° of where they face) | Dr. Green out of reach (beside-behind, behind) |
|---|---|---|
| **Standing** | Whole body turns to face her (head first, the body following over about 0.5 s) | The same: the whole body turns |
| **Seated** | **Normal turn:** head up to about 60° of yaw and 20° of pitch, the upper body about 15° (the legs counter-turned so they stay put on the seat) | **Listening turn:** head about 15° toward the side she's on, never through the back of the seat; no body |

- **Seated** means: the scene's `seat` command has seated them (it exists for Dr. Green; the scenes would also seat the crew who sit: Kaufman on the couch, the Adams in their seats). Anyone else is standing.
- **The same rules apply to Dr. Green.** Standing in a conversation (every one so far), she turns to face the other person. She keeps that facing when the conversation ends; the camera doesn't move, as now.
- **Explicit exceptions** (owner: "any exceptions would be made explicit"): the scene's setup can give someone `look: "listen"` (always the small turn) or `look: "none"` (no turn). Nobody has one yet.
- **Eased:** in over about 0.4 s when the conversation starts, back to the pose's own over about 0.4 s when it ends. The crew turn back to where they faced; nothing is saved.
- **On top of the animation:** the turn is applied after the animation mixer each frame, so Kaufman's reading loop (and later the nod) keeps playing under it.

**Why the legs are counter-turned:** on this skeleton `Body` is the root bone and the legs hang from it, so turning `Body` alone would swing a seated character's legs off the couch. Turning the legs back by the same angle keeps them where they were.

## How

**Pass 1: the look on Dr. Green and Dr. Kaufman.**
- `look.ts` (new): each frame, for the conversation's two people, the angle from where each faces to the other's head; the rules in the table above; the head bone turned about the vertical, then its pitch; for a seated normal turn, `Body` turned and the legs counter-turned; for a standing turn, the character's root turned (Dr. Green's facing in `character.ts`; a crew member's `Placement` root). Eased in and out as above.
- `dialogue.ts` / `story.ts`: the conversation's partner (`talk_<id>` → `<id>`) handed to `look.ts` when it starts, cleared when it ends.
- The scenes: `{ "do": "seat", "id": "kaufman" }` in chapter 1's setup (she's on the couch). If the `seat` command does more than mark someone seated, a separate `pose` field in the setup instead.
- `settings.ts` and the tuning panel: the reach angle, the head's limits, the listening turn's angle, the ease time, so they can be tuned while playing.

> **[Agent note]** 2026-11-07: the export half of pass 2 is done: the crew export skins all four with their idle loops (the owner's 1.22 animations), and Adam's mesh is weighted to `Head` (their loop turns it). Pass 2 is now only the look itself.

**Pass 2: Ogawa and the Adams.** The crew export bakes them into static meshes (no bones), so nothing can turn. It would export them **skinned, with their pose as a one-frame clip**, as Kaufman is: an export change, no edit to the `.blend`. **To check first:** Adam's body is one rigid block. If the head isn't its own part weighted to `Head`, Adam can't turn their head until that's changed in Blender (an owner task, flagged then). Then the Adams seated in their seats, Ogawa as the file has him (seated at the Signal Station now; standing at the sensor array when SC-19 comes).

**Cutscene 2 (pass 2, only if the owner wants it):** everyone is seated, and almost every line is between the crew. The one exchange with Dr. Green is Ogawa's *"Hard to tell. / A couple thousand kilometers."*, and the script has Ogawa *"(over the comms)"* there (SC-143, open). If he's over the comms, there's nobody to look at; if he's in the cockpit, a tag on his lines (`# to: green`; a tag, not copy) would give her a listening turn. Left until SC-143 is answered.

## Done when

- **The agent:** a probe (`look-probe.js`): chapter 1, she walks up to Kaufman from in front and talks: Kaufman's `Head` turns toward her (within the limits), her `Body` a little, her legs where they were; Dr. Green's facing turns to Kaufman. Then from behind the couch: only the 15° listening turn, toward the side she's on. After the conversation, both back (Kaufman's pose as her loop has it). Screenshots of both. `npm run check`, `npm run build`, the smoke script once at the end.
- **The owner:** talks to Kaufman from the front and from behind the couch at http://localhost:5202/?scene=chapter-1, on the gamepad.

## Estimate

Agent: pass 1 about 1 hour, pass 2 about 45 minutes (more if Adam's head needs a Blender fix). Owner review: one round per pass, at http://localhost:5202/?scene=chapter-1.

## Open questions for the owner

1. **Go-ahead for pass 1** as above.
2. **Dr. Green keeps her new facing** after the conversation (the alternative: she turns back to where she stood). The plan assumes she keeps it.
3. **Cutscene 2:** leave it without turns until SC-143 is answered? The plan assumes yes.

## After

- `doc/features/dialogue.md`: who turns, the table, the `look` exception, the settings.
- `characters.md` (*Talking*), the dialogue plan and the decision log: dated updates (conflicts 1 and 2).
- The code map (`look.ts`), `tools/README.md` (the probe), `doc/tasks.md` (a Blender task for Adam's head, if pass 2 finds one is needed).
