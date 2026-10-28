# Plan: tracking the work in Linear

> **[Agent note]** **Superseded 2026-10-28** (owner: not worth the trouble): the owner's tasks are in [`doc/tasks.md`](../../tasks.md). Kept for history.

**Status:** *approved* (owner, 2026-10-22: "write the plan and go"). Two passes, a stop between them. **Pass 1 done 2026-10-22** (SC-5 to SC-42); **pass 2 done 2026-10-22** (the projects, SC-43 to SC-115, the docs). Built.

## Goal

**The owner's manual tasks tracked in one place** (owner, 2026-10-22), kept up to date by the agent with as little of the owner's effort as possible: **a clear view of the owner's next task, and of how the project is going.**

## Where

- Linear workspace at `linear.app/eigodojo`, team **Studio Cataplasma** (`SC`); the projects labelled *The Zamboni*, starting with [*The Zamboni: ongoing*](https://linear.app/eigodojo/project/the-zamboni-ongoing-2fdb167f8d22) (its description explains the layout). The Eigodojo team and its projects are separate: never touched.

## How it's organized

- **Linear is for the owner, a human** (owner, 2026-10-22): to know what to work on and see how the project is going without asking. **The repo stays the source of truth.** An issue carries what's needed to work on it: when the relevant part of a doc is a paragraph or two, it's **copied into the issue**; a longer one is summarized, with a link.
- **One project per big piece of work with an end** (owner, 2026-10-22), made when its plan is approved and completed at the owner's sign-off; past ones made retroactively as completed projects (Linear dates their completion the day they're marked: the real dates are in each description). **Everything small, open or *later* goes to *The Zamboni: ongoing***, which never closes; a new snag in a finished area goes there too, never back into the finished project. Every project carries the project label `The Zamboni` (the workspace also holds Eigodojo).

- **The owner's tasks are assigned to the owner** (Ricardo). Linear's *My issues* is the owner's list; the first one by priority is the next task. **The agent's work is unassigned.**
- **Labels** (the team's): `blender` (work in the `.blend`), `script` (the owner's writing), `play-test` (something built, for the owner to try), `approval` (a plan or result waiting on sign-off), `decision` (a choice only the owner can make); kinds `build`, `design`, `docs`, `research`, `Bug`.
- **Statuses:** *Backlog* (later, set aside, on hold); *Todo*; *In Progress*; *In Review* (built, the owner's to try: assigned to the owner, `play-test`); *Done*; *Canceled* (replaced or dropped).
- **Backlog items keep their numbers** in the title (`77 · The flying scene…`), so "item 77" in the docs and the decision log still finds them. New issues get no number: they're `SC-n`.
- **Passes are sub-issues** of their item (the flying scene's passes 0–6 under item 77). **An owner task that a pass needs *blocks* that pass**, so a blocked pass shows what it waits for.
- **How it's going:** a **project update** (Linear's status update, with health) written by the agent at the end of every session: what was done, what's next, what waits on the owner.

## What stays in the repo

The docs stay the source of truth for **what** and **why**: plans, decisions, feature docs, the owner's task specs (the Blender and script docs keep their tables and notes; their ticks move to Linear, each row linking its issue). `doc/steps/current.md` stays the session handover and points to issues instead of listing what waits on the owner. `doc/plans/backlog.md` becomes a pointer to Linear plus the owner's notes as written (unchanged).

## Keeping it automatic (the agent's routine)

- **End of every session:** issues moved to their new status, a comment on each issue worked on (what was done, the commit), new owner tasks created and assigned, the project update. Part of the rewrite of `current.md` (CLAUDE.md, *Picking the work up*).
- **When the owner says something is done** (in chat), the agent closes the issue; the owner can also just tick it in Linear: the agent reads the project at the start of a session.
- **Optional, the owner's:** Linear's GitHub integration would link commits naming `SC-n`; the repo is pushed rarely, so not needed now.

## Passes

1. **The owner's tasks now.** Project description, labels; item 77 and its seven passes; every owner task in the flying scene's Blender and script docs; the other things waiting on the owner (dialogue pass 2 to try, item 54's decision-log updates, the receiver in the export list, item 28's pressed button, item 70's choice). **Stop: the owner checks the view.**
2. **The projects, the rest of the backlog and the docs.** The projects below, the pass 1 issues moved into theirs; every other backlog item (the finished ones as *Done*; items from backlog passes 1–4 marked *Built* are taken as done, as they've been in every build since; the owner reopens any that isn't); `backlog.md` to a pointer; the Blender and script docs' ticks to issue links; CLAUDE.md, `current.md`, the decision log, `plans/README.md`; the first project update.

### The projects (pass 2; owner, 2026-10-22: "This is good")

| Project | Backlog items | State |
|---|---|---|
| Prototype 01 (frozen as 0.0.1) | 1, 2, 9, 12, 16, 17, 51 | Completed; 51's Vercel step and side-by-side check are the owner's |
| The see-through hull | 11, 13, 14, 15 (replaced by 41), 41 | In progress (41) |
| Doors, ladders and interaction | 3, 4, 5, 6, 7, 8, 22, 23, 29, 31, 33, 35, 44, 56 | Completed |
| The jetpack | 21, 32, 34, 37, 38, 39 | Completed |
| Sound and the start screen | 24, 26, 27, 28, 40 | Completed but 28 (the owner's look) |
| Collision | 18, 19, 20, 30, 42, 55 | Completed but 42 (the owner's play-test) |
| Exports and the pipeline | 25, 46, 48 | Completed |
| Load and performance | 36, 50, 57 | Completed |
| The game's structure | 49, 54 | Completed but the owner's review (SC-42) |
| Her locker's outfits | 72, 75 | Completed |
| The dialogue system | 71 | In progress |
| Chapter 1: the flying scene | 77 | In progress |
| The Zamboni: ongoing | 10, 43, 45, 47, 52, 53, 58–70 (but 69, done, in its crew check), 73, 74, 76 | Ongoing |

## Done when

The owner opens *My issues* and sees their next task; the project shows every backlog item with its status; the docs say Linear is the tracker.
