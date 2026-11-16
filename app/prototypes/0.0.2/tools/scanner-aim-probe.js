// The scanner aimed (pass 3, doc/plans/features/gadgets-scanner.md): while she scans, `Body` turns the
// scanner onto the closest interaction point in reach (`scannerReach`), up and down too; her facing
// is untouched; facing away, nothing is aimed at. In the ship (the checks' `landed`), at the side
// door's keypad. In app/:
//
//     npm run probe -- tools/scanner-aim-probe.js
//     node tools/probe-01.mjs tools/scanner-aim-probe.js --shots .export/scanner-aim

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const character = w.__character, physics = w.__physics, view = w.__view, gadgets = w.__gadgets, interaction = w.__interaction();
const settings = w.__settings;
const model = character.model;
const ray = model.object.getObjectByName('Scanner_Ray') ?? model.object.getObjectByName('Scanner Ray');
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const tap = async (code) => { key(code, true); await wait(60); key(code, false); };
const right = (down) => window.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', { button: 2 }));
const f = (n) => n.toFixed(2);

const NAME = 'Side_Door_Keypad';
const item = interaction.items.find((i) => i.name === NAME);
if (!item) return [`FAIL  no ${NAME}`];
const centre = new T.Box3().setFromObject(item.objects[0]).getCenter(new T.Vector3());
const DOWN = new T.Vector3(0, -1, 0);
/** A spot `r` m from the keypad where she fits, facing `off` radians to the side of it. */
const place = async (off) => {
  for (let r = 0.6; r < 1.0; r += 0.1) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const at = centre.clone().add(new T.Vector3(Math.sin(a) * r, 0.3, Math.cos(a) * r));
      const hit = physics.ray(at, DOWN, 2.5, true);
      if (!hit) continue;
      const spot = at.clone().setY(at.y - hit.distance + 0.02);
      if (!physics.fits(spot)) continue;
      physics.teleport(spot); character.position.copy(spot); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0);
      character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z)) + off;
      await wait(500);
      if (interaction.inReach.some((p) => p.name === NAME)) return spot;
    }
  }
  return null;
};

const wobble = settings.scannerAimWobble;
settings.scannerAimWobble = 0; // the miss measured without the random scan on top
const spot = await place(0.5); // ~29° to her right of it
report(Boolean(spot), `she stands where ${NAME} is in the scanner's reach`, spot ? spot.toArray().map(f).join(', ') : `in reach: ${interaction.inReach.map((p) => p.name).join(', ')}`);
if (!spot) { settings.scannerAimWobble = wobble; return results; }
view.yaw = character.facing + 0.6; view.pitch = 0.2;
const facing = character.facing;

await tap('Digit2');
await until(() => gadgets.held >= 1, 2000);
await wait(300);
report(model.scanAim.target === null, 'held, not on: nothing aimed at', JSON.stringify(model.scanAim));
right(true);
await until(() => gadgets.scan >= 1, 2000);
await wait(1500);
const aim = model.scanAim;
const target = interaction.inReach.find((p) => p.name === aim.target);
report(Boolean(target), 'on: aimed at something in reach', JSON.stringify(aim) + ` in reach: ${interaction.inReach.map((p) => p.name).join(', ')}`);
report(Math.abs(aim.yaw) > 5, 'the body turned toward it', `yaw ${f(aim.yaw)}°, pitch ${f(aim.pitch)}°`);
if (target) {
  // How far the ray's line passes from the point.
  const o = ray.getWorldPosition(new T.Vector3());
  const d = model.scannerRay.axis.clone().applyQuaternion(ray.getWorldQuaternion(new T.Quaternion())).normalize();
  const to = target.point.clone().sub(o);
  const miss = to.clone().sub(d.clone().multiplyScalar(to.dot(d))).length();
  report(miss < 0.05 && to.dot(d) > 0, 'the ray passes through its point (within 5 cm)', `miss ${(miss * 100).toFixed(1)} cm, ${f(to.length())} m away`);
}
report(Math.abs(character.facing - facing) < 1e-6, 'her facing untouched', `${f(facing)} → ${f(character.facing)}`);
await shot('1-aimed');

// Turned right away: nothing in front, eased back.
character.facing = facing + Math.PI;
await wait(1500);
report(model.scanAim.target === null && Math.abs(model.scanAim.yaw) < 3, 'facing away: nothing aimed at, the turn eased back', JSON.stringify(model.scanAim));
await shot('2-away');
character.facing = facing;
await wait(1200);
settings.scannerAimWobble = wobble;
// Walking past it while aimed: the legs keep her path (her facing as she walks).
key('KeyW', true);
await wait(600);
const walking = model.scanAim;
const legs = ['Leg_l', 'Leg_r'].map((n) => model.object.getObjectByName(n));
key('KeyW', false);
report(legs.every(Boolean), 'her legs found (turned back under the aim)', legs.map((l) => l?.name).join(', '));
results.push(`INFO  walking: ${JSON.stringify(walking)}`);
right(false);
await until(() => gadgets.scan === 0, 2000);
await wait(200);
report(model.scanAim.target === null, 'let go: nothing aimed at');
await tap('Digit2');
return results;
