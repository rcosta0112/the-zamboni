// Third-person orbit camera: yaw and pitch from the right stick or mouse, distance from the
// D-pad or wheel, smoothed follow of a point at chest height above the character.

import * as THREE from 'three/webgpu';
import { settings } from './settings';
import type { Input } from './input';

const DEG = Math.PI / 180;

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 8 * DEG;
  private distance = settings.cameraDistance;
  private focus = new THREE.Vector3();
  private initialised = false;
  /** Distance actually used after collision (eases back out when the way clears). */
  private collidedDistance = Infinity;
  /**
   * Camera collision: distance from the focus toward the camera to the first obstacle, or null.
   * Set to null to turn collision off (inside the ship, where the hull is cut instead).
   */
  collide: ((from: THREE.Vector3, to: THREE.Vector3) => number | null) | null = null;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 500);
  }

  update(dt: number, input: Input, target: THREE.Vector3): void {
    const look = input.consumeLook(dt);
    this.yaw += look.yaw;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + look.pitch,
      settings.cameraMinPitchDeg * DEG,
      settings.cameraMaxPitchDeg * DEG,
    );
    this.distance = THREE.MathUtils.clamp(
      this.distance + input.consumeZoom(dt),
      settings.cameraMinDistance,
      settings.cameraMaxDistance,
    );

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
      // Never closer than 1 m: closer than that, the camera ends up inside her head.
      const target = hit === null ? this.distance : Math.max(1.0, hit - 0.25);
      if (target < this.collidedDistance) this.collidedDistance = target;
      else this.collidedDistance += (target - this.collidedDistance) * (1 - Math.exp(-4 * dt));
      distance = Math.min(this.distance, this.collidedDistance);
    } else {
      this.collidedDistance = this.distance;
    }
    this.camera.position.copy(this.focus).addScaledVector(dir, distance);
    // Never go below the floor.
    this.camera.position.y = Math.max(0.2, this.camera.position.y);
    this.camera.lookAt(this.focus);
  }

  /** Settings changed in the tuning panel take effect immediately. */
  syncDistance(): void {
    this.distance = settings.cameraDistance;
  }
}
