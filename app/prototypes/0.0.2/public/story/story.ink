// The game's story (the flying scene's plan, pass 1: doc/plans/features/flying-scene.md). The test
// story (public/test/story.ink) stays for the checks (`?test` in the address). Compiled to story.json
// by `npm run ink` (in app/).
// **The master copy is the owner's scene files** (doc/story/scenes/; owner, 2026-10-22): the lines
// here are copied from them, word for word, and changed only by copying them again. A line not
// written yet is a placeholder, marked `[Placeholder]` on screen. Comments are the agent's.
// How the game reads it: doc/features/dialogue.md, and the header of the test story.

EXTERNAL command(name, id, value)

// The ship is flying (a scene with `travel`): set by the game when a scene starts.
VAR ship_flying = false
// What Dr. Green wears (her locker, the `outfit` command): "jumpsuit" or "parka". The game keeps it
// with her clothes (main.ts); a scene's setup can set it.
VAR green_outfit = "jumpsuit"
// She wears a jetpack (the cargo hold's rack): kept with her the same way.
VAR green_jetpack = false

-> DONE

// Cutscene 2, the opening (doc/story/scenes/02-opening.md, word for word): watched, not played
// (owner, 2026-10-22): the camera on whoever speaks, each line moving on by itself
// (public/conversations/opening.json). Before chapter 1, after cutscene 1's card.
=== cutscene_opening ===
// *Aerial view of a frozen desert landscape. The Zamboni flies through the plain.* (cutscene 1's card for now)
// Cockpit. Ogawa: (over the comms)
Ogawa: Got a heading on the signal.
// Green: (in the co-pilot seat)
Green: How far?
Ogawa: Hard to tell. A couple thousand kilometers.
// Adam Red: (in the pilot seat)
Adam Red: About 6 hours if this chunk of garbage holds up.
Ogawa: Hey..
// Adam Blue: (in the nav seat)
Adam Blue: My apologies. This ship is a veritable work of art.
Adam Blue: Is that a red light on engine 2?
Ogawa: Burned capacitor. I’ll replace it when we land.
Adam Red: Setting the course. Hang on.
// *External view of the ship changing course.* (not built: no scenery yet)
-> DONE

// The flight rules (owner, 2026-10-22, the flying scene's plan): while the ship is flying, the game
// locks the outer doors and hatches (their keypads with them), the jetpacks and her parka; these
// knots run instead. One line for all the outer doors (variations perhaps later).
=== flight_outer_door ===
Green: It's not safe to open that right now.
-> DONE

=== use_side_door_keypad ===
# verb: Open side door
{ ship_flying: -> flight_outer_door }
-> DONE

=== use_cargo_ramp_keypad ===
# verb: Open cargo ramp
{ ship_flying: -> flight_outer_door }
-> DONE

=== use_top_hatch_lower ===
# verb: Open roof hatch
{ ship_flying: -> flight_outer_door }
-> DONE

=== use_top_hatch_upper ===
# verb: Open roof hatch
{ ship_flying: -> flight_outer_door }
-> DONE

// The jetpacks: locked only by the flight rules. Her jetpack is whichever the rack gives her.
=== flight_jetpack ===
Green: I don't need that right now
-> DONE

=== use_jetpack_1 ===
# verb: Take jetpack
-> flight_jetpack

=== use_jetpack_2 ===
# verb: Take jetpack
-> flight_jetpack

=== use_jetpack_3 ===
# verb: Take jetpack
-> flight_jetpack

=== use_jetpack_4 ===
# verb: Take jetpack
-> flight_jetpack

// Her parka: locked only by the flight rules.
=== use_green_parka ===
# verb: Put on parka
Green: it's too warm for that in here
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

// The right-hand cockpit seat (id `cockpit-seat-pilot` until the rename: hers, the copilot's).
// Landed: the owner's line. Flying: her seat's lines and *Sit down* are pass 2.
=== use_cockpit_seat_pilot ===
# verb: Look at the seat
{ ship_flying:
    Green: [Placeholder] Her seat, in flight (pass 2).
- else:
    Green: It's not time to go yet.
}
-> DONE

// The crew: placeholders until the owner's conversations (pass 2; the list of what to write is a
// comment at the end of doc/story/scenes/03-chapter-1.md).
=== talk_adam_red ===
Adam Red: [Placeholder] Adam Red's conversation.
-> DONE

=== talk_adam_blue ===
Adam Blue: [Placeholder] Adam Blue's conversation.
-> DONE

=== talk_kaufman ===
Kaufman: [Placeholder] Dr. Kaufman's conversation.
-> DONE

=== talk_ogawa ===
Ogawa: [Placeholder] Dr. Ogawa's conversation.
-> DONE

=== function command(name, id, value) ===
// Without the game (the compiler's test run): nothing.
~ return
