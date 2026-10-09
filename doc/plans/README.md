# Plans

A plan is written **before** each project step: what will be built, how, in what order, and how we'll know it's done. Plans are reviewed by the owner before work starts.

**Plans are not part of the final documentation.** Once the project is built, the documentation describes what exists (`doc/architecture/`, `doc/features/`, …); the plans that led there are left out. Keeping them in their own folder from the start makes that separation easy. Some folder names repeat between `plans/` and the rest of `doc/` (e.g. `plans/architecture/` and `architecture/`); that's intended.

## Layout

```
plans/
  README.md          this file: index + plan format
  architecture/      plans for building the project's structure (repo, workspace, tooling)
  prototypes/        one plan per prototype
  features/          plans for building game features (added as needed)
```

## Index

| Plan | For step | Status |
|---|---|---|
| [Game architecture (levels, loading, budgets, characters, performance, saving, offline)](architecture/game-architecture/README.md) | [Step 1](../steps/01-docs-and-architecture.md) | Draft, for review |
| [Repo and prototype workspace](architecture/repo-and-prototypes.md) | [Step 2](../steps/02-first-prototype.md) | Done |
| [Prototype 01: walk](prototypes/01-walk.md) | [Step 2](../steps/02-first-prototype.md) | Built; owner play-test pending |
| [Prototype 02: low-resolution rendering](prototypes/02-low-res.md) | [Step 2](../steps/02-first-prototype.md) | Draft, for review |
| [See-through hull](features/see-through-hull.md) | [Step 3](../steps/03-see-through-hull.md) | Built; owner play-test pending |
| [See-through rules (what gets cut, and when)](features/see-through-rules.md) | [Step 3](../steps/03-see-through-hull.md) | Built (four passes); rule table next |

## Plan format

Each plan has:

- A **status** line: *draft*, *approved*, *in progress*, *done*, *superseded*, with dates.
- **Goal** and **scope**: what's in and what's explicitly out.
- **Constraints from the docs**: anything in `doc/` the plan must respect, with links. Conflicts are flagged, not silently resolved.
- **The work**, in numbered stages, each small enough to check on its own.
- **Options** where there's a real choice: each with its cost, and a recommendation.
- **Done when**: how the result is checked, by the agent and by the owner.
- **Open questions** for the owner.
- **After**: which docs get written or updated once the work is done.
