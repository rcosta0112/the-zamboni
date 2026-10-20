// The one set of commands: what scene setups say now, and Ink and cutscene event tracks will say
// (passes 3 and 5), each addressed by id. Positions are in the ship file's Blender coordinates (read
// off an object in Blender), turns in degrees.
// Plan: doc/plans/architecture/game-architecture/game-structure.md (*One set of commands*)

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import { Placement } from './crew';
import type { Entities, Openable } from './entities';

export type Command =
  /** Open or close a door, a hatch, the ramp. */
  | { do: 'set'; id: string; state: 'open' | 'closed' }
  /** Offer or stop offering something to use (its prompt), by its id. */
  | { do: 'enable' | 'disable'; id: string }
  /** Put a character's feet at `at`, turned `turn` degrees from how it was exported. */
  | { do: 'place'; id: string; at: [number, number, number]; turn?: number }
  /** Play a sound cue, at a thing (by id) or without a place. */
  | { do: 'sound'; cue: CueId; at?: string }
  /** Defined, not built: no landing site exists yet. */
  | { do: 'swap-exterior'; site: string }
  /** Pass 5. */
  | { do: 'cutscene'; id: string };

/** What the commands act on. */
export interface CommandTarget {
  entities: Entities;
  /** The ids whose interactions are off (`Interaction.disabled`). */
  disabled: Set<string>;
  play: (cue: CueId, at?: THREE.Object3D) => void;
}

const isOpenable = (c: object): c is Openable => 'open' in c && 'amount' in c;

/** The ship's glTF space from the ship file's Blender coordinates. */
export const fromBlender = ([x, y, z]: [number, number, number]) => new THREE.Vector3(x, z, -y);

/** Runs one command; what it can't do is warned about (a missing id, a stub). */
export function run(command: Command, target: CommandTarget): void {
  const entity = 'id' in command && command.do !== 'cutscene' ? target.entities.get(command.id) : null;
  const missing = () => console.warn(`[0.0.2] ${command.do}: no "${'id' in command ? command.id : ''}" that can do it`);
  switch (command.do) {
    case 'set': {
      const openable = entity?.find(isOpenable);
      if (!openable) return missing();
      openable.open = command.state === 'open';
      return;
    }
    case 'enable':
    case 'disable':
      if (!entity) return missing();
      if (command.do === 'disable') target.disabled.add(command.id);
      else target.disabled.delete(command.id);
      return;
    case 'place': {
      const placement = entity?.find((c): c is Placement => c instanceof Placement);
      if (!placement) return missing();
      placement.place(fromBlender(command.at), THREE.MathUtils.degToRad(command.turn ?? 0));
      return;
    }
    case 'sound': {
      const at = command.at ? target.entities.get(command.at)?.object : undefined;
      if (command.at && !at) console.warn(`[0.0.2] sound: no "${command.at}"`);
      target.play(command.cue, at);
      return;
    }
    case 'swap-exterior':
    case 'cutscene':
      console.warn(`[0.0.2] ${command.do} isn't built yet (${'site' in command ? command.site : command.id})`);
  }
}
