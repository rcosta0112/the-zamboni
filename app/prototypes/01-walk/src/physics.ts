// Physics with Rapier: the ground, static mesh colliders (the ship), and a kinematic character
// controller (capsule) that slides along walls and steps over small ledges.
// Gravity and jumping stay in character.ts; Rapier only resolves where the capsule can go.

import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three/webgpu';

/** Gap the character controller keeps between the capsule and what it touches (m). */
const OFFSET = 0.02;

export interface CapsuleSize {
  radius: number;
  halfHeight: number; // of the cylinder part; total height = 2 × (halfHeight + radius)
}

export class Physics {
  readonly world: RAPIER.World;
  private controller: RAPIER.KinematicCharacterController;
  private capsule: RAPIER.Collider;
  private size: CapsuleSize;
  /** Movement actually allowed by the last move() call. */
  readonly moved = new THREE.Vector3();
  /** Where the character's feet are: the capsule's bottom, less the controller's contact gap. */
  readonly feet = new THREE.Vector3();
  grounded = false;

  private constructor(size: CapsuleSize, feet: THREE.Vector3) {
    this.size = size;
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });

    // Ground: a flat 500 × 500 m triangle mesh at y = 0. (A huge box doesn't work: with Rapier
    // 0.19–0.21 the character controller sinks through a 1000 m cuboid; a mesh is robust.)
    const h = 250;
    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(new Float32Array([-h, 0, -h, h, 0, -h, h, 0, h, -h, 0, h]), new Uint32Array([0, 2, 1, 0, 3, 2])),
    );

    // The capsule is a collider with no rigid body, moved directly to where the controller allows
    // (a kinematic body plus snap-to-ground let it sink through the ground after a long frame).
    const centre = this.centreFromFeet(feet);
    this.capsule = this.world.createCollider(RAPIER.ColliderDesc.capsule(size.halfHeight, size.radius).setTranslation(centre.x, centre.y, centre.z));

    this.controller = this.world.createCharacterController(OFFSET);
    this.controller.enableAutostep(0.3, 0.2, false);
    this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(45));
    this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(30));
  }

  static async create(size: CapsuleSize, feet: THREE.Vector3): Promise<Physics> {
    await RAPIER.init();
    return new Physics(size, feet);
  }

  /** A static triangle-mesh collider from a mesh, in its current world position. */
  addStaticMesh(mesh: THREE.Mesh): void {
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position');
    const vertices = new Float32Array(position.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      vertices.set([v.x, v.y, v.z], i * 3);
    }
    const index = geometry.getIndex();
    const indices = index ? new Uint32Array(index.array) : Uint32Array.from({ length: position.count }, (_, i) => i);
    this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices));
  }

  /**
   * Try to move the capsule by `desired` (metres); Rapier shortens or deflects it on contact.
   * Updates `moved` and `grounded`, and steps the world.
   */
  move(desired: THREE.Vector3): void {
    this.controller.computeColliderMovement(this.capsule, desired);
    const m = this.controller.computedMovement();
    this.moved.set(m.x, m.y, m.z);
    this.grounded = this.controller.computedGrounded();
    const t = this.capsule.translation();
    this.capsule.setTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });
    this.world.step(); // keeps the scene queries up to date
    const c = this.capsule.translation();
    this.feet.set(c.x, c.y - this.size.halfHeight - this.size.radius - OFFSET, c.z);
  }

  private centreFromFeet(feet: THREE.Vector3): THREE.Vector3 {
    // A few centimetres up, so the capsule doesn't start out touching the ground.
    return new THREE.Vector3(feet.x, feet.y + this.size.halfHeight + this.size.radius + 0.05, feet.z);
  }
}
