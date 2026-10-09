// Placeholder character: a 1.8 m capsule with a "nose" showing which way it faces.
// Movement follows Part 1's controller: camera-relative input, accelerate to walk/run speed,
// decelerate to a stop, turn smoothly toward the input, move along the facing direction.

import * as THREE from 'three/webgpu';
import { settings } from './settings';
import type { Input } from './input';
import type { AnimatedModel, ModelId } from './model';
import type { Physics } from './physics';

const HEIGHT = 1.8;
const RADIUS = 0.35;

export class Character {
  readonly root = new THREE.Group();

  /** Simulation state (fixed timestep). */
  readonly position = new THREE.Vector3();
  facing = 0; // radians around +Y; 0 faces -Z
  speed = 0; // horizontal speed the character is trying to move at, m/s
  movedSpeed = 0; // horizontal speed it actually moved at (less when blocked), m/s
  verticalVelocity = 0;
  grounded = true;
  indoors = false; // inside the ship: the indoor walk and run speeds apply

  /** Previous state, for interpolating between fixed steps when rendering. */
  private prevPosition = new THREE.Vector3();
  private prevFacing = 0;
  private turnVelocity = 0;

  constructor() {
    const material = new THREE.MeshStandardNodeMaterial({ color: 0xe8743b, roughness: 0.6 });
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(RADIUS, HEIGHT - RADIUS * 2, 8, 16),
      material,
    );
    body.position.y = HEIGHT / 2;
    body.castShadow = true;

    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.3),
      new THREE.MeshStandardNodeMaterial({ color: 0x2b2b2b, roughness: 0.8 }),
    );
    nose.position.set(0, 1.5, -RADIUS);
    nose.castShadow = true;

    this.capsule.add(body, nose);
    this.root.add(this.capsule);
  }

  /** Placeholder shapes, hidden while an animated model is shown. */
  readonly capsule = new THREE.Group();
  private models: Partial<Record<ModelId, AnimatedModel>> = {};

  setModels(models: Record<ModelId, AnimatedModel>): void {
    this.models = models;
    for (const m of Object.values(models)) this.root.add(m.object);
  }

  /** Per rendered frame: which model is visible, and its animation. */
  animate(dt: number): void {
    const current = settings.showModel ? this.models[settings.characterModel] : undefined;
    this.capsule.visible = !current;
    for (const m of Object.values(this.models)) m.object.visible = m === current;
    current?.update(dt, this.movedSpeed, this.grounded, this.walkSpeed(), this.runSpeed());
  }

  /**
   * One fixed simulation step.
   * @param cameraYaw camera orbit angle; movement input is relative to it
   * @param indoors inside the ship (the indoor speeds apply)
   */
  update(dt: number, input: Input, cameraYaw: number, physics: Physics | null, indoors: boolean): void {
    this.indoors = indoors;
    this.prevPosition.copy(this.position);
    this.prevFacing = this.facing;

    const mx = input.move.x;
    const my = input.move.y;
    const amount = Math.min(1, Math.hypot(mx, my));

    if (amount > 0.01) {
      const { x: dirX, z: dirZ } = moveDirection(input, cameraYaw, direction);
      const target = Math.atan2(-dirX, -dirZ);
      [this.facing, this.turnVelocity] = smoothDampAngle(
        this.facing,
        target,
        this.turnVelocity,
        settings.turnSmoothTime,
        dt,
      );

      // Keyboard: run unless Shift is held. Stick: speed follows how far it's pushed.
      const maxSpeed = input.walkHeld ? this.walkSpeed() : this.runSpeed();
      const targetSpeed = maxSpeed * amount;
      if (this.speed < targetSpeed) {
        this.speed = Math.min(targetSpeed, this.speed + settings.acceleration * dt);
      } else {
        this.speed = Math.max(targetSpeed, this.speed - settings.deceleration * dt);
      }
    } else if (this.grounded) {
      this.speed = Math.max(0, this.speed - settings.deceleration * dt);
    }

    // Jump (the same button will fly when the backpack is worn; not in this prototype).
    if (input.consumeJump() && this.grounded) {
      this.verticalVelocity = Math.sqrt(2 * settings.gravity * settings.jumpHeight);
      this.grounded = false;
    }
    this.verticalVelocity -= settings.gravity * dt;

    const desired = new THREE.Vector3(
      -Math.sin(this.facing) * this.speed * dt,
      this.verticalVelocity * dt,
      -Math.cos(this.facing) * this.speed * dt,
    );

    if (physics) {
      // Rapier decides how much of the move is possible (walls, the ship, the ground).
      physics.move(desired);
      // Feet from where the capsule actually is (not accumulated moves), so they sit on the ground.
      this.position.copy(physics.feet);
      this.grounded = physics.grounded;
      if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;
      // Head hit something on the way up.
      if (!this.grounded && this.verticalVelocity > 0 && physics.moved.y < desired.y * 0.5) this.verticalVelocity = 0;
      this.movedSpeed = Math.hypot(physics.moved.x, physics.moved.z) / dt;
    } else {
      // No physics yet (still loading): the floor is the plane y = 0.
      this.position.add(desired);
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
      this.movedSpeed = this.speed;
    }
  }

  /**
   * On a ladder: placed directly (no physics move, no gravity), facing `facing`. Shown standing:
   * there's no climbing animation yet.
   */
  setClimbing(feet: THREE.Vector3, facing: number, physics: Physics | null): void {
    this.prevPosition.copy(this.position);
    this.prevFacing = this.facing;
    this.position.copy(feet);
    this.facing = facing;
    this.turnVelocity = 0;
    this.speed = 0;
    this.movedSpeed = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    physics?.teleport(feet);
  }

  walkSpeed(): number {
    return this.indoors ? settings.indoorWalkSpeed : settings.walkSpeed;
  }

  runSpeed(): number {
    return this.indoors ? settings.indoorRunSpeed : settings.runSpeed;
  }

  /** Place the visible model between the last two fixed steps. */
  render(alpha: number): void {
    this.root.position.lerpVectors(this.prevPosition, this.position, alpha);
    this.root.rotation.y = this.prevFacing + shortestAngle(this.prevFacing, this.facing) * alpha;
  }
}

const direction = new THREE.Vector3();

/**
 * The stick or keys as a direction on the ground (world space, length = how far it's pushed,
 * 0..1), relative to the camera. Camera forward on the ground is (-sin yaw, -cos yaw); right is
 * (cos yaw, -sin yaw).
 */
export function moveDirection(input: Input, cameraYaw: number, out: THREE.Vector3): THREE.Vector3 {
  const mx = input.move.x;
  const my = input.move.y;
  return out.set(-Math.sin(cameraYaw) * my + Math.cos(cameraYaw) * mx, 0, -Math.cos(cameraYaw) * my - Math.sin(cameraYaw) * mx);
}

function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Critically damped angle smoothing (same behaviour as Unity's Mathf.SmoothDampAngle). */
function smoothDampAngle(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  dt: number,
): [number, number] {
  const t = current + shortestAngle(current, target);
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - t;
  const temp = (velocity + omega * change) * dt;
  const newVelocity = (velocity - omega * temp) * exp;
  let output = t + (change + temp) * exp;
  // Don't overshoot.
  if (t - current > 0 === output > t) {
    output = t;
    return [output, 0];
  }
  return [output, newVelocity];
}
