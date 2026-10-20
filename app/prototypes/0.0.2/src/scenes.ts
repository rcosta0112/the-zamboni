// Scenes: story beats in a location. A scene is a small data file (`public/test/scenes/<id>.json`):
// its location, where she starts and the setup, a list of commands (commands.ts). Starting one puts
// the location back to its kinds' defaults (every door and the ramp closed, every interaction on, the
// crew where they were exported), then applies the setup, snaps the doors there and puts her at her
// start. Dev builds: `?scene=<id>` in the address starts another scene than `opening`;
// `__director().start('<id>')`.
// Plan: doc/plans/architecture/game-architecture/game-structure.md (*Locations and scenes*, pass 2)

import * as THREE from 'three/webgpu';
import { run, fromBlender, type Command, type CommandTarget } from './commands';
import { Placement } from './crew';
import { Door } from './doors';
import { updateShip, type Ship } from './ship';

export interface SceneData {
  /** Only the ship so far (landing sites: the exterior slot, later). */
  location: 'ship';
  /** Her feet (the ship file's Blender coordinates) and the camera's yaw (degrees, the game's). */
  player: { at: [number, number, number]; yaw: number };
  setup: Command[];
}

export const FIRST_SCENE = 'opening';

export class SceneDirector {
  /** The scene started last. */
  current: string | null = null;

  constructor(
    private readonly ship: Ship,
    private readonly target: CommandTarget,
    /** Put her there (world), the camera turned to `yaw` (radians). */
    private readonly placePlayer: (at: THREE.Vector3, yaw: number) => void,
  ) {}

  async start(id: string): Promise<void> {
    const response = await fetch(`/test/scenes/${id}.json`);
    if (!response.ok) throw new Error(`no scene "${id}" (${response.status})`);
    this.apply(id, (await response.json()) as SceneData);
  }

  apply(id: string, scene: SceneData): void {
    // The kinds' defaults.
    for (const entity of this.ship.entities.all()) {
      for (const c of entity.components) {
        if (c instanceof Door) c.shut = false;
        if ('open' in c) c.open = false;
        if (c instanceof Placement) c.reset();
      }
    }
    this.target.disabled.clear();
    for (const command of scene.setup) run(command, this.target);
    updateShip(this.ship, 0, true);
    this.placePlayer(this.ship.object.localToWorld(fromBlender(scene.player.at)), THREE.MathUtils.degToRad(scene.player.yaw));
    this.current = id;
    console.info(`[0.0.2] scene: ${id}`);
  }
}
