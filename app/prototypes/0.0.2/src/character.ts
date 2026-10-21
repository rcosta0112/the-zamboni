// Placeholder character: a 1.8 m capsule with a "nose" showing which way it faces.
// Movement follows Part 1's controller: camera-relative input, accelerate to walk/run speed,
// decelerate to a stop, turn smoothly toward the input, move along the facing direction.
// The jetpack, with momentum (owner, 2026-10-14, "similar to the ship in Asteroids"): while it's on
// there's no gravity and she has a velocity. Slow, she hovers (R2 sets her height, the stick drifts
// her); fast, she flies (thrust where the stick points, forward being where the camera looks).
// Letting go at speed she glides, losing momentum; on the ground at speed with the jet off she
// skids to a stop. Plan: doc/plans/features/jetpack-hover-and-flight.md.
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
  /** Her velocity (world, m/s) while the jet is on, and while she glides or skids after. */
  readonly velocity = new THREE.Vector3();
  /** The jet is on and she's in flight (thrust where the stick points), not hovering. */
  inFlight = false;
  /** How far the handover from hover to flight has gone, 0..1 (over `flightBlendTime`). */
  flightShare = 0;
  /**
   * Flying by an analog R2: how far it's pressed (0..1), going to 1 as she goes into flight (for the
   * jet's sound and glow); null otherwise (Space, a digital R2: R2 held fully).
   */
  flyTrigger: number | null = null;
  /** Hovering by R2, in the hover band (its edges widen once she's in it). */
  hovering = false;
  /** The jet cut out at speed: she glides on her momentum. */
  gliding = false;
  /** On the ground at speed with the jet off: she slides to a stop. */
  skidding = false;
  /** Steps in a row her move has been blocked (`moveBy`). */
  private blocked = 0;
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

  /** 0..1: how much of her shows (the camera close to her fades her out). */
  setShown(share: number): void {
    for (const m of Object.values(this.models)) m.setShown(share);
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

  /** The model shown, if any. */
  get model(): AnimatedModel | undefined {
    return settings.showModel ? this.models[settings.characterModel] : undefined;
  }

  /** Time into the climbing animation while the ladder plays it (s); null otherwise. */
  clipTime: number | null = null;

  /** Per rendered frame: which model is visible, and its animation. */
  animate(dt: number): void {
    const current = this.model;
    this.capsule.visible = !current;
    for (const m of Object.values(this.models)) m.object.visible = m === current;
    // Skidding, she's shown standing (there's no skid clip yet).
    current?.update(dt, this.skidding ? 0 : this.movedSpeed, this.grounded, this.walkSpeed(), this.runSpeed(), this.flying || this.parachuting, this.clipTime);
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

    // Space and a digital R2 count as R2 held fully.
    const trigger = input.flyTrigger ?? 1;
    // Hovering, on the ground only R2's climb band takes off; descending onto the ground lands her
    // (she walks, rather than skimming the ground). In flight R2's depth doesn't matter.
    const takesOff = !this.grounded || this.inFlight || trigger > settings.hoverHigh;
    // Only with a jetpack on (taken from the rack); jumping doesn't need one.
    if (input.flyHeld && takesOff && settings.wearingJetpack) {
      this.parachuting = false;
      this.jet(dt, input, trigger, cameraYaw, cameraPitch, amount, physics);
      return;
    }
    if (this.flying) this.letGo();
    if (this.gliding || this.skidding) {
      input.consumeJump(); // no jumping out of a glide or a skid
      this.coast(dt, physics);
      return;
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
   * One fixed step with the jet on (owner, 2026-10-14). No gravity; her velocity carries over. Two
   * modes, picked by her horizontal speed, with an eased handover (`flightShare`):
   * - **Hover** (slow): R2 sets her vertical speed (lower third descends, middle third holds, upper
   *   third climbs), which she eases toward. The stick's first `hoverStickShare` of its travel sets
   *   a drift of up to `hoverDriftSpeed`; past it, it thrusts.
   * - **Flight** (from `cruiseSpeed`, until she's back under the drift speed with the stick in its
   *   drift share, so a reversal through zero stays in flight): thrust where the stick points
   *   (forward: where the camera looks, its pitch included), and a drag that holds her top speed at
   *   `flySpeed`. Below `flyLowest` a dive levels off.
   * She faces the stick while it's pushed, and her motion while she coasts.
   */
  private jet(dt: number, input: Input, trigger: number, cameraYaw: number, cameraPitch: number, amount: number, physics: Physics | null): void {
    const v = this.velocity;
    if (!this.flying && !this.gliding && !this.skidding) {
      // From the walk: its speed and fall carry over (a glide or a skid already has its velocity).
      const direct = this.indoors && settings.indoorDirectMove;
      v.set(
        (direct ? this.heading.x : -Math.sin(this.facing)) * this.speed,
        this.verticalVelocity,
        (direct ? this.heading.z : -Math.cos(this.facing)) * this.speed,
      );
    }
    this.flying = true;
    this.gliding = false;
    this.skidding = false;
    this.floating = 0;

    const hs = Math.hypot(v.x, v.z);
    const share = settings.hoverStickShare;
    if (!this.inFlight && hs > settings.cruiseSpeed) this.inFlight = true;
    else if (this.inFlight && hs < settings.hoverDriftSpeed && amount <= share) this.inFlight = false;
    const blend = dt / Math.max(0.01, settings.flightBlendTime);
    this.flightShare = THREE.MathUtils.clamp(this.flightShare + (this.inFlight ? blend : -blend), 0, 1);
    const w = smoothstep(this.flightShare);
    this.flyTrigger = input.flyTrigger === null ? null : THREE.MathUtils.lerp(trigger, 1, w);

    // The stick on the ground, relative to the camera (length: how far it's pushed), and as a unit.
    const stick = moveDirection(input, cameraYaw, direction);
    const ux = amount > 0 ? stick.x / amount : 0;
    const uz = amount > 0 ? stick.z / amount : 0;
    if (amount >= 0.1) {
      [this.facing, this.turnVelocity] = smoothDampAngle(this.facing, Math.atan2(-ux, -uz), this.turnVelocity, settings.turnSmoothTime, dt);
    } else if (hs > settings.hoverDriftSpeed) {
      [this.facing, this.turnVelocity] = smoothDampAngle(this.facing, Math.atan2(-v.x, -v.z), this.turnVelocity, settings.turnSmoothTime, dt);
    }

    // Hover, horizontally: drift toward the stick's speed, or thrust past its drift share.
    let hx: number;
    let hz: number;
    if (amount > share) {
      const thrust = (settings.flyThrust * (amount - share)) / Math.max(0.01, 1 - share);
      hx = ux * thrust;
      hz = uz * thrust;
    } else {
      const drift = (settings.hoverDriftSpeed * amount) / Math.max(0.01, share);
      const dx = ux * drift - v.x;
      const dz = uz * drift - v.z;
      const d = Math.hypot(dx, dz);
      const most = (drift >= hs ? settings.flyAcceleration : settings.flyDeceleration) * dt;
      const k = d > most ? most / d : 1;
      hx = (dx * k) / dt;
      hz = (dz * k) / dt;
    }
    // Hover, vertically: R2's shape, -1..1: 0 across the hover band (wider once she's in it), smooth
    // ramps from its edges to the trigger's ends.
    const widen = this.hovering ? settings.hoverHysteresis : 0;
    const low = settings.hoverLow - widen;
    const high = settings.hoverHigh + widen;
    this.hovering = trigger >= low && trigger <= high;
    const shape =
      trigger < low ? -smoothstep((low - trigger) / Math.max(0.01, low - settings.flyTriggerOff)) :
      trigger > high ? smoothstep((trigger - high) / Math.max(0.01, 1 - high)) : 0;
    const wantedVy = shape > 0 ? shape * settings.flyClimbSpeed : shape * settings.flyDescendSpeed;
    const vyChange = settings.flyVerticalAcceleration * dt;
    const hy = (THREE.MathUtils.clamp(wantedVy - v.y, -vyChange, vyChange)) / dt;

    // Flight: thrust along the stick, forward tilted by the camera's pitch, and a drag that holds her
    // top speed at fly speed. Vertically she follows the camera's aim more tightly (a climb left
    // from hovering doesn't carry her on up), at the speed that thrust would give.
    const cp = Math.cos(cameraPitch);
    const fx = -Math.sin(cameraYaw);
    const fz = -Math.cos(cameraYaw);
    const thrust = settings.flyThrust;
    const drag = thrust / Math.max(0.1, settings.flySpeed);
    const my = input.move.y;
    const mx = input.move.x;
    const ax = (fx * cp * my + Math.cos(cameraYaw) * mx) * thrust - v.x * drag;
    const az = (fz * cp * my - Math.sin(cameraYaw) * mx) * thrust - v.z * drag;
    let ay = (-Math.sin(cameraPitch) * my * settings.flySpeed - v.y) * settings.flyVerticalFollow;
    // Not Part 1's: near the ground a dive levels off (and from the ground she lifts off), so pushing
    // forward flies instead of skimming the ground.
    if (w > 0 && physics) {
      lift.copy(this.position).y += 0.05;
      const below = physics.ray(lift, DOWN, settings.flyLowest + 0.05);
      if (below) {
        const near = 1 - THREE.MathUtils.clamp((below.distance - 0.05) / Math.max(0.01, settings.flyLowest), 0, 1);
        ay = Math.max(ay, 0) + (near * thrust) / LIFT;
        if (v.y < 0) ay -= v.y * LEVEL_OFF * near;
      }
    }

    v.x += THREE.MathUtils.lerp(hx, ax, w) * dt;
    v.z += THREE.MathUtils.lerp(hz, az, w) * dt;
    v.y += THREE.MathUtils.lerp(hy, ay, w) * dt;
    this.moveBy(dt, physics);
    // Touching the ground with the jet on costs her some speed, no more.
    if (this.grounded) slow(v, settings.flyGroundDrag * dt);
    this.speed = Math.hypot(v.x, v.z);
    this.verticalVelocity = v.y;
  }

  /**
   * The jet cuts out (R2 or Space let go). Faster than her run she glides, or skids if she's on the
   * ground; slower, she falls as she does without a jetpack, from the speed she had.
   */
  private letGo(): void {
    const v = this.velocity;
    this.flying = false;
    this.inFlight = false;
    this.flightShare = 0;
    this.flyTrigger = null;
    this.hovering = false;
    this.speed = Math.hypot(v.x, v.z);
    this.verticalVelocity = v.y;
    if (this.speed > 0.01) this.heading.set(v.x, 0, v.z).normalize();
    else this.heading.set(-Math.sin(this.facing), 0, -Math.cos(this.facing));
    if (this.speed > this.runSpeed()) {
      if (this.grounded) this.skidding = true;
      else this.gliding = true;
    }
  }

  /**
   * One fixed step of a glide or a skid, with the jet off: she goes the way her momentum takes her
   * (the stick does nothing), facing it. Gliding, her speed falls off by `glideDrag`, and on the way
   * down part of gravity is cancelled and her fall held back, both by her speed. Skidding, it falls
   * off by `skidFriction`. A glide that lands skids; a skid off a ledge glides again. Down to her run
   * speed (a glide) or to a stop (a skid), she's back to the walk's rule.
   */
  private coast(dt: number, physics: Physics | null): void {
    const v = this.velocity;
    const run = this.runSpeed();
    let hs = Math.hypot(v.x, v.z);
    if (hs > 0.01) {
      [this.facing, this.turnVelocity] = smoothDampAngle(this.facing, Math.atan2(-v.x, -v.z), this.turnVelocity, settings.turnSmoothTime, dt);
    }
    slow(v, (this.skidding ? settings.skidFriction : settings.glideDrag) * dt);
    hs = Math.hypot(v.x, v.z);
    if (this.gliding && v.y < 0) {
      // The fastest fall: glideSink at fly speed, up to twice that at her run speed (where the glide
      // ends). Falling faster already (a dive let go), she's eased back to it.
      const held = THREE.MathUtils.clamp((hs - run) / Math.max(0.01, settings.flySpeed - run), 0, 1);
      const fastest = settings.glideSink * (2 - held);
      const within = v.y >= -fastest;
      v.y -= settings.gravity * (1 - settings.glideLift * THREE.MathUtils.clamp(hs / settings.flySpeed, 0, 1)) * dt;
      if (within) v.y = Math.max(v.y, -fastest);
      else v.y += (-fastest - v.y) * Math.min(1, SINK_EASE * dt);
    } else v.y -= settings.gravity * dt;
    this.verticalVelocity = v.y;
    this.parachute(dt, physics);
    v.y = this.verticalVelocity;
    this.moveBy(dt, physics);
    hs = Math.hypot(v.x, v.z);

    // A glide that lands skids; a skid off a ledge glides again.
    if (this.grounded !== this.skidding && (this.gliding || this.skidding)) {
      this.skidding = this.grounded;
      this.gliding = !this.grounded;
    }
    if (this.gliding && hs <= run) this.gliding = false;
    if (this.skidding && hs < SKID_STOP) {
      this.skidding = false;
      v.x = 0;
      v.z = 0;
      hs = 0;
    }
    this.speed = hs;
    this.verticalVelocity = v.y;
    if (hs > 0.01) this.heading.set(v.x, 0, v.z).normalize();
  }

  /**
   * Moves her by her velocity for one step. What she runs into takes away that part of it (sliding
   * along a wall she keeps the rest); on the ground she isn't falling, and against a ceiling she
   * isn't climbing.
   */
  private moveBy(dt: number, physics: Physics | null): void {
    const v = this.velocity;
    const desired = flyStep.copy(v).multiplyScalar(dt);
    if (physics) {
      physics.move(desired);
      this.position.copy(physics.feet);
      this.grounded = physics.grounded;
      const moved = physics.moved;
      // Only a real block counts: the controller's small corrections on the ground would add up, and
      // pressed into the ground at speed it now and then stops her for a step or two on open ground.
      // A wall blocks her position all the same; it takes her speed once it has for BLOCK_STEPS.
      const bx = Math.abs(moved.x) < Math.abs(desired.x) * BLOCKED;
      const bz = Math.abs(moved.z) < Math.abs(desired.z) * BLOCKED;
      this.blocked = bx || bz ? this.blocked + 1 : 0;
      if (this.blocked >= BLOCK_STEPS) {
        if (bx) v.x = moved.x / dt;
        if (bz) v.z = moved.z / dt;
      }
      if (v.y > 0 && moved.y < desired.y * 0.5) v.y = 0;
      this.movedSpeed = Math.hypot(moved.x, moved.z) / dt;
    } else {
      this.position.add(desired);
      if (this.position.y < 0) this.position.y = 0;
      this.grounded = this.position.y <= 0;
      this.movedSpeed = Math.hypot(v.x, v.z);
    }
    if (this.grounded && v.y < 0) v.y = 0;
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
    this.velocity.set(0, 0, 0);
    this.gliding = false;
    this.skidding = false;
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
/** Near the ground in flight, the lift is the thrust over this (at the ground itself). */
const LIFT = 0.5;
/** ...and a dive loses this share of its downward speed per second (at the ground itself). */
const LEVEL_OFF = 8;
/** A glide falling faster than it may: the share of the excess lost per second. */
const SINK_EASE = 4;
/** Moved less than this share of the way asked for, along an axis: something blocked her there. */
const BLOCKED = 0.9;
/** ...for this many steps in a row (fewer: the controller's glitch on open ground). */
const BLOCK_STEPS = 3;
/** A skid is over below this speed (m/s). */
const SKID_STOP = 0.3;

/** Takes `by` off a velocity's horizontal speed (not below 0), keeping its direction. */
function slow(v: THREE.Vector3, by: number): void {
  const h = Math.hypot(v.x, v.z);
  if (h <= 0) return;
  const k = Math.max(0, h - by) / h;
  v.x *= k;
  v.z *= k;
}

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
