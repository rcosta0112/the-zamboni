// Changing clothes at her locker (item 72; owner, 2026-10-21). The clothes in it are the ship's
// things with an `outfit` tag (kinds `outfit` and `clothes`), each shown unless she wears the outfit
// it goes with. The `outfit` one (the parka) is the prompt, *Put on parka* / *Take off parka*,
// offered only while the door it's `behind` is open. An instant swap of `settings.outfit`: model.ts
// dresses her, main.ts keeps Ink's `green_outfit` with it (the save).
// Plan: doc/plans/features/locker-outfit.md

import type * as THREE from 'three/webgpu';
import { isOpenable, type Entities } from './entities';
import type { Interactable } from './interaction';
import { labelOf } from './labels';
import type { Outfit } from './model';
import { settings } from './settings';

/** What she takes an outfit off into: the indoor clothes. */
const INDOORS: Outfit = 'jumpsuit';
/** How open the door must be for the clothes behind it to be offered (0..1). */
const OPEN_ENOUGH = 0.8;

export class LockerClothes {
  /** Each thing in a locker and the outfit it goes with. */
  readonly items: { object: THREE.Object3D; outfit: Outfit }[];
  readonly interactables: Interactable[];

  constructor(entities: Entities) {
    const outfitOf = (o: THREE.Object3D) => o.userData.outfit as Outfit;
    this.items = [...entities.ofKind('outfit'), ...entities.ofKind('clothes')].map((e) => ({ object: e.object, outfit: outfitOf(e.object) }));
    this.interactables = entities.ofKind('outfit').map((e) => {
      const outfit = outfitOf(e.object);
      const behind = e.object.userData.behind as string | undefined;
      const door = behind ? entities.get(behind)?.find(isOpenable) : null;
      if (behind && !door) console.warn(`[0.0.2] ${e.id}: no door "${behind}" to be behind`);
      const name = labelOf(e.id, e.kind);
      return {
        name: e.object.name,
        objects: [e.object],
        verb: () => (settings.outfit === outfit ? `Take off ${name}` : `Put on ${name}`),
        available: () => !door || door.amount >= OPEN_ENOUGH,
        act: () => {
          settings.outfit = settings.outfit === outfit ? INDOORS : outfit;
          this.update();
        },
      };
    });
  }

  /** Per frame: what she wears isn't in the locker. */
  update(): void {
    for (const item of this.items) item.object.visible = item.outfit !== settings.outfit;
  }
}
