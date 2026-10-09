// Interaction: point at something and press E (keyboard) or Circle / B (gamepad) to use it.
// "Pointing" in third person: of the objects within her reach (from her chest, not hidden behind
// something solid), the one nearest the centre of the screen. No crosshair. The target is
// highlighted and a prompt names the action, with the button of the last device used.
// Targets come from the ship file's tags: `interact: "open"` (doors), `interact: "use"` with
// `controls: "<object name>"` (the keypads by the side door).
// Plan: doc/plans/features/interaction-doors.md

import * as THREE from 'three/webgpu';
import type { Door } from './doors';
import type { Device } from './input';
import { named } from './names';
import type { Physics } from './physics';
import { settings } from './settings';

export interface Interactable {
  /** For its bounds, and the meshes to highlight. */
  object: THREE.Object3D;
  /** What pressing the button does, for the prompt ("Open", "Close"...). */
  verb: () => string;
  act: () => void;
}

/** The ship's interactables: its doors and the keypads that control the ramp and the side door. */
export function shipInteractables(ship: THREE.Object3D, doors: Door[]): Interactable[] {
  const list: Interactable[] = doors.map((door) => ({
    object: door.object,
    verb: () => (door.open ? 'Close' : 'Open'),
    act: () => door.toggle(),
  }));
  ship.traverse((o) => {
    const target = o.userData.controls as string | undefined;
    if (o.userData.interact !== 'use' || !target) return;
    if (target === 'Door Cargo') {
      list.push({ object: o, verb: () => (settings.cargoRampOpen ? 'Close ramp' : 'Open ramp'), act: () => (settings.cargoRampOpen = !settings.cargoRampOpen) });
      return;
    }
    const door = doors.find((d) => named(d.object, target));
    if (!door) {
      console.warn(`[01-walk] "${o.name}" controls "${target}", which isn't a door`);
      return;
    }
    list.push({ object: o, verb: () => (door.open ? 'Close door' : 'Open door'), act: () => door.toggle() });
  });
  return list;
}

const GLYPH: Record<Device, string> = { gamepad: '◯', keyboard: 'E' };

export class Interaction {
  target: Interactable | null = null;
  private box = new THREE.Box3();
  private centre = new THREE.Vector3();
  private closest = new THREE.Vector3();
  private toTarget = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private ray = new THREE.Ray();

  constructor(
    private items: Interactable[],
    private physics: Physics,
    private prompt: HTMLElement,
  ) {}

  /**
   * Per frame: pick the target, highlight it, show the prompt; act on a press.
   * @param chest her chest (world)
   */
  update(chest: THREE.Vector3, camera: THREE.Camera, device: Device, pressed: boolean): void {
    camera.getWorldDirection(this.forward);
    this.ray.set(camera.position, this.forward);
    const maxAngle = THREE.MathUtils.degToRad(settings.interactMaxAngleDeg);
    let best: Interactable | null = null;
    let bestAngle = Infinity;
    let bestDistance = Infinity;
    for (const item of this.items) {
      this.box.setFromObject(item.object);
      const distance = this.box.distanceToPoint(chest);
      if (distance > settings.interactReach) continue;
      // Not behind something solid (its own collider is hit at about its own distance).
      this.box.clampPoint(chest, this.closest);
      const hit = distance > 0.05 ? this.physics.castRay(chest, this.closest) : null;
      if (hit !== null && hit < distance - 0.15) continue;
      // How far from the screen centre: 0 if the view's centre line passes through it.
      let angle = 0;
      if (!this.ray.intersectsBox(this.box)) {
        this.toTarget.subVectors(this.box.getCenter(this.centre), camera.position);
        angle = this.toTarget.angleTo(this.forward);
      }
      if (angle > maxAngle) continue;
      if (angle < bestAngle - 1e-3 || (Math.abs(angle - bestAngle) <= 1e-3 && distance < bestDistance)) {
        best = item;
        bestAngle = angle;
        bestDistance = distance;
      }
    }
    if (best !== this.target) {
      if (this.target) setHighlight(this.target.object, 0);
      if (best) setHighlight(best.object, 1);
      this.target = best;
    }
    if (pressed && this.target) this.target.act();
    if (this.target) {
      this.prompt.textContent = `${GLYPH[device]}  ${this.target.verb()}`;
      this.prompt.hidden = false;
    } else {
      this.prompt.hidden = true;
    }
  }
}

function setHighlight(object: THREE.Object3D, on: 0 | 1): void {
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.userData.highlight = on;
  });
}
