// The test story (the game's structure, pass 3): placeholder lines, never the owner's script.
// Compiled to story.json by `npm run ink` (in app/). The game reads its variables when a scene starts
// (a command's `if` / `unless`) and runs a knot `use_<id>` (dashes as underscores) when the thing
// with that id is used while what it controls is locked; the knot's `# verb:` tag is the prompt.
// The knots call the game through `command(name, id, value)`: one of commands.ts's (set, lock,
// unlock, enable, disable, sound, cutscene), `value` its state or cue ("" if none).

EXTERNAL command(name, id, value)

VAR side_door_unlocked = false

-> DONE

=== use_side_door_keypad ===
# verb: Unlock door
[Test] The keypad takes the code.
~ side_door_unlocked = true
~ command("unlock", "side-door", "")
~ command("sound", "side-door-keypad", "sfx_panel_open")
-> DONE

=== function command(name, id, value) ===
// Without the game (the compiler's test run): nothing.
~ return
