// Changing clothes at her locker (item 72; owner, 2026-10-21). The clothes in it are the ship's
// things with an `outfit` tag (kinds `outfit` and `clothes`), each shown unless she wears the outfit
// it goes with. The `outfit` one (the parka) is the prompt, *Put on parka* / *Take off parka*,
// offered only while the door it's `behind` is open. An instant swap of `settings.outfit`: model.ts
// dresses her, main.ts keeps Ink's `green_outfit` with it (the save). Each change zips (a sound at
// the parka) and swings its hanger (kind `hanger`, the parka its child in the file): a small swing
// about its hook that dies away (item 75).
// Plan: doc/plans/features/locker-outfit.md

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
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
  readonly swings: HangerSwing[];

  constructor(entities: Entities, sound: (id: CueId, at: THREE.Object3D) => void = () => undefined) {
    this.swings = entities.ofKind('hanger').map((e) => new HangerSwing(e.object));
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
          const off = settings.outfit === outfit;
          settings.outfit = off ? INDOORS : outfit;
          this.update(0);
          sound(off ? 'sfx_zipper_down' : 'sfx_zipper_up', e.object);
          this.swings.find((s) => s.carries(e.object))?.start();
        },
      };
    });
  }

  /** Per frame: what she wears isn't in the locker; the hangers swing. */
  update(dt: number): void {
    for (const item of this.items) item.object.visible = item.outfit !== settings.outfit;
    for (const swing of this.swings) swing.update(dt);
  }
}

/** A hanger and what's on it, turning about its hook (the top of its own bounds, without the things on it). */
class HangerSwing {
  private readonly pivot = new THREE.Group();
  /** Across the hanger's widest side, in the pivot's parent: the swing goes toward and away from her. */
  private readonly axis = new THREE.Vector3();
  private time = Infinity;
  /** Now, in radians (for checks). */
  angle = 0;

  constructor(private readonly hanger: THREE.Object3D) {
    const parent = hanger.parent!;
    parent.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    for (const o of [hanger, ...hanger.children.filter((c) => !c.userData.id)]) {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld));
    }
    const size = box.getSize(new THREE.Vector3());
    const hook = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
    this.axis.set(size.x >= size.z ? 1 : 0, 0, size.x >= size.z ? 0 : 1).applyQuaternion(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    this.pivot.name = `${hanger.name} (swing)`;
    this.pivot.position.copy(parent.worldToLocal(hook));
    parent.add(this.pivot);
    this.pivot.updateWorldMatrix(false, false);
    this.pivot.attach(hanger);
  }

  carries(o: THREE.Object3D): boolean {
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === this.hanger) return true;
    return false;
  }

  start(): void {
    this.time = 0;
  }

  update(dt: number): void {
    if (this.time > settings.hangerSwingTime) return;
    this.time += Math.max(0, dt);
    // Damped: e^-4 (2%) of the swing is left when it stops; scaled so its first swing reaches hangerSwing.
    const t = this.time;
    const damping = (at: number) => Math.exp((-4 * at) / settings.hangerSwingTime);
    const reach = THREE.MathUtils.degToRad(settings.hangerSwing) / damping(1 / (4 * settings.hangerSwingRate));
    this.angle = t > settings.hangerSwingTime ? 0 : reach * damping(t) * Math.sin(2 * Math.PI * settings.hangerSwingRate * t);
    this.pivot.quaternion.setFromAxisAngle(this.axis, this.angle);
  }
}
