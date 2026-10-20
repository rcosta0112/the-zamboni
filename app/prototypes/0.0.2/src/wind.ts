// The wind (owner, 2026-10-14): heard full outside the ship, faintly inside, and louder in the cargo
// bay the more its ramp and side door are open, each by the size of its opening. The file is a
// coast recording, not a clean loop: streamed, its end crossfaded into its start (`setLoop`).
// Inside, for the wind, is within the ship's bounds and in from the ramp's hinge: on the ramp she's
// outside (owner), though its top is within the bounds the see-through hull uses.
// The cargo bay is the lower deck on the ramp's side of the engineering bulkhead (its doors).

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import type { Door } from './doors';
import { settings } from './settings';
import type { Ship } from './ship';

/** The openings' sizes (m², from their bounds in the game): the cargo ramp and the side door. */
const RAMP_AREA = 8.8;
const SIDE_DOOR_AREA = 1.5;
/** Going in or out, or into or out of the cargo bay, the wind changes over this long (s). */
const FADE = 0.5;
const BULKHEAD = 'Engineering_Door_Right';

/** What the wind needs of the audio (`GameAudio`). */
interface WindAudio {
  setLoop(id: CueId, on: boolean, fade?: number, level?: number): void;
}

export class Wind {
  /** Its level, as a share of the cue's volume: for checks. */
  level = 0;
  /** 0..1, eased: she's inside the ship (in from the ramp's hinge). */
  indoors = 0;
  private cargo = 0; // 0..1, eased: she's in the cargo bay
  private sideDoor: Door | null = null;
  private bulkhead: THREE.Vector3 | null = null;
  private hinge = new THREE.Vector3();
  /** Toward the ramp, level. */
  private aft = new THREE.Vector3();
  private v = new THREE.Vector3();

  constructor(private audio: WindAudio) {}

  /** Once the ship is loaded. */
  setShip(ship: Ship): void {
    // The side door is the one door that opens down to the ground (the ramp isn't a door in the code).
    this.sideDoor = ship.doors.find((d) => d.walkway !== null) ?? null;
    const bulkhead = ship.doors.find((d) => d.name === BULKHEAD);
    if (!this.sideDoor || !bulkhead) console.warn('[0.0.2] wind: no side door or engineering bulkhead found; no louder wind in the cargo bay');
    if (!bulkhead) return;
    this.bulkhead = bulkhead.zone.getCenter(new THREE.Vector3());
    // The ramp's node is its hinge, at the bottom of the hull's opening; it turns but doesn't move.
    ship.ramp.getWorldPosition(this.hinge);
    this.aft.subVectors(this.hinge, this.bulkhead).setY(0).normalize();
  }

  /**
   * Per frame, once the game has begun.
   * @param chest her chest, for where she is
   */
  update(dt: number, chest: THREE.Vector3, ship: Ship | null): void {
    const known = ship !== null && this.bulkhead !== null;
    const inside = known && ship.interior.containsPoint(chest) && this.v.subVectors(chest, this.hinge).dot(this.aft) < 0;
    const inCargo = inside && chest.y < ship.upperFloorY && this.v.subVectors(chest, this.bulkhead!).dot(this.aft) > 0;
    const step = Math.max(0, dt) / FADE;
    this.indoors = ease(this.indoors, inside ? 1 : 0, step);
    this.cargo = ease(this.cargo, inCargo ? 1 : 0, step);
    // The sound through an opening grows with its area: its loudness with the square root.
    const open = (ship?.rampAmount ?? 0) * RAMP_AREA + (this.sideDoor?.amount ?? 0) * SIDE_DOOR_AREA;
    const share = Math.sqrt(open / (RAMP_AREA + SIDE_DOOR_AREA));
    const level = THREE.MathUtils.lerp(settings.windIndoors, settings.windCargoOpen, share * this.cargo);
    this.level = THREE.MathUtils.lerp(1, level, this.indoors);
    // Faded in over 2 s when the game begins.
    this.audio.setLoop('amb_wind', true, 2, this.level);
  }
}

const ease = (value: number, target: number, step: number) => (value < target ? Math.min(target, value + step) : Math.max(target, value - step));
