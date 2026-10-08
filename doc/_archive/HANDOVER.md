> **Superseded 2026-10-08.** Split into the documentation structure in [`../README.md`](../README.md): UE inventory → `reference/ue-prototype.md`, stack → `architecture/stack.md` + `decision-log.md`, folder layout → `architecture/asset-pipeline.md`, see-through hull → `features/see-through-hull.md`, next steps and open questions → `steps/`. Kept for history.

# The Zamboni — Handover

Context handover from an exploratory Claude Code session (2026-10-06 → 2026-10-08) about porting the UE5 prototype to a new, AI-agent-friendly stack. Nothing has been built yet; this file records what is known, what was decided, and what is still open.

---

## 1. Project at a glance

- **Game:** *The Zamboni*, by Studio Cataplasma (cataplasma.net). A game set inside a small aircraft/spaceship with a retro-tech look (Kaypro/TRS-80 keyboards, green CRTs, teal/gray panels, cassettes).
- **Current prototype:** Unreal Engine 5.7, first-person, **Blueprint-only** (no C++), **not under version control**.
  - Location: `C:\Users\31658\Desktop\The Zamboni.archive\the_zamboni 5.7\` (all old material now lives in `The Zamboni.archive`)
  - Built from UE's First Person Blueprint template + Starter Content.
  - Startup map: `/Game/FirstPerson/Maps/FirstPersonMap` (One File Per Actor, ~290 external actors).
  - Rendering: Lumen GI + reflections, virtual shadow maps, DX12/SM6.
  - Plugins: ModelingToolsEditorMode, USDImporter. The models came from Blender; the original `.blend` files exist and the latest ones have been copied to `art/` (see §1a).

## 1a. Project folder layout (decided 2026-10-08)

```
The Zamboni/
  app/    git repo: source code + production assets only (exported glTF, game audio, etc.)
  art/    source art, NOT in git (Blender files, textures, PSDs, reference)
    blender/          The Zamboni 1.18 (ship), The Crew 2.01 Landscape, The Crew 1.09 Dr. Green,
                      The Crew Console 1.02, Cloud + their textures/
    blender/props/    latest props (Characters 3.5, Chess Board, Hugs, Keyboard, Temple 1.02, mavica, height map)
    textures/         copy of archive Resources/Textures
    export/           existing .glb/.fbx exports (doors, lever, boombox, galley, fridge, lab window, coffee pot, Dr. Kaufman)
    audio/            music + ambient/SFX (music licenses unchecked, see §2)
    fonts/  reference/
  doc/    HANDOVER.md, the-zamboni.md (story/script, copied from the Google Doc)
```

- Blender texture links broke in the copy; the owner is relinking them in Blender.
- Production assets are copied from `art/` into `app/` once the stack decides the asset folder layout.
- Left in the archive: both UE projects + zip, renders/screens/media, `tehzamboni.com`, the old Monogatari visual-novel web prototype (`Prototype/`), older `.blend` versions, `.aep`/`.ai`.
- **Owner's goals for the new version:**
  - **Third-person** (not first-person), with **indoor and outdoor** sections.
  - An AI agent does most of the coding; the owner focuses on **art, story and gameplay design**.
  - Web delivery is attractive (Three.js was the starting question) but not final.

## 2. What's in the UE prototype

Inventory is from file and folder names only. `.uasset` files are binary, so **the actual Blueprint logic has not been read yet**.

### Ship areas (`Content/Models/`)
| Area | Contents |
|---|---|
| Cockpit | Seats, yoke, D-pad, dials, monitors, nav display, fire extinguisher |
| Crew Quarters (~150 files) | Bunks, boombox, cassettes, chess set, books, coffee, Braun KF20 coffee maker, comms |
| Engineering | 3D printer, centrifuge, bench, cabinets, crates, lab window |
| Cargo Bay | Lockers, jetpacks + rack, sledge, pallets, ladder, chests |
| Hull | Bulkheads, floors, galley, couch, doors, landing gear |
| Crew | One character: "Dr. Kaufman" |

~80 materials, mostly flat colors and emissives (this suits a web renderer well).

### Gameplay Blueprints (`Content/Blueprints/`)
- `BPI_Interact`: an interaction interface, presumably shared by the interactables
- Doors: `BP_Door` base plus Fridge, Galley, Hatch, Internal, Locker, Locker_Cargo variants
- `BP_Boombox` (4 music tracks, cassette sound, custom sound attenuation)
- `BP_Ladder`, `BP_Lever_Panel`, `BP_Engineering_Window`
- UI: `W_HUD`, `W_HUD1`, `W_Crosshair`
- Ambient audio: wind, birds, Cessna flight/landing loops

### Clutter that doesn't need porting
- Template rifle, projectile, weapon component and `IMC_Weapons` (probably unused)
- Duplicate game modes (`BP_FirstPersonGameMode`, `_`, `_2`), `BP_Door_Locker` vs `BP_Locker_Door`, `W_HUD` vs `W_HUD1`
- Starter Content and its sample maps
- Plane audio duplicated in `Audio/` and `Audio/Ambient/`

### ⚠ Licensing
The boombox tracks are by **Anamanaguchi** ("Helix Nebula", "My Skateboard Will Go On") and **2NRO8OT**. A public web build counts as distribution, so confirm the licenses before shipping them.

## 3. Unreal MCP status (dead end for now)

- Epic's official **Unreal MCP** plugin (`ModelContextProtocol` + "All Toolsets") requires **UE 5.8**. It is not in 5.7.
  Docs: https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor
- `C:\Program Files\Epic Games\UE_5.8\` was empty on 2026-10-06; as of 2026-10-08 it contains `Engine/`, `Templates/` and `ToolComplete.txt`, so the install looks complete (not yet tested).
- If revisited:
  1. Finish installing 5.8.
  2. Upgrade a **copy** of the project (it has no git).
  3. Turn on the plugins.
  4. Start the server with `ModelContextProtocol.StartServer`.
  5. Run `ModelContextProtocol.GenerateClientConfig ClaudeCode`, which writes a `.mcp.json` pointing to `http://127.0.0.1:8000/mcp` (HTTP, loopback only, no authentication).
- Given the plan to move off UE, this matters mainly as a way to **extract information** from the prototype.

## 4. Porting the logic

The logic is small (doors, interaction, ladder, lever, boombox) and easy to rebuild. The blocker is reading it. **Preferred method:** in each Blueprint's Event Graph, select all nodes (Ctrl+A), copy them (Ctrl+C), and paste into a `.txt` file (UE copies nodes as readable text). Save these files as e.g. `ue-reference/blueprints/BP_Door.txt` in the new project. Fallbacks: written descriptions of each behavior, or short gameplay videos for timing and feel.

## 5. Stack options

> **Decided 2026-10-08:** plain Three.js (no React Three Fiber) + TypeScript, `WebGPURenderer` + TSL, pinned to `three@0.186.1` exactly (with `@types/three@0.186.0`). Upgrade deliberately, one release at a time, reading the migration notes. Babylon.js, PlayCanvas, Needle, Wonderland and Bevy were also considered; Three.js won on AI-agent friendliness (most training data, all code, easy browser screenshot loop).

The key principle: **the project should live in text files**, so the agent can read, change, compare and check everything. UE Blueprints are binary, which works against an AI-driven workflow.

| | **A. Three.js / React Three Fiber + Blender** | **B. Godot 4** |
|---|---|---|
| Agent-friendliness | Excellent: all code is TypeScript | Excellent: `.tscn` scenes and GDScript are plain text |
| Level editing | Blender is the editor (custom properties tag interactables) | Real visual editor, like UE |
| Lighting | No real-time GI; bake lighting in Blender | Lightmap baking + real-time GI options |
| Web | Native, small builds | Exports to web, heavier builds |
| Agent visual feedback | Best: agent can drive the browser and take screenshots | Possible, less smooth |

Recommendation given: **Godot** if the owner wants to keep laying out the ship visually; **Three.js** if "a link anyone can open" is the top priority. If Three.js, lean toward **`WebGPURenderer` + TSL** for shaders.

Web-stack details if A is chosen:
- Collision/character movement: `three-mesh-bvh`; Rapier if real physics objects are needed
- Helpers: `@react-three/drei`; bloom on emissives/CRTs: `postprocessing`
- Assets: glTF exported per room, Draco/Meshopt geometry compression, KTX2 textures, rooms loaded progressively
- Positional audio: Three's `PositionalAudio`

## 6. Workflow conventions agreed in principle

- **Git from day one.**
- **`CLAUDE.md`** in the new repo with conventions, the art pipeline and design rules.
- **Content lives in data files, not code:**
  - Story and dialogue in **Ink** or **Yarn Spinner**
  - Items, puzzle state and tuning values in JSON/YAML
  - The owner edits these; the agent builds the systems that read them.
- **Naming contract between art and code**, e.g.:
  - Objects named `door_*` become doors.
  - A custom property `interact: door`, `requires: lever_01` sets up behavior and dependencies.
  - A `cuttable: true` tag marks surfaces the see-through hole may hide (see §7).
- **Small playable steps:** one feature, play it, give feedback, then the next.

## 7. Key feature: see-through hull hole (third-person)

**Goal:** in third person, hide the part of the hull and walls between the camera and the character, like a hole that follows the camera.

**Approach:**
- A world-space **capsule from the camera to the character**.
- Pixels of "cuttable" materials that fall inside the capsule *and* between camera and character are discarded.
- A **dithered edge** (interleaved gradient noise) gives a soft fade without transparency sorting problems.
- Applies only to tagged surfaces (hull, walls, bulkheads, ceilings). Floors, props and characters stay solid.

Reference implementation (WebGL, `MeshStandardMaterial` + `onBeforeCompile`; port to TSL if using WebGPU, the math is the same):

```js
const cutout = {
  uPlayer: { value: new THREE.Vector3() },
  uCamPos: { value: new THREE.Vector3() },
  uRadius: { value: 1.2 },
  uSoft:   { value: 0.4 },
  uEnabled:{ value: 1 },
};

export function makeCuttable(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cutout);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <project_vertex>',
        '#include <project_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uPlayer, uCamPos;
        uniform float uRadius, uSoft, uEnabled;
        varying vec3 vWorldPos;`)
      .replace('void main() {', `void main() {
        if (uEnabled > 0.5) {
          vec3 ab = uPlayer - uCamPos;
          float t = dot(vWorldPos - uCamPos, ab) / dot(ab, ab);
          if (t > 0.0 && t < 0.98) {
            float d = length(vWorldPos - (uCamPos + ab * t));
            float mask = smoothstep(uRadius - uSoft, uRadius, d);
            float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
            if (mask < n) discard;
          }
        }`);
  };
  material.customProgramCacheKey = () => 'cutout';
}
// Every frame: uCamPos = camera position; uPlayer = character position + ~1 m (chest height)
// Note: InstancedMesh needs instanceMatrix folded into vWorldPos.
```

**Notes:**
- Shadows stay correct automatically: Three's shadow depth pass doesn't include the discard, so the hull still blocks light. Baked lighting isn't affected.
- **Clean cut edges:** render cuttable walls double-sided and paint back faces a flat dark color (`!gl_FrontFacing`), so the hole's rim looks like a solid cross-section.
- **Indoor and outdoor modes:** trigger volumes switch behavior.
  - Outdoors: cut off, or only when behind the ship.
  - Indoors: cut on, optionally hiding the ceiling or upper deck entirely (a cutaway view).
  - Transitions: animate `uRadius` from 0 to full over about 0.3s at doors.
- **Third-person camera:** a follow camera with BVH collision. Thanks to the hole, the camera can stay outside the hull instead of squeezing into corridors.
- **Optional:**
  - Oval hole instead of round
  - Constant on-screen size (scale the radius by camera distance)
  - Faint glowing rim at the edge
- **Effort:** core effect in an afternoon; polish (edges, mode rules, transitions) a few days.

In Godot the same logic is a spatial shader on the hull material using `discard` with the same capsule math.

## 8. Suggested next steps

1. ~~Decide the stack~~ → Three.js r186 + TSL (see §5).
2. Set up the new project folder: `git init`, `CLAUDE.md`, folder layout, naming contract.
3. Export the UE Blueprints as text into `ue-reference/blueprints/`. (`.blend` sources found and copied to `art/`.)
4. **Build a vertical slice:** one room (cockpit or crew quarters) with baked lighting, a third-person controller and camera, the see-through hull shader, one working door, and the boombox with positional audio.
5. Optionally, build a standalone prototype of the see-through hole first (box ship, capsule character, orbiting camera, radius/softness sliders) to judge the feel.
6. Check the music licenses.

## 9. Open questions for the owner

- Camera style: free orbit, fixed angles, or a cutaway/isometric view indoors?
- What do the outdoor sections look like (scale, terrain), and how does the player move between inside and outside?
