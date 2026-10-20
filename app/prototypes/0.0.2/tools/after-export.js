// The check after a taken export (robust exports, item 48, pass B; plan:
// doc/plans/features/robust-exports.md). Run by export.mjs when the dev server is up; by hand, in app/:
//
//     npm run probe -- tools/after-export.js
//
// About 30 s. Returns one "PASS …" / "FAIL …" line per check: every door opens and comes back to
// its rest pose; the collider covers the hull (rays from outside hit it where the hull is drawn);
// the crew are in the ship, Dr. Kaufman on the couch; the ladder's foot is clear; she walks from
// the cargo bay into engineering. Runs in the page (probe-01.mjs): `w`, `T`, `ship`, `wait`, `until`.

const settings = w.__settings;
const character = w.__character;
const physics = w.__physics;
const view = w.__view;
const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const fmt = (v) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
const put = (p) => {
  physics.teleport(p);
  character.position.copy(p);
  character.verticalVelocity = 0;
  character.speed = 0;
  character.velocity.set(0, 0, 0);
};
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const yawToward = (dx, dz) => Math.atan2(-dx, -dz);
const part = (blenderName) => {
  let found = null;
  ship.object.traverse((o) => {
    if (!found && o.userData.name === blenderName) found = o;
  });
  return found;
};
const DOWN = new T.Vector3(0, -1, 0);
const autoDoors = settings.autoDoors;

// --- Every door opens and comes back to its rest pose ------------------------------------------
{
  settings.autoDoors = false;
  put(new T.Vector3(0, 0.05, 0));
  await wait(300);
  const initially = ship.doors.map((d) => d.open);
  const all = (v) => ship.doors.every((d) => d.amount === v);
  const pose = (d) => {
    d.object.updateWorldMatrix(true, false);
    const p = new T.Vector3();
    const q = new T.Quaternion();
    d.object.matrixWorld.decompose(p, q, new T.Vector3());
    return { p, q };
  };
  const off = (a, b) => Math.max(a.p.distanceTo(b.p), a.q.angleTo(b.q));
  for (const d of ship.doors) d.open = false;
  const shut = await until(() => all(0), 5000);
  const rest = ship.doors.map(pose);
  for (const d of ship.doors) d.open = true;
  const opened = await until(() => all(1), 5000);
  const still = ship.doors.filter((d, i) => off(pose(d), rest[i]) < 0.01).map((d) => d.name);
  for (const d of ship.doors) d.open = false;
  const back = await until(() => all(0), 5000);
  const notBack = ship.doors.filter((d, i) => off(pose(d), rest[i]) > 1e-4).map((d) => d.name);
  for (const [i, d] of ship.doors.entries()) d.open = initially[i];
  settings.autoDoors = autoDoors;
  report(shut && opened && back && !still.length && !notBack.length, `all ${ship.doors.length} doors open and come back to their rest pose`,
    `all shut: ${shut}; all open: ${opened}${still.length ? `; didn't move: ${still.join(', ')}` : ''}; all shut again: ${back}${notBack.length ? `; not back at rest: ${notBack.join(', ')}` : ''}`);
}

// --- The collider covers the hull --------------------------------------------------------------
{
  const hull = part('Hull_Merged');
  if (!hull) {
    report(false, 'the collider covers the hull', 'no "Hull_Merged" in the ship');
  } else {
    hull.updateWorldMatrix(true, true);
    const box = new T.Box3().setFromObject(hull);
    const centre = box.getCenter(new T.Vector3());
    const far = box.getSize(new T.Vector3()).length();
    const raycaster = new T.Raycaster();
    raycaster.layers.enableAll();
    const rays = [];
    // Eight from round the sides at mid-height, two from above.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rays.push({ name: `side ${i * 45}°`, dir: new T.Vector3(-Math.cos(a), 0, -Math.sin(a)), at: centre.clone() });
    }
    const along = box.max.x - box.min.x > box.max.z - box.min.z ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
    for (const s of [-0.25, 0.25]) rays.push({ name: `above ${s < 0 ? 'one end' : 'the other'}`, dir: DOWN.clone(), at: centre.clone().addScaledVector(along, s * box.getSize(new T.Vector3()).dot(along)) });
    const missed = [];
    let tried = 0;
    for (const r of rays) {
      const from = r.at.clone().addScaledVector(r.dir, -far);
      raycaster.set(from, r.dir);
      raycaster.far = far * 2;
      // (Recursive: a mesh with several materials is a group of meshes.)
      const drawn = raycaster.intersectObject(hull, true)[0];
      if (!drawn) continue;
      tried++;
      const hit = physics.ray(from, r.dir, far * 2, true);
      if (!hit || hit.distance > drawn.distance + 0.15) missed.push(`${r.name} (drawn at ${drawn.distance.toFixed(2)}, collider ${hit ? hit.distance.toFixed(2) : 'none'})`);
    }
    report(tried >= 8 && !missed.length, 'the collider covers the hull', `${tried} rays reach the drawn hull${missed.length ? `; the collider isn't there for ${missed.join(', ')}` : ', the collider meets every one'}`);
  }
}

// --- The crew are in the ship, Dr. Kaufman on the couch ----------------------------------------
{
  const crew = w.__crew?.();
  if (!crew) {
    report(false, 'the crew are where they were', 'no crew loaded');
  } else {
    const boxes = new Map();
    crew.object.updateWorldMatrix(true, true);
    crew.object.traverse((o) => {
      if (!o.isMesh) return;
      let name;
      for (let n = o; n && !name; n = n.parent) name = n.userData.character;
      if (name) boxes.set(name, (boxes.get(name) ?? new T.Box3()).union(new T.Box3().setFromObject(o)));
    });
    const outside = [...boxes].filter(([, b]) => !ship.interior.containsPoint(b.getCenter(new T.Vector3()))).map(([n]) => n);
    const couch = part('Couch');
    const kaufman = boxes.get('Dr. Kaufman');
    const onCouch = !!(couch && kaufman && new T.Box3().setFromObject(couch).intersectsBox(kaufman));
    report(boxes.size === 4 && !outside.length && onCouch, 'the crew are in the ship, Dr. Kaufman on the couch',
      `${boxes.size} characters (${[...boxes.keys()].join(', ')})${outside.length ? `; outside the ship: ${outside.join(', ')}` : ''}; Dr. Kaufman on the couch: ${onCouch}${couch ? '' : ' (no "Couch")'}`);
  }
}

// --- The ladder's foot is clear -------------------------------------------------------------
{
  const ladder = w.__ladders?.()?.list?.[0];
  if (!ladder) {
    report(false, "the ladder's foot is clear", 'no ladder');
  } else {
    const foot = ladder.bottom.clone().addScaledVector(ladder.face, -0.45);
    foot.y += 0.02;
    report(physics.fits(foot), "the ladder's foot is clear", `she fits standing at ${fmt(foot)}`);
  }
}

// --- She walks from the cargo bay into engineering ----------------------------------------------
{
  const leaves = ship.doors.filter((d) => /Engineering/.test(d.name) && d.auto);
  const ramp = part('Door Cargo');
  if (leaves.length !== 2 || !ramp) {
    report(false, 'she walks from the cargo bay into engineering', `engineering's door leaves: ${leaves.map((d) => d.name).join(', ') || 'none'}; ramp: ${!!ramp}`);
  } else {
    settings.autoDoors = true;
    const zone = leaves[0].zone;
    const centre = zone.getCenter(new T.Vector3());
    const across = zone.max.x - zone.min.x < zone.max.z - zone.min.z ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
    const side = (p) => (p.x - centre.x) * across.x + (p.z - centre.z) * across.z;
    // The cargo bay is on the ramp's side of the bulkhead; she walks to the other side.
    const way = -Math.sign(side(new T.Box3().setFromObject(ramp).getCenter(new T.Vector3())));
    const stand = (distance) => {
      const p = centre.clone().addScaledVector(across, distance).setY(zone.min.y + 0.6);
      const floor = physics.ray(p, DOWN, 3, true);
      p.y -= floor ? floor.distance : 0.6;
      return p;
    };
    const start = stand(-way * (settings.autoDoorDistance + 1));
    const past = settings.autoDoorDistance + 0.4;
    put(start);
    view.yaw = yawToward(way * across.x, way * across.z);
    view.pitch = 0.15;
    key('KeyW', true);
    await wait(80);
    key('KeyW', false);
    await wait(300);
    put(start);
    const aim = centre.clone().addScaledVector(across, way * 6);
    key('KeyW', true);
    const t0 = performance.now();
    while (performance.now() - t0 < 9000 && way * side(character.position) < past) {
      view.yaw = yawToward(aim.x - character.position.x, aim.z - character.position.z);
      await wait(30);
    }
    key('KeyW', false);
    const through = way * side(character.position) >= past;
    settings.autoDoors = autoDoors;
    report(through, 'she walks from the cargo bay into engineering', `from ${fmt(start)} to ${fmt(character.position)} (${(way * side(character.position)).toFixed(2)} m past the door; ${past.toFixed(2)} needed)`);
  }
}

return results;
