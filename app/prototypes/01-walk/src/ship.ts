// The Zamboni's exterior, landed a few metres from the start, with a simple mesh collider.
// Exported by app/tools/export-ship-exterior.py: the outer hull and outside parts, plus
// `zamboni_col` (a decimated copy, never rendered) used as the collider.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Physics } from './physics';

const SHIP_URL = '/test/zamboni-exterior.glb';
const COLLIDER = 'zamboni_col';

export interface Ship {
  object: THREE.Object3D;
  collider: THREE.Mesh;
}

/**
 * @param scale the same scale as the characters (ship and crew share units in the Blender files)
 */
export async function loadShip(scene: THREE.Scene, physics: Physics, scale: number): Promise<Ship> {
  const gltf = await new GLTFLoader().loadAsync(SHIP_URL);
  const object = gltf.scene;

  // Landed in front of the player, off to the right, turned to show its side.
  object.scale.setScalar(scale);
  object.position.set(9, 0, -15);
  object.rotation.y = THREE.MathUtils.degToRad(-35);

  let collider: THREE.Mesh | null = null;
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (o.name === COLLIDER) {
      collider = mesh;
      return;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  if (!collider) throw new Error(`${SHIP_URL} has no "${COLLIDER}" mesh`);
  const col: THREE.Mesh = collider;
  col.material = new THREE.MeshBasicNodeMaterial({ color: 0xff3366, wireframe: true });
  col.visible = false;

  scene.add(object);
  object.updateMatrixWorld(true);
  physics.addStaticMesh(col);
  return { object, collider: col };
}
