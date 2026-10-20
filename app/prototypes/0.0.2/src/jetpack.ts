// The jetpack rack in the cargo hold (owner, 2026-10-14): she takes a jetpack from it, and puts it
// back there. The rack's jetpacks are tagged `interact: "pickup"`, `device: "jetpack"` in the ship
// file. Taken, that one hides on the rack and `settings.wearingJetpack` turns on: hers shows, her
// little backpack hides, the hood moves (model.ts), and she can fly (character.ts). Pointing at the
// empty spot puts it back. The tuning panel's switch moves the same setting; the rack follows it.
// Plan: doc/plans/features/dr-green-jetpack-model.md

import type * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import type { Interactable } from './interaction';
import { settings } from './settings';

export class JetpackRack {
  /** The rack's jetpacks, in the file's order. */
  readonly slots: THREE.Object3D[] = [];
  /** The one she took (hidden on the rack), or null. */
  taken: THREE.Object3D | null = null;
  readonly interactables: Interactable[];

  constructor(ship: THREE.Object3D, sound: (id: CueId, at: THREE.Object3D) => void = () => undefined) {
    ship.traverse((o) => {
      if (o.userData.device === 'jetpack') this.slots.push(o);
    });
    // One target each: "Take" while she has none, "Put back" on the spot she took hers from.
    this.interactables = this.slots.map((slot) => ({
      name: slot.name,
      objects: [slot],
      verb: () => (this.taken === slot ? 'Put back jetpack' : 'Take jetpack'),
      available: () => this.taken === null || this.taken === slot,
      act: () => {
        const taking = this.taken === null;
        settings.wearingJetpack = taking;
        this.update(slot);
        sound(taking ? 'sfx_jetpack_take' : 'sfx_jetpack_return', slot);
      },
    }));
  }

  /**
   * Per frame: the rack follows `settings.wearingJetpack` (the tuning panel may switch it): on with
   * none taken, the first one on the rack goes; off, the taken one comes back.
   * @param slot the one to take, if one is taken now
   */
  update(slot?: THREE.Object3D): void {
    if (settings.wearingJetpack && this.taken === null) this.taken = slot ?? this.slots[0] ?? null;
    if (!settings.wearingJetpack) this.taken = null;
    for (const s of this.slots) s.visible = s !== this.taken;
  }
}
