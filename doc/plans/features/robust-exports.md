# Plan: Exports that don't break when the file is worked on (item 48)

**Status:** *built* 2026-10-20, passes A and B (see *As built*, at the end); the owner's part (an export after the next edit in Blender) open. *Approved* (owner, 2026-10-20; rewritten for 0.0.2 the same day). First draft of 2026-10-19 saved with no action while the owner weighed [the ship's things as components](../architecture/game-architecture/components.md) (item 49). On 2026-10-20 the owner chose this plan as the first work in 0.0.2.

## Goal

**An export gives the game the ship as it's meant to be, whatever state the working file is in.** If the file differs from the game in a way nobody announced, the export stops and says so, and the game's files are left alone.

**Why.** Every export break on 2026-10-19 had one cause: **the export trusted the file's working state.**

| What was left in the file | What it did to the game |
|---|---|
| Collections switched off | most props were lost |
| Objects hidden | `Hull_Merged` left the collider, and the galley doors' hinges went to the origin |
| Pose mode | the crew and player exports stopped |
| A hatch turned out of the way for the ladder animation | the trapdoor opened the wrong way |

Each of these is normal while working in Blender, and each changed the game silently. The first three are handled already (`export-collections.json`, hidden objects shown in memory, object mode). **What's left:**

- the pose of the moving parts;
- animation and the current frame;
- a gate on what reaches the game;
- a check after the export.

## Scope

- **In:**
  - the ship export, the crew export and the player export (all three run by `export.mjs`);
  - 0.0.2 only (0.0.1 is frozen).
- **Out:**
  - the component model (item 49). This plan's data is built so that item 49 can take it over (see *Fit with item 49*).
  - Any change to the file's tags, or to how the game reads them.

## Constraints from the docs

- **The export stays one command** with a short summary (CLAUDE.md, *Keeping the work cheap* 1). Small edits to the ship file stay the owner's: the owner exports, and the agent comes in only when the summary shows something unexpected. This plan makes that "unexpected" explicit.
- **Nothing is saved to the `.blend`.** Every correction is made in memory (`export.mjs`; [`asset-pipeline.md`](../../architecture/asset-pipeline.md#before-the-next-export)).
- **Doors in the file must be closed and not animated** (asset pipeline, 2026-10-12). This plan turns that rule into something the export enforces, instead of a rule the owner has to remember.
- **The decision log's *The ship's reference file*** (2026-10-12) says behaviour comes from tags in the file. This plan keeps that, so there's no conflict.

## The work, in two passes (a stop to assess between them)

### Pass A: the moving parts' rest poses, and the frame (about 1½ hours)

1. **A record of every moving part's rest pose:** `tools/rest-poses.json`.
   - **Which parts:** the 17 doors, hatches, sliding doors, the window, the lever, and everything tagged `moving`.
   - **What's recorded:** each part's local transform (position, rotation, scale), keyed by object name.
   - **Where it comes from:** 1.21 as it is now (the trapdoor was closed by the owner on 2026-10-20; the game's files match it).
   - **How:** a small script, `tools/rest-poses.py`, writes it. Run with `--accept <name>`, it takes the file's current pose for that part as meant (when the owner really moves a door).
2. **The export puts each moving part in its rest pose, in memory,** whatever the file has. When the file differs it prints a line, for example `POSE: Hatch.002 turned 90° from its rest pose: exported at rest`. It also prints:
   - a `POSE:` line for a moving part with no record (a new or renamed door);
   - a `POSE:` line for a record with no object left in the file.
3. **Animation can't pose the export.** Every export, in memory:
   - sets the scene to a fixed frame, its start frame. Today the frame the owner left the file on decides the pose of anything animated, the placed crew included;
   - drops the actions on the moving parts (the ramp's single keyframe once held it open at every frame), with a `POSE:` line for each.
4. **The stopgap goes:** `POSED_OPEN` and `closeInFile` in `doors.ts`. The game takes the pose in the glTF as closed again, which is now guaranteed.

**Check:**

- Export from 1.21 as it is: the ship file comes out identical, or only reordered (compare-glb shows 0 differences).
- On a scratch copy of 1.21: turn `Hatch.002` open, add a keyframe to `Door Cargo`, leave the frame at 40. The export prints three `POSE:` lines, and its output is the same as from the clean file.
- A probe: the trapdoor opens upward, 90° (as [interaction.md](../../features/interaction.md) says).

> **[Agent note]** This line said "downward" until 2026-10-20: a slip when the plan was written; the trapdoor has always opened up into the crew quarters.

### Pass B: the gate, the crew's checks, and a check after the export (about 2½ hours)

5. **The game's files are replaced only when nothing changed** (owner, 2026-10-20: "anything that looks odd and could potentially give an unexpected result should stop the export. Let's start broad and add exceptions as we go"; the point is to avoid wasted work).
   - **The baseline is the game's own files:** compare-glb already compares the new export with them object by object. It learns to compare animations too (names, length, the bones they move).
   - **What stops the export: any difference at all.**
     - Objects gone, new, moved, or with different triangles, materials or tags.
     - A file whose bytes differ though its objects match (materials, textures).
     - Any new or changed `NOTE:`, `POSE:`, `PERF:` or `NODES:` line.
     - Every `STOP:` line (step 6).
   - **Exceptions are added one at a time, as they come up:** each is a rule in `export.mjs` with a line in the asset pipeline saying why. **The first one, from the start:** the crew's places and poses only flag (step 6).
   - **When it stops:** the new files stay in the version's `.export/<what>/`, the summary lists every reason, and the last line says how to take them.
   - **Taking them:** `npm run export:accept -- ship` copies the files waiting in `.export/` into the game, without running Blender again. It refuses if the `.blend` was saved since that export: what you take is exactly what the summary showed.
6. **The crew** (owner, 2026-10-20: the crew will be in different places and animations in different scenes, so their export stays flexible). No recorded poses for them. Instead:
   - **These stop the export (`STOP:` lines):**
     - a missing animation: a character that had an action in the last taken export has none, or its action is gone from the file;
     - movement that doesn't make sense: a character at the world origin, outside the ship's bounds, below its deck's floor, or two characters overlapping (hips closer than 0.3 m);
     - the existing height check (`SCALE:`).
   - **These are flagged and go through:** a character moved or turned since the last taken export, a different action, a different frame of its pose.
   - **The player export** stops the same way if the ladder clip (`Dr. Green - Ladder x1.25`) or any part listed for her is missing.
7. **A check after a taken export:** `tools/after-export.js` (about 20 s), run by `export.mjs` when the dev server is up on 5202; otherwise it prints the command. It checks:
   - every door opens and comes back to its rest pose;
   - the collider covers the hull (rays from outside the ship hit it at about ten known points);
   - the crew stand where they were (Dr. Kaufman on the couch);
   - the ladder's foot is clear;
   - she can walk from the cargo bay into engineering.

**Check:**

- On a scratch copy:
  - hide one prop's collection with the table off for it, and move one prop by 0.3 m: the export stops and lists both;
  - run `export:accept`: the game's files change, and the after-export check passes;
  - move Dr. Kaufman to the origin and take her action off: the crew export stops with two `STOP:` lines; move her 1 m along the couch instead: it's flagged.
- The clean file: the export goes straight through.
- The smoke script, once at the end: still 82 passed, the same 8 known failures.

## Options

1. **What stops an export:** decided by the owner (2026-10-20): any difference, with exceptions added as they come up (step 5). An intended change is then two commands: the export, then `export:accept`.
2. **What tolerance counts as "moved":** 2 mm (compare-glb's default, recommended), or larger if compression noise shows up.
3. **Rest poses at export (recommended) or when the game loads.** The data is the same either way. At export, the game's files are right and the game stays simple.
4. **Taking a stopped export:**
   - **(a, recommended)** `npm run export:accept -- ship`: copies the files already made. You take exactly what the summary showed, at once.
   - **(b)** `npm run export:ship -- --accept`: runs Blender again (about 1 min) and takes whatever comes out. If the file was saved in between, you take something you haven't seen.

## Fit with item 49 (the components)

Item 49's step 3 is "recording each instance's rest pose once, as part of its definition". `rest-poses.json` is that record, made now. When the components are built, each kind's definition takes its instances' rest poses from it, and the file (or its data) moves into the definitions. Nothing here is thrown away by item 49, and nothing pre-empts its decisions (kinds, ids, the file's tags).

## A habit (the owner's call, not part of the work)

Animation work in its own `.blend` that links the ship from the reference file. Then posing, hiding and moving things for an animation never reach the export. With this plan built it matters less: the export corrects poses and stops on moves.

## Done when

- The trapdoor exports closed from a file where it's open, with a `POSE:` line, and `doors.ts` has no stopgap.
- The current frame and actions on doors don't change the export.
- An export with a moved or missing prop doesn't replace the game's files until it's taken with `export:accept`.
- The after-export check passes on the taken files.
- The owner's part: one export from the real file after the next edit in Blender, and the summary reads clearly.

## Open questions for the owner

None. Answered 2026-10-20: what stops an export (any difference, exceptions as they come); the crew (no recorded poses; missing animations and senseless movement stop, other anomalies flagged); taking a stopped export (`export:accept`, option 4a).

## After

- [`asset-pipeline.md`](../../architecture/asset-pipeline.md): *Before the next export* (the door rule becomes "the export corrects it") and the export section.
- `tools/README.md`, the code map (`doors.ts`), the decision log (a short entry: rest poses recorded and the export gated).
- Backlog item 48.

## As built

### Pass A (2026-10-20)

- **The record:** [`tools/rest-poses.json`](../../../app/prototypes/0.0.2/tools/rest-poses.json), written from 1.21 as it was: **18 moving parts** (the 17 doors, hatches, sliding doors, the window and the lever, plus the ramp, `Door Cargo`, tagged `moving`), one line each (location, rotation mode, rotation, scale; 6 decimals). What hangs on them isn't recorded: it moves with them.
- **The script is `tools/rest_poses.py`** (not `rest-poses.py`: the exports import it, and Python can't import a name with a hyphen). `npm run rest-poses` (in `app/`) runs it in Blender on the working file through `export.mjs`: it compares the file with the record; `-- --accept "<name>"` takes the file's pose of that part (adds a new part, drops a record with no part). A difference counts below 0.01 mm, 0.006° or a scale of 0.00001.
- **In the exports:** `export_collections.switch_collections` puts the scene at its start frame (all three exports); `export-ship.py` drops the actions, NLA tracks and drivers on the moving parts, then puts each at rest, before their hinges and axes are worked out. `POSE:` lines go into the summary with the others.
- **`POSED_OPEN` and `closeInFile` are out of `doors.ts`.**
- **What 1.21 has:** it was saved on **frame 0** (the start frame is 1), and `Hatch.002` still had an action, `Hatch.002Action`: one key at frame 13, closed. So every export from it printed two `POSE:` lines (the frame, the hatch's action). **Fixed in the file** the same day (owner: "can you fix it? if yes, do it"): saved by the agent on frame 1, without the hatch's action; the file as it was is next to it, `The Zamboni 1.21 (before frame and hatch fix, 2026-10-20).blend`. The ship and crew exports after it: identical files, no `POSE:` line.

**Checked:**

- From 1.21 as it is: `zamboni-ship.glb` and `zamboni-ship-col.glb` **byte-identical** to the game's; the crew file byte-identical too.
- **The player export differs by one vertex** (`Dr. Green Mesh.004`: 5287 → 5286), **with the start frame switched off as well**: not from this work. The game keeps the committed file; to look at with the owner (the file changed since the last player export, or the export isn't deterministic).
- On a scratch copy of 1.21 (`Hatch.002` turned 90°, `Door Cargo` keyed at frame 40, the frame at 40): three `POSE:` lines (the frame, the action dropped, the hatch turned 90°), and both files the same as from the clean file (compare-glb: SAME). A harder copy with a single key holding the ramp open at -60° (as the ramp once was): a fourth line, `'Door Cargo' turned 60.0°`, the same output.
- `npm run rest-poses` on that copy lists the two parts; `--accept "Hatch.002"` changed only its line in the record (put back after).
- A probe: the trapdoor opens upward, from 3.36 to 4.28 (its hinge to its top), as before.
- `npm run check`, `npm run build`: pass. The smoke script: see `doc/steps/current.md`.

**For pass B:** the frame line will show on every export from a file saved on another frame; under pass B's gate ("any new or changed `POSE:` line stops") that would stop exports for a harmless difference. Suggested: the frame line doesn't stop the export (the first exception), since the export doesn't depend on it any more.

### Pass B (2026-10-20)

- **The gate** (`export.mjs`): the new files go to `.export/<what>/out/`; compared with the game's (compare-glb, which now compares animations too: names, lengths, what they move; then the bytes) and the lines with the last *taken* export's (`.export/<what>-lines.txt`). Stops on any difference, a new `PERF:` / `NODES:` / `NOTE:` / `POSE:` line or any `STOP:` line; `STOPPED:` lists every reason. `npm run export:accept -- <what>` takes the waiting files, refused if the `.blend`'s modified time changed since that export. **Exceptions** (`EXCEPTIONS`, flagged as `FLAG:`): the frame line (owner's answer to the suggestion above); the crew's moved objects and changed animations, folded into one line per file.
- **The crew** (`export-ship-crew.py`): a `CREW:` line per character (hips from the `Body` bone, facing, action). `STOP:` for an animated character with no action (a `NOTE:` before), at the origin (hips, or the armature), outside `Hull_Merged`'s bounds, below the lower deck, reaching more than 0.05 below their deck's floor (`Floor Bottom` top 1.24, `Floor Top.001` top 3.46), or two hips closer than 0.3. `export.mjs` stops on a character whose action was lost or who is gone since the last taken export, and flags a changed `CREW:` line.
- **The player** (`export-crew-character.py`): `STOP:` for a listed part, the clip or the clip's start missing (exported without them); no armature: no export.
- **The after-export check**, `tools/after-export.js` (about 30 s, `npm run probe -- tools/after-export.js`): every door opens and comes back to its rest pose (17: the ramp isn't a door in the code, and the smoke script checks it); ten rays from outside (eight round the sides at mid-height, two from above) meet the collider no further than 0.15 behind where they meet the drawn `Hull_Merged`; the four crew in the ship, Dr. Kaufman touching the couch; the ladder's foot clear (she fits there); she walks from the cargo bay through the engineering door. `export.mjs` runs it after a taken change when the dev server answers on 5202.
- **`EXPORT_BLEND=<file>`** exports another file (for scratch copies).

**Checked:**

- The real file: ship and crew straight through ("Nothing changed").
- A scratch copy with the `Shelf` collection renamed (so unknown to the table: off) and `Jetpack.001` moved 0.3 m: **stopped**, 27 reasons (the new collection, the 18 listed objects it held, the 7 objects gone from the file and the jetpack moved by 0.300). `export:accept` with the copy's modified time changed: refused. As exported: taken, and the after-export check passed (5 of 5). The game's file restored from git and the ship re-exported from 1.21: identical.
- Crew copies: Dr. Kaufman at the origin without her action: **stopped**, 5 `STOP:` reasons (no action, origin, outside the ship, below the lower deck, the action lost since the last taken export); her body's 13 changes only flagged. Moved 1 m: flagged (her `CREW:` line, then and now) and **taken**; the after-export check passed. Restored from git and re-exported from 1.21: identical.
- **The player export stops on every run:** it isn't deterministic (different bytes each run; 5286 to 5290 vertices in `Dr. Green Mesh.004`, seam duplicates merged or not: one on each leg, two on an arm). Not fixed (owner: leave it for now); the committed `green-parka.glb` is kept, an export waits in `.export/player/out/`.
- Not run: the smoke script (no game code changed after pass A's run: 82 passed, the same 8 known failures).
