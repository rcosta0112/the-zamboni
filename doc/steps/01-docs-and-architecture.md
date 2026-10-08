# Step 1 — Documentation structure and project architecture

**Status:** in progress (started 2026-10-08).

## Goal

Set up the documentation so the whole project is documented from here on, and define the project's architecture: stack, scope, how the game is put together.

## Deliverables

| Deliverable | File | Status |
|---|---|---|
| Documentation structure and conventions | [`../README.md`](../README.md) | Done |
| Game overview | [`../overview.md`](../overview.md) | Done (from the owner's brief) |
| Decision log | [`../decision-log.md`](../decision-log.md) | Started |
| Story docs: overview, cast, storyline, scenes | [`../story/`](../story/overview.md) | Done (moved from `the-zamboni.md`) |
| Part 1 summary | [`../reference/big-moon-tiny-moon.md`](../reference/big-moon-tiny-moon.md) | Done |
| UE prototype reference | [`../reference/ue-prototype.md`](../reference/ue-prototype.md) | Done (moved from `HANDOVER.md`) |
| Stack | [`../architecture/stack.md`](../architecture/stack.md) | Engine decided; libraries proposed |
| Scope | [`../architecture/scope.md`](../architecture/scope.md) | Draft, needs owner review |
| Architecture overview (modes, systems, data, folders) | [`../architecture/README.md`](../architecture/README.md) | Draft, needs owner review |
| Asset pipeline + naming contract | [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md) | Draft |
| Game architecture plan: levels, loading, budgets, characters, performance, saving, offline | [`../plans/architecture/game-architecture/`](../plans/architecture/game-architecture/README.md) | Draft, for review |
| Design folder (design system scope and workflow) | [`../design/README.md`](../design/README.md) | Set up |
| Audio workflow | [`../architecture/audio.md`](../architecture/audio.md) | Open for discussion |

The original `HANDOVER.md` (2026-10-06 → 2026-10-08) was split into these files and moved to [`../_archive/HANDOVER.md`](../_archive/HANDOVER.md).

## Done when

- The owner has reviewed scope and architecture and the open questions below are answered or deliberately deferred.
- The decisions are in the decision log.

## Open questions

Collected from the docs above; each is also listed where it applies.

**Project setup**
- ~~Should `doc/` be under version control?~~ **Decided 2026-10-08:** yes. The whole `The Zamboni/` folder is the repo, with `resources/` ignored (see [`../decision-log.md`](../decision-log.md)).

**Architecture** ([`../architecture/README.md`](../architecture/README.md), [`../architecture/stack.md`](../architecture/stack.md))
- ~~Ink as the dialogue language~~ **Decided 2026-10-08: Ink.**
- Markdown scene docs or Ink files as the master copy of dialogue once implemented?

**Scope** ([`../architecture/scope.md`](../architecture/scope.md))
- Camera style indoors: free orbit, fixed angles, or cutaway/isometric?
- What's at each landing (6 to 10 scenes, some repeat locations: decided 2026-10-08).
- What the outdoor sites look like, and how the player moves between inside and outside.
- Action segments: any, and what?
- Languages. (Voice acting: none, decided 2026-10-08. Hosting: Vercel, probably.)

**Audio** ([`../architecture/audio.md`](../architecture/audio.md))
- Who makes the music, and in what style; license or replace the Anamanaguchi and 2NRO8OT tracks; sound-effect sourcing.

**Story** ([`../story/`](../story/overview.md), [`../reference/big-moon-tiny-moon.md`](../reference/big-moon-tiny-moon.md))
- See each story file's open questions (Adam's pronouns and unit names, links to Part 1).
