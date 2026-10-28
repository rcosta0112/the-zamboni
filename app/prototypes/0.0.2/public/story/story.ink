// The game's story (the flying scene's plan, pass 1: doc/plans/features/flying-scene.md). The test
// story (public/test/story.ink) stays for the checks (`?test` in the address). Compiled to story.json
// by `npm run ink` (in app/).
// **The master copy is the owner's scene files** (doc/story/scenes/; owner, 2026-10-22): the lines
// here are copied from them, word for word, and changed only by copying them again. A line not
// written yet is a placeholder, marked `[Placeholder]` on screen. Comments are the agent's.
// How the game reads it: doc/features/dialogue.md, and the header of the test story.
// **One file per scene file** (2026-10-28), included below: knots only. This file keeps the
// variables, the start and the `command` function. Knot and variable names are shared by all files.

EXTERNAL command(name, id, value)

// The ship is flying (a scene with `travel`): set by the game when a scene starts.
VAR ship_flying = false
// What Dr. Green wears (her locker, the `outfit` command): "jumpsuit" or "parka". The game keeps it
// with her clothes (main.ts); a scene's setup can set it.
VAR green_outfit = "jumpsuit"
// She wears a jetpack (the cargo hold's rack): kept with her the same way.
VAR green_jetpack = false

-> DONE

INCLUDE 02-opening.ink
INCLUDE 03-chapter-1.ink

=== function command(name, id, value) ===
// Without the game (the compiler's test run): nothing.
~ return
