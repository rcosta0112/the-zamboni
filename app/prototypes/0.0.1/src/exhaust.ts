// The jetpack's exhaust glow (item 38), as in Part 1: there, a tiny cyan particle at the nozzle made
// into a white-hot ball with a cyan halo by the camera's bloom. We have no bloom, so the halo is
// painted into the sprite: one camera-facing sprite per nozzle, additive, a constant size on screen
// (as Part 1's renderer kept its particles). Shown while she flies or the auto-parachute fires; with
// an analog R2 it grows and dims with the trigger as the jet sound does, and it flickers on its own.
// Plan: doc/plans/features/jetpack-glow.md

import * as THREE from 'three/webgpu';
import { float, length, smoothstep, uniform, uv, vec4 } from 'three/tsl';
import { settings } from './settings';

/**
 * The nozzles in the `Jetpack` group's own space, as shares of the group's height: the middle of
 * each nozzle ring (`Jetpack_Mesh002`, two octagonal rings). Both models have the same mesh (Part 1's
 * is about 12 times larger in its units), so shares fit both. Measured 2026-10-14.
 */
const NOZZLES = [new THREE.Vector3(-0.229, -0.436, -0.173), new THREE.Vector3(0.229, -0.436, -0.173)];
/**
 * Which way the glow is pushed out of the nozzles (`exhaustOut` metres), in the group's space, where
 * -y is down and -z is away from her back (both models, flying; the nozzles are at the jetpack's
 * bottom back edge). Down and back as much (owner, 2026-10-14: the glow below the jetpack and behind it).
 */
const OUT = new THREE.Vector3(0, -1, -1).normalize();
/** Children of the jetpack named like this mark the nozzles instead, if the owner adds them. */
const MARKER = /^JetpackExhaust/;
/** How fast the glow comes on and goes off (time constants, s). On take-off Part 1's first frame was small and faint. */
const FADE_IN = 0.03;
const FADE_OUT = 0.03;

function glowMaterial() {
  const core = uniform(new THREE.Color());
  const halo = uniform(new THREE.Color());
  const coreSize = uniform(0.4);
  const haloLevel = uniform(1);
  const level = uniform(0);
  // r: 0 at the middle, 1 at the sprite's edge. The halo falls off to nothing at the edge; the core
  // is a soft-edged white disc over it.
  const r = length(uv().sub(0.5)).mul(2);
  const haloShape = float(1).sub(smoothstep(0, 1, r)).pow(1.5);
  const coreShape = float(1).sub(smoothstep(coreSize.mul(0.45), coreSize, r));
  const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  material.toneMapped = false;
  material.colorNode = vec4(halo.mul(haloShape.mul(haloLevel)).add(core.mul(coreShape)).mul(level), 1);
  return { material, core, halo, coreSize, haloLevel, level };
}

type Glow = ReturnType<typeof glowMaterial> & { sprite: THREE.Sprite; size: number; target: number; shake: THREE.Vector3 };

export class Exhaust {
  private glows: Glow[];
  /** 0..1, eased toward on or off. */
  private amount = 0;
  private sinceFlicker = 0;
  /** Per jetpack group: where its nozzles are, in its own space. */
  private nozzles = new WeakMap<THREE.Object3D, THREE.Vector3[]>();
  private at = new THREE.Vector3();
  private out = new THREE.Vector3();
  private toCamera = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.glows = NOZZLES.map(() => {
      const g = glowMaterial();
      const sprite = new THREE.Sprite(g.material);
      sprite.visible = false;
      scene.add(sprite);
      return { ...g, sprite, size: 1, target: 1, shake: new THREE.Vector3() };
    });
  }

  /** Visible while on (wearing it is the caller's test); for the probe. */
  get shown(): boolean {
    return this.glows.some((g) => g.sprite.visible);
  }

  private nozzlesOf(jetpack: THREE.Object3D): THREE.Vector3[] {
    let found = this.nozzles.get(jetpack);
    if (found) return found;
    const markers = jetpack.children.filter((c) => MARKER.test(c.name));
    if (markers.length > 0) found = markers.map((m) => m.position.clone());
    else {
      // The group's height in its own space, from its meshes (its direct children).
      const box = new THREE.Box3();
      for (const c of jetpack.children) {
        const g = (c as THREE.Mesh).geometry;
        if (!g) continue;
        if (!g.boundingBox) g.computeBoundingBox();
        c.updateMatrix();
        box.union(g.boundingBox!.clone().applyMatrix4(c.matrix));
      }
      const height = box.max.y - box.min.y;
      found = NOZZLES.map((n) => n.clone().multiplyScalar(height));
    }
    this.nozzles.set(jetpack, found);
    return found;
  }

  /**
   * Per rendered frame, after the camera has moved. `jetpack`: the shown model's jetpack group (null
   * if she has none on); `on`: flying or the auto-parachute firing; `trigger`: R2's value when it's
   * flying her, else null.
   */
  update(dt: number, jetpack: THREE.Object3D | null, on: boolean, trigger: number | null, camera: THREE.PerspectiveCamera): void {
    dt = Math.max(0, dt);
    const wanted = on && jetpack !== null && settings.exhaustGlow ? 1 : 0;
    this.amount += (wanted - this.amount) * (1 - Math.exp(-dt / (wanted ? FADE_IN : FADE_OUT)));
    if (this.amount < 0.01 && !wanted) this.amount = 0;
    const visible = this.amount > 0 && jetpack !== null;
    for (const g of this.glows) g.sprite.visible = visible;
    if (!visible) return;

    // With an analog R2, as the jet sound: the trigger squared, from the low end to full.
    const t = settings.jetSoundFollowsTrigger ? trigger : null;
    const level = t === null ? 1 : THREE.MathUtils.lerp(settings.exhaustLowLevel, 1, t * t);

    // The flicker: each glow picks a new size now and then, and eases to it.
    this.sinceFlicker += dt;
    const newTarget = this.sinceFlicker >= 1 / settings.exhaustFlickerRate;
    if (newTarget) this.sinceFlicker = 0;
    const ease = 1 - Math.exp(-dt * settings.exhaustFlickerRate * 2);

    jetpack.updateWorldMatrix(true, false);
    const nozzles = this.nozzlesOf(jetpack);
    this.out.copy(OUT).transformDirection(jetpack.matrixWorld);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    this.glows.forEach((g, i) => {
      if (newTarget) {
        g.target = 1 + (Math.random() * 2 - 1) * settings.exhaustFlicker;
        g.shake.randomDirection().multiplyScalar(Math.random() * settings.exhaustShake);
      }
      g.size += (g.target - g.size) * ease;
      // At the nozzle, a little out along its axis and toward the camera (so the jetpack's own
      // surface doesn't cut through the glow).
      this.at.copy(nozzles[i % nozzles.length]!).applyMatrix4(jetpack.matrixWorld).addScaledVector(this.out, settings.exhaustOut).add(g.shake);
      this.toCamera.copy(camera.position).sub(this.at);
      const distance = this.toCamera.length();
      this.at.addScaledVector(this.toCamera, Math.min(settings.exhaustTowardCamera, distance * 0.5) / Math.max(distance, 1e-6));
      g.sprite.position.copy(this.at);
      // A constant share of the screen's height.
      g.sprite.scale.setScalar(settings.exhaustSize * 2 * tanHalf * (distance - settings.exhaustTowardCamera) * g.size * level);
      g.core.value.set(settings.exhaustCoreColor);
      g.halo.value.set(settings.exhaustHaloColor);
      g.coreSize.value = settings.exhaustCore;
      g.haloLevel.value = settings.exhaustHalo;
      g.level.value = this.amount * level * (0.85 + 0.15 * g.size);
    });
  }
}
