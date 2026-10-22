// The jetpack rack in the cargo hold (owner, 2026-10-14): she takes a jetpack from it, and puts it
// back there. The rack's jetpacks are the ship's things of kind `jetpack`. **She only ever uses the
// bottom right one** (owner, 2026-10-22: the others are the crew's; a scene may have fewer on the
// rack, never without hers). Taken, it hides on the rack and `settings.wearingJetpack` turns on: hers
// shows, her little backpack hides, the hood moves (model.ts), and she can fly (character.ts).
// Pointing at its empty spot puts it back. The tuning panel's switch moves the same setting; the rack follows it.
// Plan: doc/plans/features/dr-green-jetpack-model.md

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import type { Entities } from './entities';
import type { Interactable } from './interaction';
import { settings } from './settings';

export class JetpackRack {
  /** The rack's jetpacks, in the file's order. */
  readonly slots: THREE.Object3D[] = [];
  /** Hers: the bottom right one, seen from the room (null: no rack). */
  readonly hers: THREE.Object3D | null;
  /** The one she took (hidden on the rack), or null. */
  taken: THREE.Object3D | null = null;
  readonly interactables: Interactable[];

  /** @param middleX the ship's centre line across (world x) */
  constructor(entities: Entities, middleX: number, sound: (id: CueId, at: THREE.Object3D) => void = () => undefined) {
    this.slots.push(...entities.ofKind('jetpack').map((e) => e.object));
    // Hers, as seen from the room: the lower shelf, the right end. The rack faces the middle of the ship.
    const centre = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const rack = this.slots.reduce((sum, s) => sum.add(centre(s)), new THREE.Vector3()).divideScalar(Math.max(1, this.slots.length));
    const looking = new THREE.Vector3(Math.sign(rack.x - middleX), 0, 0); // toward the wall, across the ship
    const right = looking.clone().cross(new THREE.Vector3(0, 1, 0));
    const shelf = (o: THREE.Object3D) => Math.round(centre(o).y / 0.2);
    this.hers = [...this.slots].sort((a, b) => shelf(a) - shelf(b) || centre(b).dot(right) - centre(a).dot(right))[0] ?? null;
    const hers = this.hers;
    // One target: "Take" while it's on the rack, "Put back" on its empty spot.
    this.interactables = hers
      ? [
          {
            name: hers.name,
            objects: [hers],
            verb: () => (this.taken ? 'Put jetpack back' : 'Take jetpack'),
            act: () => {
              const taking = this.taken === null;
              settings.wearingJetpack = taking;
              this.update();
              sound(taking ? 'sfx_jetpack_take' : 'sfx_jetpack_return', hers);
            },
          },
        ]
      : [];
  }

  /** Per frame: the rack follows `settings.wearingJetpack` (the tuning panel may switch it): on, hers goes; off, it comes back. */
  update(): void {
    if (settings.wearingJetpack && this.taken === null) this.taken = this.hers;
    if (!settings.wearingJetpack) this.taken = null;
    for (const s of this.slots) s.visible = s !== this.taken;
  }
}
