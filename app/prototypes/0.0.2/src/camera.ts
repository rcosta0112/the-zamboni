// Third-person orbit camera: yaw and pitch from the right stick or mouse, smoothed follow of a
// point at chest height above the character. The distance is fixed: one value indoors, one
// outdoors (settings), eased from one to the other; there's no zoom (owner, 2026-10-12). First person
// through the binoculars (`firstPerson`, 2026-11-16) is a separate view with its own lens.

import * as THREE from 'three/webgpu';
import { settings } from './settings';
import type { Input } from './input';

const DEG = Math.PI / 180;
/** Time constant of the ease between the indoor and outdoor distances: about 0.5 s to get there. */
const DISTANCE_EASE = 0.17;
/** Time constant of the pitch's return to its limit after a flight, or on going inside. */
const PITCH_EASE = 0.25;
/** First person (the binoculars): how far up and down the view goes (rad). */
const FIRST_PERSON_PITCH = 80 * DEG;

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 8 * DEG;
  /** The distance wanted now (before collision): eases toward the indoor or outdoor setting. */
  distance = settings.cameraDistanceOutdoors;
  private focus = new THREE.Vector3();
  private initialised = false;
  /** Distance actually used after collision (eases back out when the way clears). */
  private collidedDistance = Infinity;
  /**
   * Camera collision: distance from the focus toward the camera to the first obstacle, or null.
   * Set to null to turn collision off. Inside the ship: the hull, the bulkheads and some furniture
   * (main.ts; ship.ts hullWallAt, furnitureAt).
   */
  collide: ((from: THREE.Vector3, to: THREE.Vector3) => number | null) | null = null;
  /** The ground's height (world y) under a point: flat at 0 unless the landed scene's terrain says otherwise. */
  groundAt: (x: number, z: number) => number = () => 0;

  /** The orbit's lens (degrees, vertical); first person narrows it. */
  readonly baseFov = 55;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 500);
  }

  /**
   * @param indoors she's inside the ship (the same test as the see-through hull)
   * @param flight how far she's in flight with the jetpack, 0..1: the camera can go below her that
   *   much (she flies where it looks)
   * Outside it can go below her on foot too (`cameraMinPitchOutdoorsDeg`), pulled in toward her
   * near the ground, so it looks up; inside, never (the see-through).
   */
  update(dt: number, input: Input, target: THREE.Vector3, indoors: boolean, flight = 0): void {
    this.setFov(this.baseFov);
    const look = input.consumeLook(dt);
    this.yaw += look.yaw;
    const usual = indoors ? settings.cameraMinPitchDeg : Math.min(settings.cameraMinPitchOutdoorsDeg, settings.cameraMinPitchDeg);
    const min = THREE.MathUtils.lerp(usual, Math.min(settings.cameraMinPitchFlyingDeg, usual), flight) * DEG;
    // Below the limit (after a flight, or on going inside): it eases back up instead of jumping.
    const floor = this.pitch < min ? this.pitch + (min - this.pitch) * (1 - Math.exp(-dt / PITCH_EASE)) : min;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.pitch, Math.min(min, floor), settings.cameraMaxPitchDeg * DEG);
    const wanted = indoors ? settings.cameraDistanceIndoors : settings.cameraDistanceOutdoors;
    this.distance += (wanted - this.distance) * (1 - Math.exp(-dt / DISTANCE_EASE));
    if (Math.abs(wanted - this.distance) < 0.002) this.distance = wanted;

    const desired = new THREE.Vector3(target.x, target.y + settings.cameraHeight, target.z);
    if (!this.initialised) {
      this.focus.copy(desired);
      this.initialised = true;
    } else {
      // Frame-rate independent exponential smoothing.
      const k = 1 - Math.exp(-settings.cameraFollowSharpness * dt);
      this.focus.lerp(desired, k);
    }

    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    let distance = this.distance;
    if (this.collide) {
      // Move in front of anything between the focus and the camera; ease back out when clear.
      const ideal = this.focus.clone().addScaledVector(dir, this.distance);
      const hit = this.collide(this.focus, ideal);
      // As close as it needs (owner, 2026-10-21; it used to stop at 1 m and went through what was
      // behind her): she fades out instead (shown).
      const target = hit === null ? this.distance : Math.max(settings.cameraMinDistance, hit - settings.cameraWallGap);
      if (target < this.collidedDistance) this.collidedDistance = target;
      else this.collidedDistance += (target - this.collidedDistance) * (1 - Math.exp(-4 * dt));
      distance = Math.min(this.distance, this.collidedDistance);
    } else {
      this.collidedDistance = this.distance;
    }
    if (dir.y < 0) {
      // Below her: in toward her along the line of sight before it meets the ground, so it keeps
      // looking up (raised alone, it would flatten the view back out).
      const lowest = this.groundAt(this.focus.x + dir.x * distance, this.focus.z + dir.z * distance) + 0.2;
      const reach = (lowest - this.focus.y) / dir.y;
      if (reach < distance) distance = Math.max(settings.cameraMinDistance, reach);
    }
    this.camera.position.copy(this.focus).addScaledVector(dir, distance);
    // Never go below the ground (the landed scene's hills: `groundAt`).
    this.camera.position.y = Math.max(this.groundAt(this.camera.position.x, this.camera.position.z) + 0.2, this.camera.position.y);
    this.camera.lookAt(this.focus);
  }

  /**
   * First person (the binoculars, 2026-11-16): the camera at `eye`, looking along the same yaw and
   * pitch the orbit uses (so the cut keeps the direction), narrowed to `fovDeg`; the look slowed by
   * the zoom so it feels the same at any magnification. The orbit's own distance and focus are kept
   * for the cut back.
   */
  firstPerson(dt: number, input: Input, eye: THREE.Vector3, fovDeg: number): void {
    const look = input.consumeLook(dt);
    const slow = fovDeg / this.baseFov;
    this.yaw += look.yaw * slow;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.pitch * slow, -FIRST_PERSON_PITCH, FIRST_PERSON_PITCH);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.position.copy(eye);
    this.camera.lookAt(eye.clone().sub(dir));
    this.setFov(fovDeg);
  }

  /** The lens back to the orbit's (after first person). */
  private setFov(fovDeg: number): void {
    if (this.camera.fov === fovDeg) return;
    this.camera.fov = fovDeg;
    this.camera.updateProjectionMatrix();
  }

  /** How much of her shows, 0..1: she fades out as the camera comes close (cameraFadeStart → cameraFadeEnd). */
  get shown(): number {
    const d = this.camera.position.distanceTo(this.focus);
    const t = THREE.MathUtils.clamp((d - settings.cameraFadeEnd) / Math.max(settings.cameraFadeStart - settings.cameraFadeEnd, 1e-3), 0, 1);
    return t * t * (3 - 2 * t);
  }
}
