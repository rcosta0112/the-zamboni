// Scenes: story beats in a location. A scene is a small data file (`public/scenes/<id>.json`, the
// game's; `public/test/scenes/<id>.json`, the checks'): its location, where she starts, whether the
// ship is flying (`travel`) and the setup, a list of commands (commands.ts). Starting one puts the
// location back to its kinds' defaults (every door and the ramp closed, nothing locked, every
// interaction on, the crew where they were exported), then the flight rules if the ship is flying,
// then the setup; it snaps the doors there and puts her at her start. Each scene start is a checkpoint
// (`onStarted`: main.ts saves once the game has begun).
// **The flight rules** (owner, 2026-10-22), on every scene with `travel`: the outer doors and hatches,
// the jetpacks and her parka locked (`FLIGHT_LOCKED`; their `use_<id>` knots say why), the story's
// `ship_flying` set and the ship's noise on; the scenery going by (`onTravel`: terrain.ts).
// Dev builds: `?scene=<id>` in the address starts a new game from another point (main.ts `ASKED`);
// `__director().start('<id>')`.
// Plans: doc/plans/architecture/game-architecture/game-structure.md (*Locations and scenes*, pass 2),
// doc/plans/features/flying-scene.md (*The flight rules*, pass 1)

import * as THREE from 'three/webgpu';
import { run, fromBlender, type Command, type CommandTarget } from './commands';
import { Placement } from './crew';
import { Door } from './doors';
import { settings } from './settings';
import { updateShip, type Ship } from './ship';

export interface SceneData {
  /** Only the ship so far (landing sites: the exterior slot, later). */
  location: 'ship';
  /** Her feet (the ship file's Blender coordinates) and the camera's yaw (degrees, the game's). */
  player: { at: [number, number, number]; yaw: number };
  /** The ship is flying: the flight rules, its noise; the terrain going by (`public/terrain/<id>.json`). */
  travel?: { terrain: string };
  setup: Command[];
}

/** A new game's first scene. */
export const FIRST_SCENE = 'chapter-1';
/** The checks' first scene (dev builds, `?test`: the test story): the ship landed, as the checks were written for. */
export const TEST_SCENE = 'landed';

/**
 * What the flight rules lock (owner, 2026-10-22): the outer doors and hatches (their keypads with
 * them), the jetpacks and her parka. By kind; the roof hatch by id (the floor hatch is a hatch too).
 */
const FLIGHT_LOCKED = { kinds: ['jetpack', 'outfit'], ids: [] as string[] };
/** The outer doors, also locked in flight unless the tuning panel says otherwise (`settings.outerDoorsLocked`). */
const OUTER_DOORS = { kinds: ['ramp', 'drop-door'], ids: ['top-hatch-lower', 'top-hatch-upper'] };

/** A scene's file: the game's, else the checks'. (Vite answers a missing file with the page: not JSON.) */
async function sceneFile(id: string): Promise<SceneData> {
  for (const url of [`/scenes/${id}.json`, `/test/scenes/${id}.json`]) {
    const response = await fetch(url);
    if (response.ok && response.headers.get('content-type')?.includes('json')) return (await response.json()) as SceneData;
  }
  throw new Error(`no scene "${id}"`);
}

export class SceneDirector {
  /** The scene started last. */
  current: string | null = null;
  /** Called once a scene has started: the checkpoint save (main.ts). */
  onStarted: ((id: string) => void) | null = null;
  /** Called with the scene's terrain, or null when the ship isn't flying: the scenery (main.ts). */
  onTravel: ((terrain: string | null) => void) | null = null;

  constructor(
    private readonly ship: Ship,
    private readonly target: CommandTarget,
    /** Put her there (world), the camera turned to `yaw` (radians). */
    private readonly placePlayer: (at: THREE.Vector3, yaw: number) => void,
  ) {}

  async start(id: string): Promise<void> {
    this.apply(id, await sceneFile(id));
  }

  apply(id: string, scene: SceneData): void {
    // The kinds' defaults.
    for (const entity of this.ship.entities.all()) {
      for (const c of entity.components) {
        if (c instanceof Door) c.shut = false;
        if ('open' in c) c.open = false;
        if ('locked' in c) c.locked = false;
        if (c instanceof Placement) c.reset();
      }
    }
    this.target.disabled.clear();
    this.target.locked.clear();
    // The flight rules, before the setup (its `if` may read `ship_flying`).
    const flying = scene.travel !== undefined;
    settings.shipFlying = flying;
    this.onTravel?.(scene.travel?.terrain ?? null);
    if (this.target.story?.get('ship_flying') !== undefined) this.target.story.set('ship_flying', flying);
    if (flying) {
      for (const id of this.ids(FLIGHT_LOCKED)) run({ do: 'lock', id }, this.target);
      if (settings.outerDoorsLocked) for (const id of this.ids(OUTER_DOORS)) run({ do: 'lock', id }, this.target);
    }
    for (const command of scene.setup) run(command, this.target);
    updateShip(this.ship, 0, true);
    this.placePlayer(this.ship.object.localToWorld(fromBlender(scene.player.at)), THREE.MathUtils.degToRad(scene.player.yaw));
    this.current = id;
    console.info(`[0.0.2] scene: ${id}`);
    this.onStarted?.(id);
  }

  /** The tuning panel's *outer doors locked*, now: in flight they lock or unlock; landed they're never locked. */
  applyOuterDoors(): void {
    if (!settings.shipFlying) return;
    for (const id of this.ids(OUTER_DOORS)) run({ do: settings.outerDoorsLocked ? 'lock' : 'unlock', id }, this.target);
  }

  /** The ids of a list: its own, and every entity of its kinds. */
  private ids(list: { kinds: string[]; ids: string[] }): string[] {
    return [...list.ids, ...[...this.ship.entities.all()].filter((e) => list.kinds.includes(e.kind)).map((e) => e.id)];
  }
}
