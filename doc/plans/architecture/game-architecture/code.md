# Code architecture (outline)

Part of the [game architecture plan](README.md). The repo and workspace layout is in its own plan: [repo and prototype workspace](../repo-and-prototypes.md).

| Part | Role |
|---|---|
| **World** | Holds the three layers ([levels](levels.md)); swaps the exterior slot; switches indoor/outdoor rules |
| **Asset manager** | Reads manifests; a priority download queue (what's needed now first, preloads after); reference counting so sites unload cleanly; the compile/warm-up step ([performance](performance.md#stutter)) |
| **Mode machine** | Title, travelling, landed, cutscene, plus overlays ([`architecture/README.md`](../../../architecture/README.md)) |
| **Input** | Actions, not keys: *move, look, jump/fly, interact, comm, pause…*, mapped to the gamepad (primary) and keyboard/mouse (secondary). Button prompts follow the last device used |
| **Physics** | Rapier: static collision from the exported shapes, dynamic props, the character controller |
| **Characters** | Loads character meshes and the shared animation files; one animation mixer per character; layering (e.g. `talk` over `idle`) ([characters](characters.md)) |
| **Save** | Checkpoints, IndexedDB storage, export/import ([saving](saving.md)) |
| **Offline** | Service worker, the "download everything" job, update flow ([offline](offline.md)) |
| **UI** (`packages/ui`, Svelte 5) | Design-system components and screens. Fully usable with a gamepad: focus navigation on every screen |
| **Game ↔ UI bridge** | One shared state module: the game writes (new message, new scan, prompt), the UI reads and sends commands back (choice picked, app opened). The UI never touches Three.js directly |
| **Content** | Ink story, JSON data, manifests ([`architecture/README.md`](../../../architecture/README.md#content-and-data)) |
