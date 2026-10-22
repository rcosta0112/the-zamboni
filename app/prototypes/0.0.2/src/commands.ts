// The one set of commands: what scene setups and Ink's knots say, and cutscene event tracks will say
// (pass 5), each addressed by id. Positions are in the ship file's Blender coordinates (read off an
// object in Blender), turns in degrees. Any command can depend on the story: `if` / `unless` name an
// Ink variable, read when it runs (a scene's setup: when the scene starts).
// Plan: doc/plans/architecture/game-architecture/game-structure.md (*One set of commands*)

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import { Placement } from './crew';
import { isOpenable, type Entities } from './entities';
import type { Outfit } from './model';
import { settings } from './settings';
import type { GameStory } from './story';

export type Command = (
  /** Open or close a door, a hatch, the ramp. */
  | { do: 'set'; id: string; state: 'open' | 'closed' }
  /**
   * Lock or unlock anything she can use: locked, its `use_<id>` knot runs instead of its action (or
   * "Locked"). A door, hatch or the ramp can't be opened from its keypad either; scenes and Ink still can.
   */
  | { do: 'lock' | 'unlock'; id: string }
  /** Offer or stop offering something to use (its prompt), by its id. */
  | { do: 'enable' | 'disable'; id: string }
  /** Put a character's feet at `at`, turned `turn` degrees from how it was exported. */
  | { do: 'place'; id: string; at: [number, number, number]; turn?: number }
  /** Play a sound cue, at a thing (by id) or without a place. */
  | { do: 'sound'; cue: CueId; at?: string }
  /** Defined, not built: no landing site exists yet. */
  | { do: 'swap-exterior'; site: string }
  /** Run a knot of the story (story.ts). */
  | { do: 'story'; knot: string }
  /** Play a cutscene (cutscene.ts), by its track's id. */
  | { do: 'cutscene'; id: string }
  /** Dress her: the jumpsuit or the parka. */
  | { do: 'outfit'; set: Outfit }
) & {
  /** Only if this story variable is true (set, not zero, not empty). */
  if?: string;
  /** Only if it isn't. */
  unless?: string;
};

/** What the commands act on. */
export interface CommandTarget {
  entities: Entities;
  /** The ids whose interactions are off (`Interaction.disabled`). */
  disabled: Set<string>;
  /** The ids locked that don't open (a jetpack, her parka): `respectLocks` reads it. */
  locked: Set<string>;
  play: (cue: CueId, at?: THREE.Object3D) => void;
  /** Null until it's loaded (or if it couldn't be): `if` / `unless` then count as false. */
  story: GameStory | null;
  /** Plays a cutscene by id. */
  cutscene: (id: string) => void;
}

/** The ship's glTF space from the ship file's Blender coordinates. */
export const fromBlender = ([x, y, z]: [number, number, number]) => new THREE.Vector3(x, z, -y);

/** Runs one command; what it can't do is warned about (a missing id, a stub). */
export function run(command: Command, target: CommandTarget): void {
  const truth = (name: string) => Boolean(target.story?.get(name));
  if (command.if !== undefined && !truth(command.if)) return;
  if (command.unless !== undefined && truth(command.unless)) return;
  const entity = 'id' in command && command.do !== 'cutscene' ? target.entities.get(command.id) : null;
  const missing = () => console.warn(`[0.0.2] ${command.do}: no "${'id' in command ? command.id : ''}" that can do it`);
  switch (command.do) {
    case 'set': {
      const openable = entity?.find(isOpenable);
      if (!openable) return missing();
      openable.open = command.state === 'open';
      return;
    }
    case 'lock':
    case 'unlock': {
      if (!entity) return missing();
      const openable = entity.find(isOpenable);
      if (openable) openable.locked = command.do === 'lock';
      else if (command.do === 'lock') target.locked.add(command.id);
      else target.locked.delete(command.id);
      return;
    }
    case 'story':
      if (!target.story) return console.warn(`[0.0.2] story: not loaded (${command.knot})`);
      target.story.run(command.knot);
      return;
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
    case 'cutscene':
      target.cutscene(command.id);
      return;
    case 'outfit':
      settings.outfit = command.set;
      return;
    case 'swap-exterior':
      console.warn(`[0.0.2] swap-exterior isn't built yet (${command.site})`);
  }
}
