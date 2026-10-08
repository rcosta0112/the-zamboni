# Performance: targets, devices, smoothness, rendering

Part of the [game architecture plan](README.md).

## Targets (owner, 2026-10-08)

| Machine | GPU | Target |
|---|---|---|
| Owner's PC | NVIDIA GTX 1070, 1920×1080 | 60 fps |
| MacBook Pro 13" 2020, macOS 26 Tahoe | Intel Iris Plus G7, 2560×1600 | **30 fps is acceptable** |

No Steam Deck target (not available for testing). Phones, tablets and Chromebooks are out of scope.

**What these two machines cover** *(estimate)*: the Iris Plus G7 is a step below Intel's Iris Xe, so a game that holds 30 fps there should hold 30–60 fps on most laptops from 2020 on (Apple M1 and later, Iris Xe, AMD Radeon 680M/780M). Older Intel UHD 620 laptops (2017–2019) will need the low quality tier.

## Device limitations

Integrated GPUs struggle with many Three.js scenes, as they do with UE5 games. In both cases it's mostly *what* is rendered, not the engine. This game's look (flat colours, baked lighting) is cheap per pixel, so it can run well on modest hardware if we keep it that way.

| Limit | Why it hurts on integrated GPUs | What we do |
|---|---|---|
| **Pixels (fill rate)** | High-DPI screens: the MacBook renders 2560×1600, about 2× the pixels of 1080p, at the default pixel ratio. The single biggest cost | Cap the 3D render's pixel ratio; **dynamic resolution** (lower the 3D resolution when frame times rise); or **low-resolution rendering** as a style (being tested in [prototype 02](../../prototypes/02-low-res.md)). The Svelte UI is HTML, so it stays sharp at native resolution regardless |
| **Cost per pixel** | Real-time lights, realistic materials, transparency, overdraw | Baked lighting, one palette material, few lights, little transparency |
| **Shadows** | Each shadow map is another render of the scene | No real-time shadows indoors (baked); one cascaded sun shadow outdoors, lower resolution on the low tier |
| **Post-processing** | Each pass reads and writes the whole screen | Bloom only, at half or quarter resolution; off on the low tier |
| **Anti-aliasing** | Multisampling multiplies the fill cost | A cheap post-process pass, or none at low resolution |
| **CPU / draw calls** | JavaScript plus the driver's overhead per draw | ≤ 300 draw calls; merged static geometry; `BatchedMesh`; WebGPU has less overhead than WebGL |
| **Memory** | Integrated GPUs share system RAM | ≤ 512 MB of textures; KTX2 stays compressed |
| **Heat and battery** | Laptops slow down after a few minutes of load | 60 fps cap, a 30 fps mode, dynamic resolution |
| **The wrong GPU** | Windows laptops with two GPUs may run the browser on the integrated one | Ask for the high-performance GPU (a hint the browser may ignore) |

**Quality tiers** (low / medium / high: resolution scale, shadows, bloom, lightmap resolution) are picked by a short benchmark during the title screen (render the ship briefly, measure frame times), adjustable in settings. GPU names reported by the browser are unreliable, so measuring beats guessing.

> **Story lever:** frame rate is mostly set by what's on screen at once. If a scene is heavy, the script can help: fewer characters in the same shot, a big ruin seen from fewer angles, an effect-heavy moment moved into a cutscene where the camera is controlled.

## Stutter

> **Observed (2026-10-08, prototype 01):** after adding noise-based mist shaders, the frame rate read 7 fps for a few seconds after loading while they compiled, then settled at 60. The compile-ahead step below matters.

On the web, the biggest threat to "smooth" isn't download time but **hitches**: one long frame when something is used for the first time.

| Cause | Fix |
|---|---|
| Shader compilation the first time a material appears | Few materials (palette); compile everything for the ship and the next site off-screen (`renderer.compileAsync`) before it's shown |
| Uploading big textures to the GPU | KTX2 (no main-thread decoding); spread uploads over several frames; upload during cutscenes |
| Decoding glTF and textures | In background workers (built into the Meshopt and KTX2 loaders) |
| Garbage collection | No allocations in the per-frame update; reuse objects |
| Audio decoding | Asynchronous; long tracks streamed |
| First appearance of a site | A hidden warm-up render of the site before the landing cutscene ends |

## Rendering choices

### Lighting

**Ship interior: baked.** The web renderer has no real-time global illumination, so real-time lights alone make the ship look flat.

| | Download | Look | Cost |
|---|---|---|---|
| **Lightmaps** (texture atlas, second UV set) | 4–10 MB for the ship *(estimate)* | Best: soft shadows, bounced light | UV unwrapping and baking time; static only |
| **Vertex lighting** (baked into vertex colours) | < 1 MB | Softer, blotchier on large flat surfaces unless the mesh is denser | Cheap; suits the flat-colour style |
| **Real-time only** + ambient occlusion | 0 | Flattest | More lights per frame |

**Recommendation:** test lightmaps and vertex lighting side by side on one room before deciding. Characters and movable props are lit by a few real-time lights plus light probes either way.

**Outdoors: real-time.** Sun + sky + fog, one shadowed sun with cascaded shadows. Bounded sites keep the terrain small; fog hides the edges.

### Other choices

- **Travel terrain: generated.** Endless rocky/icy plain from a noise heightmap, displaced in a TSL shader, with scattered instanced rocks. Almost no download; no hand-placed landmarks during travel unless added as authored set pieces.
- **Interactivity vs draw calls.** Static geometry merged per room; interactive props drawn with `BatchedMesh` (one draw call for many different objects sharing the palette material, each still movable). To verify with `WebGPURenderer`.
- **Post-processing:** bloom only (emissives, CRTs).
- **Cutscenes:** in-engine. Pre-rendered video costs about 40–60 MB per minute at 1080p.

## Open questions

- Lightmaps or vertex lighting: after the side-by-side test.
- Low-resolution rendering as the game's style: after [prototype 02](../../prototypes/02-low-res.md).
