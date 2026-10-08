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

    const horizontal = Math.cos(this.pitch) * this.distance;
    this.camera.position.set(
      this.focus.x + Math.sin(this.yaw) * horizontal,
      this.focus.y + Math.sin(this.pitch) * this.distance,
      this.focus.z + Math.cos(this.yaw) * horizontal,
    );
    // Never go below the floor.
    this.camera.position.y = Math.max(0.2, this.camera.position.y);
    this.camera.lookAt(this.focus);
  }

  /** Settings changed in the tuning panel take effect immediately. */
  syncDistance(): void {
    this.distance = settings.cameraDistance;
  }
}
