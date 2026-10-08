# The Zamboni — Documentation

Project documentation for *The Zamboni*, a short third-person story/exploration game by Studio Cataplasma. These docs are the project's source of truth: what the game is, how it's built and why, and where it stands. Start with [`overview.md`](overview.md), then [`steps/README.md`](steps/README.md) for what's being worked on now.

## Layout

```
doc/
  README.md            this file: index + documentation conventions
  overview.md          the game: pitch, pillars, structure, features, constraints
  decision-log.md      every project decision, newest first
  steps/               the project broken into steps (open-ended, added as we go)
  plans/               plans written before each step; not part of the final docs (see plans/README.md)
    README.md          step index with status
    NN-<slug>.md       one file per step: goal, deliverables, status, open questions
  architecture/        how the game is built
    README.md          system overview: game modes, systems, data flow, folder layout
    platform.md        delivery (web, offline app, hosting), input, test machines, performance targets
    prototypes.md      the prototype workspace: structure, rules, naming, list of prototypes
    stack.md           engine, libraries, versions, tooling
    scope.md           what's in, what's out, size targets
    asset-pipeline.md  Blender → glTF, naming contract between art and code
    audio.md           sound effects, music and dialogue audio workflow (open)
  design/              interface design: the design system (Figma + code), brand, screens, in-game devices
  features/            one design/implementation plan per feature
  story/               the narrative
    overview.md        premise, setting, themes, the mission
    cast.md            characters
    storyline.md       the order of scenes, beat by beat
    scenes/            one file per scene (script + stage directions)
  reference/           prior work this project draws on
    big-moon-tiny-moon.md   Part 1 of the story (2020–2022 Unity prototype)
    ue-prototype.md         the UE 5.7 prototype of The Zamboni
  _archive/            superseded documents, kept for history
```

## Related folders

The whole `The Zamboni/` folder is one git repo; `resources/` is ignored.

| Folder | What | In git? |
|---|---|---|
| `doc/` | This documentation | Yes |
| `app/` | The game: source code + production assets (exported glTF, game audio) | Yes |
| `resources/` | Source art: Blender files, textures, PSDs, reference images, audio masters | No |
| `C:\Users\31658\Desktop\The Zamboni.archive\` | Everything from earlier versions (UE projects, old Blender versions, renders). Only what's needed gets copied over | No |
| `D:\Work\Big Moon Tiny Moon\` | Part 1 prototype (see [`reference/big-moon-tiny-moon.md`](reference/big-moon-tiny-moon.md)) | No |

## Conventions

- **One file per natural unit** (a feature, a scene, a step), not one large document.
- **Say why.** Facts come with their reason; decisions go in [`decision-log.md`](decision-log.md) with context and alternatives.
- **Dates are absolute** (`2026-10-08`), never "last week".
- **Status is stated plainly** at the top of plan-type docs: *draft*, *proposed*, *decided*, *in progress*, *done*, *superseded*.
- **Open questions are listed explicitly**, in the doc they affect, under an "Open questions" heading, so they can be found and closed.
- **Links are relative** Markdown links between docs.
- **Docs that get superseded move to `_archive/`** with a note at the top pointing to what replaced them; they aren't deleted.
- **Naming is consistent everywhere a name appears.** Scene ids, asset names and code ids use the same lowercase-hyphenated slug (see [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md)).
