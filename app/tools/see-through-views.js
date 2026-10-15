// The see-through check while the rules are rebuilt (owner, 2026-10-14: lots of small changes,
// fewer tests): `npm run see-through` (in app/), about 30 s. Stands her in the aisle of each room,
// takes screenshots from two sides with the camera high (outside the hull) and one from inside, and
// lists what's drawn. Screenshots in app/.export/see-through/ (not in git). Run by probe-01.mjs.

const physics = w.__physics, character = w.__character, view = w.__view, settings = w.__settings;
const DOWN = new T.Vector3(0, -1, 0);
const centre = ship.interior.getCenter(new T.Vector3());
// By its name, or its parent's (a part with something hanging on it has its mesh in a child).
const unitNamed = (name) => ship.cutUnits.find((u) => u.object.name === name || (u.object.name === '' && u.object.parent?.name === name));
const put = (p) => {
  physics.teleport(p);
  character.position.copy(p);
  character.verticalVelocity = 0;
  character.speed = 0;
  character.velocity.set(0, 0, 0);
};
// Each room by an object in it: she stands on the ship's centre line, level with it.
const rooms = [
  ['cargo', 'Pallet', 0],
  ['engineering', 'Contraption', 0],
  ['crew-quarters', 'Table', 1],
  ['cockpit', 'Seat', 1],
];
const views = [
  ['a', 0.8, 0.7],
  ['b', 0.8 + Math.PI, 0.7],
  ['low', 0.8, 0.15],
];
const found = [];
for (const [room, object, deck] of rooms) {
  const unit = unitNamed(object);
  if (!unit) {
    found.push(`${room}: no "${object}"`);
    continue;
  }
  const at = new T.Box3().setFromObject(unit.object).getCenter(new T.Vector3());
  // Just above the deck's floor, so the ray finds the floor, not furniture (the cargo floor is
  // 0.3 m above the interior's bottom).
  // Off the centre line if furniture stands there: the lowest floor found.
  let feet = null;
  for (const dx of [0, 0.7, -0.7, 1.2, -1.2]) {
    const from = new T.Vector3(centre.x + dx, (deck ? ship.upperFloorY : ship.interior.min.y + 0.3) + 0.4, at.z);
    const hit = physics.ray(from, DOWN, 1.5, true);
    if (hit && hit.distance > 0.05 && (!feet || from.y - hit.distance < feet.y)) feet = from.clone().setY(from.y - hit.distance);
  }
  if (!feet) {
    found.push(`${room}: no floor found`);
    continue;
  }
  put(feet);
  for (const [name, yaw, pitch] of views) {
    view.yaw = yaw;
    view.pitch = pitch;
    await wait(1500);
    await shot(`${room}-${name}`);
  }
  found.push(`${room}: feet ${feet.toArray().map((v) => v.toFixed(2)).join(', ')}`);
}
const drawn = ship.cutUnits.filter((u) => u.meshes[0].userData.cutSolid !== -1);
return {
  stage: settings.seeThroughStage,
  rooms: found,
  drawn: `${drawn.length} of ${ship.cutUnits.length}`,
  objects: drawn.map((u) => u.object.name || `(part of ${u.object.parent?.name})`).sort(),
};
