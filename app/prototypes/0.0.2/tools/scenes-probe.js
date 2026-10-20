// The scenes (the game's structure, pass 2): starts each test scene and reads what its setup says:
// the doors' and the ramp's states, where she is, where Dr. Kaufman is, what's switched off. In app/:
//
//     npm run probe -- tools/scenes-probe.js
//     node tools/probe-01.mjs tools/scenes-probe.js --shots <folder>    (a screenshot per scene)
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const fmt = (v) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
const director = w.__director();
const open = (id) => w.__entity(id)?.components[0]?.open;
const amount = (id) => w.__entity(id)?.components[0]?.amount;
const kaufman = () => w.__entity('kaufman')?.object;
const atBlender = ([x, y, z]) => ship.object.localToWorld(new T.Vector3(x, z, -y));

report(director?.current === 'opening', 'the game starts in opening', `current: ${director?.current}`);
const home = kaufman()?.getWorldPosition(new T.Vector3());
report(Boolean(home), 'Dr. Kaufman is an entity with a root', home ? fmt(home) : 'no entity "kaufman"');

for (const id of ['later', 'opening', 'later']) {
  await director.start(id);
  await wait(2000);
  await shot(`scene-${id}`);
  const data = await (await fetch(`/test/scenes/${id}.json`)).json();
  const feet = w.__character.position;
  const want = atBlender(data.player.at);
  const near = Math.hypot(feet.x - want.x, feet.z - want.z) < 0.3;
  const states = data.setup.filter((c) => c.do === 'set').map((c) => `${c.id} ${c.state} → ${open(c.id) ? 'open' : 'closed'} (${amount(c.id)})`);
  const statesOk = data.setup.filter((c) => c.do === 'set').every((c) => open(c.id) === (c.state === 'open') && amount(c.id) === (c.state === 'open' ? 1 : 0));
  // Everything not named by the setup is at its kind's default: closed (the automatic doors aside: she may be near one).
  const named = new Set(data.setup.map((c) => c.id));
  const others = ship.doors.filter((d) => !named.has(d.id) && !d.auto && d.open).map((d) => d.id);
  report(statesOk && others.length === 0, `${id}: the doors and the ramp as its setup says`, `${states.join('; ')}; others open: ${others.join(', ') || 'none'}`);
  report(near, `${id}: she starts where it says`, `feet ${fmt(feet)}, asked ${fmt(want)}`);
  const place = data.setup.find((c) => c.do === 'place' && c.id === 'kaufman');
  const k = kaufman().getWorldPosition(new T.Vector3());
  const kWant = place ? atBlender(place.at) : home;
  report(k.distanceTo(kWant) < 0.01, `${id}: Dr. Kaufman ${place ? 'moved' : 'where she was exported'}`, `at ${fmt(k)}, expected ${fmt(kWant)}`);
  const off = [...w.__interaction().disabled];
  const wantOff = data.setup.filter((c) => c.do === 'disable').map((c) => c.id);
  report(off.join() === wantOff.join(), `${id}: switched off: ${wantOff.join(', ') || 'nothing'}`, `off: ${off.join(', ') || 'nothing'}`);
}
return results;
