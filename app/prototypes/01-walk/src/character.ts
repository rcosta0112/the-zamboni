// Placeholder character: a 1.8 m capsule with a "nose" showing which way it faces.
// Movement follows Part 1's controller: camera-relative input, accelerate to walk/run speed,
// decelerate to a stop, turn smoothly toward the input, move along the facing direction.
// The jetpack, as in Part 1: while it's held there's no gravity; with the stick pushed she flies
// where the camera points (up and down included), at rest she rises straight up. Letting go, she
// falls. No visuals, sound or animation yet. Plan: doc/plans/backlog-passes.md (pass 6).
// After a long fall, the jetpack she wears fires by itself near the ground (the auto-parachute).

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
  /** The way she moves (horizontal, unit) when it isn't the way she faces: the stick's, indoors. */
  private heading = new THREE.Vector3(0, 0, -1);
  /** Seconds left of floating (no gravity) after leaving a ladder at its top; ends on the floor. */
  floating = 0;
  /** The jetpack is held (and worn: `settings.wearingJetpack`). */
  flying = false;
  /** The way she flies (unit, world space); her speed is `speed`. */
  readonly flyDirection = new THREE.Vector3(0, 1, 0);
  /** Flying by an analog R2: how far it's pressed (0..1); null otherwise (Part 1's rule). */
  flyTrigger: number | null = null;
  /** Flying by R2, in the hover band (its edges widen once she's in it). */
  hovering = false;
  /** The auto-parachute is firing: the jetpack slows a long fall near the ground. */
  parachuting = false;
  /** The top of the current fall: where she last stood, climbed or flew (world y). */
  private fallTop = 0;

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

  /** Where the shown model's walk/run cycle is, 0..1; null with no model shown. */
  get cycle(): number | null {
    return (settings.showModel ? this.models[settings.characterModel] : undefined)?.cycle ?? null;
  }

  /** The shown model's jetpack while it's on her back; null otherwise. */
  get jetpack(): THREE.Object3D | null {
    const jetpack = (settings.showModel ? this.models[settings.characterModel] : undefined)?.jetpack ?? null;
    return jetpack?.visible ? jetpack : null;
  }

  /** Per rendered frame: which model is visible, and its animation. */
  animate(dt: number): void {
    const current = settings.showModel ? this.models[settings.characterModel] : undefined;
    this.capsule.visible = !current;
    for (const m of Object.values(this.models)) m.object.visible = m === current;
    current?.update(dt, this.movedSpeed, this.grounded, this.walkSpeed(), this.runSpeed(), this.flying || this.parachuting);
  }

  /**
   * One fixed simulation step.
   * @param cameraYaw camera orbit angle; movement input is relative to it
   * @param cameraPitch camera pitch (positive: above her, looking down); flight follows it
   * @param indoors inside the ship (the indoor speeds apply)
   */
  update(dt: number, input: Input, cameraYaw: number, cameraPitch: number, physics: Physics | null, indoors: boolean): void {
    this.indoors = indoors;
    this.prevPosition.copy(this.position);
    this.prevFacing = this.facing;
    // A fall starts where she stood (or climbed: a ladder leaves her grounded) or let go of the jetpack.
    if (this.grounded || this.flying) this.fallTop = this.position.y;
    else this.fallTop = Math.max(this.fallTop, this.position.y);

    const mx = input.move.x;
    const my = input.move.y;
    const amount = Math.min(1, Math.hypot(mx, my));

    // By an analog R2, on the ground only the climb band takes off; descending onto the ground lands
    // her (she walks, rather than skimming the ground at fly speed while hovering).
    const byTrigger = input.flyTrigger !== null && settings.padFlyMode !== 'part1';
    const takesOff = !byTrigger || !this.grounded || input.flyTrigger! > settings.hoverHigh;
    // Only with a jetpack on (taken from the rack); jumping doesn't need one.
    if (input.flyHeld && takesOff && settings.wearingJetpack) {
      this.parachuting = false;
      this.fly(dt, input, cameraYaw, cameraPitch, amount, physics);
      return;
    }
    if (this.flying) {
      // Let go (Part 1): she falls from a standstill, and carries on the way she faces at the speed
      // she had, which slows to her run.
      this.flying = false;
      this.flyTrigger = null;
      this.hovering = false;
      this.verticalVelocity = 0;
      this.heading.set(-Math.sin(this.facing), 0, -Math.cos(this.facing));
    }

    if (amount > 0.01) {
      const { x: dirX, z: dirZ } = moveDirection(input, cameraYaw, direction);
      this.heading.set(dirX, 0, dirZ).normalize();
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

    // Jump (C, Cross); the jetpack has its own button (owner, 2026-10-12).
    if (input.consumeJump() && (this.grounded || this.floating > 0)) this.jump();
    if (this.floating > 0) {
      // Just off the top of a ladder, over the opening: she stays level until she's over floor.
      this.floating = Math.max(0, this.floating - dt);
      this.verticalVelocity = 0;
    } else this.verticalVelocity -= settings.gravity * dt;
    this.parachute(dt, physics);

    // Indoors she moves the way the stick points, and turns after; outdoors, the way she faces.
    const direct = indoors && settings.indoorDirectMove;
    const desired = new THREE.Vector3(
      (direct ? this.heading.x : -Math.sin(this.facing)) * this.speed * dt,
      this.verticalVelocity * dt,
      (direct ? this.heading.z : -Math.cos(this.facing)) * this.speed * dt,
    );

    if (physics) {
      // Rapier decides how much of the move is possible (walls, the ship, the ground).
      physics.move(desired);
      // Feet from where the capsule actually is (not accumulated moves), so they sit on the ground.
      this.position.copy(physics.feet);
      if (this.floating > 0 && physics.overFloor()) this.floating = 0;
      // Floating, she's shown standing (as on the ladder), not falling.
      this.grounded = physics.grounded || this.floating > 0;
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

  /** Leaves the ground (or a ladder): the jump's height is lower inside the ship. */
  jump(): void {
    this.verticalVelocity = Math.sqrt(2 * settings.gravity * (this.indoors ? settings.indoorJumpHeight : settings.jumpHeight));
    this.grounded = false;
    this.floating = 0;
  }

  /**
   * One fixed step with the jetpack held: Part 1's rule (PlayerMovement.cs). One speed, as on the
   * ground (a run carries into the flight). With the stick pushed she turns as she does on foot and
   * flies along her facing, tilted by the camera's pitch, speeding up to fly speed. With the stick
   * at rest she slows down the way she was going, then rises straight up at a quarter of fly speed.
   */
  private fly(dt: number, input: Input, cameraYaw: number, cameraPitch: number, amount: number, physics: Physics | null): void {
    if (input.flyTrigger !== null && settings.padFlyMode !== 'part1') {
      this.flyByTrigger(dt, input, cameraYaw, amount, input.flyTrigger, physics);
      return;
    }
    this.flyTrigger = null;
    this.flying = true;
    this.floating = 0;
    this.verticalVelocity = 0;

    if (amount >= 0.1) {
      const { x: dirX, z: dirZ } = moveDirection(input, cameraYaw, direction);
      this.heading.set(dirX, 0, dirZ).normalize();
      [this.facing, this.turnVelocity] = smoothDampAngle(this.facing, Math.atan2(-dirX, -dirZ), this.turnVelocity, settings.turnSmoothTime, dt);
      const target = settings.flySpeed * amount;
      this.speed = this.speed < target ? Math.min(target, this.speed + settings.flyAcceleration * dt) : Math.max(target, this.speed - settings.flyDeceleration * dt);
      const cp = Math.cos(cameraPitch);
      this.flyDirection.set(-Math.sin(this.facing) * cp, -Math.sin(cameraPitch), -Math.cos(this.facing) * cp);
      // Not Part 1's: near the ground a flight that points down levels off, and from the ground it
      // lifts her off, so pushing forward flies instead of skimming the ground at fly speed.
      if (this.flyDirection.y < LIFT && physics) {
        lift.copy(this.position).y += 0.05;
        const below = physics.ray(lift, DOWN, settings.flyLowest + 0.05);
        if (below) {
          const share = 1 - THREE.MathUtils.clamp((below.distance - 0.05) / settings.flyLowest, 0, 1);
          this.flyDirection.y = Math.max(this.flyDirection.y, LIFT * share);
          this.flyDirection.normalize();
        }
      }
    } else {
      const rise = settings.flySpeed * settings.flyRiseShare;
      if (this.speed <= rise + 1e-6) {
        this.speed = Math.min(rise, this.speed + settings.flyAcceleration * dt);
        this.flyDirection.set(0, 1, 0);
      } else this.speed = Math.max(0, this.speed - settings.flyDeceleration * dt);
    }

    const desired = flyStep.copy(this.flyDirection).multiplyScalar(this.speed * dt);
    if (physics) {
      physics.move(desired);
      this.position.copy(physics.feet);
      this.grounded = physics.grounded;
      this.movedSpeed = Math.hypot(physics.moved.x, physics.moved.z) / dt;
    } else {
      this.position.add(desired);
      if (this.position.y < 0) this.position.y = 0;
      this.grounded = this.position.y <= 0;
      this.movedSpeed = this.speed;
    }
  }

  /**
   * One fixed step flying by an analog R2 (owner, 2026-10-14): the stick flies her horizontally (at
   * fly speed, turning as on foot); the trigger alone sets her height. 'speed' mode: the trigger
   * gives a vertical speed (lower third descends, middle third hovers, upper third climbs), which
   * she eases toward. 'acceleration' mode: it gives a vertical acceleration (the middle third
   * none), with a drag so she settles.
   */
  private flyByTrigger(dt: number, input: Input, cameraYaw: number, amount: number, trigger: number, physics: Physics | null): void {
    this.flying = true;
    this.floating = 0;
    this.flyTrigger = trigger;

    if (amount >= 0.1) {
      const { x: dirX, z: dirZ } = moveDirection(input, cameraYaw, direction);
      this.heading.set(dirX, 0, dirZ).normalize();
      [this.facing, this.turnVelocity] = smoothDampAngle(this.facing, Math.atan2(-dirX, -dirZ), this.turnVelocity, settings.turnSmoothTime, dt);
      const target = settings.flySpeed * amount;
      this.speed = this.speed < target ? Math.min(target, this.speed + settings.flyAcceleration * dt) : Math.max(target, this.speed - settings.flyDeceleration * dt);
    } else this.speed = Math.max(0, this.speed - settings.flyDeceleration * dt);

    // The trigger's shape, -1..1: 0 across the hover band (wider once she's in it), smooth ramps
    // from its edges to the trigger's ends.
    const widen = this.hovering ? settings.hoverHysteresis : 0;
    const low = settings.hoverLow - widen;
    const high = settings.hoverHigh + widen;
    this.hovering = trigger >= low && trigger <= high;
    const shape =
      trigger < low ? -smoothstep((low - trigger) / Math.max(0.01, low - settings.flyTriggerOff)) :
      trigger > high ? smoothstep((trigger - high) / Math.max(0.01, 1 - high)) : 0;
    let vy = this.verticalVelocity;
    if (settings.padFlyMode === 'acceleration') {
      vy += shape * settings.flyTriggerAcceleration * dt;
      vy -= vy * Math.min(1, settings.flyVerticalDrag * dt);
    } else {
      const target = shape > 0 ? shape * settings.flyClimbSpeed : shape * settings.flyDescendSpeed;
      const change = settings.flyVerticalAcceleration * dt;
      vy = vy < target ? Math.min(target, vy + change) : Math.max(target, vy - change);
    }

    const direct = this.indoors && settings.indoorDirectMove;
    const desired = flyStep.set(
      (direct ? this.heading.x : -Math.sin(this.facing)) * this.speed * dt,
      vy * dt,
      (direct ? this.heading.z : -Math.cos(this.facing)) * this.speed * dt,
    );
    if (physics) {
      physics.move(desired);
      this.position.copy(physics.feet);
      this.grounded = physics.grounded;
      // On the ground, or her head against something: that way she isn't moving.
      if (this.grounded && vy < 0) vy = 0;
      if (vy > 0 && physics.moved.y < desired.y * 0.5) vy = 0;
      this.movedSpeed = Math.hypot(physics.moved.x, physics.moved.z) / dt;
    } else {
      this.position.add(desired);
      if (this.position.y <= 0) {
        this.position.y = 0;
        vy = Math.max(0, vy);
      }
      this.grounded = this.position.y <= 0;
      this.movedSpeed = this.speed;
    }
    this.verticalVelocity = vy;
  }

  /**
   * The auto-parachute (owner, 2026-10-14), one fixed step while she falls: after a fall of at least
   * `parachuteMinDrop`, wearing a jetpack, it fires when the ground is near enough to slow her to
   * `parachuteLandingSpeed` at a fixed braking, and keeps firing down to the ground. That braking is
   * what makes a fall of exactly the minimum drop fire for `parachuteBurst` seconds, so a longer fall
   * fires higher rather than stopping harder. Each step it brakes exactly as much as is left to do
   * over the distance left, so she lands at the landing speed.
   */
  private parachute(dt: number, physics: Physics | null): void {
    const landing = settings.parachuteLandingSpeed;
    if (!settings.parachute || !settings.wearingJetpack || !physics || this.grounded || this.floating > 0 || this.verticalVelocity >= -landing) {
      this.parachuting = false;
      return;
    }
    const from = lift.copy(this.position);
    from.y += 0.05;
    const hit = physics.ray(from, DOWN, PARACHUTE_LOOK);
    if (!hit) {
      this.parachuting = false;
      return;
    }
    const height = Math.max(0.01, hit.distance - 0.05);
    const v = -this.verticalVelocity;
    if (!this.parachuting) {
      if (this.fallTop - (this.position.y - height) < settings.parachuteMinDrop) return;
      if (height > (v * v - landing * landing) / (2 * parachuteBraking())) return;
      this.parachuting = true;
    }
    // Done a little above the ground: in fixed steps the braking lags, and aiming at the ground itself
    // landed her at about twice the landing speed.
    const brake = (v * v - landing * landing) / (2 * Math.max(0.01, height - PARACHUTE_DONE_ABOVE));
    this.verticalVelocity = Math.min(-landing, this.verticalVelocity + brake * dt);
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
    this.floating = 0;
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
const flyStep = new THREE.Vector3();
const lift = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
/** How far down the auto-parachute looks for the ground (m). */
const PARACHUTE_LOOK = 200;
/** The auto-parachute is down to the landing speed this far above the ground (m). */
const PARACHUTE_DONE_ABOVE = 0.15;

/**
 * The auto-parachute's braking (m/s²): on a fall of exactly `parachuteMinDrop` from rest, it fires
 * for `parachuteBurst` seconds. Braking evenly from v to the landing speed vl over t seconds covers
 * (v + vl) / 2 × t metres, and v² = 2g × (the drop − that), which gives v; the braking is (v − vl) / t.
 */
function parachuteBraking(): number {
  const g = settings.gravity;
  const t = settings.parachuteBurst;
  const vl = settings.parachuteLandingSpeed;
  const b = g * t;
  const v = (-b + Math.sqrt(b * b - 4 * (b * vl - 2 * g * settings.parachuteMinDrop))) / 2;
  return Math.max(1, (v - vl) / t);
}
/** Near the ground, a flight is tilted up by at least this much (vertical share of its direction). */
const LIFT = 0.5;

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

/** 0 at 0, 1 at 1, flat at both ends (input clamped to 0..1). */
function smoothstep(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
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
