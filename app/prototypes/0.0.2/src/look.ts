// Characters look at each other while Dr. Green talks to one of them (owner, 2026-11-07; plan
// doc/plans/features/look-at-each-other.md). Only her conversations (`talk_<id>`): the crew never
// turn to each other, and a watched conversation turns nobody.
//
// Each of the two, as their pose allows (scene `seat` marks the seated):
// - standing: the whole body turns to face the other, the head leading (her `facing`; a crew
//   member's root about their feet), turned back when it ends (owner, 2026-11-07: hers too);
// - seated, the other within `lookReachDeg` of where their head already looks: the head turns (up to
//   `lookHeadYawDeg`, pitched up to `lookHeadPitchDeg`), the body a little (`lookBodyShare`, up to
//   `lookBodyYawDeg`), the legs turned back so they stay on the seat;
// - seated, the other out of reach (behind, beside-behind): the head turns `lookListenDeg` toward
//   the side the other is on, as if listening, never through the seat's back.
// Applied after the animation mixers each frame, on top of what they set (the loops keep playing);
// each bone starts from the mixer's pose again, so a bone with no track doesn't pile turns up.
// Eased in when the conversation starts (`lookEase`) and back when it ends (`lookEaseBack`).

import * as THREE from 'three/webgpu';
import { settings } from './settings';

const UP = new THREE.Vector3(0, 1, 0);
const DEG = Math.PI / 180;

/** A bone turned on top of the animation: its pose from the mixer kept to start from each frame. */
class Turned {
  private readonly base = new THREE.Quaternion();
  private readonly written = new THREE.Quaternion();
  private fresh = true;
  constructor(readonly bone: THREE.Object3D) {}

  /** The pose the animation gave it this frame (the mixer's, or the last base if no track wrote it). */
  begin(): void {
    if (this.fresh || !this.bone.quaternion.equals(this.written)) this.base.copy(this.bone.quaternion);
    else this.bone.quaternion.copy(this.base);
    this.fresh = false;
  }

  /** Turned `angle` about the world's `axis` (unit), in its parent's space. */
  turn(axis: THREE.Vector3, angle: number): void {
    if (angle === 0) return;
    const parent = this.bone.parent;
    const local = axis.clone();
    if (parent) local.applyQuaternion(parent.getWorldQuaternion(q1).invert());
    this.bone.quaternion.premultiply(q2.setFromAxisAngle(local.normalize(), angle));
    this.bone.updateMatrixWorld(true);
  }

  end(): void {
    this.written.copy(this.bone.quaternion);
  }
}

const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();
const v5 = new THREE.Vector3();

/** One of the two in a conversation. */
export interface Looker {
  /** The model shown now (bones found by name under it; found again if it changes), or none. */
  object: () => THREE.Object3D | null;
  /** Seated (the scene's `seat`), or standing. */
  seated: () => boolean;
  /**
   * Standing only: turn the whole body by `yaw` (radians, about the vertical) from where it faced
   * when the conversation started. Without it, a standing character turns only their head.
   */
  turnBody?: (yaw: number) => void;
  /** The whole-body turn kept when the conversation ends (hers), instead of turned back. */
  keepsTurn?: boolean;
}

/** Their bones and the turn eased so far. */
class Rig {
  readonly head: Turned | null;
  readonly body: Turned | null;
  readonly legs: Turned[];
  headYaw = 0;
  headPitch = 0;
  bodyYaw = 0;
  wholeYaw = 0;
  /** The side a listening turn goes to (+1 left, −1 right), kept while the other is right behind. */
  side = 1;
  /** `forwardInBody`: where the body faces, in the `Body` bone's own axes (one skeleton for everyone). */
  constructor(readonly looker: Looker, readonly object: THREE.Object3D, private readonly forwardInBody: THREE.Vector3) {
    // By name, or with the suffix the glTF loader adds to repeated names (the crew file has four
    // skeletons: `Head`, `Head_1`, `Head_2`…), only among this model's bones.
    const bone = (name: string): THREE.Object3D | null => {
      const named = new RegExp(`^${name}(_[0-9]+)?$`);
      let found: THREE.Object3D | null = null;
      object.traverse((o) => {
        if (!found && (o as THREE.Bone).isBone && named.test(o.name)) found = o;
      });
      return found as THREE.Object3D | null;
    };
    const head = bone('Head');
    const body = bone('Body');
    this.head = head ? new Turned(head) : null;
    this.body = body ? new Turned(body) : null;
    this.legs = ['Leg_l', 'Leg_r'].map(bone).filter((b): b is THREE.Object3D => b !== null).map((b) => new Turned(b));
  }

  /** Where the body faces (world, horizontal), from the `Body` bone as the animation has it. */
  forward(out: THREE.Vector3): THREE.Vector3 {
    const body = this.body?.bone ?? this.object;
    out.copy(this.forwardInBody).applyQuaternion(body.getWorldQuaternion(q1)).setY(0);
    return out.lengthSq() > 1e-8 ? out.normalize() : out.set(0, 0, -1);
  }

  /** Where the head looks (world, unit, not flattened), as the animation has it: the body's forward in the head's axes (they match at rest). */
  headForward(out: THREE.Vector3): THREE.Vector3 {
    const head = this.head?.bone ?? this.object;
    return out.copy(this.forwardInBody).applyQuaternion(head.getWorldQuaternion(q1)).normalize();
  }

  /** Back to the pose the animation gave this frame. */
  begin(): void {
    for (const t of [this.body, this.head, ...this.legs]) t?.begin();
    this.object.updateMatrixWorld(true);
  }

  headPoint(out: THREE.Vector3): THREE.Vector3 {
    return (this.head?.bone ?? this.object).getWorldPosition(out);
  }

}

/** The angle about the vertical from `from` to `to` (both horizontal, unit), positive to the left. */
function yawBetween(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(from.z * to.x - from.x * to.z, from.dot(to));
}

/** Eases `value` toward `target` by a share of the way that stays the same at any frame rate. */
function ease(value: number, target: number, dt: number, time = settings.lookEase): number {
  const k = 1 - Math.exp(-dt / Math.max(1e-3, time / 3));
  const next = value + (target - value) * k;
  return Math.abs(next - target) < 1e-4 ? target : next;
}

export class LookAt {
  private readonly lookers = new Map<string, Looker>();
  private readonly rigs = new Map<string, Rig>();
  /** The two in the conversation (ids), or none. */
  private pair: [string, string] | null = null;

  /** The way a character faces, in the `Body` bone's axes (one skeleton for everyone), once measured. */
  private forwardInBody: THREE.Vector3 | null = null;

  /**
   * `measure`: that way, read from her model as drawn (null until it can be: her model's own yaw is
   * set on its first frame, so it's read then).
   */
  constructor(private readonly measure: () => THREE.Vector3 | null) {}

  add(id: string, looker: Looker): void {
    this.lookers.set(id, looker);
  }

  /** The two who look at each other (Dr. Green and whoever she talks to), or null when it ends. */
  set(pair: [string, string] | null): void {
    if (pair && this.pair && pair[0] === this.pair[0] && pair[1] === this.pair[1]) return;
    if (pair) {
      for (const id of pair) {
        const rig = this.rigs.get(id);
        if (rig?.looker.keepsTurn) rig.wholeYaw = 0; // her turn measured from where she faces now
      }
    }
    this.pair = pair;
  }

  get talking(): [string, string] | null {
    return this.pair;
  }

  /** For checks: the turn each one has now (degrees). */
  state(id: string): { head: number; pitch: number; body: number; whole: number; bones: string[] } | null {
    const r = this.rigs.get(id);
    const bones = [r?.head, r?.body, ...(r?.legs ?? [])].flatMap((t) => (t ? [t.bone.name] : []));
    return r ? { head: r.headYaw / DEG, pitch: r.headPitch / DEG, body: r.bodyYaw / DEG, whole: r.wholeYaw / DEG, bones } : null;
  }

  /** For checks: where one faces (world, horizontal), as the animation has them, before any turn. */
  facing(id: string): THREE.Vector3 | null {
    const rig = this.rigs.get(id);
    return rig ? rig.forward(new THREE.Vector3()) : null;
  }

  /** After the mixers, before drawing. */
  update(dt: number): void {
    const headMax = settings.lookHeadYawDeg * DEG;
    const pitchMax = settings.lookHeadPitchDeg * DEG;
    this.forwardInBody ??= this.measure();
    if (!this.forwardInBody) return;
    // Each one's rig on the model shown now (a new model: its turn starts again from nothing).
    for (const [id, looker] of this.lookers) {
      const object = looker.object();
      const rig = this.rigs.get(id);
      if (!object) this.rigs.delete(id);
      else if (rig?.object !== object) this.rigs.set(id, new Rig(looker, object, this.forwardInBody));
    }
    // Everyone back to the animation's pose first, so what's measured isn't last frame's turn.
    for (const rig of this.rigs.values()) rig.begin();
    for (const [id, rig] of this.rigs) {
      const otherId = this.pair?.[0] === id ? this.pair[1] : this.pair?.[1] === id ? this.pair[0] : null;
      const other = otherId ? this.rigs.get(otherId) : undefined;
      const standing = !rig.looker.seated();
      let head = 0;
      let pitch = 0;
      let body = 0;
      let whole = 0;
      if (other) {
        // Measured from the pose as drawn now (any whole-body turn so far already in it).
        const dir = other.headPoint(v2).sub(rig.headPoint(v3));
        const flat = Math.hypot(dir.x, dir.z);
        const toward = flat > 1e-4 ? dir.clone().setY(0).normalize() : rig.forward(v1).clone();
        const angle = yawBetween(rig.forward(v1), toward);
        const up = Math.atan2(dir.y, flat);
        // Where the head already looks in the animation (Ogawa's loop has it turned toward the
        // station): the turn is aimed from there, so it lands on her instead of past her (owner,
        // 2026-11-07), and the limits stay measured from the body.
        const headAhead = rig.headForward(v4);
        const ownYaw = yawBetween(rig.forward(v1), v5.copy(headAhead).setY(0).normalize());
        const ownPitch = Math.asin(THREE.MathUtils.clamp(headAhead.y, -1, 1));
        if (standing) {
          // The whole body comes round, the head leading by what's still left.
          if (rig.looker.turnBody) whole = rig.wholeYaw + angle;
          head = THREE.MathUtils.clamp(angle, -headMax, headMax) - ownYaw;
          pitch = THREE.MathUtils.clamp(up - ownPitch, -pitchMax, pitchMax);
        } else if (Math.abs(angle - ownYaw) <= settings.lookReachDeg * DEG) {
          // In reach, counted from where the head already looks (Ogawa's, turned in his loop, reaches
          // her beside his seat: the listening turn left him looking past her, owner 2026-11-07).
          const bodyMax = settings.lookBodyYawDeg * DEG;
          body = THREE.MathUtils.clamp(angle * settings.lookBodyShare, -bodyMax, bodyMax);
          head = THREE.MathUtils.clamp(angle - body, -headMax, headMax) - ownYaw;
          pitch = THREE.MathUtils.clamp(up - ownPitch, -pitchMax, pitchMax);
          rig.side = Math.sign(angle) || rig.side;
        } else {
          // Out of reach: a little toward the other's side, as if listening; right behind, the side kept.
          if (Math.abs(angle) < Math.PI - 10 * DEG) rig.side = Math.sign(angle) || rig.side;
          head = rig.side * settings.lookListenDeg * DEG;
        }
      }
      // The whole-body turn: eased toward facing the other; at the end, turned back unless it's kept (hers).
      const before = rig.wholeYaw;
      // Turning in takes `lookEase`; turning back after the conversation, `lookEaseBack` (owner: twice as long).
      const time = other ? settings.lookEase : settings.lookEaseBack;
      if (other || !rig.looker.keepsTurn) rig.wholeYaw = ease(rig.wholeYaw, whole, dt, time);
      else rig.wholeYaw = 0;
      const turned = rig.wholeYaw - before;
      if (rig.looker.turnBody && turned !== 0 && (other || !rig.looker.keepsTurn)) rig.looker.turnBody(turned);
      // What the body turned this frame comes off the head's turn.
      if (other && standing) head -= turned;
      rig.headYaw = ease(rig.headYaw, head, dt, time);
      rig.headPitch = ease(rig.headPitch, pitch, dt, time);
      rig.bodyYaw = ease(rig.bodyYaw, body, dt, time);
      this.apply(rig);
    }
  }

  private apply(rig: Rig): void {
    if (rig.body && rig.bodyYaw !== 0) {
      rig.body.turn(UP, rig.bodyYaw);
      for (const leg of rig.legs) leg.turn(UP, -rig.bodyYaw); // the legs stay on the seat
    }
    if (rig.head && (rig.headYaw !== 0 || rig.headPitch !== 0)) {
      // Yaw about the vertical, then the pitch about the axis across where the head now looks.
      const fwd = rig.headForward(v1).setY(0).normalize().applyAxisAngle(UP, rig.headYaw);
      rig.head.turn(UP, rig.headYaw);
      if (rig.headPitch !== 0) rig.head.turn(v2.crossVectors(fwd, UP).normalize(), rig.headPitch);
    }
    for (const t of [rig.body, rig.head, ...rig.legs]) t?.end();
  }
}
