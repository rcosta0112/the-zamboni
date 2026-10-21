// Where she gets stuck on the upper deck (item 55, pass 1): `npm run probe -- tools/stuck-sweep.js`
// (in app/). The cockpit's door and the trapdoor are opened first; everything else as the game has it.
// Runs her capsule straight through Rapier, frame by frame at 60 Hz, synchronously (the game's loop
// doesn't run in between), then puts her back:
// 1. reach: a 0.25 m grid over the ship's inside at the upper floor; from the start (the cockpit's
//    doorway) she walks to each neighbouring cell; a cell is reached if she ends there on the
//    upper floor. The map shows every cell she can reach (the owner: she stays in the corridor).
// 2. from every reached cell, eight directions, 0.6 s each at the indoor speed; reported:
//    - snag: she stops (under 30 % of the way for 4 frames) against something she should slide
//      along (the contact faces less than 45° against her way), or against nothing;
//    - lifted: her feet rise more than 4 cm above where she started (a step up onto something);
//    - trapped: no direction gets her 0.2 m away.
//    Contacts with the floor under her don't count; cells where she doesn't fit at the centre are skipped.
// Each finding names what she touched: a collision box, a door, or the nearest drawn object to the
// contact (the ship's collider is one mesh). Prints the map and the findings grouped by object.
// `ship` is the probe's (w.__ship()).
const physics = w.__physics;
const character = w.__character;
const rapier = physics.controller;
const STEP = 0.25;
const DT = 1 / 60;
const SPEED = 3.5;
const DIRS = [...Array(8)].map((_, i) => new T.Vector2(Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)));
const floorY = ship.upperFloorY;

// Doors open: the cockpit's (both leaves) and the trapdoor.
const opened = [];
for (const door of ship.doors) {
  if (door.id.startsWith('cockpit-door') || door.id === 'floor-hatch') {
    opened.push({ door, was: door.open });
    door.open = true;
  }
}
await until(() => opened.every(({ door }) => door.amount === 1), 4000);
await wait(200);

// What a contact is: a box, a door, a crew member, or the nearest drawn object.
const boxes = ship.boxes.map((m) => ({ name: m.name, box: new T.Box3().setFromObject(m).expandByScalar(0.05) }));
const doors = ship.doors.map((d) => ({ name: d.name, box: new T.Box3().setFromObject(d.hinge).expandByScalar(0.05) }));
const crew = (w.__crew?.()?.object.children ?? []).map((root) => ({ name: root.name, box: new T.Box3().setFromObject(root, true).expandByScalar(0.05) })).filter((c) => !c.box.isEmpty());
const drawn = [];
for (const unit of ship.cutUnits) for (const mesh of unit.meshes) if (mesh.geometry.boundsTree) drawn.push({ name: unit.object.name, mesh, box: new T.Box3().setFromObject(mesh).expandByScalar(0.1) });
const local = new T.Vector3();
const inverse = new T.Matrix4();
const nearestDrawn = (p) => {
  let best = null;
  for (const d of drawn) {
    if (!d.box.containsPoint(p)) continue;
    inverse.copy(d.mesh.matrixWorld).invert();
    local.copy(p).applyMatrix4(inverse);
    const hit = d.mesh.geometry.boundsTree.closestPointToPoint(local, {}, 0, 0.1);
    if (hit && (!best || hit.distance < best.distance)) best = { name: d.name, distance: hit.distance };
  }
  return best ? best.name : 'unknown (nothing drawn within 0.1 m)';
};
const SHAPES = { 1: 'cuboid', 6: 'trimesh', 9: 'convex' }; // RAPIER.ShapeType ids that matter here
const what = (collision) => {
  const p = new T.Vector3(collision.witness1.x, collision.witness1.y, collision.witness1.z);
  const kind = SHAPES[collision.collider.shape.type] ?? `shape ${collision.collider.shape.type}`;
  const inBox = (list) => list.find((b) => b.box.containsPoint(p))?.name;
  if (kind === 'convex') return `box/door: ${inBox(boxes) ?? inBox(doors) ?? 'the ramp? ' + nearestDrawn(p)}`;
  if (kind === 'cuboid') return `cuboid: ${inBox(crew) ?? inBox(doors) ?? 'lid? ' + nearestDrawn(p)}`;
  return nearestDrawn(p);
};

// Her state, to put back.
const saved = { feet: physics.feet.clone(), position: character.position.clone() };
const centre = new T.Vector3();
const place = (x, z) => {
  physics.teleport(new T.Vector3(x, floorY + 0.02, z));
  for (let i = 0; i < 3; i++) physics.move(new T.Vector3(0, -0.03, 0)); // settle on the floor
};
/** Walk `frames` frames along `dir`; returns where she ended and what stopped her. */
const walk = (dir, frames, stopAfter = frames) => {
  const start = physics.feet.clone();
  let blocked = 0, snag = null, lifted = 0, travelled = 0, touched = null, under = null;
  const desired = new T.Vector3();
  for (let f = 0; f < frames; f++) {
    desired.set(dir.x * SPEED * DT, -0.05, dir.y * SPEED * DT);
    physics.move(desired);
    const h = Math.hypot(physics.moved.x, physics.moved.z);
    travelled += h;
    if (physics.feet.y - start.y > lifted + 0.01) {
      lifted = physics.feet.y - start.y;
      // What she stepped onto: the nearest drawn object just under her feet.
      under = nearestDrawn(physics.feet.clone().add(new T.Vector3(0, -0.03, 0)));
    }
    if (h < 0.3 * SPEED * DT) {
      blocked++;
      if (blocked >= 4 && !snag) {
        // Head-on (the contact faces her way within 45°): a wall she's meant to stop at.
        const n = rapier.numComputedCollisions();
        let headOn = false, cause = null;
        const c = physics.capsule.translation();
        for (let i = 0; i < n; i++) {
          const col = rapier.computedCollision(i);
          if (!col) continue;
          // The floor under her: not what stops her.
          if (col.witness1.y < physics.feet.y + 0.05) continue;
          touched ??= what(col);
          const away = new T.Vector2(c.x - col.witness1.x, c.z - col.witness1.z);
          if (away.lengthSq() < 1e-8) continue;
          away.normalize();
          if (away.dot(dir) < -0.7) headOn = true;
          cause ??= what(col);
        }
        if (!headOn) snag = { cause: cause ?? 'nothing touched', at: physics.feet.clone() };
        if (headOn || f >= stopAfter) break;
      }
    } else blocked = 0;
  }
  return { end: physics.feet.clone(), travelled, snag, lifted, touched, under };
};

// 1. Reach, from the cockpit's doorway.
const cockpitDoors = ship.doors.filter((d) => d.id.startsWith('cockpit-door'));
const doorway = cockpitDoors.reduce((b, d) => b.union(new T.Box3().setFromObject(d.hinge)), new T.Box3()).getCenter(new T.Vector3());
const inside = ship.interior;
const nx = Math.ceil((inside.max.x - inside.min.x) / STEP), nz = Math.ceil((inside.max.z - inside.min.z) / STEP);
const cellOf = (x, z) => [Math.round((x - inside.min.x) / STEP), Math.round((z - inside.min.z) / STEP)];
const at = (i, j) => [inside.min.x + i * STEP, inside.min.z + j * STEP];
const key = (i, j) => i + ',' + j;
const reached = new Map();
const queue = [cellOf(doorway.x, doorway.z)];
reached.set(key(...queue[0]), true);
const onUpperFloor = () => physics.grounded && Math.abs(physics.feet.y - floorY) < 0.3;
place(...at(...queue[0]));
if (!onUpperFloor()) return { error: 'the start (the cockpit doorway) is not on the upper floor', feet: physics.feet.toArray(), floorY };
while (queue.length) {
  const [i, j] = queue.shift();
  for (const d of DIRS) {
    const ni = i + Math.round(d.x), nj = j + Math.round(d.y);
    if (ni < 0 || nj < 0 || ni > nx || nj > nz || reached.has(key(ni, nj))) continue;
    place(...at(i, j));
    const [tx, tz] = at(ni, nj);
    const dir = new T.Vector2(tx - physics.feet.x, tz - physics.feet.z);
    const frames = Math.ceil(dir.length() / (SPEED * DT));
    walk(dir.normalize(), frames);
    if (Math.hypot(physics.feet.x - tx, physics.feet.z - tz) < 0.1 && onUpperFloor()) {
      reached.set(key(ni, nj), true);
      queue.push([ni, nj]);
    }
  }
}

// 2. Eight directions from every reached cell.
const findings = [];
for (const k of reached.keys()) {
  const [i, j] = k.split(',').map(Number);
  // A cell she reached only near its centre may not fit her at its centre (against a door's frame).
  if (!physics.fits(new T.Vector3(at(i, j)[0], floorY, at(i, j)[1]))) continue;
  let furthest = 0;
  const touchedAll = new Set();
  for (const d of DIRS) {
    place(...at(i, j));
    const from = physics.feet.clone();
    const r = walk(d, 36);
    furthest = Math.max(furthest, Math.hypot(r.end.x - from.x, r.end.z - from.z));
    if (r.touched) touchedAll.add(r.touched);
    if (r.snag) findings.push({ kind: 'snag', cell: k, dir: d, cause: r.snag.cause, at: r.snag.at });
    if (r.lifted > 0.04) findings.push({ kind: 'lifted', cell: k, dir: d, cause: r.under, rise: r.lifted, at: r.end });
  }
  if (furthest < 0.2) findings.push({ kind: 'trapped', cell: k, cause: [...touchedAll].sort().join(' + ') || 'nothing', at: new T.Vector3(at(i, j)[0], floorY, at(i, j)[1]) });
}

// Put things back.
physics.teleport(saved.feet);
character.position.copy(saved.position);
character.velocity.set(0, 0, 0);
character.verticalVelocity = 0;
for (const { door, was } of opened) door.open = was;

// The map, top view: x across, z down. '.' reached, 'S' a snag starts here, 'L' lifted, 'T' trapped, 'D' the start.
const mark = new Map();
for (const f of findings) mark.set(f.cell, f.kind === 'trapped' ? 'T' : mark.get(f.cell) === 'S' ? 'S' : f.kind === 'snag' ? 'S' : 'L');
const rows = [];
let iMin = Infinity, iMax = -1, jMin = Infinity, jMax = -1;
for (const k of reached.keys()) { const [i, j] = k.split(',').map(Number); iMin = Math.min(iMin, i); iMax = Math.max(iMax, i); jMin = Math.min(jMin, j); jMax = Math.max(jMax, j); }
for (let j = jMin; j <= jMax; j++) {
  let row = '';
  for (let i = iMin; i <= iMax; i++) row += key(i, j) === key(...cellOf(doorway.x, doorway.z)) ? 'D' : mark.get(key(i, j)) ?? (reached.has(key(i, j)) ? '.' : ' ');
  rows.push(`${at(iMin, j)[1].toFixed(2).padStart(7)} ${row}`);
}
const groups = {};
for (const f of findings) {
  const g = (groups[`${f.kind}: ${f.cause}`] ??= { count: 0, cells: new Set(), example: null, rise: 0 });
  g.count++;
  g.cells.add(f.cell);
  g.rise = Math.max(g.rise, f.rise ?? 0);
  g.example ??= { feet: f.at.toArray().map((v) => +v.toFixed(3)), dir: f.dir ? [+f.dir.x.toFixed(2), +f.dir.y.toFixed(2)] : null };
}
w.__sweep = { findings, reached: [...reached.keys()], at, STEP };
return {
  floorY: +floorY.toFixed(3),
  grid: { x0: +at(iMin, 0)[0].toFixed(2), step: STEP, cells: reached.size },
  map: rows,
  findings: Object.fromEntries(Object.entries(groups).sort((a, b) => b[1].count - a[1].count).map(([k, g]) => [k, { count: g.count, cells: [...g.cells].join(' '), rise: g.rise ? +g.rise.toFixed(2) : undefined, example: g.example }])),
};
