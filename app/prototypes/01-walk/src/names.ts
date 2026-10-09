// Object names from the ship file as GLTFLoader gives them.

import type * as THREE from 'three/webgpu';

/** GLTFLoader's node names: spaces become underscores; . : / [ ] are removed. */
export const sanitize = (name: string) => name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
/** True if the object has this Blender name (as exported or as sanitised). */
export const named = (o: THREE.Object3D, name: string) => o.name === name || o.name === sanitize(name);
