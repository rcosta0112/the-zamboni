// Physics with Rapier: the ground, static mesh colliders (the ship), and a kinematic character
// controller (capsule) that slides along walls and steps over small ledges.
// Gravity and jumping stay in character.ts; Rapier only resolves where the capsule can go.

import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three/webgpu';

/** Gap the character controller keeps between the capsule and what it touches (m). */
const OFFSET = 0.02;
/** Steepest surface the character can stand on and walk up. */
const MAX_SLOPE = THREE.MathUtils.degToRad(45);

export interface CapsuleSize {
  radius: number;
  halfHeight: number; // of the cylinder part; total height = 2 × (halfHeight + radius)
}

/** A moving object's collider (a door, the ramp). */
export interface MovingCollider {
  /** Call whenever the object moves. */
  sync: () => void;
  setEnabled: (on: boolean) => void;
  /** True if the object, where it is now (not where the collider was last synced), overlaps her capsule. */
  overlapsCharacter: () => boolean;
}

export interface RayHit {
  distance: number;
  normal: THREE.Vector3;
}

export class Physics {
  readonly world: RAPIER.World;
  private controller: RAPIER.KinematicCharacterController;
  private capsule: RAPIER.Collider;
  private ground: RAPIER.Collider;
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
    this.ground = this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(new Float32Array([-h, 0, -h, h, 0, -h, h, 0, h, -h, 0, h]), new Uint32Array([0, 2, 1, 0, 3, 2])),
    );

    // The capsule is a collider with no rigid body, moved directly to where the controller allows
    // (a kinematic body plus snap-to-ground let it sink through the ground after a long frame).
    const centre = this.centreFromFeet(feet);
    this.capsule = this.world.createCollider(RAPIER.ColliderDesc.capsule(size.halfHeight, size.radius).setTranslation(centre.x, centre.y, centre.z));

    this.controller = this.world.createCharacterController(OFFSET);
    this.controller.enableAutostep(0.3, 0.2, false);
    this.controller.setMaxSlopeClimbAngle(MAX_SLOPE);
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
    this.world.step(); // updates the scene queries, so rays see it now (measurements at load)
  }

  /**
   * A collider for a moving object (a door, a ramp): the convex hull of all its meshes, in the
   * object's own space with its world scale baked in. Convex, so holes (the ramp's window) are
   * filled and it's cheap to test against. Call the returned function whenever the object moves.
   */
  addMovingConvex(object: THREE.Object3D): MovingCollider {
    object.updateWorldMatrix(true, true);
    const scale = new THREE.Vector3();
    object.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
    const toObject = new THREE.Matrix4().copy(object.matrixWorld).invert();
    const points: number[] = [];
    const v = new THREE.Vector3();
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const local = new THREE.Matrix4().multiplyMatrices(toObject, mesh.matrixWorld);
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(local);
        points.push(v.x * scale.x, v.y * scale.y, v.z * scale.z);
      }
    });
    const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(points));
    if (!desc) throw new Error(`Couldn't build a convex hull for "${object.name}"`);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    const collider = this.world.createCollider(desc, body);

    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const sync = () => {
      object.updateWorldMatrix(true, false);
      object.matrixWorld.decompose(p, q, scale);
      body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
      body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    };
    sync();
    const overlapsCharacter = () => {
      object.updateWorldMatrix(true, false);
      object.matrixWorld.decompose(p, q, scale);
      return collider.shape.intersectsShape({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w }, this.capsule.shape, this.capsule.translation(), this.capsule.rotation());
    };
    return { sync, setEnabled: (on) => collider.setEnabled(on), overlapsCharacter };
  }

  /** A static box collider, axis-aligned in world space (the crew, for now). */
  addStaticBox(box: THREE.Box3): void {
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(s.x / 2, s.y / 2, s.z / 2).setTranslation(c.x, c.y, c.z));
  }

  /** A static triangle-mesh collider from world-space vertices; can be switched on and off. */
  addStaticTriangles(vertices: Float32Array, indices: Uint32Array): { setEnabled: (on: boolean) => void } {
    const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices));
    this.world.step();
    return { setEnabled: (on) => collider.setEnabled(on) };
  }

  /**
   * Distance from `from` toward `to` to the first collider in the way, or null if the way is
   * clear. Used for camera collision, so it ignores the character's own capsule and the ground
   * (the camera is kept above the ground separately; hitting it when looking up pulled the camera
   * into her head).
   */
  castRay(from: THREE.Vector3, to: THREE.Vector3): number | null {
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    if (length < 1e-4) return null;
    dir.divideScalar(length);
    const ray = new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRay(ray, length, true, undefined, undefined, this.capsule, undefined, (c) => c !== this.ground);
    return hit ? hit.timeOfImpact : null;
  }

  /**
   * The first collider hit along a ray (the ground included, her capsule not), with the surface
   * normal. `staticOnly`: ignore moving parts (doors), e.g. to measure the ship with its doors open.
   */
  ray(from: THREE.Vector3, dir: THREE.Vector3, length: number, staticOnly = false): RayHit | null {
    const ray = new RAPIER.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRayAndGetNormal(ray, length, true, undefined, undefined, this.capsule, undefined, staticOnly ? (c) => c.parent() === null : undefined);
    return hit ? { distance: hit.timeOfImpact, normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z) } : null;
  }

  /** True if her capsule fits with its feet here (touches nothing). */
  fits(feet: THREE.Vector3): boolean {
    const c = this.centreFromFeet(feet);
    return this.world.intersectionWithShape({ x: c.x, y: c.y, z: c.z }, this.capsule.rotation(), this.capsule.shape, undefined, undefined, this.capsule) === null;
  }

  /** Put the capsule's feet here, ignoring collisions (climbing a ladder). */
  teleport(feet: THREE.Vector3): void {
    this.capsule.setTranslation({ x: feet.x, y: feet.y + this.size.halfHeight + this.size.radius + OFFSET, z: feet.z });
    this.moved.set(0, 0, 0);
    this.world.step();
    this.feet.copy(feet);
  }

  /**
   * Try to move the capsule by `desired` (metres); Rapier shortens or deflects it on contact.
   * Updates `moved` and `grounded`, and steps the world.
   */
  move(desired: THREE.Vector3): void {
    this.controller.computeColliderMovement(this.capsule, desired);
    const m = this.controller.computedMovement();
    this.moved.set(m.x, m.y, m.z);
    const t = this.capsule.translation();
    this.capsule.setTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });
    this.world.step(); // keeps the scene queries up to date
    // Rapier's own ground flag (computedGrounded) also says "grounded" against steep walls, which
    // stopped the fall (she slid down walls slowly) and let her jump again off them (climbing to
    // the top floor). So it must also find walkable ground right under her.
    this.grounded = this.controller.computedGrounded() && this.onWalkableGround();
    const c = this.capsule.translation();
    this.feet.set(c.x, c.y - this.size.halfHeight - this.size.radius - OFFSET, c.z);
  }

  /**
   * True if there's walkable ground right under her: a ray straight down from the capsule's
   * centre hits a surface no steeper than MAX_SLOPE within a few centimetres of her feet. (A ray,
   * not a sphere: a sphere also touched edges, like the cargo floor's rear edge at the top of the
   * ramp, whose sideways normal read as "not walkable" and stopped her there.)
   */
  private onWalkableGround(): boolean {
    const c = this.capsule.translation();
    const reach = this.size.halfHeight + this.size.radius + OFFSET + 0.12;
    const ray = new RAPIER.Ray({ x: c.x, y: c.y, z: c.z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRayAndGetNormal(ray, reach, true, undefined, undefined, this.capsule);
    return hit !== null && hit.normal.y >= Math.cos(MAX_SLOPE);
  }

  private centreFromFeet(feet: THREE.Vector3): THREE.Vector3 {
    // A few centimetres up, so the capsule doesn't start out touching the ground.
    return new THREE.Vector3(feet.x, feet.y + this.size.halfHeight + this.size.radius + 0.05, feet.z);
  }
}
