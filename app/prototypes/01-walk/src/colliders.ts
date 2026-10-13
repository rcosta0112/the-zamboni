// Collision boxes that stand in front of the ship's own shapes where she caught on them (owner,
// 2026-10-13): flat faces along the crew quarters' walls and furniture, one box for the sledge (up to
// the ceiling and across to the side wall: there's no way round it), one for the chests on the pallet
// and one for the lamp on them (she can stand up there), one across the foot of the slope up to the
// engineering window (one has a corner cut off). The ship's collider is every part's real shape; a box in front of a detailed
// surface is all it takes, since she never reaches what's behind it.
// They're here, in the world's coordinates, until the owner has approved them; then they become
// `*_col` objects in the ship file (the export already joins those into the ship's collider) and
// this file goes. Shown with *show colliders*; switched off with *collision boxes* (tuning panel).
// Plan: doc/plans/features/movement-and-ladder.md

import * as THREE from 'three/webgpu';
import type { Physics } from './physics';
import { settings } from './settings';

/** Floor heights (world, m). */
const CARGO = 1.22;
const CREW = 3.46;
/** The cargo hold's and engineering's ceiling. */
const LOWER_CEILING = 3.3;
/** Above her head (she's 1.23 m, and jumps 0.6 m indoors) on the crew quarters' floor. */
const CREW_TOP = CREW + 2.0;

/** What a box is: its name, then its outline seen from above (x, z; convex) and its bottom and top. */
type Box = [string, [number, number][], number, number];

/** An upright box from its min and max corners (x, y, z). */
const box = (name: string, min: [number, number, number], max: [number, number, number]): Box => [name, [[min[0], min[2]], [max[0], min[2]], [max[0], max[2]], [min[0], max[2]]], min[1], max[1]];

/**
 * Every face she can walk along stands PROUD (0.08 m) of the furthest thing behind it: her
 * controller also touches what is a few centimetres behind a face, and the end of a closed cupboard
 * door there stopped her dead (the galley's, measured 2026-10-13: it was most of "she sticks to the
 * crew quarters' walls").
 */
const BOXES: Box[] = [
  // Cargo hold. The sledge's and the chests' boxes meet, and end flush with each other (owner).
  box('sledge', [1.7, CARGO, -15.69], [3.74, LOWER_CEILING, -14.24]),
  box('chests', [3.74, CARGO, -15.69], [4.91, 1.72, -14.24]),
  box('lamp', [4.06, 1.72, -14.63], [4.21, 2.02, -14.47]),
  // Engineering: the slope up to the window starts at z = -20.45.
  box('window slope', [2.4, CARGO, -21.8], [5.6, LOWER_CEILING, -20.45]),
  // Crew quarters.
  box('crew: galley and bunks', [1.8, CREW, -17.45], [2.85, CREW_TOP, -13.3]),
  box('crew: lockers', [2.85, CREW, -13.61], [3.98, CREW_TOP, -12.9]),
  // The corner toward the galley is cut off (owner): the benches and the table step back there. The
  // cut stands 0.08 m proud of the table's foot, the nearest thing to it (at 4.37, -15.14).
  ['crew: table and benches', [[3.98, -14.86], [4.72, -15.6], [6.4, -15.6], [6.4, -12.9], [3.98, -12.9]], CREW, CREW_TOP],
  box('crew: wall by the trapdoor', [5.91, CREW, -17.45], [6.4, CREW_TOP, -15.6]),
  box('crew: bulkhead, galley side', [2.85, CREW, -17.6], [3.52, CREW_TOP, -17.27]),
  box('crew: bulkhead, trapdoor side', [4.49, CREW, -17.6], [5.91, CREW_TOP, -17.27]),
];

export interface CollisionBoxes {
  /** Per frame: shown with the colliders, on or off with the setting. */
  update: () => void;
  names: string[];
}

export function createCollisionBoxes(scene: THREE.Scene, physics: Physics): CollisionBoxes {
  const group = new THREE.Group();
  group.name = 'collision boxes';
  const material = new THREE.LineBasicNodeMaterial({ color: 0x33ddff });
  const colliders = BOXES.map(([name, outline, bottom, top]) => {
    // Its edges: the outline at the bottom and at the top, and an upright at each corner.
    const points: number[] = [];
    outline.forEach(([x, z], n) => {
      const [nx, nz] = outline[(n + 1) % outline.length]!;
      points.push(x, bottom, z, nx, bottom, nz, x, top, z, nx, top, nz, x, bottom, z, x, top, z);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(geometry, material);
    lines.name = name;
    group.add(lines);
    return physics.addStaticPrism(outline, bottom, top, false);
  });
  scene.add(group);
  let on = true;
  return {
    names: BOXES.map(([name]) => name),
    update: () => {
      group.visible = settings.showColliders && settings.collisionBoxes;
      if (on === settings.collisionBoxes) return;
      on = settings.collisionBoxes;
      for (const collider of colliders) collider.setEnabled(on);
    },
  };
}
