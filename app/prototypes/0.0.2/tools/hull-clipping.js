// Objects that reach into the hull's wall (between its two skins), for fixing in Blender (owner,
// 2026-10-15). `npm run probe -- tools/hull-clipping.js` (in app/), about 40 s. Run by probe-01.mjs.
// Lists each see-through object with how many of its vertices (sampled, up to ~400 per mesh) lie in
// the wall, worst first. Caveat: in the crew quarters the hull has only its outer skin (the room's
// inner surface is the walls and bunks), so everything there counts as "in the wall".
const hull = ship.hullUnit;
const dirs = [new T.Vector3(0, 1, 0), new T.Vector3(1, 0.13, 0.07).normalize(), new T.Vector3(-1, 0.11, -0.05).normalize()];
const ray = new T.Ray(), local = new T.Ray();
const crossings = (p, d) => {
  ray.set(p, d);
  const hits = [];
  for (const t of hull.targets) {
    local.copy(ray).applyMatrix4(t.toLocal);
    for (const h of t.bvh.raycast(local, T.DoubleSide, 0, 30 * t.scale)) hits.push(h.distance / t.scale);
  }
  hits.sort((a, b) => a - b);
  return hits.filter((x, i) => i === 0 || x - hits[i - 1] > 0.002).length;
};
const v = new T.Vector3();
const out = [];
let tested = 0;
for (const unit of ship.cutUnits) {
  if (unit === hull) continue;
  let inWall = 0, total = 0;
  for (const m of unit.meshes) {
    const pos = m.geometry.getAttribute('position');
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      total++;
      if (dirs.every((d) => crossings(v, d) % 2 === 1)) inWall++;
    }
  }
  tested += total;
  if (inWall > 0) out.push([inWall / total, `${unit.object.name || '(part of ' + unit.object.parent?.name + ')'}: ${inWall} of ${total} vertices${unit.shell ? ' [shell]' : unit.lining ? ' [inner part, drawn]' : ''}`]);
}
out.sort((a, b) => b[0] - a[0]);
return { units: ship.cutUnits.length, verticesTested: tested, objectsInWall: out.length, list: out.map((o) => o[1]) };
