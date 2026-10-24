// The cockpit's joystick (ship node `Joystick`, its pivot recorded as `hinge` by the export): in the
// ship file a damped track turns it so its Z axis points at the tail of Dr. Green's left hand bone
// (`Hand_l`, `head_tail` 1: her fingers' end) while she pilots. Done here each frame instead: always in time with her loop, and upright when she's not in
// the seat. Exported upright (export-ship.py, `UNRIGGED:`).
// Plan: doc/plans/features/piloting-loop.md (pass B)

import * as THREE from 'three/webgpu';
import { named } from './names';
import { hingeAt } from './ship';

const NAME = 'Joystick';

export class Joystick {
  /** Turned about the stick's pivot; its rest is upright. */
  private readonly pivot: THREE.Object3D;
  /** The stick's Z axis (Blender) at rest, in the pivot's parent's space: glTF's +Y. */
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly to = new THREE.Vector3();

  private constructor(pivot: THREE.Object3D) {
    this.pivot = pivot;
  }

  /** The ship's joystick on its pivot; null (warned) without one. */
  static find(ship: THREE.Object3D): Joystick | null {
    let stick: THREE.Object3D | null = null;
    ship.traverse((o) => {
      if (!stick && named(o, NAME)) stick = o;
    });
    if (!stick || !(stick as THREE.Object3D).userData.hinge) {
      console.warn(`[0.0.2] the ship has no ${NAME} with a hinge: it won't follow her hand`);
      return null;
    }
    return new Joystick(hingeAt(ship, stick));
  }

  /** Per frame: its Z at this point (world: her hand bone's tail), or upright (null). */
  update(hand: THREE.Vector3 | null): void {
    if (!hand) {
      this.pivot.quaternion.identity();
      return;
    }
    const parent = this.pivot.parent!;
    parent.updateWorldMatrix(true, false);
    this.to.copy(hand);
    parent.worldToLocal(this.to).sub(this.pivot.position).normalize();
    this.pivot.quaternion.setFromUnitVectors(this.up, this.to);
  }
}
