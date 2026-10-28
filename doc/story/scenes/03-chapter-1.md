## Chapter 1

*The player starts sitting on the copilot's chair.*

**Adam**\
I can keep an eye on things if you need a break.

> **[O Get up]**

**Green**\
Thank you. I think I'll stretch my legs for a bit. Did anyone make coffee?

*The player can walk around the ship and talk to the crew.*

*Adam is in the pilot seat and on the navigator seat*

*Dr. Kaufman is in the crew quarters reading a book.*

**Kaufman**\
*(no line yet)*

*Dr. Ogawa is sitting on the signal processing station.*

**Green**\
Can you tell what that signal is?

**Ogawa**\
It’s not a beacon or a communication signal as far as I can tell.\
It’s pretty similar to the signature of a portal, but it’s a lot fainter.
There are some gaps in the spectrum I can’t account for.

**Green**\
Care to speculate?

**Ogawa**\
...
We don't have enough information.
It could be another portal. It could be something else entirely.  

**Green**\
It could be a giant penguin.

**Ogawa**\
Dr. Kaufman would love that for sure.




lines that didn't fit anywhere:
We're in another galaxy. The laws of physics still seem to hold up even though we can't really tell how the portals work.

<!--
[Agent note] How topics look in Ink (owner, 2026-10-22: added on request). Pass 0 of the flying
scene; the design is in doc/plans/features/dialogue.md (Topics). The lines in brackets and the
opener are placeholders; the signal lines are from the script above.

=== talk_ogawa ===
// Every topic heard: straight to the one-liner.
{ talk_ogawa.signal and talk_ogawa.feeling: -> again }
// The opener: the first time, and a shorter one after.
{ talk_ogawa > 1:
    Ogawa: Anything else?
- else:
    Green: Got a minute?
    Ogawa: Sure.
}
- (topics)
// `*` a topic offered until heard; `(signal)` its name, to check it later;
// `[…]` the text in the list only (her line can say it differently).
* (signal) [Can you tell what that signal is?]
    Green: Can you tell what that signal is?
    Ogawa: It’s not a beacon or a communication signal as far as I can tell.
    Ogawa: It’s pretty similar to the signature of a portal, but it’s a lot fainter and there are some gaps in the spectrum I can’t account for.
    -> topics
* (feeling) [How are you feeling?]
    Green: How are you feeling?
    Ogawa: (his answer)
    -> topics
// A topic only offered once something has happened.
* {green_had_coffee} [Want a coffee?]
    Green: Want a coffee?
    Ogawa: (his answer)
    -> topics
// `+` always offered: the way out.
+ [That's all for now.]
    -> DONE
= again
Ogawa: (the one-liner)
-> DONE

// Elsewhere, the story asks whether a topic was heard:
=== use_cockpit_seat_copilot ===
# verb: Sit down
{ not talk_ogawa.signal:
    Green: I want to ask Dr. Ogawa about the signal.
    -> DONE
}
-->

<!--
[Agent note] The conversations still to write (copied from doc/plans/features/flying-scene.md,
section 2, on the owner's request, 2026-10-22). Until a line is written, the game shows a
placeholder, always marked [Placeholder] on screen so it can't pass for the script.

| #    | What                                   | Status                       | Placeholder in the game until written |
|------|----------------------------------------|------------------------------|----------------------------------------|
| 2.1  | The opening exchange in her seat       | Written (above)              | none                                   |
| 2.2  | Adam Red and Adam Blue: one each, or   | To write; one or two?        | Adam Red: [Placeholder] Adam Red's conversation. / Adam Blue: [Placeholder] Adam Blue's conversation. Their one-liners: [Placeholder] Adam's one-liner. |
|      | one shared "Adam" conversation         |                              |                                        |
| 2.3  | Dr. Kaufman: conversation, one-liner   | To write ("no line yet")     | Kaufman: [Placeholder] Dr. Kaufman's conversation. / [Placeholder] Dr. Kaufman's one-liner. |
| 2.4  | Dr. Ogawa (required): the rest of the  | Partly written (above)       | The written lines as they are; his one-liner: [Placeholder] Dr. Ogawa's one-liner. |
|      | conversation, his one-liner            |                              |                                        |
| 2.5  | Her refusals at the seat: Ogawa first, | Ogawa's written: "I want to  | Green: [Placeholder] I haven't had my coffee yet. |
|      | then the coffee                        | ask Dr. Ogawa about the      |                                        |
|      |                                        | signal." Coffee's to write   |                                        |
| 2.6  | The coffee remark on entering the      | To write                     | Green: [Placeholder] Coffee remark in the crew quarters. |
|      | crew quarters (once, before the coffee)|                              |                                        |
| 2.7  | The coffee: its prompt, her line while | To write                     | Prompt: Pour a coffee. Green: [Placeholder] Coffee line. / Again: [Placeholder] Already had one. |
|      | she drinks, a line if she tries again  |                              |                                        |
| 2.8  | Her seat once she can sit: the prompt, | To write                     | Prompt: Sit down. No line.             |
|      | any line before the cutscene           |                              |                                        |
| 2.9  | Her remarks on things in flight (the   | Optional                     | none                                   |
|      | windows, the viewport, the sensor      |                              |                                        |
|      | array, the signal receiver)            |                              |                                        |
| 2.10 | Where the text lives in the game: a    | To decide                    | -                                      |
|      | story file of its own for chapter 1    |                              |                                        |

Topics: each conversation can offer topics (see the Ink example above). The prompts (Pour a
coffee, Sit down) are game labels, not dialogue: say if you want other words.
-->
