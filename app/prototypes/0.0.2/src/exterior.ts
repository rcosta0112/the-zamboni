// The hull's outside (doc/plans/features/exterior-look.md, pass 3): while the camera drawing is outside
// the ship, in any scene (owner, 2026-10-23: "always", the interior's light unchanged), the outer
// shell, the turbines, the ramp and the landing gear are lit as the scenery is (the sun and the
// outside's blue sky, terrain.ts), as Blender's world lights the fly-by's ship. With the camera inside
// they keep the interior's light, so the rooms look as before (the doors, the hatch and the ramp have
// inner faces). Each mesh gets a copy of its material with the outside's lights, built and compiled at
// load (changing a material's lights rebuilds its shader: frames stall), swapped in and out. The
// glass becomes the fly-by's (pass 4): a grey metal mirror of the sky, 30% opaque over the interior;
// from inside it stays nearly invisible (cutaway.ts).

import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { settings } from './settings';
import { named } from './names';
import { LANDING_GEAR, SHELL, type Ship } from './ship';

/**
 * The fly-by's *Glass* (`The Zamboni 1.11 - fly by animation ACES.blend`): Principled, base 0.8 grey,
 * metallic 1, roughness 0.2, alpha 0.3, blended. Shared by every pane.
 */
function exteriorGlass(): THREE.MeshStandardNodeMaterial {
  const glass = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color().setRGB(0.8, 0.8, 0.8, THREE.LinearSRGBColorSpace), metalness: 1, roughness: 0.2, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  glass.name = 'Glass (outside)';
  return glass;
}

type Swap = { mesh: THREE.Mesh; inside: THREE.Material; outside: THREE.Material };

export class ExteriorLook {
  private readonly swaps: Swap[] = [];
  private on = false;
  private readonly glassReflect = uniform(1);
  /** The glass's meshes among them. */
  panes = 0;
  /** How long building its shaders took at load (ms), for the checks. */
  compiledIn = 0;

  /** `light`: lights a material as the outside is (Treadmill.lightOutside). */
  constructor(ship: Ship, light: (material: THREE.MeshStandardNodeMaterial, reflects?: boolean) => void) {
    const copies = new Map<THREE.Material, THREE.Material>();
    const glass = exteriorGlass();
    light(glass, true);
    // Its own strength over the outside's reflections: Blender's world is at 2 in the fly-by.
    glass.envNode = (glass.envNode as THREE.Node<'vec3'>).mul(this.glassReflect);
    const outer = [...SHELL, ...LANDING_GEAR];
    ship.object.traverse((node) => {
      if (!outer.some((name) => named(node, name))) return;
      node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const inside = mesh.material as THREE.MeshStandardNodeMaterial | undefined;
        // Meshes with one lit material (not the hull gap's unlit fill); the glass gets the fly-by's.
        if (!mesh.isMesh || !inside || Array.isArray(inside) || !('lightsNode' in inside) || !('roughness' in inside)) return;
        if (inside.transparent || ((inside as THREE.MeshPhysicalNodeMaterial).transmission ?? 0) > 0) {
          this.swaps.push({ mesh, inside, outside: glass });
          this.panes++;
          return;
        }
        let outside = copies.get(inside);
        if (!outside) {
          const copy = inside.clone() as THREE.MeshStandardNodeMaterial;
          copy.name = `${inside.name} (outside)`;
          light(copy);
          copies.set(inside, (outside = copy));
        }
        this.swaps.push({ mesh, inside, outside });
      });
    });
    console.info(`[0.0.2] the hull's outside: ${this.swaps.length} meshes (${this.panes} of glass), ${copies.size + 1} materials`);
  }

  /** Lit by the outside (`on`) or by the interior's light. */
  set(on: boolean): void {
    this.glassReflect.value = settings.exteriorGlassReflections;
    if (on === this.on) return;
    this.on = on;
    for (const s of this.swaps) s.mesh.material = on ? s.outside : s.inside;
  }

  get shown(): boolean {
    return this.on;
  }
}
