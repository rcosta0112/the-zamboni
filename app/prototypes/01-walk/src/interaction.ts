// Interaction: point at something and press E (keyboard) or Circle / B (gamepad) to use it.
// "Pointing" in third person: of the targets within her reach (from her chest, not hidden behind
// something solid), the one nearest the centre of the screen. No crosshair. A prompt next to the
// target on screen names the action, with the button of the last device used (owner, 2026-10-12;
// the highlight that came first is off by default).
// Targets come from the ship file's tags: `interact: "open"` (doors), `interact: "use"` with
// `controls: "<object name>"` (the keypads by the side door). A door that a keypad controls isn't
// offered itself (the side door, the cargo ramp). Doors that open together are one target (the
// roof hatch's two parts).
// Plan: doc/plans/features/interaction-doors.md, doc/plans/backlog-passes.md (pass 1)

import * as THREE from 'three/webgpu';
import type { Door } from './doors';
import type { Device } from './input';
import { named } from './names';
import type { Physics } from './physics';
import { settings } from './settings';

export interface Interactable {
  /** A name for checks and logs. */
  name: string;
  /** Its parts: for its bounds (all of them together), and the meshes to highlight. */
  objects: THREE.Object3D[];
  /** What pressing the button does, for the prompt ("Open", "Close"...). */
  verb: () => string;
  act: () => void;
  /** Offered right now (default: yes). */
  available?: () => boolean;
}

/**
 * Doors that open and close together, as one target: each is tagged `opensWith: "<object name>"`
 * in the ship file (the roof hatch's two parts).
 */
function doorGroups(doors: Door[]): Door[][] {
  const groups: Door[][] = [];
  const grouped = new Set<Door>();
  for (const door of doors) {
    const other = door.object.userData.opensWith as string | undefined;
    if (!other || grouped.has(door)) continue;
    const partner = doors.find((d) => d !== door && named(d.object, other));
    if (!partner) {
      console.warn(`[01-walk] "${door.name}" opens with "${other}", which isn't a door`);
      continue;
    }
    const group = [door, partner].sort((x, y) => x.name.localeCompare(y.name));
    for (const d of group) grouped.add(d);
    groups.push(group);
  }
  return groups;
}

/** The ship's interactables: its doors and the keypads that control the ramp and the side door. */
export function shipInteractables(ship: THREE.Object3D, doors: Door[]): Interactable[] {
  const list: Interactable[] = [];
  // The keypads first: a door with a keypad is used from the keypad only.
  const withKeypad = new Set<Door>();
  ship.traverse((o) => {
    const target = o.userData.controls as string | undefined;
    if (o.userData.interact !== 'use' || !target) return;
    if (target === 'Door Cargo') {
      list.push({ name: o.name, objects: [o], verb: () => (settings.cargoRampOpen ? 'Close ramp' : 'Open ramp'), act: () => (settings.cargoRampOpen = !settings.cargoRampOpen) });
      return;
    }
    const door = doors.find((d) => named(d.object, target));
    if (!door) {
      console.warn(`[01-walk] "${o.name}" controls "${target}", which isn't a door`);
      return;
    }
    withKeypad.add(door);
    list.push({ name: o.name, objects: [o], verb: () => (door.open ? 'Close door' : 'Open door'), act: () => door.toggle() });
  });
  const grouped = new Set<Door>();
  for (const all of doorGroups(doors)) {
    const group = all.filter((d) => !withKeypad.has(d));
    if (group.length === 0) continue;
    for (const door of group) grouped.add(door);
    const first = group[0]!;
    list.push({
      name: group.map((d) => d.name).join(' + '),
      objects: group.map((d) => d.object),
      verb: () => (first.open ? 'Close' : 'Open'),
      // All to the same state, whatever each was.
      act: () => {
        const open = !first.open;
        for (const door of group) door.open = open;
      },
      available: () => !group.some((d) => d.collider?.under()),
    });
  }
  for (const door of doors) {
    if (withKeypad.has(door) || grouped.has(door)) continue;
    list.push({
      name: door.name,
      objects: [door.object],
      verb: () => (door.open ? 'Close' : 'Open'),
      act: () => door.toggle(),
      // Not while she's standing on it (the trapdoor, closed).
      available: () => !door.collider?.under(),
    });
  }
  return list;
}

const GLYPH: Record<Device, string> = { gamepad: '◯', keyboard: 'E' };

/** The prompt stays this far inside the screen's edges (px). */
const EDGE = 8;

export class Interaction {
  target: Interactable | null = null;
  /** Where the prompt's centre is on screen (CSS px), while there's a target: for checks. */
  readonly promptAt = { x: 0, y: 0 };
  private box = new THREE.Box3();
  private part = new THREE.Box3();
  private centre = new THREE.Vector3();
  private corner = new THREE.Vector3();
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
   * Per frame: pick the target, show the prompt next to it (and highlight it, if the highlight is
   * on); act on a press.
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
      if (item.available && !item.available()) continue;
      this.bounds(item);
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
      if (this.target) for (const o of this.target.objects) setHighlight(o, 0);
      if (best) for (const o of best.objects) setHighlight(o, 1);
      this.target = best;
    }
    if (pressed && this.target) this.target.act();
    if (this.target) {
      this.prompt.textContent = `${GLYPH[device]}  ${this.target.verb()}`;
      this.prompt.hidden = false;
      this.placePrompt(this.target, camera);
    } else {
      this.prompt.hidden = true;
    }
  }

  /** The target's bounds (all its parts), into `this.box`. */
  private bounds(item: Interactable): void {
    this.box.makeEmpty();
    for (const o of item.objects) this.box.union(this.part.setFromObject(o));
  }

  /**
   * The prompt next to the target on screen: beside the centre of its bounds, to the right, clear
   * of a small target (a keypad) and at most 60 px from the centre of a large one (a door that
   * fills the view); kept inside the screen's edges.
   */
  private placePrompt(item: Interactable, camera: THREE.Camera): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const w = this.prompt.offsetWidth;
    const h = this.prompt.offsetHeight;
    this.bounds(item);
    camera.updateMatrixWorld();
    this.box.getCenter(this.centre);
    // Behind the camera (it's inside the target's bounds): the middle of the screen.
    const inFront = this.toTarget.subVectors(this.centre, camera.position).dot(this.forward) > 0.05;
    let x = width / 2;
    let y = height / 2;
    let halfWidth = 0;
    if (inFront) {
      this.centre.project(camera);
      x = (this.centre.x * 0.5 + 0.5) * width;
      y = (-this.centre.y * 0.5 + 0.5) * height;
      // Half the width of its bounds on screen, from the corners in front of the camera.
      for (let i = 0; i < 8; i++) {
        this.corner.set(i & 1 ? this.box.max.x : this.box.min.x, i & 2 ? this.box.max.y : this.box.min.y, i & 4 ? this.box.max.z : this.box.min.z);
        if (this.toTarget.subVectors(this.corner, camera.position).dot(this.forward) <= 0.05) continue;
        this.corner.project(camera);
        halfWidth = Math.max(halfWidth, Math.abs((this.corner.x * 0.5 + 0.5) * width - x));
      }
    }
    x += Math.min(halfWidth, 60) + 12 + w / 2;
    x = THREE.MathUtils.clamp(x, EDGE + w / 2, Math.max(EDGE + w / 2, width - EDGE - w / 2));
    y = THREE.MathUtils.clamp(y, EDGE + h / 2, Math.max(EDGE + h / 2, height - EDGE - h / 2));
    this.promptAt.x = x;
    this.promptAt.y = y;
    this.prompt.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px)`;
  }
}

function setHighlight(object: THREE.Object3D, on: 0 | 1): void {
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.userData.highlight = on;
  });
}
