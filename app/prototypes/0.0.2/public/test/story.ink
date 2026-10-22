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

EXTERNAL command(name, id, value)

VAR side_door_unlocked = false
// What Dr. Green wears (her locker, the `outfit` command): "jumpsuit" or "parka". The game keeps it
// with her clothes (main.ts); a scene's setup can set it.
VAR green_outfit = "jumpsuit"

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

=== talk_kaufman ===
Kaufman: [Test] Placeholder line from Dr. Kaufman.
-> DONE

=== talk_ogawa ===
Ogawa: [Test] Placeholder line from Dr. Ogawa, long enough to wrap onto a second line of the box at most sizes.
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
