// The ladder's fixed moments (ladders.ts `TRAPDOOR_AT`, `RUNG_TIMES`), measured from the climbing
// animation: run again if the clip, the ladder, the trapdoor or `doorSeconds` changes.
// `npm run probe -- tools/ladder-times.js` (in app/), about 40 s. Run by probe-01.mjs.
// One climb with the trapdoor closed (it doesn't open: TRAPDOOR_AT is set out of reach), recording
// her hands and her skinned vertices each frame; then:
// - her hands: a hand lands when it stops rising after a reach (below the floor above + 0.15 m;
//   higher, she's standing up);
// - the lid: for each start time to try, the lid posed as it would be at each frame (its opening
//   eased, as doors.ts) and her vertices of that frame tested against its box, in its own space.
// Prints the hand contacts and the latest start at which the lid touches nothing of her.
const ladders = w.__ladders();
const character = w.__character;
const physics = w.__physics;
const ladder = ladders.list[0];
const hatch = w.__entity('floor-hatch');
const door = hatch.components.find((c) => 'open' in c && 'amount' in c);
const keep = ladders.trapdoorAt;
ladders.trapdoorAt = Infinity;
door.open = false;
await until(() => door.amount === 0, 3000);
const put = (p) => { physics.teleport(p); character.position.copy(p); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0); };
put(ladder.bottom.clone().addScaledVector(ladder.face, -0.5).add(new T.Vector3(0, 0.05, 0)));
await until(() => character.grounded, 2000);
await wait(300);

// The lid's box in its own space (the trapdoor's object), shut.
hatch.object.updateMatrixWorld(true);
const toLid = new T.Matrix4().copy(hatch.object.matrixWorld).invert();
const lidBox = new T.Box3();
hatch.object.traverse((o) => {
  if (!o.isMesh) return;
  o.geometry.computeBoundingBox();
  lidBox.union(o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(toLid, o.matrixWorld)));
});
const model = character.model.object;
const bone = (n) => { let b = null; model.traverse((o) => { if (o.name === n) b = o; }); return b; };
const hands = { left: bone('Hand_l'), right: bone('Hand_r') };
const skinned = [];
model.traverse((o) => { if (o.isSkinnedMesh && o.visible) skinned.push(o); });
const STARTS = [];
for (let s = 0; s <= 2.5; s += 1 / 48) STARTS.push(s);
const touched = new Map(); // start → the first frame at which the lid touches her, and where
const frames = []; // { t, points } while she's near the lid
const v = new T.Vector3();
const lidAt = (amount) => {
  door.amount = amount;
  door.pose();
  hatch.object.updateMatrixWorld(true);
  return new T.Matrix4().copy(hatch.object.matrixWorld).invert();
};
const floorAbove = ladder.top.y;
const handRows = [];

ladders.interactables[0].act();
await new Promise((resolve) => {
  let seen = false;
  const tick = () => {
    const s = ladders.state;
    if (s.is === 'clip') {
      seen = true;
      const t = s.t;
      handRows.push({ t, left: hands.left.getWorldPosition(new T.Vector3()).y, right: hands.right.getWorldPosition(new T.Vector3()).y });
      // Her vertices (world), sampled.
      const points = [];
      for (const m of skinned) {
        const pos = m.geometry.getAttribute('position');
        const step = Math.max(1, Math.floor(pos.count / 1500));
        for (let i = 0; i < pos.count; i += step) {
          m.getVertexPosition(i, v);
          points.push(v.clone().applyMatrix4(m.matrixWorld));
        }
      }
      if (Math.min(...points.map((p) => p.y)) < floorAbove + 0.2) frames.push({ t, points });
    }
    if (s.is === 'off' && seen) return resolve();
    requestAnimationFrame(tick);
  };
  tick();
});
ladders.trapdoorAt = keep;
// What the open lid touches (or comes within NEAR_OPEN of), it touches whenever it starts: left out
// of the choice, and printed.
const NEAR_OPEN = 0.05;
const inOpen = lidAt(1);
const scale = new T.Vector3();
hatch.object.matrixWorld.decompose(new T.Vector3(), new T.Quaternion(), scale);
const nearBox = lidBox.clone().expandByVector(new T.Vector3(NEAR_OPEN / scale.x, NEAR_OPEN / scale.y, NEAR_OPEN / scale.z));
const openTouches = [];
for (const frame of frames) {
  const inside = frame.points.filter((p) => nearBox.containsPoint(v.copy(p).applyMatrix4(inOpen)));
  if (inside.length) openTouches.push({ t: +frame.t.toFixed(3), points: inside.length, at: inside[0].toArray().map((x) => +x.toFixed(3)) });
  frame.points = frame.points.filter((p) => !inside.includes(p));
}
for (const { t, points } of frames) {
  for (const start of STARTS) {
    if (touched.has(start)) continue;
    const k = Math.min(1, Math.max(0, (t - start) / w.__settings.doorSeconds));
    const inv = lidAt(k);
    const hit = points.find((p) => lidBox.containsPoint(v.copy(p).applyMatrix4(inv)));
    if (hit) touched.set(start, { t: +t.toFixed(3), amount: +k.toFixed(2), at: hit.toArray().map((x) => +x.toFixed(3)) });
  }
}
lidAt(0);

const contacts = [];
for (const side of ['left', 'right']) {
  let reaching = false;
  for (let i = 2; i < handRows.length; i++) {
    const a = handRows[i - 2], b = handRows[i];
    if (b.t <= a.t) continue;
    const speed = (b[side] - a[side]) / (b.t - a.t);
    if (speed > 0.8) reaching = true;
    if (reaching && speed < 0.15) {
      reaching = false;
      if (b[side] < floorAbove + 0.15) contacts.push({ side, t: +b.t.toFixed(3), frame: +(b.t * 24).toFixed(1), y: +b[side].toFixed(3) });
    }
  }
}
contacts.sort((a, b) => a.t - b.t);
const clear = STARTS.filter((s) => !touched.has(s));
const firstTouch = STARTS.find((s) => touched.has(s));
const latest = clear.filter((s) => firstTouch === undefined || s < firstTouch).pop();
const detail = (s) => (s === undefined ? null : { start: +s.toFixed(3), ...touched.get(s) });
return {
  lid: { min: lidBox.min.toArray().map((x) => +x.toFixed(3)), max: lidBox.max.toArray().map((x) => +x.toFixed(3)) },
  openLidTouches: openTouches.length ? { frames: openTouches.length, first: openTouches[0], last: openTouches[openTouches.length - 1] } : 'none',
  touches: { earliestStart: detail(firstTouch), start1: detail(STARTS.find((s) => s >= 1 && touched.has(s))) },
  hands: contacts,
  trapdoor: latest === undefined ? 'every start tried touches her' : { latestStart: +latest.toFixed(3), frame: +(latest * 24).toFixed(1), doorSeconds: w.__settings.doorSeconds, inUse: keep },
  frames: handRows.length,
};
