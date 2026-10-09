// The crew placed in the ship (exported by app/tools/export-ship-crew.py, in the ship's space):
// Dr. Kaufman sitting on the crew quarters couch with her idle animation, and the other characters
// in the scene as static poses. Never cut by the see-through hull (owner, 2026-10-09: all
// characters visible all the time, for now). Each gets a box collider so Dr. Green can't walk
// through them.
// Plan: doc/plans/features/ship-contents.md

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { Physics } from './physics';

const CREW_URL = '/test/zamboni-crew.glb';

export interface Crew {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  /** Character names, as in the file. */
  names: string[];
}

/** Loads the crew under the ship's object (same transform and scale as the ship). */
export async function loadCrew(shipObject: THREE.Object3D, physics: Physics): Promise<Crew> {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(CREW_URL);
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
  for (const box of boxes.values()) physics.addStaticBox(box);
  console.info(`[01-walk] crew: ${[...boxes.keys()].join(', ')}; animations: ${gltf.animations.map((a) => `${a.name} (${a.duration.toFixed(1)} s)`).join(', ') || 'none'}`);
  return { object, mixer, names: [...boxes.keys()] };
}
