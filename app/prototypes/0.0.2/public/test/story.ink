// The test story (the game's structure, pass 3): placeholder lines, never the owner's script.
// Compiled to story.json by `npm run ink` (in app/). The game reads its variables when a scene starts
// (a command's `if` / `unless`) and runs a knot `use_<id>` (dashes as underscores) when the thing
// with that id is used while what it controls is locked; the knot's `# verb:` tag is the prompt.
// The knots call the game through `command(name, id, value)`: one of commands.ts's (set, lock,
// unlock, enable, disable, sound, cutscene), `value` its state or cue ("" if none).
// Talking to a character runs `talk_<id>`. A line names its speaker before a colon (Green, Kaufman,
// Ogawa, Adam Red, Adam Blue, Adam); a line with none is narration. Shown in the dialogue box.
// A knot's `# verb:` is the whole prompt, the thing's name included ("Unlock side door").
// A `use_<id>` knot tagged `# instead` runs in place of the thing's action, locked or not.
// Ink remembers what has been said (each knot's visit count, in the save): `talk_kaufman` shows how a
// conversation is had once, then a one-liner after it. The save is written after each knot ends.
// Topics are Ink's choices (`talk_ogawa` shows them): her lines to choose from, in the box under her
// name; the one picked isn't shown again, the answer follows. `*` a topic offered until heard, `+`
// always; the text goes in `[…]` (so Ink doesn't print it again). Four at most fit.

EXTERNAL command(name, id, value)

VAR side_door_unlocked = false
// The ship is flying (a scene with `travel`): set by the game when a scene starts.
VAR ship_flying = false
// What Dr. Green wears (her locker, the `outfit` command): "jumpsuit" or "parka". The game keeps it
// with her clothes (main.ts); a scene's setup can set it.
VAR green_outfit = "jumpsuit"
// She wears a jetpack (the cargo hold's rack): kept with her the same way.
VAR green_jetpack = false

-> DONE

=== use_side_door_keypad ===
# verb: Unlock side door
// [Test] The keypad takes the code. (Not said: the cutscene starts at once.)
~ side_door_unlocked = true
~ command("unlock", "side-door", "")
~ command("sound", "side-door-keypad", "sfx_panel_open")
~ command("cutscene", "test-ship-shots", "")
-> DONE

// The crew's lockers: hers stays shut (owner, 2026-10-21, the owner's lines).
=== use_crew_locker_door_2 ===
# verb: Open Dr. Kaufman's locker
# instead
Green: That's Dr. Kaufman's locker. I shouldn't open it.
-> DONE

=== use_cargo_locker_door ===
# verb: Open Dr. Ogawa's locker
# instead
Green: That's Dr. Ogawa's locker. I shouldn't open it.
-> DONE

// The pilot's seat: no action of its own, only her remark (the owner's line).
=== use_cockpit_seat_pilot ===
# verb: Look at pilot's seat
Green: It's not time to go yet.
-> DONE

// A whole conversation the first time; every time after, the one-liner (`again`).
=== talk_kaufman ===
{ talk_kaufman > 1: -> again }
Kaufman: [Test] First screen, from Dr. Kaufman, long enough to wrap onto a second line of the box at most sizes.
Green: [Test] Second screen: her answer.
Kaufman: [Test] Third screen, from Dr. Kaufman again.
Green: [Test] Fourth screen: hers, and the end.
-> DONE
= again
Kaufman: [Test] The one-liner, every time after the conversation.
-> DONE

// Topics: an opener, then her lines to choose from; the answer; a topic heard is gone from the list;
// the leave topic ends it.
=== talk_ogawa ===
// Every topic heard: straight to the one-liner.
{ talk_ogawa.signal and talk_ogawa.feeling: -> again }
// The opener: the first time, and a shorter one after.
{ talk_ogawa > 1:
    Ogawa: [Test] Anything else?
- else:
    Green: [Test] Her opener.
    Ogawa: [Test] His answer to it.
}
- (topics)
// `(signal)` the topic's name, to ask later whether it was heard (`talk_ogawa.signal`).
* (signal) [(Test) Her first question?]
    Ogawa: [Test] His answer to the first.
    -> topics
* (feeling) [(Test) Her second question?]
    Ogawa: [Test] His answer to the second.
    -> topics
// A topic offered only once something has happened: here, once she has talked to Dr. Kaufman.
* (kaufman) {talk_kaufman} [(Test) Her question about Dr. Kaufman?]
    Ogawa: [Test] His answer about Dr. Kaufman.
    -> topics
+ [(Test) That's all for now.]
    -> DONE
= again
Ogawa: [Test] The one-liner, once every topic is heard.
-> DONE

=== talk_adam_red ===
Adam Red: [Test] Placeholder line from Adam (Red).
-> DONE

=== talk_adam_blue ===
Adam Blue: [Test] Placeholder line from Adam (Blue).
Green: [Test] A second line, from her: Next, then End.
-> DONE

=== function command(name, id, value) ===
// Without the game (the compiler's test run): nothing.
~ return
