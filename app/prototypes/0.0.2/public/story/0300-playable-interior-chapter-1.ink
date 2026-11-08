// Included by story.ink: the lines of doc/story/scenes/0300 - Playable interior - Chapter 1.md, and the flight rules' and
// the ship's lines played in it. Knots only (anything above the first knot would join the story's
// start).

// Chapter 1 (doc/story/scenes/0300 - Playable interior - Chapter 1.md, word for word). She starts in the copilot's seat:
// Adam's line once the player has her (the scene's `begin`, after cutscene 2), then *Get up*; her
// line once she's up (main.ts runs `got_up` when she gets up).
=== chapter_1_start ===
Adam: I can keep an eye on things if you need a break.
-> DONE

=== got_up ===
Green: Thank you. I think I'll stretch my legs for a bit.
Green: Did anyone make coffee?
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

// Adam (owner, 2026-11-08): either body gives the same lines, and talking to one counts as talking
// to the other: both run one knot, so its visits are shared. The speaker is the body talked to (its
// name's colour). The script's first interaction, then its second; after that a placeholder (not
// written yet).
=== talk_adam_red ===
~ adam = "Adam Red"
-> adam_conversation

=== talk_adam_blue ===
~ adam = "Adam Blue"
-> adam_conversation

=== adam_conversation ===
{ adam_conversation > 2: -> again }
{ adam_conversation > 1: -> second }
{adam}: You know I don't really need to rest right?
{adam}: I can fly this thing and read a book at the same time.
Green: I know. But why should I let you have all the fun?
{adam}: Right.
-> DONE
= second
Green: Do you think we'll find another portal?
{adam}: Ask Dr. Ogawa.
{adam}: He's the one that has memorized all the frequencies and patterns.
Green: I thought you knew all that stuff too.
{adam}: Not enough room on these shells for all that data.
{adam}: I keep having to purge stuff.
{adam}: I wish we had a processing core in this stupid ship.
Green: You know we can't bring those through a portal.
Green: They come out scrambled like eggs.
{adam}: I know. I just feel very stupid.
Green: Welcome to the human condition.
-> DONE
= again
{adam}: [Placeholder] Adam's one-liner.
-> DONE

// Dr. Kaufman (owner, 2026-11-08): the owner's exchange the first time; her one-liner after (not
// written yet).
=== talk_kaufman ===
{ talk_kaufman > 1: -> again }
Kaufman: Hey Green Bean. What's up?
Green: Just stretching my legs a bit.
Green: How are things?
Kaufman: I'm bored out of my mind.
Kaufman: When are we landing?
Green: Another six hours, if we don't run into anything interesting.
Kaufman: Oh boy.
-> DONE
= again
Kaufman: [Placeholder] Dr. Kaufman's one-liner.
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
