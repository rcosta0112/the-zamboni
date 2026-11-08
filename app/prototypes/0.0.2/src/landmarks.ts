// Landmarks: buildings placed on a landed scene's ground (2026-11-07: the temple and its light shaft,
// doc/plans/features/temple.md). A scene's `landmarks` names each file (`public/scenery/<file>.glb`,
// `npm run export:temple`) and where it stands: `ahead` metres along the ship's axis from its centre,
// `side` metres to its right. The file is turned as the ship is (its turn relative to the ship is the
// .blend's), its floor (the top of `Temple Steps`) put at the highest ground under the steps, which
// reach down into the hills everywhere (a console warning if they don't, or if a rock is in the way).
// The stone is lit by the outside's light (the rocks' `lightOutside`), casts and receives shadows, and
// is a static triangle collider. The shaft (tagged `shaft` by the export) has none: the file's box is
// hidden and light-shaft.ts draws it (its core, glow, flare and point light) from the box's foot, width
// and Blackbody colour, once placed. Shown only in a scene that names it, while the ship is parked on
// a terrain.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LightShaft } from './light-shaft';
import type { Physics } from './physics';

export interface LandmarkPlace {
  /** `public/scenery/<file>.glb`. */
  file: string;
  /** Along the ship's axis from its centre (m), forward. */
  ahead: number;
  /** To the ship's right (m). */
  side?: number;
  /** Times the file's size (owner: the temple 3 times, 2026-11-07; 0.7 later; 1.4, 2026-11-08). */
  scale?: number;
}

/** The steps' square, sampled every this many metres for the ground under it. */
const GROUND_STEP = 1;
/** A rock this close to the steps' edge (m) is warned about. */
const ROCK_MARGIN = 10;
/** The light shaft's tinge, linear: the owner's reference render's peach-pink, at the glow's faint edges only; its middle white (owner, 2026-11-08). */
const SHAFT_COLOUR = [1, 0.42, 0.32];
/** The shaft's width (m), whatever the temple's scale: as it was at 3 times the file's (owner, 2026-11-07: kept when the temple shrank). */
const SHAFT_WIDTH = 0.45;
/** The `Rock` stone as the owner's reference render: matte, a warm near-white (linear; the file's grey 0.67, metalness 0.23, before). */
const STONE = { color: new THREE.Color(0.9, 0.86, 0.85), roughness: 1, metalness: 0 };

interface Landmark {
  object: THREE.Object3D;
  steps: THREE.Mesh | null;
  solid: THREE.Mesh[];
  shaft: THREE.Mesh | null;
  /** The shaft as drawn (light-shaft.ts), made where it's placed. */
  lightShaft: LightShaft | null;
  collider: { setEnabled: (on: boolean) => void } | null;
  placed: string;
}

export class Landmarks {
  private readonly files = new Map<string, Promise<Landmark>>();
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  /** Each landmark shown, by file (the probe reads it). */
  readonly shown = new Map<string, Landmark>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly physics: Physics,
    /** The outside's light on a material (Treadmill.lightOutside). */
    private readonly lightOutside: (material: THREE.MeshStandardNodeMaterial) => void,
    /** A light added to the outside's list, or taken off (Treadmill.setOutsideLight). */
    private readonly outsideLight: (light: THREE.Light, on: boolean) => void,
  ) {}

  /** Each frame: the shafts' pulse and flicker, their widths in pixels, the haze, the panel's settings. */
  update(camera: THREE.PerspectiveCamera, drawingHeight: number, fog: THREE.Fog | null, dt: number): void {
    for (const landmark of this.shown.values()) landmark.lightShaft?.update(camera, drawingHeight, fog, dt);
  }

  /** The light shaft shown (the temple's), if any: main.ts plays its hum. */
  get shownShaft(): LightShaft | null {
    for (const landmark of this.shown.values()) if (landmark.lightShaft?.group.visible) return landmark.lightShaft;
    return null;
  }

  /**
   * The scene's landmarks shown and placed (none: all hidden).
   * @param ship the ship's object (its turn, its axis) and its centre on the ground plan (world x, z)
   * @param groundY the ground's height under a world point
   * @param rocks the rocks nearest the ship (world matrices set), checked against the steps
   */
  async show(places: LandmarkPlace[], ship: { object: THREE.Object3D; centre: { x: number; z: number } }, groundY: (x: number, z: number) => number, rocks: THREE.Mesh[]): Promise<void> {
    const wanted = new Set(places.map((p) => p.file));
    for (const [file, landmark] of this.shown) {
      if (wanted.has(file)) continue;
      landmark.object.visible = false;
      landmark.collider?.setEnabled(false);
      this.showShaft(landmark, false);
      this.shown.delete(file);
    }
    for (const place of places) {
      const landmark = await this.load(place.file);
      this.place(landmark, place, ship, groundY, rocks);
      landmark.object.visible = true;
      landmark.collider?.setEnabled(true);
      this.showShaft(landmark, true);
      this.shown.set(place.file, landmark);
    }
  }

  private showShaft(landmark: Landmark, on: boolean): void {
    if (!landmark.lightShaft) return;
    landmark.lightShaft.group.visible = on;
    this.outsideLight(landmark.lightShaft.light, on);
  }

  private load(file: string): Promise<Landmark> {
    let loading = this.files.get(file);
    if (!loading) {
      loading = this.loader.loadAsync(`/scenery/${file}.glb`).then((gltf) => {
        const object = gltf.scene;
        let steps: THREE.Mesh | null = null;
        let shaft: THREE.Mesh | null = null;
        const solid: THREE.Mesh[] = [];
        const made = new Map<THREE.Material, THREE.Material>();
        object.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const extras = (o.userData ?? {}) as { shaft?: boolean; glowColor?: number[]; glowStrength?: number };
          if (extras.shaft) {
            // Hidden: light-shaft.ts draws it from where it stands (its foot, its width, its colour).
            o.visible = false;
            shaft = o;
            return;
          }
          if (o.name === 'Temple_Steps') steps = o;
          solid.push(o);
          o.castShadow = true;
          o.receiveShadow = true;
          // As the rocks: lit by the outside, single-sided (the file's materials are double-sided).
          const swap = (m: THREE.Material): THREE.Material => {
            let copy = made.get(m);
            if (!copy) {
              const from = m as THREE.MeshStandardMaterial;
              const look = m.name === 'Rock' ? STONE : { color: from.color, roughness: from.roughness, metalness: from.metalness };
              const lit = new THREE.MeshStandardNodeMaterial({ ...look, side: THREE.FrontSide });
              this.lightOutside(lit);
              made.set(m, (copy = lit));
            }
            return copy;
          };
          o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
        });
        object.visible = false;
        this.scene.add(object);
        if (!steps) console.warn(`[0.0.2] landmark ${file}: no Temple Steps: its floor is put at the ground under its origin`);
        return { object, steps, solid, shaft, lightShaft: null, collider: null, placed: '' };
      });
      this.files.set(file, loading);
    }
    return loading;
  }

  private place(landmark: Landmark, place: LandmarkPlace, ship: { object: THREE.Object3D; centre: { x: number; z: number } }, groundY: (x: number, z: number) => number, rocks: THREE.Mesh[]): void {
    const { object } = landmark;
    ship.object.updateWorldMatrix(true, false);
    // The ship's forward: the file's -y (the cockpit), in the world.
    const ahead = new THREE.Vector3(0, 0, 1).transformDirection(ship.object.matrixWorld).setY(0).normalize();
    const right = new THREE.Vector3(-ahead.z, 0, ahead.x);
    const at = new THREE.Vector3(ship.centre.x, 0, ship.centre.z).addScaledVector(ahead, place.ahead).addScaledVector(right, place.side ?? 0);
    object.quaternion.copy(ship.object.getWorldQuaternion(new THREE.Quaternion()));
    object.position.copy(at);
    object.scale.setScalar(place.scale ?? 1);
    object.updateMatrixWorld(true);
    // The floor at the highest ground under the steps; their bottom should be under the lowest.
    const box = new THREE.Box3().setFromObject(landmark.steps ?? object);
    let high = -Infinity;
    let low = Infinity;
    for (let x = box.min.x; x <= box.max.x + 1e-6; x += GROUND_STEP) {
      for (let z = box.min.z; z <= box.max.z + 1e-6; z += GROUND_STEP) {
        const y = groundY(x, z);
        high = Math.max(high, y);
        low = Math.min(low, y);
      }
    }
    if (!landmark.steps) high = groundY(at.x, at.z) - box.min.y; // its origin on the ground
    object.position.y += high - box.max.y;
    object.updateMatrixWorld(true);
    const bottom = box.min.y + (high - box.max.y);
    if (landmark.steps && bottom > low) console.warn(`[0.0.2] landmark ${place.file}: the ground under its steps falls ${(high - low).toFixed(2)} m, its steps reach ${(box.max.y - box.min.y).toFixed(2)}: a gap up to ${(low - bottom).toFixed(2)} m shows`);
    // A rock in the way (the scatter is fixed: this only fires if the spot or the rocks change).
    const reach = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + ROCK_MARGIN;
    const v = new THREE.Vector3();
    let nearest = Infinity;
    for (const rock of rocks) {
      const position = rock.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(rock.matrixWorld);
        nearest = Math.min(nearest, Math.hypot(v.x - at.x, v.z - at.z));
      }
    }
    if (nearest < reach) console.warn(`[0.0.2] landmark ${place.file}: a rock ${nearest.toFixed(1)} m from its centre (within its steps and ${ROCK_MARGIN} m)`);
    console.info(`[0.0.2] landmark ${place.file}: ${place.ahead} m ahead${place.side ? `, ${place.side} m right` : ''}, ×${place.scale ?? 1}, floor at y ${high.toFixed(2)} (the ground ${low.toFixed(2)}..${high.toFixed(2)} under its steps), nearest rock ${nearest.toFixed(0)} m`);
    // The collider, made again only when the landmark moved.
    const key = [object.position.x, object.position.y, object.position.z, object.scale.x].map((n) => n.toFixed(3)).join(',');
    if (landmark.placed !== key) {
      landmark.collider?.setEnabled(false);
      landmark.collider = this.collider(landmark.solid);
      landmark.placed = key;
      this.makeShaft(landmark);
    }
  }

  /** The shaft drawn from the file's box where it now stands (the old one dropped). */
  private makeShaft(landmark: Landmark): void {
    if (landmark.lightShaft) {
      this.showShaft(landmark, false);
      this.scene.remove(landmark.lightShaft.group);
      landmark.lightShaft = null;
    }
    const box = landmark.shaft;
    if (!box) return;
    // The reference's peach-pink (owner, 2026-11-07; the file's Blackbody, 1,500 K, came out orange),
    // set here over the file's `glowColor` (linear, brightest channel 1).
    const colour = new THREE.Color().fromArray(SHAFT_COLOUR);
    const bounds = new THREE.Box3().setFromObject(box, true);
    const foot = bounds.getCenter(new THREE.Vector3()).setY(bounds.min.y);
    const temple = landmark.object.getObjectByName('Temple') ?? landmark.object;
    const width = new THREE.Box3().setFromObject(temple).getSize(new THREE.Vector3()).x;
    landmark.lightShaft = new LightShaft(foot, SHAFT_WIDTH, colour, width);
    landmark.lightShaft.group.visible = false;
    this.scene.add(landmark.lightShaft.group);
  }

  /** The stone as one static triangle collider, in world coordinates. */
  private collider(meshes: THREE.Mesh[]): { setEnabled: (on: boolean) => void } | null {
    const vertices: number[] = [];
    const indices: number[] = [];
    const v = new THREE.Vector3();
    for (const mesh of meshes) {
      mesh.updateWorldMatrix(true, false);
      const position = mesh.geometry.getAttribute('position');
      const base = vertices.length / 3;
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        vertices.push(v.x, v.y, v.z);
      }
      const index = mesh.geometry.getIndex();
      if (index) for (let i = 0; i < index.count; i++) indices.push(base + index.getX(i));
      else for (let i = 0; i < position.count; i++) indices.push(base + i);
    }
    return indices.length ? this.physics.addStaticTriangles(new Float32Array(vertices), new Uint32Array(indices)) : null;
  }
}
