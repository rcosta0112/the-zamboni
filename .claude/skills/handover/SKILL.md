---
name: handover
description: End the session - rewrite doc/steps/current.md (and tasks.md) so a fresh session can pick up the next task with the least reading. Use when the owner says /handover, "hand over", "wrap up" or "end the session".
argument-hint: "[what to do next, if the owner already knows]"
---

# Handover

Goal: the next session reads `CLAUDE.md` (automatic) + `doc/steps/current.md` and can start work at once, opening nothing else it doesn't need. Short sessions, small context, no loss of effectiveness.

**Work from what this session already knows.** Don't re-read code, plans or docs to write the handover; don't run checks to fill it in. Read only `doc/steps/current.md` (to rewrite it) and the lines of `doc/tasks.md` you change (Grep for the `SC-n`).

## 1. Settle the state (no tool calls unless needed)

- What was done this session; what is built but **uncommitted**; what was **verified** (check, probe, smoke, screenshot) and what wasn't.
- If `src/` changed and the full smoke hasn't run since, don't run it: write "smoke not run since <change>" in *How to verify* and say so in chat.
- The **one next task** (the argument, if given; else the obvious next step; if it waits on the owner, say what it waits on and give the next task that doesn't).
- New owner decisions or rules from this session: confirm they're already in their real doc (plan, decision log, feature doc, `world.md`). If not, write them there now, not in `current.md`.

## 2. Rewrite `doc/steps/current.md` (60 lines at most; not a log)

Keep its header, the version block, *Known traps* and *How to verify* (update the last-run line). Then:

- **Top: "Next session: start here"**, at most ~8 lines, the part the next session must act on:
  - the task, with its plan link and pass (and whether the owner's go is still needed);
  - **the files to open, exact paths** (and the code-map entry), plus what *not* to open if it's tempting and irrelevant;
  - the state it starts from (uncommitted files, dev server, page to test, e.g. http://localhost:5202/...);
  - the check to run first (`npm run probe -- tools/<file>.js`, with its last result);
  - anything found out this session that would cost tokens to find again (a cause, a dead end, a value).
- **Other threads:** one line each, a link to the plan holding the details. Push detail into the plans/feature docs, not here.
- **Drop** what's finished and committed, what's in git history, and old "latest:" chains in the header (keep only today's and the last commit). If a thread hasn't moved in weeks and lives in `tasks.md`, cut it to the task number.
- Update the weekly-budget figure from the hook's latest message.
- Count the lines (`wc -l`); over 60, cut further.

## 3. Update `doc/tasks.md` with edits, not a regeneration

Remove done items, add new owner tasks (continue from the highest `SC-n`; set the "continue from" number in `current.md`), re-pick *Next up*. One line per task.

## 4. Clean up

- `current.md` is the only handover. Don't write separate handover files. If one exists in `doc/steps/` (`handover-*.md`) and `current.md` now carries it, list it in chat as ready to delete (don't delete untracked files without the owner's yes).
- Don't commit (rule 7); say what's uncommitted.

## 5. Report in chat (short)

- Done / uncommitted / not verified, in 3–5 lines.
- Whether the page needs a reload or a server restart (rule 8).
- **The opening line for the next session**, ready to paste, e.g.:
  `Read doc/steps/current.md and do <task> (<plan>, pass <n>).`
- If the session ran long, suggest starting the next one fresh rather than continuing here.
