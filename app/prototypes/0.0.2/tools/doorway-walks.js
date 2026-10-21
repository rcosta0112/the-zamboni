// Through the cockpit's doorway as the player walks it (item 55): `npm run probe -- tools/doorway-walks.js`
// (in app/), about 80 s. The game's own movement (W held, the camera's yaw set), the door open (it opens
// from its panels only: `autoDoors` is off, owner 2026-10-13). From 1.6 m away on each side, at five angles to the doorway (−40° to
// 40°) and aiming at three points across it (its centre and 0.2 m to each side): does she get
// through, and does she stop before she's 0.25 m past it (moving under 0.3 m/s for more than 0.25 s while W
// is held)? Then out of the doorway from its centre at steep angles (±50°, ±65°: she slides along
// the frame and passes its corner), the same test. Falling through the open trapdoor beside the door (from the crew quarters at 40°) is
// as the game has it.
const physics = w.__physics;
const character = w.__character;
const view = w.__view;
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const put = (p) => {
  physics.teleport(p);
  character.position.copy(p);
  character.verticalVelocity = 0;
  character.speed = 0;
  character.velocity.set(0, 0, 0);
};
const doors = ship.doors.filter((d) => d.id.startsWith('cockpit-door'));
const box = doors.reduce((b, d) => b.union(new T.Box3().setFromObject(d.hinge)), new T.Box3());
const centre = box.getCenter(new T.Vector3());
const floorY = ship.upperFloorY;
for (const d of doors) d.open = true;
await until(() => doors.every((d) => d.amount === 1), 4000);
const results = [];
for (const side of [1, -1]) { // 1: from the crew quarters (+z), -1: from the cockpit
  for (const angle of [-40, -20, 0, 20, 40]) {
    for (const aim of [-0.2, 0, 0.2]) {
      const a = T.MathUtils.degToRad(angle);
      const target = new T.Vector3(centre.x + aim, floorY, centre.z);
      // In the cockpit the corridor is short (its front wall 1.2 m from the doorway): start 0.8 m away there.
      const distance = side === 1 ? 1.6 : 0.8;
      const start = new T.Vector3(target.x + Math.sin(a) * distance, floorY + 0.02, target.z + side * Math.cos(a) * distance);
      if (!physics.fits(start)) { results.push({ side: side === 1 ? 'crew→cockpit' : 'cockpit→crew', angle, aim, result: 'start blocked' }); continue; }
      put(start);
      const dx = target.x - start.x, dz = target.z - start.z;
      view.yaw = Math.atan2(-dx, -dz);
      view.pitch = 0.15;
      character.facing = view.yaw;
      await wait(400);
      key('KeyW', true);
      let slow = 0, longest = 0, stuckAt = null, last = performance.now();
      const was = character.position.clone();
      const t0 = last;
      while (performance.now() - t0 < 1800) {
        await wait(16);
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        // Her real movement, not the speed she means to go at (that stays up against a wall).
        const moved = Math.hypot(character.position.x - was.x, character.position.z - was.z);
        was.copy(character.position);
        const ahead = side === 1 ? character.position.z > centre.z - 0.25 : character.position.z < centre.z + 0.25;
        if (now - t0 > 300 && ahead && moved < 0.3 * dt) {
          slow += dt;
          if (slow > longest) { longest = slow; stuckAt = character.position.clone(); }
        } else slow = 0;
      }
      key('KeyW', false);
      await wait(150);
      const end = character.position;
      const through = side === 1 ? end.z < centre.z - 0.25 : end.z > centre.z + 0.25;
      results.push({
        side: side === 1 ? 'crew→cockpit' : 'cockpit→crew', angle, aim,
        result: through ? (longest > 0.25 ? 'through, after a stop' : 'through') : 'NOT through',
        stopped: longest > 0.25 ? `${longest.toFixed(2)} s at ${stuckAt.toArray().map((v) => v.toFixed(2)).join(', ')}` : undefined,
        end: end.toArray().map((v) => +v.toFixed(2)),
      });
    }
  }
}
// Out of the doorway from its centre, at steep angles: along the frame and past its corner.
for (const side of [1, -1]) {
  for (const angle of [-65, -50, 50, 65]) {
    const start = new T.Vector3(centre.x, floorY + 0.02, centre.z);
    put(start);
    const a = T.MathUtils.degToRad(angle);
    view.yaw = Math.atan2(-Math.sin(a), -side * Math.cos(a));
    view.pitch = 0.15;
    character.facing = view.yaw;
    await wait(400);
    key('KeyW', true);
    const was = character.position.clone();
    let slow = 0, longest = 0, stuckAt = null, last = performance.now();
    const t0 = last;
    while (performance.now() - t0 < 1000) {
      await wait(16);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const moved = Math.hypot(character.position.x - was.x, character.position.z - was.z);
      was.copy(character.position);
      const near = Math.abs(character.position.z - centre.z) < 0.6; // the cockpit's corridor ends 1.2 m in: its corner isn't counted
      if (now - t0 > 250 && near && moved < 0.3 * dt) {
        slow += dt;
        if (slow > longest) { longest = slow; stuckAt = character.position.clone(); }
      } else slow = 0;
    }
    key('KeyW', false);
    await wait(150);
    results.push({
      side: side === 1 ? 'doorway→crew' : 'doorway→cockpit', angle, aim: 0,
      result: longest > 0.25 ? 'STOPPED by the frame' : 'out',
      stopped: longest > 0.25 ? `${longest.toFixed(2)} s at ${stuckAt.toArray().map((v) => v.toFixed(2)).join(', ')}` : undefined,
      end: character.position.toArray().map((v) => +v.toFixed(2)),
    });
  }
}
for (const d of doors) d.open = false;
return { doorway: centre.toArray().map((v) => +v.toFixed(3)), rows: results.map((r) => `${r.side} ${String(r.angle).padStart(3)}° aim ${String(r.aim).padStart(4)}: ${r.result}${r.stopped ? ' (' + r.stopped + ')' : ''} → ${r.end ?? ''}`) };
