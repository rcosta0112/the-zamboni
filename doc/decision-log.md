# Decision Log

A running record of project decisions: technology, architecture, pipeline, scope, story direction and documentation. Newest first. Each entry is headed `## [YYYY-MM-DD] — Title (area)` and follows **Context → Decision → Alternatives considered → Rationale → Status**. When a decision changes, add an **Update (date):** note under the entry instead of rewriting it, so the history stays visible.

---

## [2026-10-08] — See-through hull rules (feature)

**Context:** Step 3; the [plan](plans/features/see-through-hull.md) asked where to build it, what happens outside the ship, and how to treat the ceiling.

**Decision:**
- Built in prototype 01.
- **Inside** the ship: a capsule-shaped hole from the camera to Dr. Green's chest, dither-edged, through cuttable surfaces only; the ceiling is cut by the same capsule (no full cutaway, for now). Tune the radius to fix issues.
- **Outside:** no cut; normal camera collision.

**Alternatives considered:** cutting outside too, whenever the hull is in the way; hiding the ceiling entirely while inside (cutaway view).

**Status:** Built. See [`features/see-through-hull.md`](features/see-through-hull.md).

---

## [2026-10-08] — Ink for dialogue (tech)

**Context:** The dialogue language was open: Ink was proposed, Yarn Spinner was used in Part 1.

**Decision:** Ink, run in the browser with `inkjs`. One Ink story drives face-to-face dialogue, comm chats and barks, and holds the story state.

**Alternatives considered:** Yarn Spinner (Part 1); its official runtimes target Unity and Godot, and the JavaScript ports are less complete.

**Status:** Decided, after the owner's review of the docs. Still open: whether the Markdown scene docs or the Ink files are the master copy of the dialogue once implemented.

---

## [2026-10-08] — Inverted Y in prototypes, normal in production (input)

**Context:** The owner plays with inverted vertical look.

**Decision:** Prototypes default to **inverted Y**; production builds default to **normal**. Either can be changed in settings (prototypes: the tuning panel or the Y key).

**Status:** Done in prototype 01; rule in `CLAUDE.md` and [`architecture/prototypes.md`](architecture/prototypes.md).

---

## [2026-10-08] — No spoken dialogue; characters talk by nodding (scope)

**Context:** Voice acting was an open question in scope and audio. The owner also answered how characters move while talking.

**Decision:** No spoken dialogue: all dialogue is text. Characters have no mouth movement (no shape keys, no jaw): they talk by rotating their heads on the X axis, like nodding.

**Rationale:** owner's call. It keeps the download and production small, and suits the visual-novel side of the game.

**Status:** Decided. Scope, audio and the [characters plan](plans/architecture/game-architecture/characters.md#talking) updated.

**Update (2026-10-08):** the nod is **hand-animated**, one talk loop per character. A procedural nod (in time with the text box) was proposed; the owner doesn't think it's needed for now.

---

## [2026-10-08] — Prototype workspace built; TypeScript 6 (tech)

**Context:** The owner wants several prototypes built in parallel without affecting the main code ([plan](plans/architecture/repo-and-prototypes.md)).

**Decision:** Git repo at `The Zamboni/`; one npm workspace in `app/` with `packages/` (shared code, promoted on second use; `packages/ui` from the start) and `prototypes/NN-<slug>/` (one Vite app each, port 5200 + NN); shared assets in `app/assets/` (not `app/public/assets/` as first proposed). `CLAUDE.md` at the repo root carries the owner's rules for the agent. **TypeScript is pinned to 6.0.3, not 7**, because `svelte-check` supports only TypeScript 5–6.

**Alternatives considered:** a shared engine package from day one (rejected: guesses at what's shared before it exists); pnpm (an extra tool for no gain at this size).

**Status:** Built. See [`architecture/prototypes.md`](architecture/prototypes.md).

---

## [2026-10-08] — Platform, saving and performance targets (scope)

**Context:** The owner's review of the game architecture plan.

**Decision:**
- **Installable web app, playable offline:** the player can download everything at once.
- **Save / continue is Core:** checkpoint saves; props (books etc.) aren't tracked and reset on reload.
- **Performance targets:** 60 fps on the owner's PC (GTX 1070), **30 fps is acceptable** on the MacBook Pro 13" 2020 (Iris Plus G7). No Steam Deck target.
- **Hosting:** Vercel, probably.
- **Landing scenes:** 6 to 10, with some repeat locations; some have ruins, mostly unique models.
- **Characters:** the humans share a skeleton and some animations; each has several animations (run, walk, talk…).
- **Story levers:** the owner controls the story and script and is open to changing them to relieve performance issues; plans flag where that applies.

**Status:** Decided. Recorded in [`architecture/platform.md`](architecture/platform.md), [`architecture/scope.md`](architecture/scope.md), [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md); details in the [game architecture plan](plans/architecture/game-architecture/README.md).

---

## [2026-10-08] — Gamepad is the main input (scope)

**Context:** [`architecture/scope.md`](architecture/scope.md) listed keyboard and mouse as the input, and gamepad as a *Maybe*.

**Decision:** Gamepad first; keyboard and mouse supported as secondary. Every screen and menu must work with a gamepad, and button prompts follow the last device used.

**Rationale:** owner's call.

**Status:** Decided. Scope, stack, architecture, design and the prototype 01 plan updated.

---

## [2026-10-08] — Svelte 5 for the UI (tech)

**Context:** The UI layer (dialogue box, comm and its apps, menus, device screens) is large and stateful, and it's the code version of a Figma design system.

**Decision:** Svelte 5 (runes mode) with Vite, not SvelteKit, rendering an HTML/CSS overlay above the Three.js canvas. The 3D side stays plain Three.js. The design system's code version lives in a shared `packages/ui`.

**Alternatives considered:** React (most examples, and Figma's design-to-code output defaults to it, but it needs an external store and care to avoid re-renders next to a game loop); plain TypeScript DOM code (messy at this size).

**Rationale:** the owner's Eigodojo design-system pipeline (Figma ↔ Svelte components, gallery, visual tests) is proven; Svelte compiles away and plugs game state straight into reactive state.

**Status:** Decided. See [`architecture/stack.md`](architecture/stack.md).

---

## [2026-10-08] — A design system in Figma, with a code version (design)

**Context:** The game has a lot of interface: the dialogue box, the comm and its apps, menus, the HUD, and the screens of in-game devices (PCs, handhelds, ship displays).

**Decision:** One design system covers brand, game screen, interfaces and in-game devices. It's fully documented in Figma, with a code version the game uses. Workflow as in Eigodojo: Figma for mockups, Figma MCP + Claude Code for automation. Docs in [`design/`](design/README.md).

**Status:** Decided. Open: whether the code version uses a UI framework.

---

## [2026-10-08] — `doc/` goes in git: the whole project folder is the repo (pipeline)

**Context:** The first plan made only `app/` a git repo, which would have left the documentation without version history.

**Decision:** The whole `The Zamboni/` folder is the git repo, so `doc/` and `app/` are versioned together. `resources/` (source art) is ignored. Not initialised yet; that happens at repo setup.

**Alternatives considered:** a separate repo for `doc/`; keeping `doc/` inside `app/`.

**Rationale:** owner's call. One repo keeps the docs and the code they describe in the same history.

**Status:** Decided. Updates the "Source art stays out of git" entry below.

---

## [2026-10-08] — In-world name: comm, not phone (docs)

**Context:** The owner noted that smartphones are called **comms** in the game world (recorded in [`story/world.md`](story/world.md)).

**Decision:** Docs and code use *comm* for the device and its chat feature (`Comm` system, `comm/` code folder). "Comms" also keeps its other meanings in the script (the crew's radio channel); a word with several meanings, by design.

**Status:** Done in the docs.

---

## [2026-10-08] — Documentation structure (docs)

**Context:** The project needs full documentation, modelled on how the owner's Eigodojo project was documented, but without Eigodojo's product-design phases (research, define, ideate…) and without documenting the workflow itself.

**Decision:** The structure in [`README.md`](README.md): a game overview, a decision log, open-ended numbered **steps** instead of fixed phases, `architecture/`, `features/` (one plan per feature), `story/` (overview, cast, storyline, one file per scene), `reference/` for prior work, and `_archive/`. The original `HANDOVER.md` was split into these files and archived; the story document copied from Google Docs (`the-zamboni.md`) was split into `story/`.

**Alternatives considered:** Eigodojo's 10 fixed product phases. Not used: this isn't a product-design process, and the work is open-ended.

**Rationale:** one file per natural unit is easy to find, link and keep current; steps can be added as the project grows.

**Status:** Done.

---

## [2026-10-08] — Source art stays out of git (pipeline)

**Context:** The source art (Blender files, textures, PSDs, reference) is about 1.1 GB and binary.

**Decision:** The git repo (`app/`) holds only source code and production assets (exported glTF, game-ready audio). Source art lives in `art/`, outside git. Material from earlier versions stays in `The Zamboni.archive` and is copied over only when needed.

**Alternatives considered:** Git LFS for source art.

**Rationale:** owner's call: keep the repo for code and what ships.

**Status:** Decided. See [`architecture/asset-pipeline.md`](architecture/asset-pipeline.md).

**Update (2026-10-08):** the owner renamed `art/` to `resources/`. And the repo is now the whole `The Zamboni/` folder, not just `app/`, so `doc/` is versioned too; `resources/` stays out of git (entry above).

---

## [2026-10-08] — Engine: plain Three.js r186 with TSL (tech)

**Context:** The UE 5.7 prototype is Blueprint-only and binary, which works against a workflow where an AI agent writes most of the code. The owner wants the project in text files, web delivery was attractive from the start, and the game needs third-person movement, indoor and outdoor areas.

**Decision:** Plain Three.js (no React Three Fiber) with TypeScript, `WebGPURenderer` and TSL for shaders, pinned to `three@0.186.1` exactly. Upgrades are deliberate, one release at a time, after reading the migration notes.

**Alternatives considered:**
- **Godot 4.** Real visual editor and lightmapping; text scene files. Ranked lower for agent work: Godot 3/4 API mix-ups, error-prone hand edits of `.tscn`, harder for the agent to see the running game.
- **Babylon.js.** More built in (physics, character controller, audio), strong backward compatibility; fewer examples to draw on.
- **PlayCanvas, Needle Engine, Wonderland Engine, Bevy.** Cloud-hosted editor projects, an add-on layer over Three.js, small XR-focused community, or no mature editor and harder for an agent, respectively.

**Rationale:** Three.js has the most training data and examples, everything is code, and the agent can run the game in a browser and check screenshots and console errors itself. TSL is newer and has fewer examples; pinning the version and pointing the agent to the r186 examples in `node_modules/three/examples` (`webgpu_*`) limits the risk.

**Status:** Decided. See [`architecture/stack.md`](architecture/stack.md).
