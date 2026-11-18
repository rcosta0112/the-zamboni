# Chapter 1's first two lines on 0200's cameras

> **[Agent note]** Status: **built** (2026-11-18), as planned; the owner's look pending. Also: `tools/check-ids.mjs` knows `watch`; `opening-probe` now expects the bars kept after the exterior shot (chapter 1's lines follow). Its *saved at its end* check fails, with or without this change (older).

## Goal (owner, 2026-11-18)

0300 opens with Adam Blue's *"I can keep an eye on things if you need a break."* and her *"Thank you. I think I'll stretch my legs for a bit."*, each on its speaker's camera from cutscene 2 (0200), played like a cutscene: black bars, the handheld drift, lines moving on by themselves, a hold skips. After her line, a hard cut to the game's camera behind her seat, then the *Get up* prompt. The two lines stay part of 0300.

## How

1. **A conversation file** `public/conversations/chapter-1-start.json`: knot `chapter_1_start`, no opening wide shot, and `"shotsFrom": "opening"`, so it uses 0200's cameras (`adam-blue`, `green`) from `opening.json`. That way, when `tools/cutscene-cameras.py` writes new cameras, both scenes get them (`whats-that.json` has its own copies; it stays as it is). `watched.ts` `load` reads the field.
2. **A command `watch`** (`commands.ts`, main.ts): plays a watched conversation by id. Chapter 1's `begin` becomes `{ "do": "watch", "id": "chapter-1-start" }` instead of running the knot in the normal box. *Get up* comes once it ends (as now, once the box closes). Skipped, the same.
3. **Ink:** the speaker tag `Adam:` → `Adam Blue:` in `chapter_1_start` (a tag, not the copy). The line's name pill takes Blue's colour.
4. **Unchanged:** *"Did anyone make coffee?"* on getting up (the normal box, the game camera). The `?scene=0500` shortcut still skips the opening lines (`dropBegin`). The save after the lines, as now.
5. **Probes:** the five that go through chapter 1's start (piloting, landed, coffee, flight, opening) wait for the conversation to end or skip it. Piloting checks the camera is on Adam Blue's shot, then hers, then back behind her with *Get up*.

## Done when

The probes pass; check and build pass; screenshots of the two shots and the cut back look right; the docs (dialogue, scenes, CODE-MAP) describe it.

**Agent build:** ~30 min, checks included. **Review rounds:** 1 (watch http://localhost:5202/?scene=0300, and once after a new game, through cutscene 2).
