// Interaction: point at something and press E (keyboard) or Circle / B (gamepad) to use it.
// "Pointing" in third person: of the targets within her reach (from her chest, not hidden behind
// something solid), the one nearest the centre of the screen. No crosshair. A prompt next to the
// target on screen names the action, with the button of the last device used (owner, 2026-10-12;
// the highlight that came first is gone, 2026-10-14).
// Targets: the doors, and the devices (the kinds `keypad`, `door-panel`, `lever`: the keypads by the
// side door and the ramp, the bulkhead doors' panels, the engineering window's lever), each naming
// what it opens by id with its `controls` tag. A door that a device controls isn't offered itself (the side door,
// the cargo ramp, the bulkhead doors, the window). Doors that open together are one target (the
// roof hatch's two parts), and a panel moves all of them (a bulkhead door's two leaves).
// Other devices (the boombox) make their own target and are handed in (`others`).
// Locked (a scene or Ink): a door, or its keypad or panel, offers its story knot (`use_<id>`, its
// `# verb:` tag as the prompt) if the story has one, otherwise "Locked" (`respectLocks`).
// Plan: doc/plans/features/interaction-doors.md, doc/plans/backlog-passes.md (pass 1),
// doc/plans/features/bulkhead-doors.md, doc/plans/features/audio-from-ue.md,
// doc/plans/features/interaction-sounds.md (the panels' two tones, the lever's clunk)

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import type { Command } from './commands';
import type { Door } from './doors';
import type { Entities, Openable } from './entities';
import type { Device } from './input';
import { isDeviceKind } from './kinds';
import type { Physics } from './physics';
import { settings } from './settings';
import type { GameStory } from './story';

export interface Interactable {
  /** A name for checks and logs. */
  name: string;
  /** Its parts: for its bounds (all of them together). */
  objects: THREE.Object3D[];
  /** What pressing the button does, for the prompt ("Open", "Close"...). */
  verb: () => string;
  act: () => void;
  /** Offered right now (default: yes). */
  available?: () => boolean;
  /** What it opens: while any is locked, it does what `respectLocks` says instead. */
  controls?: Openable[];
}

/**
 * The ship's interactables: its doors, and the devices that control something (`controls`): the
 * keypads of the ramp and the side door, the bulkhead doors' panels, the engineering window's lever.
 * @param others targets that are made elsewhere (the boombox)
 * @param sound plays a device's own sound, at the device: a panel's two tones (up for open, down
 *   for close), the lever's clunk
 * @param ramp the cargo ramp's state (what its keypad controls)
 */
export function shipInteractables(entities: Entities, doors: Door[], others: Interactable[] = [], sound: (id: CueId, at: THREE.Object3D) => void = () => undefined, ramp?: Openable): Interactable[] {
  const list: Interactable[] = [...others];
  // The devices first: a door with a keypad, a panel or a lever is used from there only.
  const withKeypad = new Set<Door>();
  for (const { object: o, kind } of entities.all()) {
    if (!isDeviceKind(kind)) continue;
    const target = o.userData.controls as string | undefined;
    if (!target) {
      console.warn(`[0.0.2] the ${kind} "${o.name}" controls nothing (no \`controls\` tag)`);
      continue;
    }
    if (target === 'cargo-ramp') {
      list.push({
        name: o.name,
        objects: [o],
        ...(ramp ? { controls: [ramp] } : {}),
        verb: () => (settings.cargoRampOpen ? 'Close ramp' : 'Open ramp'),
        act: () => {
          settings.cargoRampOpen = !settings.cargoRampOpen;
          settings.cargoRampByKeypad = settings.cargoRampOpen; // from inside: it won't stop for her (ship.ts)
          sound(settings.cargoRampOpen ? 'sfx_panel_open' : 'sfx_panel_close', o);
        },
      });
      continue;
    }
    const door = doors.find((d) => d.id === target);
    if (!door) {
      console.warn(`[0.0.2] "${o.name}" controls "${target}", which isn't a door`);
      continue;
    }
    // What it moves: the door with everything that opens with it (a bulkhead door's two leaves),
    // and the device's own handle (the lever), which goes to its other position with it.
    const group = door.group;
    const handles = doors.filter((d) => d.device === o);
    for (const d of [...group, ...handles]) withKeypad.add(d);
    // The handle moves first, then what it controls.
    for (const d of group) d.waitsFor = handles;
    const what = kind === 'lever' ? 'window' : 'door';
    // A door that opens by itself: the panel shuts it and keeps it shut; used again, the door is
    // automatic again (owner, 2026-10-13). With the automatic opening off, the panel just toggles.
    const automatic = () => door.auto && settings.autoDoors;
    list.push({
      name: o.name,
      objects: [o, ...handles.map((h) => h.object)],
      controls: group,
      verb: () => ((automatic() ? !door.shut : door.open) ? `Close ${what}` : `Open ${what}`),
      act: () => {
        // A lever isn't used while it's moving (as in the UE prototype).
        if ([...group, ...handles].some((d) => d.moving) && handles.length > 0) return;
        let opens: boolean;
        if (automatic()) {
          const shut = !door.shut;
          for (const d of group) d.shut = shut;
          opens = !shut;
        } else {
          const open = !door.open;
          for (const d of group) {
            d.open = open;
            d.shut = false;
          }
          opens = open;
        }
        for (const h of handles) h.open = door.open;
        sound(kind === 'lever' ? 'sfx_lever' : opens ? 'sfx_panel_open' : 'sfx_panel_close', o);
      },
    });
  }
  const grouped = new Set<Door>();
  for (const all of new Set(doors.filter((d) => d.group.length > 1).map((d) => d.group))) {
    const group = all.filter((d) => !withKeypad.has(d));
    if (group.length === 0) continue;
    for (const door of group) grouped.add(door);
    const first = group[0]!;
    list.push({
      name: group.map((d) => d.name).join(' + '),
      objects: group.map((d) => d.object),
      controls: group,
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
      controls: [door],
      verb: () => (door.open ? 'Close' : 'Open'),
      act: () => door.toggle(),
      // Not while she's standing on it (the trapdoor, closed).
      available: () => !door.collider?.under(),
    });
  }
  return list;
}

/**
 * The targets, minding locks: while what one controls is locked, it runs the story's knot for it
 * (`use_<id>` of its first object, through the commands), prompted by the knot's `# verb:` tag
 * ("Use" without one); with no knot, it says "Locked" and does nothing.
 */
export function respectLocks(items: Interactable[], story: () => GameStory | null, run: (command: Command) => void): Interactable[] {
  return items.map((item) => {
    const controls = item.controls;
    if (!controls?.length) return item;
    const id = item.objects[0]?.userData.id as string | undefined;
    const locked = () => controls.some((c) => c.locked);
    const knot = () => (id ? (story()?.useKnot(id) ?? null) : null);
    return {
      ...item,
      verb: () => {
        if (!locked()) return item.verb();
        const k = knot();
        return k ? (story()!.tag(k, 'verb') ?? 'Use') : 'Locked';
      },
      act: () => {
        if (!locked()) return item.act();
        const k = knot();
        if (k) run({ do: 'story', knot: k });
      },
    };
  });
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
  /** The ids switched off by a scene or a command (any of an item's objects): not offered. */
  disabled = new Set<string>();

  constructor(
    private items: Interactable[],
    private physics: Physics,
    private prompt: HTMLElement,
  ) {}

  /**
   * Per frame: pick the target, show the prompt next to it; act on a press.
   * @param chest her chest (world)
   */
  update(chest: THREE.Vector3, camera: THREE.Camera, device: Device, pressed: boolean, off = false): void {
    // Off (she's climbing the ladder): no target, no prompt.
    if (off) {
      this.target = null;
      this.prompt.hidden = true;
      return;
    }
    camera.getWorldDirection(this.forward);
    this.ray.set(camera.position, this.forward);
    const maxAngle = THREE.MathUtils.degToRad(settings.interactMaxAngleDeg);
    let best: Interactable | null = null;
    let bestAngle = Infinity;
    let bestDistance = Infinity;
    for (const item of this.items) {
      if (item.available && !item.available()) continue;
      if (this.disabled.size && item.objects.some((o) => this.disabled.has(o.userData.id as string))) continue;
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
    this.target = best;
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
