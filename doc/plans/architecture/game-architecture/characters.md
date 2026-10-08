# Characters: skeletons, outfits, animations

Part of the [game architecture plan](README.md).

## Decided (owner, 2026-10-08)

- The **human characters share a skeleton** and some animations.
- Each character has **several animations**: run, walk, talk, and more.
- **Hands: mittens.** No finger bones.
- **Outfits:** each character except Adam has **at least two**: an **indoor jumpsuit** and an **outdoor parka**. Each wears the jumpsuit a bit differently and it carries a name tag, so jumpsuit textures **can't be shared** between characters.
- **Adam:** taller than the humans, similar articulation. Made of **isolated solid blocks** (no deformation), already a **single mesh**. No detachable blocks. **Both bodies are animated exactly the same.**
- **Penguins:** a dozen in a scene is enough; more is always better.
- **No spoken dialogue.** All dialogue is text.
- **Talking = nodding.** No mouths, shape keys or jaw bones: characters speak by rotating their heads on the X axis, like nodding.
- **`Elbow_r` is a pointer for the arm IK** (a rig control), not a body part.

### How the cast behaves

- **Secondary characters don't change location during a sequence.** In the ship they sit or stand at their stations with **ambient loops** (working in the lab, piloting). Outdoors it's similar: e.g. Dr. Kaufman among a group of penguins, scanning them, as a custom loop.
- When the player interacts with them, they **talk**, and may **hand the player an object**.
- **Walk, run, jump and fly are mostly for the player** (Dr. Green).
- Each cast member performs **one or two custom actions per scene**.
- **Talking shows each character's personality.** Talking is a hand-animated head nod per character (see [Talking](#talking)).
- **Adam so far:** piloting, operating the navigation station, lying in bed reading, and walking in one scene where they run away and stop when the player reaches them ([scene outline](../../../story/scenes/going-after-adam.md)).

## What exists today

Measured in `resources/models/The Crew 1.09 Dr. Green.blend` (2026-10-08):

| | Triangles | Materials and textures | Rig |
|---|---|---|---|
| Dr. Green, parka | 722 | Flat colours; jumpsuit texture 1024² | Parka rig |
| Dr. Kaufman, parka | 673 | Flat colours; body texture 2048² | Parka rig |
| Dr. Ogawa, parka (+ tool harness, 598) | 626 | Flat colours; name tag 482×122 | Parka rig |
| Jumpsuit body (Ogawa) | 400 | Flat colours, skin | Human rig |
| Adam (Red/Blue droid) | 656 | Flat colours | Human rig |
| Penguin / baby penguin | 346 / 353 | Flat colours; penguin texture | Penguin rig |

**Skeletons, by deforming bone names:**

| Rig | Bones | Used by |
|---|---|---|
| **Human** | `Body`, `Head`, `Leg_l`, `Calf_l`, `Leg_r`, `Calf_r`, `Arm_l`, `Hand_l`, `Arm_r`, `Hand_r`, `Elbow_r`, `Foot_l`, `Foot_r` (13) | The jumpsuit characters **and Adam** |
| **Parka** | The human 13 + `Hood` (14) | The parka outfits |
| **Penguin** | `Body`, `Head`, `Leg_l`, `Leg_r`, `Arm_l`, `Arm_r`, `Foot_l`, `Foot_r` (8) | Adult and baby penguins |

So **one skeleton is already shared** by every human, every outfit and Adam. Animations made for any of them play on the others (the parka's `Hood` bone simply keeps its pose when an animation doesn't move it).

**`Elbow_r`** is an IK pointer (owner, 2026-10-08). It's currently flagged as a deforming bone, so the glTF export would include it; the export script leaves it out by name, so the exported skeleton has the 12 bones that move the body.

**Existing animations:** `Walking`, `Wave`, `T-Pose`; penguins: `Penguin Idle`, `Penguin Walk`, `Penguin Walk Fast`.

## Sharing a rig: pros and cons

Two separate things can be shared: the **skeleton** and the **animations**. Given how the cast behaves, they're worth different amounts.

**Sharing animations saves little.** Most of what the cast plays is unique: ambient loops, talk loops and custom actions. Locomotion is mostly the player's. What's naturally shared is a short list: sitting down and standing up, handing over or taking an object, a neutral idle, walking in the occasional cutscene.

**Sharing the skeleton is worth it**, for reasons that have little to do with download size:

| Pros | Cons |
|---|---|
| One rig to maintain, one export setup | All bodies must fit one bone layout. Very different proportions make *shared* animations look wrong; unique ones are unaffected |
| Engine code written once: heads turning toward the player, layering the talk nod over other animations, objects held in `Hand_r` for hand-overs, sitting on seats | Changing the skeleton later affects every character and animation |
| Shared animations where they apply, made once instead of three times | |
| Library animation can be adapted once and used on anyone | |
| Cutscenes move any character with the same tools | |

**Recommendation:** keep the one skeleton (as it already is). Animations unique by default, shared only for the short list.

## Outfits

Each outfit is its **own skinned mesh on the shared skeleton**: changing outfit swaps the mesh, and every animation keeps working.

| Outfit | Files | Loaded |
|---|---|---|
| Jumpsuit (indoors) | `char-<name>-jumpsuit.glb`: mesh + its own texture (name tag and the character's way of wearing it) | With the crew, at start |
| Parka (outdoors) | `char-<name>-parka.glb` | Before the first landing, with the first landing site |

Characters change outfit off-screen or in a cutscene, at the moment the story needs it (before going outside).

**Cost:** small. The meshes are a few hundred triangles; the cost is the textures. At 1024² in KTX2, roughly 0.1–0.5 MB per outfit *(estimate)*. Dr. Kaufman's 2048² texture can go to 1024² at third-person distance with no visible loss.

## Adam

- **Rigid skinning:** every block's vertices belong 100% to one bone, so nothing bends. One mesh, one draw call per body; same skeleton, files and code as the humans. The export script checks that each block is fully assigned to a single bone.
- **Red and Blue:** one mesh with two colour variants, one animation set. The second body costs nothing extra.
- **Taller:** Adam's animations are their own, so height doesn't matter for them. If Adam ever uses a shared human animation, its hip height is scaled to Adam's when loaded; anything where bodies have to meet (a hand-over) may need an Adam version.

## Penguins

| Approach | How many | Cost |
|---|---|---|
| **Skinned penguins** (normal animation, each with its own animation player, random start times so they don't move in sync, as in Part 1) | **12–20** comfortably | ~350 triangles each: very cheap; one draw call each plus a little CPU |
| **Baked animation, instanced** (animation baked into a texture; the GPU moves the vertices; all drawn in one call) | **Hundreds** | A bake step in the export script and a TSL shader; less smooth blending between animations |

**Recommendation:** a dozen skinned penguins to start. If bigger colonies matter, add the instanced version for the background (skinned near the player, instanced further away), with the number set by the quality tier.

## Talking

Characters talk by **nodding: rotating the `Head` bone on its X axis** while their line is on screen (owner, 2026-10-08). There's no spoken dialogue, so nothing has to sync with audio.

**Decided (owner, 2026-10-08): hand-animated.** Each character has a `talk` loop made in Blender, showing their personality. A procedural nod was considered and isn't needed for now.

**In the game:**
- The talk loop plays while a line is on screen and blends back to the character's idle or ambient loop when the line finishes. Lines are different lengths, so the loop just repeats as long as needed.
- The nod is **layered on top** of what the character is doing (ambient loop, idle, sitting): the talk loop only animates the head, so a character can keep working at their station while they talk.
- The head turns toward the player when a conversation starts.

## Animation files

Most animations belong to one character in one scene, so they load **with the scene that uses them**:

| File | Contents | Loaded |
|---|---|---|
| `anim-player.glb` | Dr. Green: idle, walk, run, jump (start/air/land), fall, fly, interact, pickup, scan, comm, sit/stand, talk | Once, with the crew |
| `anim-shared.glb` | The shared short list: sit down/stand up, hand over/take object, neutral idle, cutscene walk | Once, with the crew |
| `anim-<name>.glb` | A character's own animations used across scenes: talk loop, personal idle, gestures | Once, with the crew |
| `anim-scene-<id>.glb` | That scene's ambient loops and custom actions, for everyone in it | With the scene, like a landing site |
| `anim-penguin.glb` | Idle, walk, walk fast (+ more as needed) | With the first scene that has penguins |

Three.js matches animation tracks to bones **by name**, so any of these files drives any character on the same skeleton. Action names say which file they go into (`player_walk`, `shared_sit_down`, `kaufman_talk`, `s03_kaufman_scan_penguins`).

**Adam's set** (both bodies): `adam_pilot`, `adam_nav`, `adam_bed_read`, `adam_walk`, `adam_idle`, `adam_talk`.

## What the export expects

Requirements on the files, so the export script can process them automatically:

- One skeleton layout (the bone names above) for all humanoid characters, outfits and Adam; the penguin rig for penguins. Rig controls such as `Elbow_r` are left out of the export.
- One action per animation, named as above; walk and run cycles **in place** (the game moves the character).
- Scale applied, metres; at most 4 bone influences per vertex (glTF limit).
- One file per outfit; no animations in character files.

## Budget

The characters are **much lighter than first estimated**: a few hundred triangles each, mostly flat colours.

| Item | Estimate |
|---|---|
| Each outfit (mesh + 1024² texture) | ≈ 0.1–0.5 MB |
| Three humans × 2 outfits, Adam, penguins | ≈ 1.5–3 MB in total |
| Animation data (13–14 bones, compressed) | ≈ 1.5–3 KB per second of animation |
| Player animation set | ≈ 0.2–0.3 MB |
| Per scene (cast ambient loops + custom actions) | ≈ 0.2–0.5 MB |
| **All animation in the game** | **≈ 2–5 MB** |

So the crew bundle drops to **≤ 4 MB** (meshes, jumpsuits, player and personal animations); parkas (≈ 1 MB) come with the first landing; scene animations come with their scenes.

> **Production lever:** the real cost of unique animation is **animator time, not download**. Reusing an ambient loop across scenes (Ogawa at the lab in several scenes), keeping custom actions short, and staging moments as cutscenes all reduce it.

## Open questions

- None at the moment.
