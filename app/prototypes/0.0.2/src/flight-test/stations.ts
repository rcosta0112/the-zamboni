// The flight test scene's stations (plan doc/plans/features/non-linear-travel/flight-test-scene.md, pass 2;
// owner, 2026-11-23): while she's seated, the camera is a station's (pilot first); Tab / Shift+Tab or the pad's
// R1 / L1 cycle pilot → navigation → signal (the third-person view not among them: owner, 2026-11-23). She gets up:
// the game camera (main.ts `leave`); she sits down: the pilot's station again.
// Each station's camera: first at the root of the seated character's head bone (taken as the station is
// entered), turned to centre the station's console horizontally; from there the tuning panel's nudges
// (folder *Flight test: stations*): side / up / forward (m, along that facing), turn, pitch, lens. The
// character at the station is hidden while its camera is on (the camera is inside their head). The player looks
// around from there (mouse, right stick; owner 2026-11-23), within LOOK_YAW / LOOK_PITCH of the station's view,
// each station's look kept when switching away and found again on coming back (owner, 2026-11-23).
// *Copy values* puts the nudges on the clipboard as JSON, to be made the defaults here.
// Prototype code: only flight-test.html uses it (main.ts FLIGHT_TEST).

import * as THREE from 'three/webgpu';
import type GUI from 'three/addons/libs/lil-gui.module.min.js';

export type StationId = 'pilot' | 'navigation' | 'signal';

interface Station {
  id: StationId;
  /** Who sits there in the flight test scene: `green` (her model) or a crew entity's id. */
  who: string;
  /** The console's middle, in the ship's space (three's axes: the glTF's), centred horizontally. */
  target: [number, number, number];
}

/**
 * First guesses from the ship file (2026-11-23): her half of the main dashboard (`Cube019_1`'s left half); the
 * left side console (`Cube008`, the topographic map's side); the right side console's receivers (`Radio Dial`).
 * Seated there in this scene: Adam Red at the left console, Dr. Ogawa at the right.
 */
const STATIONS: Station[] = [
  { id: 'pilot', who: 'green', target: [-0.5, 4.38, 4.04] },
  { id: 'navigation', who: 'adam-red', target: [-1.51, 4.36, 1.79] },
  { id: 'signal', who: 'ogawa', target: [1.57, 4.51, 1.81] },
];

/** A station camera's nudges from its first guess. */
export interface StationNudge {
  /** m along the station's facing: to the right, up, forward. */
  side: number;
  up: number;
  forward: number;
  /** ° added to the facing that centres the console (positive turns left). */
  turn: number;
  /** ° up (negative looks down). */
  pitch: number;
  /** Vertical field of view, °. */
  fov: number;
}

const start = (nudge: Partial<StationNudge> = {}): StationNudge => ({ side: 0, up: 0, forward: 0, turn: 0, pitch: -20, fov: 90, ...nudge }); // lens 90° (owner, 2026-11-23)
/** The owner's values (2026-11-23, second round; navigation's, 2026-11-25). */
export const stationNudges: Record<StationId, StationNudge> = { pilot: start({ up: 0.25, forward: 0.1 }), navigation: start({ side: -0.05, up: 0.34, forward: 0.38 }), signal: start({ up: 0.2 }) };

const HEAD = /^Head(_\d+)?$/;
/** How far the player may look round from a station's view: left / right, up / down (rad). */
const LOOK_YAW = THREE.MathUtils.degToRad(120);
const LOOK_PITCH = THREE.MathUtils.degToRad(70);

export class Stations {
  /** The station camera, drawn instead of the game's while a station is on. */
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.05, 500);
  /** -1: the game camera; otherwise an index into STATIONS. */
  private index = -1;
  private get station(): Station | null {
    return STATIONS[this.index] ?? null;
  }
  /** The head bone's root as the station was entered, in the ship's space. */
  private head = new THREE.Vector3();
  /** Each station's head position, taken once (the crew's idle loop keeps the bone moving; resampling it on
   * every entry would reframe the view by a fraction of a degree each time, depending on the loop's phase). */
  private readonly heads = new Map<StationId, THREE.Vector3>();
  private hidden: THREE.Object3D | null = null;
  /** The player's look from the station's view (rad): yaw + left, pitch + up. */
  private lookYaw = 0;
  private lookPitch = 0;
  /** Each station's look as it was left. */
  private readonly looks = new Map<StationId, { yaw: number; pitch: number }>();
  private readonly local = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(
    private readonly ship: THREE.Object3D,
    /** A station's character's model: her model for `green`, the crew entity's object otherwise. */
    private readonly modelOf: (who: string) => THREE.Object3D | null,
  ) {}

  /** The station on, or null for the game camera. */
  get current(): StationId | null {
    return this.station?.id ?? null;
  }

  /** Her model is hidden by the caller (main.ts: `setShown`), the crew's here. */
  get herHidden(): boolean {
    return this.current === 'pilot';
  }

  /** Tab / R1: +1, Shift+Tab / L1: -1, among the stations (nothing while none is on). */
  cycle(step: 1 | -1): void {
    if (this.index < 0) return;
    this.enter((this.index + step + STATIONS.length) % STATIONS.length);
  }

  /** Back to the game camera (she got up). */
  leave(): void {
    this.keepLook();
    this.index = -1;
    this.showHidden();
  }

  /** A station's camera on: STATIONS' index (0, the pilot's). */
  enter(index: number): void {
    this.keepLook();
    this.index = index;
    this.showHidden();
    const station = this.station;
    if (!station) return;
    const kept = this.looks.get(station.id);
    this.lookYaw = kept?.yaw ?? 0;
    this.lookPitch = kept?.pitch ?? 0;
    const model = this.modelOf(station.who);
    const cached = this.heads.get(station.id);
    if (cached) {
      this.head.copy(cached);
    } else {
      let bone: THREE.Object3D | null = null;
      model?.traverse((o) => {
        if (!bone && (o as THREE.Bone).isBone && HEAD.test(o.name)) bone = o;
      });
      if (bone) {
        (bone as THREE.Object3D).updateWorldMatrix(true, false);
        this.ship.worldToLocal((bone as THREE.Object3D).getWorldPosition(this.head));
      } else {
        console.warn(`[0.0.2] station ${station.id}: no head bone for ${station.who}; the console's middle used, 0.6 m back`);
        this.head.set(...station.target).add(new THREE.Vector3(0, 0, -0.6));
      }
      this.heads.set(station.id, this.head.clone());
    }
    if (station.who !== 'green' && model) {
      model.visible = false;
      this.hidden = model;
    }
  }

  /** The camera placed for this frame (the ship may move: its pose is read each frame). */
  update(aspect: number, look: { yaw: number; pitch: number } | null): void {
    const station = this.station;
    if (!station) return;
    const nudge = stationNudges[station.id];
    // The player's look (input.ts `consumeLook`: the orbit's signs, pitch + looks down).
    if (look) {
      this.lookYaw = THREE.MathUtils.clamp(this.lookYaw + look.yaw, -LOOK_YAW, LOOK_YAW);
      this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - look.pitch, -LOOK_PITCH, LOOK_PITCH);
    }
    const [tx, , tz] = station.target;
    // The facing that centres the console: three's camera looks down -Z.
    const yaw = Math.atan2(-(tx - this.head.x), -(tz - this.head.z));
    const pitch = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(nudge.pitch) + this.lookPitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.euler.set(pitch, yaw + THREE.MathUtils.degToRad(nudge.turn) + this.lookYaw, 0);
    this.turn.setFromEuler(this.euler);
    // The nudges along the centring facing (not the turned one: turning doesn't move the camera).
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.local.copy(this.head).addScaledVector(right, nudge.side).addScaledVector(forward, nudge.forward);
    this.local.y += nudge.up;
    this.ship.updateWorldMatrix(true, false);
    this.camera.position.copy(this.ship.localToWorld(this.local.clone()));
    this.camera.quaternion.copy(this.ship.getWorldQuaternion(new THREE.Quaternion()).multiply(this.turn));
    if (this.camera.fov !== nudge.fov || this.camera.aspect !== aspect) {
      this.camera.fov = nudge.fov;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  private keepLook(): void {
    const station = this.station;
    if (station) this.looks.set(station.id, { yaw: this.lookYaw, pitch: this.lookPitch });
  }

  private showHidden(): void {
    if (this.hidden) this.hidden.visible = true;
    this.hidden = null;
  }
}

/** The tuning panel's folder: each station's nudges, and *Copy values*. */
export function stationsFolder(gui: GUI): void {
  const folder = gui.addFolder('Flight test: stations (Tab / Shift+Tab, R1 / L1)');
  for (const station of STATIONS) {
    const n = stationNudges[station.id];
    const sub = folder.addFolder(`${station.id} (${station.who})`);
    sub.add(n, 'side', -1, 1, 0.01).name('side (m, + right)');
    sub.add(n, 'up', -1, 1, 0.01).name('up (m)');
    sub.add(n, 'forward', -1, 1, 0.01).name('forward (m)');
    sub.add(n, 'turn', -90, 90, 0.5).name('turn (°, + left)');
    sub.add(n, 'pitch', -80, 60, 0.5).name('pitch (°, + up)');
    sub.add(n, 'fov', 20, 100, 1).name('lens: field of view (°)');
  }
  folder
    .add(
      {
        copy: () => {
          const text = JSON.stringify(stationNudges, null, 2);
          console.info('[0.0.2] station cameras:\n' + text);
          void navigator.clipboard?.writeText(text).catch(() => undefined);
        },
      },
      'copy',
    )
    .name('Copy values (JSON, also in the console)');
}
