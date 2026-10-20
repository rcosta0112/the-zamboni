// Entities: the ship's things the game names, each found by its stable `id` (a custom property in the
// file, glTF extras → userData) and made of components. What a thing is comes from its `kind`
// (kinds.ts), never from its name. Plain objects, no ECS: an entity is its id, its kind, its object in
// the scene and the components the features attached to it (a door, a ramp…).
// Plan: doc/plans/architecture/game-architecture/game-structure.md (passes 1 and 6)

import type * as THREE from 'three/webgpu';
import { isKind, type Kind } from './kinds';

/** A part of an entity with behaviour of its own. */
export interface Component {
  /** Paused: it doesn't update (a cutscene's timeline owns it until it ends). */
  paused: boolean;
}

/** Something that opens and closes: a door, a hatch, the ramp. What scenes and Ink set. */
export interface Openable extends Component {
  /** Where it's going: open or closed. */
  open: boolean;
  /** Where it is: 0 = closed, 1 = open. */
  readonly amount: number;
}

export class Entity {
  readonly components: Component[] = [];

  constructor(
    readonly id: string,
    readonly kind: Kind,
    readonly object: THREE.Object3D,
  ) {}

  /** The first component that passes `test`. */
  find<T extends Component>(test: (c: Component) => c is T): T | null {
    return (this.components.find(test) as T | undefined) ?? null;
  }
}

/** The entities of a location, by id. */
export class Entities {
  private readonly byId = new Map<string, Entity>();

  /** Every object under `root` with an `id` (a duplicate or an unknown kind is warned about, not used). */
  constructor(root: THREE.Object3D) {
    root.traverse((o) => {
      const id = o.userData.id as string | undefined;
      if (!id) return;
      const kind = o.userData.kind as string | undefined;
      if (!kind || !isKind(kind)) console.warn(`[0.0.2] "${o.name}" (${id}) has an unknown kind "${kind}"`);
      else if (this.byId.has(id)) console.warn(`[0.0.2] the id "${id}" is on "${this.byId.get(id)!.object.name}" and "${o.name}"`);
      else this.byId.set(id, new Entity(id, kind, o));
    });
  }

  get(id: string): Entity | null {
    return this.byId.get(id) ?? null;
  }

  /** The entity whose object is `object` (by its `id`), if it has one. */
  of(object: THREE.Object3D): Entity | null {
    const id = object.userData.id as string | undefined;
    return id ? this.get(id) : null;
  }

  all(): IterableIterator<Entity> {
    return this.byId.values();
  }
}
