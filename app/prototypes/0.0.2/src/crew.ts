// The crew placed in the ship (exported by tools/export-ship-crew.py, in the ship's space):
// Dr. Kaufman sitting on the crew quarters couch with her idle animation, and the other characters
// in the scene as static poses. Never cut by the see-through hull (owner, 2026-10-09: all
// characters visible all the time, for now). Each gets a box collider so Dr. Green can't walk
// through them. Each character is an entity (its `id` from the crew export: `kaufman`, `ogawa`,
// `adam-red`, `adam-blue`) whose pieces are grouped under one root at their feet, so a scene can put
// them somewhere else (`Placement`).
// Plans: doc/plans/features/ship-contents.md, doc/plans/architecture/game-architecture/game-structure.md

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Entity, type Component, type Entities } from './entities';
import { downloads } from './loading';
import type { Physics } from './physics';

const CREW_URL = '/test/zamboni-crew.glb';

export interface Crew {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  /** Character names, as in the file. */
  names: string[];
}

/** A character a scene can put somewhere: its root (at its feet, as exported) moved and turned. */
export class Placement implements Component {
  paused = false;
  /** Where it was exported (the ship's glTF space): `turn` is measured from there. */
  private readonly home: THREE.Vector3;

  constructor(
    readonly root: THREE.Object3D,
    private collider: { setEnabled: (on: boolean) => void },
    private readonly physics: Physics,
  ) {
    this.home = root.position.clone();
  }

  /**
   * Feet at `at` (the ship's glTF space), turned `turn` radians about the vertical from how it was
   * exported. Its collider follows (a new box around its pose there).
   */
  place(at: THREE.Vector3, turn = 0): void {
    this.root.position.copy(at);
    this.root.rotation.y = turn;
    this.root.updateMatrixWorld(true);
    this.collider.setEnabled(false);
    this.collider = this.physics.addStaticBox(new THREE.Box3().setFromObject(this.root, true));
  }

  /** Back where it was exported. */
  reset(): void {
    if (!this.root.position.equals(this.home) || this.root.rotation.y !== 0) this.place(this.home, 0);
  }
}

/** Loads the crew under the ship's object (same transform and scale as the ship). */
export async function loadCrew(shipObject: THREE.Object3D, physics: Physics, entities: Entities, onProgress: (share: number) => void = () => undefined): Promise<Crew> {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(CREW_URL, downloads(1, onProgress)[0]);
  const object = gltf.scene;
  shipObject.add(object);
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // skinned meshes move away from their bind-pose bounds
    }
  });

  // Her idle loops; the first frame is applied now, so the colliders fit the pose.
  const mixer = new THREE.AnimationMixer(object);
  for (const clip of gltf.animations) {
    // Tracks for bones left out of the export (IK helpers with no weights) have nothing to drive.
    clip.tracks = clip.tracks.filter((t) => object.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName));
    mixer.clipAction(clip).play();
  }
  mixer.update(0);
  object.updateMatrixWorld(true);

  // One box collider per character, around its posed meshes.
  const boxes = new Map<string, THREE.Box3>();
  object.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    let name: string | undefined;
    for (let n: THREE.Object3D | null = o; n && !name; n = n.parent) name = n.userData.character as string | undefined;
    if (!name) return;
    const box = boxes.get(name) ?? new THREE.Box3();
    box.expandByObject(o, true);
    boxes.set(name, box);
  });
  // Each character's pieces under one root at its feet (the middle of its box, at its bottom).
  const pieces = new Map<string, THREE.Object3D[]>();
  for (const o of object.children) {
    const id = o.userData.id as string | undefined;
    if (id) pieces.set(id, [...(pieces.get(id) ?? []), o]);
  }
  for (const [id, parts] of pieces) {
    const name = parts[0]!.userData.character as string;
    const box = boxes.get(name) ?? new THREE.Box3().setFromObject(parts[0]!, true);
    const root = new THREE.Group();
    root.name = `${name} (root)`;
    object.worldToLocal(box.getCenter(root.position).setY(box.min.y));
    root.userData = { id, kind: 'character' };
    object.add(root);
    for (const part of parts) root.attach(part);
    root.updateMatrixWorld(true);
    const entity = new Entity(id, 'character', root);
    entity.components.push(new Placement(root, physics.addStaticBox(box), physics));
    entities.add(entity);
    boxes.delete(name);
  }
  for (const box of boxes.values()) physics.addStaticBox(box); // a character with no id (an older export)
  console.info(`[0.0.2] crew: ${[...boxes.keys()].join(', ')}; animations: ${gltf.animations.map((a) => `${a.name} (${a.duration.toFixed(1)} s)`).join(', ') || 'none'}`);
  return { object, mixer, names: [...boxes.keys()] };
}
