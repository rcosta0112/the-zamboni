// Characters look at each other while she talks (plan doc/plans/features/look-at-each-other.md, pass 1).
// In the checks' game: she talks to Dr. Kaufman (seated on the couch) from in front and to her left:
// Kaufman's head turns toward her, her body a little; Dr. Green turns her whole body to face her.
// After the box ends it, both turn back to where they faced. Then Adam Blue in the front
// seat, she in the aisle behind: only the listening turn (the head about 15° toward her side, no body). In app/:
//
//     npm run probe -- tools/look-probe.js
//     node tools/probe-01.mjs tools/look-probe.js --shots .export/look   (with screenshots)
//
// The bones are checked too (2026-11-07: the crew's were missed by name, `Head_2`…, and only the
// look's own numbers were read). Returns one "PASS …" / "FAIL …" line per check, and the crew's facings.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const look = w.__look(), ch = w.__character, physics = w.__physics, story = w.__story(), dialogue = w.__dialogue, view = w.__view;
const deg = (r) => (r * 180) / Math.PI;
const f = (n) => n.toFixed(1);
const press = async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  await wait(250);
};
const end = async () => {
  for (let i = 0; i < 20 && dialogue.active; i++) await press();
  await wait(2000); // the turn back (lookEaseBack, 0.8 s) and the cooldown
};
const put = async (spot) => {
  physics.teleport(spot); ch.position.copy(spot); ch.velocity.set(0, 0, 0); ch.speed = 0; ch.verticalVelocity = 0;
  await wait(500);
};
/** The angle (degrees) from her facing to the way to Kaufman, about the vertical. */
const herOff = (kPos) => {
  const to = kPos.clone().sub(ch.position); to.y = 0; to.normalize();
  const fwd = new T.Vector3(-Math.sin(ch.facing), 0, -Math.cos(ch.facing));
  return deg(Math.atan2(fwd.z * to.x - fwd.x * to.z, fwd.dot(to)));
};
/** The follow camera looking past her toward Kaufman, `side` degrees round from straight behind her. */
const frame = (kPos, side) => {
  const v = kPos.clone().sub(ch.position); v.y = 0; v.normalize().applyAxisAngle(new T.Vector3(0, 1, 0), (side * Math.PI) / 180);
  view.yaw = Math.atan2(-v.x, -v.z); view.pitch = (15 * Math.PI) / 180;
};

if (!look) return ['FAIL  no look (her model has no Body bone?)'];
await wait(500);
const kaufman = w.__entity('kaufman').object;
const kPos = kaufman.getWorldPosition(new T.Vector3());
const fwd = look.facing('kaufman');
report(!!fwd, 'Kaufman has a rig');
const shipObject = ship.object;
const local = (v) => v.clone().transformDirection(shipObject.matrixWorld.clone().invert());
for (const id of ['kaufman', 'ogawa', 'adam-red', 'adam-blue']) {
  const v = local(look.facing(id));
  results.push(`INFO  ${id} faces (ship space) ${f(v.x)}, ${f(v.y)}, ${f(v.z)}`);
}
for (const id of ['kaufman', 'ogawa', 'adam-red', 'adam-blue']) {
  const b = look.state(id).bones;
  report(b.length === 4 && /^Head/.test(b[0]) && /^Body/.test(b[1]), `${id}: head, body and legs found`, b.join(', '));
}
/** The head's turn against the body as drawn (the bones themselves, not the look's numbers). */
const headInBody = (id) => {
  let head = null, body = null;
  w.__entity(id).object.traverse((o) => { if (o.isBone && /^Head(_\d+)?$/.test(o.name)) head = o; if (o.isBone && /^Body(_\d+)?$/.test(o.name)) body = o; });
  return body.getWorldQuaternion(new T.Quaternion()).invert().multiply(head.getWorldQuaternion(new T.Quaternion()));
};
const turnedBy = (a, b) => f((a.angleTo(b) * 180) / Math.PI);
const vg = local(look.facing('green'));
results.push(`INFO  green faces (ship space) ${f(vg.x)}, ${f(vg.y)}, ${f(vg.z)}`);

// In front of her, 30° to her left, 1.3 m.
const front = kPos.clone().add(fwd.clone().applyAxisAngle(new T.Vector3(0, 1, 0), (30 * Math.PI) / 180).multiplyScalar(1.3));
await put(front);
ch.facing += Math.PI / 2; // away from Kaufman first, so her turn shows
await wait(200);
const facingBefore = ch.facing;
look.set(['green', 'kaufman']);
story.run('talk_kaufman');
await wait(1000);
let k = look.state('kaufman');
report(k.head > 10 && k.head < 40 && k.body > 3 && k.body <= 15.01, 'in front, to her left: Kaufman\'s head and body turn toward her', `head ${f(k.head)}°, body ${f(k.body)}°, pitch ${f(k.pitch)}°`);
report(Math.abs(herOff(kPos)) < 12, 'Dr. Green has turned to face Kaufman', `${f(herOff(kPos))}° off`);
frame(kPos, 50);
await wait(800);
await shot('front');
const kDuring = headInBody('kaufman');
await end();
report(+turnedBy(kDuring, headInBody('kaufman')) > 12, 'Kaufman’s head bone turned against her body while talking, back after', `${turnedBy(kDuring, headInBody('kaufman'))}°`);
k = look.state('kaufman');
report(Math.abs(k.head) < 1 && Math.abs(k.body) < 1, 'after the conversation, Kaufman back', `head ${f(k.head)}°, body ${f(k.body)}°`);
report(Math.abs(ch.facing - facingBefore) < 0.02, 'Dr. Green turned back to where she faced', `${f(deg(ch.facing - facingBefore))}° from it`);

// The cockpit: Adam Blue in the front seat, she in the aisle behind them and a little to their right.
const adam = w.__entity('adam-blue').object;
const aPos = adam.getWorldPosition(new T.Vector3());
const aFwd = look.facing('adam-blue');
const behind = aPos.clone().add(aFwd.clone().applyAxisAngle(new T.Vector3(0, 1, 0), (-155 * Math.PI) / 180).multiplyScalar(1.1));
await put(behind);
look.set(['green', 'adam-blue']);
story.run('talk_adam_blue');
await wait(1000);
let a = look.state('adam-blue');
report(Math.abs(Math.abs(a.head) - w.__settings.lookListenDeg) < 1.5 && a.head < 0 && Math.abs(a.body) < 0.5, 'Adam Blue seated, she behind to their right: the listening turn only, toward their right', `head ${f(a.head)}°, body ${f(a.body)}°`);
frame(aPos, 35);
await wait(800);
await shot('behind');
const aDuring = headInBody('adam-blue');
await end();
report(+turnedBy(aDuring, headInBody('adam-blue')) > 10, 'Adam Blue’s head bone turned while talking, back after', `${turnedBy(aDuring, headInBody('adam-blue'))}°`);
a = look.state('adam-blue');
report(Math.abs(a.head) < 1, 'after it, Adam Blue back', `head ${f(a.head)}°`);
const o = look.state('ogawa');
report(Math.abs(o.head) < 0.5, 'nobody else turned (Ogawa)', `head ${f(o.head)}°`);
return results;
