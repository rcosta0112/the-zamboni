# Context prompt: The Zamboni (handover to a new session)

> **[Agent note]** Written 2026-11-19 (state refreshed 2026-11-20, after the flight shots' passes 1–2) to paste into a new session (Claude Code or a chat). It summarises; the repo's docs are the source of truth and win where this differs. It will go stale: the live state is always `doc/steps/current.md` and `doc/tasks.md`.

---

You're picking up work on **The Zamboni**, a short (about one hour) third-person story/exploration game for the web, visual novel × immersive sim, by **Studio Cataplasma** (a solo owner). It's Part 2 of a story begun in the Unity prototype *Big Moon Tiny Moon*. A crew travels across an icy, rocky planet in an old converted transport ship, looking for portals. No violence, not open world, mostly linear with dialogue choices. The player character is **Dr. Green** (she); the crew includes **Adam** (*they/them*, an AI with two bodies, **Red** and **Blue**, technical ids Unit 1 / Unit 2), **Dr. Kaufman** and **Dr. Ogawa**. The in-world smartphone is a **comm**.

## Where things are

The project folder (`C:\Users\31658\Desktop\The Zamboni\`) is one git repo, branch `main`, about 170 commits since 2026-10-08.

- `CLAUDE.md`: the agent's rules. **Read it first; it overrides defaults.**
- `doc/`: the **source of truth**. Start with `doc/steps/current.md` (the state of the work in progress, 60 lines at most), then `doc/tasks.md` (open items by kind, numbered `SC-n`; new ones continue from **SC-188**). Decisions: `doc/decision-log.md` (read its index, then only the entry you need). Plans: `doc/plans/`. What exists: `doc/features/`, `doc/architecture/`, `doc/design/`. Story: `doc/story/` (the scene scripts are in `doc/story/scenes/`, named `NNNN - Type - Description.md`).
- `app/`: an npm workspace. The current prototype is **0.0.2** (`app/prototypes/0.0.2/`, dev server http://localhost:5202/, Vercel https://002-teal.vercel.app/). **0.0.1 is frozen** (port 5201, tag `v0.0.1`). The code map is `app/prototypes/0.0.2/CODE-MAP.md`; scripts are listed in `app/prototypes/0.0.2/tools/README.md`. Shared UI code is in `app/packages/ui`.
- `resources/`: the source art (`.blend` files, textures, audio masters). **Not in git, and the agent's file tools can't read it** (denied in `.claude/settings.json`). Blender scripts and node scripts run from the project root can reach it. The ship file is `resources/models/The Zamboni 1.22.blend`.

## Stack

Three.js **0.186.1 pinned exactly**, with `WebGPURenderer` (falls back to WebGL2) and shaders in **TSL** (check `node_modules/three/examples/webgpu_*`, not older online examples). TypeScript 6, Vite 8, Svelte 5 in runes mode for the UI (not SvelteKit). **Ink** (`inkjs`) for dialogue and story state, Rapier for physics. **The gamepad is the main input**; every UI must work with a pad. Desktop Chrome is the only test target for now. Blender 5.2 is at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` (not on PATH); ffmpeg and Python 3.11 are on PATH.

## Commands (in `app/`)

`npm run dev` · `npm run check` (types and ids) · `npm run build` · `npm run probe -- tools/<file>.js` (one check against the running game, about 20 s) · `npm run smoke` (the whole scripted check, about 3.5 min, **once at the end** of a session's changes, output to a file, never piped through `tail`) · `npm run export:ship|crew|player|temple` (Blender → compressed glTF with a summary and a gate) · `npm run export:accept -- <name>` · `npm run rest-poses`. Dev URLs take `?scene=0050|0100|0200|0300|0500|0600|0700`. Last smoke run (2026-11-20): only the 4 known failures (listed in `current.md`).

## How the work runs

- **One owner** (they/them), with an AI coding agent (Claude Code) doing most of the engineering. Work happens in sessions. Each session starts by reading `current.md` and ends by **rewriting** `current.md` and `tasks.md`.
- **Plan, review, build, document.** Before each step, the agent writes a short plan in `doc/plans/` (format in `doc/plans/README.md`, summary length). The owner reviews it, and building starts only after that. Afterwards the agent updates the real docs to describe what was built and records decisions in the decision log (Context → Decision → Alternatives → Rationale → Status; dated *Update* notes, never rewrites). **Small fixes** (one object or one value) skip the plan: a line in the relevant doc plus `current.md`.
- **Big tasks are flagged first and split into passes**, with a stop between passes for the owner to assess. Give two estimates, the agent's build time and the owner's review rounds. The agent's past estimates ran 4–10× too high.
- **Checking:** check narrowly while working (a probe per change), fully once (smoke). Type-check, build, then look at the running game (screenshots via headless Chrome scripts, console errors). Report what was and wasn't verified. Most features have a `tools/*-probe.js`.
- **Owner-facing rules:** give the dev server link whenever there's something to look at. After every edit, **say if the running page needs a reload or a server restart**; no flag means the owner tests without reloading. **Commit only when the owner asks.**
- **Budget:** this project may use **50% of the plan's weekly token limit**. A hook (`.claude/usage/`, local) adds the current figure to every message (18% on 2026-11-20; the week resets Monday 09:30). Check it before a big pass. Past 50%, say so and stop for the week.
- **Docs conflicts:** if a request conflicts with the docs, flag the conflict and don't silently follow either side.

## AI tools vs manual work

**Done by the AI agent (Claude Code):**
- **Nearly all code:** the Three.js/TSL rendering (see-through hull, shaders that rebuild the owner's Blender looks such as the planet, water, ice, clouds and hologram), the character controller and physics, interaction, cutscene playback, the dialogue box, save, audio engine, the Web Audio synth, and optimisation (palette materials, merging meshes per room).
- **The pipeline tooling:** the export scripts (headless Blender Python plus Node/gltf-transform steps: resize, dedup, WebP, Meshopt, a gate that compares against the last export), id checks, cutscene data generators, and Blender helper scripts (always tried on a scratch copy first). The ship file's own edits are the owner's.
- **Testing:** probes and the smoke suite in headless Chrome, with a made-up gamepad and dev hooks on `window`.
- **Documentation upkeep:** plans, the decision log, feature docs, the code map, `current.md`, `tasks.md`.
- **Copying the owner's script into Ink word for word.** Rules: a name alone on a line is the speaker, one screen per line, anything unclear is flagged. The agent never writes the copy.
- **Placeholder sounds** generated by script from tones and noise. **Figma MCP:** Figma designs turned into Svelte code (e.g. the dialogue box from the owner's mockup) and Figma files updated.
- **Optional, saving the owner's `.blend`:** allowed, but announced every time. Check Blender isn't running and back up first.

**Done by the owner, by hand:**
- **All story and writing:** story, cast, scenes, dialogue. **The agent never edits `doc/story/`** or any of the owner's text without a specific instruction. Tags and comments in script files are fine. The exception is `doc/story/world.md`: the owner's world comments are recorded there, and agent additions are tagged `> **[Agent comment]**`. If a story change could ease a technical problem, the agent offers it as an option and doesn't apply it.
- **All 3D art and animation in Blender:** the ship, the crew, Dr. Green, animations, props, cloud and planet source files. The owner makes small ship-file edits and runs `npm run export:ship` themselves. **They announce `.blend` edits before a task**; the agent compares the new file with the last version and asks if it differs from what was said. The agent states what a file needs, not Blender how-tos.
- **Design:** the Figma mockups and design system (Figma is the source of truth for how things look).
- **Sound choice:** library picks, recordings, synth patches.
- **Tuning looks and feel:** on the in-game lil-gui panels and dev pages (all linked from `tools.html`: `synth.html`, `scanner-synth.html`, `planet.html`, `water-test.html`, `shot-editor.html`). The owner pastes or saves the values back.
- **Play-testing on a gamepad,** all decisions, plan reviews, commits and Vercel setup.

As far as the docs show, **no generative AI is used for art, audio or writing**. The current audio is placeholders (from the earlier UE prototype, libraries, or made by script); licensing comes up only at a production-ready build. The project was moved from Unreal (binary Blueprints) to a text-file web stack on purpose, so that an agent can read, change, compare and check everything.

## Conventions worth knowing

- Agent notes in docs are tagged `> **[Agent note]**`. Dates are absolute. Docs use relative links. One file per natural unit.
- Pad buttons: the owner may name them in any convention (PS, Nintendo, Xbox). Map the name to the button's position and don't correct them. Docs use L1/R1 and L2/R2 for shoulders and triggers.
- Prototypes: code is promoted to `app/packages/` on its second use. Each prototype pins its own build tools. Game files go in the version's `public/`, test-only files in `public/test/`.
- Known traps (dev server already running on 5202, don't edit `src/` during smoke, gltf-transform `prune` limits, the ship's half-turn in world space, collision corners): see *Known traps* in `current.md`.

## State on 2026-11-20

Committed and pushed: the flyby (0400) and 0500 as its own scene; the viewport closed in chapter 1; the flight shots' passes 0–2 (SC-187): the dev-only tools page (`tools.html`), the flyby generator's core (`src/flight-shots/flyby.ts`, plain maths; `node --experimental-strip-types tools/flight-shots-check.mjs` proves today's 0400 rebuilt from values matches `flyby.json`), and the shot editor (`shot-editor.html`: seeds, nudged values, checks, buckets and repetition warnings, **the preview is the game itself in a frame** via `/?scene=shot-editor` and the dev hook `CutscenePlayer.playTrack`, saves to `public/cutscenes/shots.json` through `POST /__shots`). Uncommitted: the owner's own edits to scene files in `doc/story/scenes/` (never touch them). **Next:** the owner tries the shot editor; then, on their go, [pass 3](../plans/features/flight-shots.md) (the shots file in the game, the `# shot:` tag, random play with a per-playthrough memory in the save, 0400 as a saved shot); talk over the cockpit shot (its open questions). Known gap: the shot checks treat the ground as flat (hills not counted). Also waiting on the owner: the flyby's look (SC-185), the viewport (SC-186), optimisation SC-180's next step, gadgets and synth listening, the ice (SC-181/182), and the decisions SC-151/169/170/174. Details and links are in `doc/steps/current.md` and `doc/tasks.md`.
