# Characters look at each other when they talk to Dr. Green

**Status:** *pass 1 built 2026-11-07* on the owner's go ("update the plan and start on pass 1"), for all four crew: the other session's crew export had skinned them all. See the agent note at the end.

The owner (2026-11-07): *"characters look at each other when they talk. This would only happen when they talk to Dr. Green. Any exceptions would be made explicit. Characters that are seated or can't naturally turn their heads should not do so (for example, if they are sitting at their console and Dr. Green is standing behind them). If the characters are standing (we don't have this situation yet, but will) they should turn to face each other unless there's a reason not to. When in doubt, ask."*

Answers to the agent's questions (same day):
- **Standing:** the **whole body** turns to face the other person (the head leads). There's no turn-in-place animation, so the feet slide a little.
- **Dr. Kaufman on the couch:** her **head turns, and her body a bit**.
- **When a normal head turn isn't possible** (she's behind the seat, out of reach): the head turns **about 15° toward her side, as if listening**. This is the general rule, not an exception.

## Goal and scope

- **In:** whoever Dr. Green talks to and Dr. Green herself turn toward each other during a conversation, as far as their pose allows. They turn back when it ends. **Update 2026-11-07:** all four crew are skinned now (the owner's animations, exported in another session; Adam's head is weighted to `Head`, 195 vertices on each body), so pass 1 covers everyone.
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
- **The same rules apply to Dr. Green.** Standing in a conversation (every one so far), she turns to face the other person, and **turns back to where she stood when it ends** (owner, 2026-11-07); the camera doesn't move, as now.
- **Explicit exceptions** (owner: "any exceptions would be made explicit"): the scene's setup can give someone `look: "listen"` (always the small turn) or `look: "none"` (no turn). Nobody has one yet.
- **Eased:** in over about 0.4 s when the conversation starts, back to the pose's own over about 0.4 s when it ends. The crew turn back to where they faced; nothing is saved.
- **On top of the animation:** the turn is applied after the animation mixer each frame, so Kaufman's reading loop (and later the nod) keeps playing under it.

**Why the legs are counter-turned:** on this skeleton `Body` is the root bone and the legs hang from it, so turning `Body` alone would swing a seated character's legs off the couch. Turning the legs back by the same angle keeps them where they were.

## How

**Pass 1: the look, on Dr. Green and all four crew** (was: Dr. Green and Kaufman only).
- `look.ts` (new): each frame, for the conversation's two people, the angle from where each faces to the other's head; the rules in the table above; the head bone turned about the vertical, then its pitch; for a seated normal turn, `Body` turned and the legs counter-turned; for a standing turn, the character's root turned (Dr. Green's facing in `character.ts`; a crew member's `Placement` root). Eased in and out as above.
- `dialogue.ts` / `story.ts`: the conversation's partner (`talk_<id>` → `<id>`) handed to `look.ts` when it starts, cleared when it ends.
- The scenes: `{ "do": "seat", "id": "<id>" }` for each crew member who sits (all four, in every scene so far: Kaufman on the couch, the Adams and Ogawa in the cockpit). The `seat` command takes any character now; for the crew it only marks them seated.
- `settings.ts` and the tuning panel: the reach angle, the head's limits, the listening turn's angle, the ease time, so they can be tuned while playing.

> **[Agent note]** 2026-11-07: the export half of pass 2 is done: the crew export skins all four with their idle loops (the owner's 1.22 animations), and Adam's mesh is weighted to `Head` (their loop turns it). Pass 2 is now only the look itself.

~~**Pass 2: Ogawa and the Adams.**~~ Not needed: the export side was done in another session (agent note above), and the look itself went into pass 1.

**Cutscene 2 (later, only if the owner wants it):** everyone is seated, and almost every line is between the crew. The one exchange with Dr. Green is Ogawa's *"Hard to tell. / A couple thousand kilometers."*, and the script has Ogawa *"(over the comms)"* there (SC-143, open). If he's over the comms, there's nobody to look at; if he's in the cockpit, a tag on his lines (`# to: green`; a tag, not copy) would give her a listening turn. Left until SC-143 is answered.

## Done when

- **The agent:** a probe (`look-probe.js`): chapter 1, she walks up to Kaufman from in front and talks: Kaufman's `Head` turns toward her (within the limits), her `Body` a little, her legs where they were; Dr. Green's facing turns to Kaufman. Then Adam Blue in the front seat with her in the aisle behind: only the 15° listening turn, toward the side she's on (behind the couch is a wall). After the conversation, both back (Kaufman's pose as her loop has it). Screenshots of both. `npm run check`, `npm run build`, the smoke script once at the end.
- **The owner:** talks to Kaufman on the couch and to the Adams and Ogawa in the cockpit from behind and beside their seats, at http://localhost:5202/?scene=chapter-1 (*Get up* first), on the gamepad.

## Estimate

Agent: pass 1 about 1 hour (now for everyone). Owner review: one round, at http://localhost:5202/?scene=chapter-1.

## Open questions for the owner

1. ~~Go-ahead for pass 1~~ (given 2026-11-07).
2. ~~Dr. Green keeps her new facing?~~ **No: she turns back to where she stood** (owner, 2026-11-07; built).
3. ~~Cutscene 2 until SC-143?~~ **SC-143 closed** (owner, 2026-11-07): Ogawa is in the cockpit, at the Signal Station. Cutscene 2: **no turns** (owner, 2026-11-07: nobody turns their head during the cutscene); a watched conversation turns nobody, as built.

## After

- `doc/features/dialogue.md`: who turns, the table, the `look` exception, the settings.
- `characters.md` (*Talking*), the dialogue plan and the decision log: dated updates (conflicts 1 and 2).
- The code map (`look.ts`), `tools/README.md` (the probe), `doc/tasks.md`.

> **[Agent note]** **Pass 1, as built (2026-11-07):** `src/look.ts` (`LookAt`): each frame after both mixers (main.ts, after `crew.mixer.update`), every looker's `Head`, `Body` and legs back to the animation's pose, then for the two in the conversation the table above. **Where someone faces** is their `Body` bone's forward, in the skeleton's axes read once from her model on its first frame (her `facing` against her `Body`): one skeleton for everyone, and all four crew read as facing the ship's nose or the couch's front, as the screenshots show. Her whole-body turn is `Character.turnBy` (her facing, kept after); a standing crew member's would turn their root about their feet and back (no one stands yet, so untried). The partner comes from the crew's *Talk to* (`crewInteractables` passes the id; main.ts `look.set(['green', id])`), cleared when the box closes. The `seat` command takes any character (the crew only marked seated); all four seated in every scene's setup, the checks' too. Settings `look*` on the tuning panel (*Interaction › Looking at each other*). **Not built:** the `look: "listen" | "none"` exceptions (none asked for yet; a field on `seat` when the first comes). **Checked:** `tools/look-probe.js`, 8 pass: Kaufman from in front to her left, head 22.5°, body 7.5°, pitch 20° (clamped: she looks up at her); Dr. Green turned to 0.1° of facing her and keeps it after; Kaufman back to 0; Adam Blue from behind to their right, head −15°, no body, back after; Ogawa untouched. Screenshots `.export/look/front.png`, `behind.png`. One bug found and fixed on the way: the skeleton's facing was first read before her model's own yaw was set, so everyone faced backwards.

> **[Agent note]** **Update 2026-11-07 (owner's answers):** she turns back after the conversation (`keepsTurn` off for her in main.ts; the probe's check now *turned back*, 0.0°), 8/8. SC-143 closed: Ogawa is at the Signal Station in the cockpit. `check-ids.mjs` had its own copy of the old *only green can be seated* rule and failed `npm run check` on the crew's seats (missed in pass 1: the check ran before the scenes changed): it now takes any crew id. `npm run check` passes.

> **[Agent note]** **Fix 2026-11-07 (owner: only Adam Blue turned):** the glTF loader makes repeated names unique, so in the crew file only the first skeleton has `Head`, `Body`…; the others' are `Head_1`, `Head_2`, `Head_3`. `look.ts` found bones by the exact name, so only Adam Blue's were turned; the others' turns were computed but drove nothing, and their facings fell back to their roots (hence four identical facings). Bones are now found by name with or without the `_n` suffix. **The probe missed it** because it read the look's own numbers: it now checks each rig's bones and that Kaufman's and Adam Blue's head bones really turn against their bodies (26.8°, 24.3°). 14 checks pass.

> **[Agent note]** **2026-11-07 (owner):** the turn back takes twice the turn in: `lookEaseBack` 0.8 s (tuning panel *turn back time*). **Ogawa "looking in the wrong direction"** at the owner's spot (feet 3.63, 3.572, −18.992, beside him at the Signal Station): measured, his head turns toward her (58.8° → 41.3° off her), but she's 78° off his facing, past `lookReachDeg` (70°), so he gets only the 15° listening turn and keeps facing his console. Asked: widen the reach (a full turn when beside a seat), or something else.

> **[Agent note]** **Fix 2026-11-07 (owner: Ogawa "looks past Dr. Green", with a screenshot):** the turn was added on top of the head's own pose in the loop, measured from the body; Ogawa's loop already turns his head ~19° her way, so the turn aimed past her, and at the owner's spot (78° from his body) he was out of reach: the listening turn left him 41° to her left. Now the head is **aimed from where it already looks** (the limits still from the body), and **reach is counted from the head** too. At the owner's spot: 1° off her sideways, 4° in height (58° before). Kaufman and the Adams, heads straight on their bodies, barely change. `look-probe.js` 14/14.
