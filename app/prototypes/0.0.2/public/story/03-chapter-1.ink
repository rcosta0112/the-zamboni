// Included by story.ink: the lines of doc/story/scenes/03-chapter-1.md, and the flight rules' and
// the ship's lines played in it. Knots only (anything above the first knot would join the story's
// start).

// Chapter 1 (doc/story/scenes/03-chapter-1.md, word for word). She starts in the copilot's seat:
// Adam's line once the player has her (the scene's `begin`, after cutscene 2), then *Get up*; her
// line once she's up (main.ts runs `got_up` when she gets up).
=== chapter_1_start ===
Adam: I can keep an eye on things if you need a break.
-> DONE

=== got_up ===
Green: Thank you. I think I'll stretch my legs for a bit. Did anyone make coffee?
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

// Dr. Ogawa: the owner's exchange the first time; his one-liner after (not written yet).
// Each line of the script is a screen of its own; ellipses are lines, verbatim (owner, 2026-10-28).
=== talk_ogawa ===
{ talk_ogawa > 1: -> again }
Green: Can you tell what that signal is?
Ogawa: It’s not a beacon or a communication signal as far as I can tell.
Ogawa: It’s pretty similar to the signature of a portal, but it’s a lot fainter.
Ogawa: There are some gaps in the spectrum I can’t account for.
Green: Care to speculate?
Ogawa: ...
Ogawa: We don't have enough information.
Ogawa: It could be another portal. It could be something else entirely.
Green: It could be a giant penguin.
Ogawa: Dr. Kaufman would love that for sure.
-> DONE
= again
Ogawa: [Placeholder] Dr. Ogawa's one-liner.
-> DONE
