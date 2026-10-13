// Scripted check of prototype 01 (`npm run smoke`, in app/): drives it in headless Chrome and
// prints one PASS / FAIL line per check, from the "Done when" lists in doc/plans/backlog-passes.md.
// No dependencies: Chrome's DevTools protocol over Node's own WebSocket (Node 22), Vite's own API
// for the dev server (it uses the one already running on port 5201 if there is one). The checks
// run inside the page, through the dev hooks on `window` (main.ts) and simulated keys.
// Chrome is started by browser.mjs (set CHROME_PATH to use another). No gamepad: keyboard only.
// To try one check out, or look at one thing: probe-01.mjs.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { answers, findChrome, openBrowser, useStartButton } from './browser.mjs';

const URL_01 = 'http://localhost:5201/';
const PROTOTYPE = resolve(dirname(fileURLToPath(import.meta.url)), '../prototypes/01-walk');

// ---------------------------------------------------------------------------------------------
// The checks. This function runs in the page: it can't use anything from this file.
// ---------------------------------------------------------------------------------------------
async function checks() {
  const w = /** @type {any} */ (window);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (test, ms) => {
    const start = performance.now();
    while (!test() && performance.now() - start < ms) await wait(30);
    return test();
  };
  let failed = 0;
  const report = (ok, name, detail) => {
    if (!ok) failed++;
    console.log(`[smoke] ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
  };

  if (!(await until(() => w.__ship?.() && w.__ladders?.() && w.__interaction?.(), 60000))) {
    report(false, 'the ship loads', 'no ship after 60 s');
    return failed;
  }
  const T = w.__THREE;
  const settings = w.__settings;
  // Off in the game for now (owner, 2026-10-13); the code is kept, so it's still checked here.
  settings.autoDoors = true;
  const character = w.__character;
  const physics = w.__physics;
  const view = w.__view;
  const ship = w.__ship();
  const ladders = w.__ladders();
  const interaction = w.__interaction();
  const items = interaction.items;
  const prompt = document.querySelector('#prompt');

  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const tap = async (code) => {
    key(code, true);
    await wait(80);
    key(code, false);
    await wait(80);
  };
  const put = (p) => {
    physics.teleport(p);
    character.position.copy(p);
    character.verticalVelocity = 0;
    character.speed = 0;
  };
  /** The camera's yaw that makes "forward" (W) this direction on the ground. */
  const yawToward = (dx, dz) => Math.atan2(-dx, -dz);
  const boxOf = (item) => {
    const box = new T.Box3();
    for (const o of item.objects) box.union(new T.Box3().setFromObject(o));
    return box;
  };
  const fmt = (v) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
  const door = (name) => ship.doors.find((d) => d.name === name);
  const DOWN = new T.Vector3(0, -1, 0);
  const inside = ship.interior.getCenter(new T.Vector3());

  /** Stand her in front of an item (toward the middle of the ship), looking at it; true once it's the target. */
  const aimAt = async (item) => {
    const centre = boxOf(item).getCenter(new T.Vector3());
    const away = new T.Vector3(inside.x - centre.x, 0, inside.z - centre.z);
    // Along the axis the item's wall faces: the larger part of the way to the middle of the ship.
    if (Math.abs(away.x) > Math.abs(away.z)) away.z = 0;
    else away.x = 0;
    away.normalize();
    const feet = centre.clone().addScaledVector(away, 0.55);
    const floor = physics.ray(feet, DOWN, 3, true);
    feet.y -= floor ? floor.distance : 0;
    put(feet);
    view.yaw = yawToward(-away.x, -away.z);
    for (let pitch = 0; pitch <= 1.0; pitch += 0.1) {
      view.pitch = pitch;
      await wait(120);
      if (interaction.target === item) return true;
    }
    return false;
  };

  // --- Camera (16, 17) -------------------------------------------------------------------------
  settings.cargoRampOpen = true;
  await until(() => ship.rampAmount === 1, 4000);
  put(new T.Vector3(0, 0.05, 0));
  view.yaw = 0;
  view.pitch = 0.15;
  await wait(1200);
  const outdoors = view.distance;
  report(Math.abs(outdoors - settings.cameraDistanceOutdoors) < 0.01, 'camera distance outdoors', `${outdoors.toFixed(2)} m (setting ${settings.cameraDistanceOutdoors})`);
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 300 }));
  document.querySelector('#view').dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true }));
  await wait(200);
  report(view.distance === outdoors, 'the mouse wheel does not zoom', `${view.distance.toFixed(2)} m after a wheel turn`);
  view.pitch = -0.5;
  await wait(100);
  report(settings.cameraMinPitchDeg === 0 && view.pitch >= 0, 'minimum pitch is 0', `pitch ${T.MathUtils.radToDeg(view.pitch).toFixed(1)}° after asking for -28.6°`);
  // Up the open ramp into the cargo bay, on foot.
  const rampMouth = new T.Vector3(inside.x, 0.05, ship.interior.max.z + 6);
  put(rampMouth);
  view.yaw = yawToward(0, -1);
  view.pitch = 0.15;
  await wait(300);
  let wasOutside = !ship.interior.containsPoint(character.position.clone().setY(character.position.y + settings.cutTargetHeight));
  key('KeyW', true);
  const cameIn = await until(() => ship.interior.containsPoint(character.position.clone().setY(character.position.y + settings.cutTargetHeight)), 8000);
  await wait(250);
  const midway = view.distance;
  key('KeyW', false);
  await wait(1200);
  report(wasOutside && cameIn, 'she walks up the open ramp into the ship', `now at ${fmt(character.position)}`);
  report(cameIn && Math.abs(view.distance - settings.cameraDistanceIndoors) < 0.01 && midway !== outdoors && Math.abs(midway - settings.cameraDistanceIndoors) > 0.01, 'camera distance changes at the ramp, eased', `${outdoors.toFixed(2)} → ${midway.toFixed(2)} (0.25 s in) → ${view.distance.toFixed(2)} m (setting ${settings.cameraDistanceIndoors})`);

  // --- The cargo ramp, from its keypad (9) -----------------------------------------------------
  const rampPad = items.find((i) => i.objects[0].userData.controls === 'Door Cargo');
  const sidePad = items.find((i) => i.objects[0].userData.controls === 'Door');
  const rampTop = () => new T.Box3().setFromObject(ship.ramp).max.y;
  if (!rampPad || !(await aimAt(rampPad))) {
    report(false, 'the ramp keypad can be aimed at', rampPad ? `target: ${interaction.target?.name ?? 'none'}` : 'no keypad controls "Door Cargo"');
  } else {
    const openTop = rampTop();
    const shown = prompt.textContent;
    await tap('KeyE');
    const closed = await until(() => ship.rampAmount === 0, 4000);
    const travel = T.MathUtils.radToDeg(Math.abs(ship.rampClosedAngle - ship.rampOpenAngle));
    const closedTop = rampTop();
    report(closed && travel > 60 && closedTop - openTop > 1, 'the ramp closes from its keypad', `prompt "${shown}"; turned ${travel.toFixed(0)}°; its top edge ${openTop.toFixed(2)} → ${closedTop.toFixed(2)} m`);
    await wait(200);
    const shownClosed = prompt.textContent;
    await tap('KeyE');
    const opened = await until(() => ship.rampAmount === 1, 4000);
    report(opened && Math.abs(rampTop() - openTop) < 0.01, 'the ramp opens from its keypad', `prompt "${shownClosed}"; top edge back at ${rampTop().toFixed(2)} m`);
  }

  // --- The side door (3) -----------------------------------------------------------------------
  const side = door('Door');
  const offered = items.filter((i) => i.objects.includes(side?.object));
  report(side !== undefined && offered.length === 0, 'the side door is not a target itself', side ? `${offered.length} targets on it` : 'no door named "Door"');
  if (side && sidePad && (await aimAt(sidePad))) {
    // Look around from the keypad: whatever is targeted, it's never the door.
    const seen = new Set();
    const yaw = view.yaw;
    for (let a = -1.2; a <= 1.2; a += 0.2) {
      for (const pitch of [0, 0.4, 0.8]) {
        view.yaw = yaw + a;
        view.pitch = pitch;
        await wait(60);
        seen.add(interaction.target ? `${interaction.target.name} "${prompt.textContent}"` : 'nothing');
      }
    }
    report(![...seen].some((s) => s.startsWith('Door ')), 'looking around at the side door: no prompt for it', `seen: ${[...seen].join('; ')}`);
    await aimAt(sidePad);
    await tap('KeyE');
    const opened = await until(() => side.amount === 1, 3000);
    await tap('KeyE');
    const closed = await until(() => side.amount === 0, 3000);
    report(opened && closed, 'the side door opens and closes from its keypad');
  } else {
    report(false, 'the side door keypad can be aimed at', `target: ${interaction.target?.name ?? 'none'}`);
  }

  // --- The ladder (4, 5, 31): up and down, held at the top, off it by the player's own push -------
  const ladder = ladders.list[0];
  const foot = ladder.bottom.clone().addScaledVector(ladder.face, -0.45);
  const keys = (down, ...codes) => codes.forEach((c) => key(c, down));
  /** From the floor at its foot, up to this share of the way (1: the top), still pushing. */
  const climbTo = async (share) => {
    keys(false, 'KeyW', 'KeyA', 'KeyS', 'KeyD');
    put(foot);
    view.yaw = yawToward(ladder.face.x, ladder.face.z);
    view.pitch = 0.3;
    await wait(300);
    key('KeyW', true);
    return until(() => ladders.state.is === 'on' && ladders.state.s >= share, 6000);
  };
  const offLadder = () => until(() => ladders.state.is === 'off' && character.grounded && character.floating === 0, 3000);
  const onDeck = () => character.grounded && Math.abs(character.position.y - ladder.top.y) < 0.15;
  const onCargoFloor = () => character.grounded && Math.abs(character.position.y - ladder.bottom.y) < 0.15;
  {
    // Held at the top for as long as she pushes toward the ladder, or doesn't push.
    const up = await climbTo(1);
    await wait(800);
    const pushing = ladders.state.is === 'on' && ladders.state.s === 1 && Math.abs(character.position.y - ladder.top.y) < 0.02;
    key('KeyW', false);
    await wait(500);
    report(up && pushing && ladders.state.is === 'on', 'the ladder is climbed, and she is held at its top', `climbed: ${up}; held while pushing: ${pushing}; held at rest: ${ladders.state.is === 'on'}; at ${fmt(character.position)}`);

    // Off the top by her own push: back and to the side there is floor, 10 times in a row each.
    for (const [name, code] of [['to the side', 'KeyA'], ['back', 'KeyS']]) {
      const problems = [];
      for (let i = 1; i <= 10; i++) {
        await climbTo(1);
        key('KeyW', false);
        await wait(150);
        key(code, true);
        await wait(700);
        key(code, false);
        await offLadder();
        if (!onDeck() || ladders.state.colliding[0]) problems.push(`${i}: at ${fmt(character.position)}, ladder collides ${ladders.state.colliding[0]}`);
      }
      report(problems.length === 0, `pushing ${name} at the top, she floats onto the floor above, 10 times in a row`, problems.join('; ') || `ends at ${fmt(character.position)}; the ladder doesn't collide while she's up there`);
    }

    // From the floor above (behind the opening, where pushing back left her) into the opening: she
    // drops to the cargo floor, past the ladder.
    key('KeyW', true);
    let attachedAbove = false;
    let lowestStop = Infinity;
    const start = performance.now();
    while (performance.now() - start < 4000 && !onCargoFloor()) {
      if (ladders.state.is !== 'off' && character.position.y > ladder.bottom.y + 0.5) attachedAbove = true;
      if (character.grounded && character.position.y < ladder.top.y - 0.3) lowestStop = Math.min(lowestStop, character.position.y);
      await wait(30);
    }
    key('KeyW', false);
    await wait(300);
    report(!attachedAbove && onCargoFloor(), 'she drops through the open trapdoor, without landing on the ladder', `lands at ${fmt(character.position)} (cargo floor ${ladder.bottom.y.toFixed(2)}); attached on the way: ${attachedAbove}${lowestStop < Infinity && lowestStop > ladder.bottom.y + 0.3 ? `; STOOD at ${lowestStop.toFixed(2)} on the way` : ''}`);
    key('KeyS', true);
    await wait(700);
    key('KeyS', false);
    const back = await until(() => ladders.state.colliding[0], 1000);
    report(back, 'the ladder collides again once she is clear of it on the cargo floor', `at ${fmt(character.position)}`);

    // Part of the way up, pushing away climbs down, and at the foot walks her off.
    await climbTo(0.5);
    key('KeyW', false);
    const height = character.position.y;
    key('KeyS', true);
    let fell = false;
    let last = height;
    const t0 = performance.now();
    while (performance.now() - t0 < 5000 && ladders.state.is === 'on') {
      if (last - character.position.y > 0.1) fell = true; // faster than climbing
      last = character.position.y;
      await wait(30);
    }
    await wait(400);
    key('KeyS', false);
    const walked = Math.hypot(character.position.x - ladder.bottom.x, character.position.z - ladder.bottom.z);
    report(!fell && ladders.state.is === 'off' && onCargoFloor() && walked > 0.3, 'pushing away climbs down the ladder, and walks her off at its foot', `from ${height.toFixed(2)} m; dropped: ${fell}; ends ${walked.toFixed(2)} m from its foot at ${fmt(character.position)}`);

    // Jump is a jump: part of the way up she falls back down; near the top, pushing back, she lands above.
    await climbTo(0.5);
    key('KeyW', false);
    const from = character.position.y;
    await tap('Space');
    let peak = from;
    const t1 = performance.now();
    while (performance.now() - t1 < 1500) {
      peak = Math.max(peak, character.position.y);
      await wait(16);
    }
    report(peak - from > settings.indoorJumpHeight * 0.7 && ladders.state.is === 'off' && onCargoFloor(), 'jump part of the way up the ladder: she jumps, and falls to the cargo floor', `rose ${(peak - from).toFixed(2)} m from ${from.toFixed(2)}; ends at ${fmt(character.position)}`);
    await climbTo(0.85);
    key('KeyW', false);
    key('Space', true);
    key('KeyS', true);
    await wait(80);
    key('Space', false);
    await wait(800);
    key('KeyS', false);
    await offLadder();
    report(onDeck(), 'jump near the top of the ladder, pushing back: she lands on the floor above', `ends at ${fmt(character.position)}`);
  }

  // --- The roof hatch (22) ---------------------------------------------------------------------
  const top = door('Top_Hatch');
  const bottom = door('Top_Hatch_Bottom');
  const hatch = items.filter((i) => i.objects.includes(top?.object) || i.objects.includes(bottom?.object));
  if (!top || !bottom || hatch.length !== 1) {
    report(false, 'the roof hatch is one target', `${hatch.length} targets for its two parts`);
  } else {
    // It's out of her reach from the floor (see doc/features/interaction.md): a longer reach and a
    // wider aim, for this check only.
    const keep = { reach: settings.interactReach, angle: settings.interactMaxAngleDeg };
    settings.interactReach = 4;
    settings.interactMaxAngleDeg = 180;
    const under = boxOf(hatch[0]).getCenter(new T.Vector3());
    const floor = physics.ray(under.clone().setY(under.y - 0.5), DOWN, 5, true);
    under.y -= 0.5 + (floor ? floor.distance : 0);
    put(under);
    view.pitch = 1.2;
    // With that reach the cockpit door's panel is a candidate too, and nearer the screen centre
    // (the camera can't look up): nothing else is offered meanwhile.
    const others = items.filter((i) => i !== hatch[0]).map((i) => [i, i.available]);
    for (const [i] of others) i.available = () => false;
    const aimed = await until(() => interaction.target === hatch[0], 1500);
    const shown = prompt.textContent;
    await tap('KeyE');
    const opened = await until(() => top.amount === 1 && bottom.amount === 1, 3000);
    await tap('KeyE');
    const closed = await until(() => top.amount === 0 && bottom.amount === 0, 3000);
    for (const [i, available] of others) i.available = available;
    settings.interactReach = keep.reach;
    settings.interactMaxAngleDeg = keep.angle;
    report(aimed && opened && closed, 'one press moves both parts of the roof hatch', `target "${hatch[0].name}", prompt "${shown}"; both open: ${opened}; both closed again: ${closed}`);
  }

  // --- The prompt next to the target (23) ------------------------------------------------------
  report(settings.highlight === 0, 'the highlight is off by default', `highlight ${settings.highlight}`);
  if (rampPad && (await aimAt(rampPad))) {
    const onScreen = () => {
      const c = boxOf(rampPad).getCenter(new T.Vector3()).project(view.camera);
      return { x: (c.x * 0.5 + 0.5) * innerWidth, y: (-c.y * 0.5 + 0.5) * innerHeight };
    };
    const samples = [];
    const offsets = [];
    const places = [];
    const yaw = view.yaw;
    let insideScreen = true;
    for (const a of [-0.5, 0, 0.5]) {
      view.yaw = yaw + a;
      await wait(250);
      if (interaction.target !== rampPad) continue;
      const t = onScreen();
      const r = prompt.getBoundingClientRect();
      const px = r.left + r.width / 2;
      const py = r.top + r.height / 2;
      offsets.push(Math.hypot(px - t.x, py - t.y));
      places.push(t.x);
      if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) insideScreen = false;
      samples.push(`keypad at ${t.x.toFixed(0)},${t.y.toFixed(0)} → prompt at ${px.toFixed(0)},${py.toFixed(0)}`);
    }
    view.yaw = yaw;
    await wait(100);
    // The keypad moved across the screen, and the prompt stayed the same short way from it.
    const follows = samples.length === 3 && Math.max(...places) - Math.min(...places) > 40 && Math.max(...offsets) - Math.min(...offsets) < 30 && Math.max(...offsets) < 160;
    report(follows && insideScreen, 'the prompt follows the target on screen', `${samples.join('; ')} (screen ${innerWidth}×${innerHeight})`);
  } else {
    report(false, 'the prompt follows the target on screen', 'the ramp keypad could not be aimed at');
  }

  // --- Pass 2: the re-export from the reference file (12, 18, 19, 20) --------------------------
  const part = (blenderName) => {
    let found = null;
    ship.object.traverse((o) => {
      if (!found && o.userData.name === blenderName) found = o;
    });
    return found;
  };
  const worldBox = (blenderName) => {
    const o = part(blenderName);
    return o ? new T.Box3().setFromObject(o) : null;
  };
  const shipScale = ship.object.scale.x;
  report(Math.abs(ship.rampClosedAngle) < 0.001, 'the ramp is closed in the file', `closed at ${T.MathUtils.radToDeg(ship.rampClosedAngle).toFixed(1)}° from the file's pose`);

  /** Walk from `from` in a straight line on the ground for `ms`; where she ends up. */
  const walk = async (from, dx, dz, ms) => {
    put(from);
    view.yaw = yawToward(dx, dz);
    view.pitch = 0.15;
    await wait(300);
    key('KeyW', true);
    await wait(ms);
    key('KeyW', false);
    await wait(200);
    return character.position.clone();
  };
  const hull = worldBox('Hull_Merged');
  if (!hull) {
    report(false, 'she cannot walk under the hull', 'no "Hull_Merged" in the ship');
  } else {
    // From the side with no door, at the middle of the hull's length, toward its centre line.
    const centre = hull.getCenter(new T.Vector3());
    const half = (hull.max.x - hull.min.x) / 2;
    const end = await walk(new T.Vector3(hull.min.x - 2, 0.05, centre.z), 1, 0, 3500);
    const reached = (centre.x - end.x) / half;
    report(reached > 0.75 && reached < 1.1 && end.y > -0.02, 'she cannot walk under the hull', `stopped at ${(reached * 100).toFixed(0)}% of the hull's half-width from its centre line (feet at ${fmt(end)})`);
  }
  for (const name of ['Turbine.001', 'Turbine.002']) {
    const box = worldBox(name);
    if (!box) {
      report(false, `she cannot walk under the front thruster ${name}`, 'not in the ship');
      continue;
    }
    // From the outer side, toward the hull.
    const centre = box.getCenter(new T.Vector3());
    const outward = Math.sign(centre.x - inside.x);
    const end = await walk(new T.Vector3(centre.x + outward * ((box.max.x - box.min.x) / 2 + 2), 0.05, centre.z), -outward, 0, 3500);
    const reached = ((end.x - centre.x) * outward) / ((box.max.x - box.min.x) / 2);
    report(reached > 0.4 && end.y > -0.02, `she cannot walk under the front thruster ${name}`, `stopped at ${(reached * 100).toFixed(0)}% of its half-width from its centre; feet at height ${end.y.toFixed(3)} m`);
  }

  const display = worldBox('Monitor Arm.031');
  if (!display || !hull) {
    report(false, 'the engineering display is in the room', 'no "Monitor Arm.031" in the ship');
  } else {
    // Posed, the arm reaches 0.4 Blender units out from the wall; in its rest pose (the bug) 0.23, inside the wall.
    const reach = (display.max.x - display.min.x) / shipScale;
    const fromHull = Math.min(display.min.x - hull.min.x, hull.max.x - display.max.x) / shipScale;
    report(reach > 0.35 && fromHull > 0.15, 'the engineering display is in the room', `reaches ${reach.toFixed(2)} out, starting ${fromHull.toFixed(2)} in from the hull's side (Blender units)`);
  }

  const cuttable = [];
  ship.object.traverse((o) => {
    if (o.isMesh && o.material.name.endsWith('(cuttable)') && !cuttable.includes(o.material)) cuttable.push(o.material);
  });
  const sides = () => cuttable.filter((m) => m.side === T.DoubleSide).length;
  const single = settings.singleSided;
  settings.singleSided = true;
  await wait(100);
  const doubleWhenSingle = sides();
  settings.singleSided = false;
  await wait(100);
  const doubleWhenDouble = sides();
  settings.singleSided = single;
  await wait(100);
  report(single === true && doubleWhenSingle === 0 && doubleWhenDouble === cuttable.length && cuttable.length > 0, 'single-sided materials, with a switch', `${cuttable.length} see-through materials: ${doubleWhenSingle} double-sided with the switch on, ${doubleWhenDouble} with it off`);

  // --- Pass 3: lighting (10) --------------------------------------------------------------------
  const glassTriangles = ship.glassShadowCaster.geometry.getAttribute('position').count / 3;
  report(settings.sunThroughGlass && glassTriangles > 0 && ship.glassShadowCaster.castShadow === false && ship.shadowCaster.castShadow === true, 'the sun gets in through the glass', `${glassTriangles} glass triangles cast no shadow; the rest of the ship does`);
  const metals = cuttable.filter((m) => m.metalness >= 0.5 && !m.transparent);
  report(metals.length > 0 && metals.every((m) => m.envNode) && cuttable.filter((m) => m.metalness < 0.5).every((m) => !m.envNode), 'metal has something to reflect, and only metal', `${metals.length} metallic materials: ${metals.map((m) => m.name.replace(' (cuttable)', '')).join(', ')}`);
  // (The single-sided check above rebuilds the shaders: frames stall for a while, so wait on the value.)
  const worldLight = () => w.__world.ambient.intensity / (Math.PI * settings.worldStrength);
  put(new T.Vector3(0, 0.05, 0));
  const fullOutside = await until(() => Math.abs(worldLight() - 1) < 0.01, 8000);
  put(inside.clone().setY(ship.upperFloorY + 0.05));
  const downInside = await until(() => Math.abs(worldLight() - settings.worldIndoors) < 0.01, 8000);
  report(fullOutside && downInside, 'the world light is turned down inside the ship', `full outside: ${fullOutside}; inside at ${worldLight().toFixed(2)} of it (setting ${settings.worldIndoors})`);

  // --- Pass 4: bulkhead doors, their panels, the engineering window and its lever (6, 7, 8) -----
  /** Stand her beside an item, on whichever side it can be used from, looking at it; true once it's the target. */
  const aimFromAnySide = async (item) => {
    const centre = boxOf(item).getCenter(new T.Vector3());
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const feet = centre.clone().add(new T.Vector3(dx, 0, dz).multiplyScalar(0.55));
      const floor = physics.ray(feet, DOWN, 3, true);
      if (!floor) continue;
      feet.y -= floor.distance;
      put(feet);
      view.yaw = yawToward(-dx, -dz);
      for (let pitch = 0; pitch <= 1.0; pitch += 0.1) {
        view.pitch = pitch;
        await wait(120);
        if (interaction.target === item) return true;
      }
    }
    return false;
  };
  const settled = (doors, amount) => doors.every((d) => d.amount === amount);
  const bulkheadDoors = [...new Set(ship.doors.filter((d) => d.auto).map((d) => d.group))];
  report(bulkheadDoors.length === 2 && bulkheadDoors.every((g) => g.length === 2), 'two bulkhead doors, two leaves each', bulkheadDoors.map((g) => g.map((d) => d.name).join(' + ')).join('; '));
  for (const leaves of bulkheadDoors) {
    const label = leaves[0].name.replace(/_/g, ' ');
    const zone = leaves[0].zone;
    const centre = zone.getCenter(new T.Vector3());
    // Across the bulkhead: the thin way of the closed door.
    const across = zone.max.x - zone.min.x < zone.max.z - zone.min.z ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
    const side = (p) => (p.x - centre.x) * across.x + (p.z - centre.z) * across.z;
    const stand = (distance) => {
      const p = centre.clone().addScaledVector(across, distance).setY(zone.min.y + 0.6);
      const floor = physics.ray(p, DOWN, 3, true);
      p.y -= floor ? floor.distance : 0.6;
      return p;
    };
    const far = settings.autoDoorDistance + 1;
    // Through: far enough past it for it to close (the cockpit is about 2 m long past its door).
    const past = settings.autoDoorDistance + 0.4;
    // Far from it, it's closed; walking up, it opens; she goes through; behind her, it closes.
    // (From one side, then the other if furniture stands where she'd start.)
    let walked = { ok: false, detail: '' };
    for (const way of [1, -1]) {
      put(stand(-way * far));
      view.yaw = yawToward(way * across.x, way * across.z);
      view.pitch = 0.15;
      // Facing the door first: turning round as she sets off, she swings wide and misses the doorway.
      await tap('KeyW');
      await wait(300);
      put(stand(-way * far));
      const closedFar = await until(() => settled(leaves, 0), 3000);
      let opened = false;
      key('KeyW', true);
      const start = performance.now();
      // Steering at a point on the door's centre line, well past it (starting on the pallet in the
      // cargo hold, she comes off it to one side).
      const aim = centre.clone().addScaledVector(across, way * 6);
      while (performance.now() - start < 9000 && way * side(character.position) < past) {
        view.yaw = yawToward(aim.x - character.position.x, aim.z - character.position.z);
        if (settled(leaves, 1)) opened = true;
        await wait(30);
      }
      key('KeyW', false);
      const through = way * side(character.position) >= past;
      const closedBehind = await until(() => settled(leaves, 0), 3000);
      walked = { ok: closedFar && opened && through && closedBehind, detail: `closed from afar: ${closedFar}; opened: ${opened}; through: ${through} (${(way * side(character.position)).toFixed(2)} m past it); closed behind: ${closedBehind}${through ? '' : `; she's at ${fmt(character.position)}, door centre ${fmt(centre)}, leaves ${leaves.map((d) => `${d.amount.toFixed(2)}${d.blocked ? ' waiting for her' : ''}`).join(' / ')}`}` };
      if (walked.ok) break;
    }
    report(walked.ok, `${label}: opens as she walks up, she goes through, it closes behind her`, walked.detail);

    const panels = items.filter((i) => i.objects[0].userData.device === 'panel' && leaves.some((d) => d.name === i.objects[0].userData.controls || d.object.userData.name === i.objects[0].userData.controls));
    report(panels.length === 2, `${label}: a panel on each side`, panels.map((p) => p.name).join(', '));
    for (const [n, panel] of panels.entries()) {
      const name = panel.name.replace(/_/g, ' ');
      if (!(await aimFromAnySide(panel))) {
        report(false, `${name} can be aimed at`, `target: ${interaction.target?.name ?? 'none'}`);
        continue;
      }
      const wasOpen = await until(() => settled(leaves, 1), 3000);
      const shown = prompt.textContent;
      const from = side(character.position);
      await tap('KeyE');
      const shut = await until(() => settled(leaves, 0), 3000);
      await wait(200);
      const shownShut = prompt.textContent;
      let blocked = true;
      if (n === 0) {
        // Shut, it stays shut with her in front of it, and she can't walk through.
        put(stand(Math.sign(from) * 0.8));
        view.yaw = yawToward(-Math.sign(from) * across.x, -Math.sign(from) * across.z);
        await wait(300);
        key('KeyW', true);
        await wait(1500);
        key('KeyW', false);
        blocked = Math.sign(side(character.position)) === Math.sign(from) && settled(leaves, 0);
        await aimFromAnySide(panel);
      }
      await tap('KeyE');
      const again = await until(() => settled(leaves, 1), 3000);
      report(wasOpen && shut && blocked && again, `${name}: shuts the door and keeps it shut; used again, it opens`, `open with her at it: ${wasOpen}; prompt "${shown}" → shut: ${shut}${n === 0 ? `; she can't walk through: ${blocked}` : ''}; prompt "${shownShut}" → open: ${again}`);
    }
  }

  const lever = items.find((i) => i.objects[0].userData.device === 'lever');
  const halves = ship.doors.filter((d) => d.slide && !d.auto && !d.device);
  const handle = ship.doors.find((d) => d.device);
  if (!lever || !handle || halves.length !== 2 || !(await aimFromAnySide(lever))) {
    report(false, 'the window lever can be aimed at', `lever: ${lever?.name ?? 'none'}; handle: ${handle?.name ?? 'none'}; window halves: ${halves.length}; target: ${interaction.target?.name ?? 'none'}`);
  } else {
    const place = () => handle.hinge.getWorldPosition(new T.Vector3());
    const gap = () => Math.abs(new T.Box3().setFromObject(halves[0].hinge).getCenter(new T.Vector3()).x - new T.Box3().setFromObject(halves[1].hinge).getCenter(new T.Vector3()).x);
    const at = place();
    const closedGap = gap();
    const shown = prompt.textContent;
    await tap('KeyE');
    const opened = await until(() => settled([...halves, handle], 1), 3000);
    const moved = place().distanceTo(at) / shipScale;
    const openGap = gap();
    await wait(200);
    const shownOpen = prompt.textContent;
    await tap('KeyE');
    const closed = await until(() => settled([...halves, handle], 0), 3000);
    report(opened && closed && Math.abs(moved - 0.06) < 0.005 && openGap > closedGap * 2.5, 'the lever opens and closes the window, and slides', `prompt "${shown}" → open: ${opened}; the halves' centres ${closedGap.toFixed(2)} → ${openGap.toFixed(2)} m apart; the lever moved ${moved.toFixed(3)} (Blender units); prompt "${shownOpen}" → closed: ${closed}`);
  }
  const offeredDoors = items.filter((i) => i.objects.some((o) => ship.doors.some((d) => d.object === o && (d.slide || d.device))) && !i.objects[0].userData.controls);
  report(offeredDoors.length === 0, 'the bulkhead doors, the window and the lever are not targets themselves', offeredDoors.map((i) => i.name).join(', '));

  // --- Pass 4.5: sound (24). What plays and when; not what it sounds like. ----------------------
  const audio = w.__audio;
  const boombox = w.__boombox?.();
  const count = (cue) => audio.started[cue] ?? 0;
  report(audio.context.state === 'running', 'the sound is on', `audio context: ${audio.context.state}`);
  {
    // One door sound for a bulkhead door's two leaves, when it opens and again when it closes.
    const leaves = bulkheadDoors[0];
    const zone = leaves[0].zone;
    const centre = zone.getCenter(new T.Vector3());
    const across = zone.max.x - zone.min.x < zone.max.z - zone.min.z ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
    const stand = (distance) => {
      const p = centre.clone().addScaledVector(across, distance).setY(zone.min.y + 0.6);
      const floor = physics.ray(p, DOWN, 3, true);
      p.y -= floor ? floor.distance : 0.6;
      return p;
    };
    let result = '';
    let ok = false;
    for (const way of [1, -1]) {
      put(stand(way * (settings.autoDoorDistance + 1)));
      await until(() => settled(leaves, 0), 3000);
      await wait(100);
      const before = count('sfx_door_slide');
      put(stand(way * 0.9));
      const opened = await until(() => settled(leaves, 1), 3000);
      const onOpening = count('sfx_door_slide') - before;
      const heard = audio.playing().includes('sfx_door_slide');
      put(stand(way * (settings.autoDoorDistance + 1)));
      const closed = await until(() => settled(leaves, 0), 3000);
      await wait(100);
      const onClosing = count('sfx_door_slide') - before - onOpening;
      ok = opened && closed && onOpening === 1 && onClosing === 1 && heard;
      result = `opening: ${onOpening} started (sounding: ${heard}); closing: ${onClosing} started`;
      if (ok) break;
    }
    report(ok, 'a bulkhead door plays the door sound once as it opens and once as it closes', result);
  }
  if (lever && (await aimFromAnySide(lever))) {
    const before = count('sfx_door_slide');
    await tap('KeyE');
    await until(() => settled([...halves, handle], 1), 3000);
    const onOpening = count('sfx_door_slide') - before;
    await tap('KeyE');
    await until(() => settled([...halves, handle], 0), 3000);
    const onClosing = count('sfx_door_slide') - before - onOpening;
    report(onOpening === 1 && onClosing === 1, 'the engineering window plays the door sound once each way', `opening: ${onOpening}, closing: ${onClosing}`);
  } else {
    report(false, 'the engineering window plays the door sound once each way', 'the lever could not be aimed at');
  }

  const boxItem = boombox ? items.find((i) => i === boombox.interactable) : null;
  if (!boombox || !boxItem || !(await aimFromAnySide(boxItem))) {
    report(false, 'the boombox can be aimed at', boombox ? `target: ${interaction.target?.name ?? 'none'}` : 'no boombox in the ship');
  } else {
    const trackVoice = (n) => [...audio.voices].find(([k]) => k.startsWith(`mus_boombox_0${n}@`))?.[1];
    const prompts = [prompt.textContent];
    const cassettes = count('sfx_boombox_cassette');
    await tap('KeyE');
    const cassette = count('sfx_boombox_cassette') - cassettes === 1 && boombox.track === 0;
    const first = await until(() => boombox.track === 1, 5000);
    await wait(100);
    prompts.push(prompt.textContent);
    report(cassette && first && boombox.step === 1, 'using the boombox plays the cassette sound, then track 1', `cassette first: ${cassette}; then sounding: track ${boombox.track}; prompts "${prompts.join('" → "')}"`);
    // It shakes while a track plays, and comes from the boombox.
    const places = new Set();
    for (let i = 0; i < 6; i++) {
      places.add(boombox.object.position.toArray().map((v) => v.toFixed(5)).join());
      await wait(50);
    }
    const voice = trackVoice(1);
    report(places.size > 2 && voice?.positional?.parent === boombox.object, 'it shakes while a track plays; the sound is at the boombox', `${places.size} places in 6 looks; falls off from ${voice?.positional?.getRefDistance()} to ${voice?.positional?.getMaxDistance()} m`);
    // A track that ends by itself goes on to the next.
    const element = voice?.element;
    if (element) element.currentTime = element.duration - 0.4;
    const went = await until(() => boombox.track === 2 && boombox.step === 2, 5000);
    report(went, 'a track that ends goes on to the next', `step ${boombox.step}, sounding: track ${boombox.track}`);
    // The ring: used again, 3, then 4 ("Turn off"), then off ("Play").
    await tap('KeyE');
    const stopped = boombox.track === 0;
    const third = await until(() => boombox.track === 3, 5000);
    await tap('KeyE');
    const fourth = await until(() => boombox.track === 4, 5000);
    await wait(100);
    const last = prompt.textContent;
    const fromFourth = trackVoice(4)?.element;
    if (fromFourth) fromFourth.currentTime = fromFourth.duration - 0.4;
    const endsOff = await until(() => boombox.step === 0 && boombox.track === 0, 5000);
    await tap('KeyE');
    await until(() => boombox.track === 1, 5000);
    await tap('KeyE');
    await tap('KeyE');
    await tap('KeyE');
    await until(() => boombox.track === 4, 5000);
    await tap('KeyE');
    await wait(2500);
    const off = boombox.step === 0 && boombox.track === 0 && !audio.playing().some((c) => c.startsWith('mus_'));
    await wait(100);
    const still = boombox.object.position.equals(boombox.home);
    report(stopped && third && fourth && endsOff && off && still, 'the boombox steps round its ring: 1, 2, 3, 4, off', `a use stops the track at once: ${stopped}; 3: ${third}; 4: ${fourth}, prompt "${last}"; the fourth ends in off: ${endsOff}; used on the fourth, off: ${off}, prompt "${prompt.textContent}"; still again: ${still}`);
  }

  // The ship's noise: both sounds together while it's flying; each repeats with no silence (in this
  // browser: the level around the point where one copy of the file hands over to the other).
  settings.shipFlying = true;
  const flying = await until(() => audio.noise?.length === 2 && audio.noise.every((n) => n.playing), 5000);
  report(flying && audio.playing().includes('amb_ship_noise'), 'ship flying: both noise sounds play', `${audio.noise?.filter((n) => n.playing).length ?? 0} of ${audio.noise?.length ?? 0} playing`);
  if (flying) {
    await until(() => audio.noise.every((n) => n.elements[n.active].duration > 0 && n.elements[n.active].currentTime > 0.5), 8000);
    const seams = [];
    let seamless = true;
    const taps = audio.noise.map((n) => {
      const analyser = audio.context.createAnalyser();
      analyser.fftSize = 2048;
      n.out.connect(analyser);
      const active = n.active;
      const e = n.elements[active];
      e.currentTime = e.duration - 3.5;
      return { n, analyser, active, levels: [] };
    });
    const data = new Float32Array(2048);
    const start = performance.now();
    while (performance.now() - start < 6500) {
      for (const t of taps) {
        t.analyser.getFloatTimeDomainData(data);
        t.levels.push(Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length));
      }
      await wait(25);
    }
    for (const [i, t] of taps.entries()) {
      // The first second is the seek settling.
      const levels = t.levels.slice(40);
      const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
      const quietest = Math.min(...levels);
      const handedOver = t.n.active !== t.active && t.n.elements[t.n.active].currentTime < 6;
      if (!(handedOver && mean > 0 && quietest > mean * 0.25)) seamless = false;
      seams.push(`${i === 0 ? 'a' : 'b'}: handed over ${handedOver}, quietest ${(quietest / mean * 100).toFixed(0)}% of the mean level`);
      t.n.out.disconnect(t.analyser);
    }
    report(seamless, 'the ship noise repeats with no silence where it starts again', seams.join('; '));
  }
  settings.shipFlying = false;
  const landed = await until(() => !audio.playing().includes('amb_ship_noise'), 4000);
  report(landed, 'ship not flying: the noise fades out and stops');

  // --- The interactions' sounds and the footsteps (26). Which cue starts at which event. ----------
  {
    const NEW = ['sfx_latch_open', 'sfx_latch_close', 'sfx_hatch_open', 'sfx_hatch_close', 'sfx_panel_open', 'sfx_panel_close', 'sfx_lever', 'sfx_ramp_move', 'sfx_ramp_stop', 'sfx_ladder_grab', 'sfx_step_snow', 'sfx_step_ship', 'sfx_land_snow', 'sfx_land_ship'];
    const snap = () => Object.fromEntries(NEW.map((c) => [c, count(c)]));
    /** What started since, as "cue ×n, cue ×n" in the order of NEW. */
    const since = (before) => NEW.filter((c) => count(c) !== before[c]).map((c) => `${c} ×${count(c) - before[c]}`).join(', ') || 'nothing';
    const away = new T.Vector3(inside.x + 25, 0.05, inside.z); // on the snow, clear of every door
    const still = (doors) => doors.every((d) => !d.moving);
    /** Use a target twice (by its action, not by aiming); what started each time. */
    const twice = async (item, doors) => {
      const heard = [];
      for (let i = 0; i < 2; i++) {
        const before = snap();
        item.act();
        await wait(100);
        const motor = audio.playing().includes('sfx_ramp_move');
        await until(() => still(doors) && ship.rampAmount === (settings.cargoRampOpen ? 1 : 0), 6000);
        await wait(400);
        heard.push({ started: since(before), motor, motorAfter: audio.playing().includes('sfx_ramp_move') });
      }
      return heard;
    };
    const both = (heard, a, b) => [heard[0].started, heard[1].started].sort().join(' | ') === [a, b].sort().join(' | ');
    const said = (heard) => heard.map((h) => h.started).join(' | ');

    put(away);
    await wait(600);
    const quiet = snap();
    await wait(1000);
    report(since(quiet) === 'nothing', 'standing still, no step sounds', since(quiet));

    const locker = await twice(items.find((i) => i.name === 'Locker_Door001'), [door('Locker_Door001')]);
    report(both(locker, 'sfx_latch_open ×1', 'sfx_latch_close ×1'), 'a locker: a latch sound as it opens, another once closed', said(locker));
    const trap = await twice(items.find((i) => i.name === 'Hatch002'), [door('Hatch002')]);
    report(both(trap, 'sfx_hatch_open ×1', 'sfx_hatch_close ×1'), 'the trapdoor: the hatch sounds', said(trap));
    const roof = await twice(items.find((i) => i.objects.includes(top.object)), [top, bottom]);
    report(both(roof, 'sfx_hatch_open ×1', 'sfx_hatch_close ×1'), 'the roof hatch: one sound for its two parts', said(roof));
    for (const [pad, name] of [[sidePad, 'the side door'], [rampPad, 'the cargo ramp']]) {
      const heard = await twice(pad, [side]);
      const tones = both(heard.map((h) => ({ started: h.started.split(', ')[0] })), 'sfx_panel_open ×1', 'sfx_panel_close ×1');
      const motor = heard.every((h) => h.started.endsWith('sfx_ramp_move ×1, sfx_ramp_stop ×1') && h.motor && !h.motorAfter);
      report(tones && motor, `${name}: its keypad's two tones, the motor while it moves, the stop when it's there`, `${said(heard)}; motor sounding while moving: ${heard.map((h) => h.motor)}, after: ${heard.map((h) => h.motorAfter)}`);
    }
    if (lever) {
      const heard = await twice(lever, [...halves, handle]);
      report(heard.every((h) => h.started === 'sfx_lever ×1'), 'the lever: its clunk each way, and no tones', said(heard));
    }
    const panel = items.find((i) => i.objects[0].userData.device === 'panel' && bulkheadDoors.some((leaves) => leaves.some((d) => d.object.name === String(i.objects[0].userData.controls).replace(/ /g, '_'))));
    if (panel) {
      const heard = await twice(panel, []);
      report(heard[0].started === 'sfx_panel_close ×1' && heard[1].started === 'sfx_panel_open ×1', "a bulkhead door's panel: down for close, up for open", said(heard));
    } else {
      report(false, "a bulkhead door's panel: down for close, up for open", 'no panel found');
    }

    // Footsteps: snow outside, faster at a run than at a walk; a landing after a jump.
    const steps = async (dx, dz, ms, slow) => {
      view.yaw = yawToward(dx, dz);
      view.pitch = 0.15;
      await wait(300);
      if (slow) key('ShiftLeft', true);
      key('KeyW', true);
      await wait(600);
      const before = snap();
      await wait(ms);
      const got = { snow: count('sfx_step_snow') - before.sfx_step_snow, ship: count('sfx_step_ship') - before.sfx_step_ship };
      key('KeyW', false);
      if (slow) key('ShiftLeft', false);
      await wait(500);
      return got;
    };
    put(away);
    const running = await steps(1, 0, 3000, false);
    const walking = await steps(1, 0, 3000, true);
    report(running.snow >= 5 && running.snow > walking.snow && walking.snow >= 2 && running.ship + walking.ship === 0, 'steps in the snow outside, more of them at a run', `3 s at a run: ${running.snow}; at a walk: ${walking.snow}; ship steps: ${running.ship + walking.ship}`);
    const jump = snap();
    await tap('Space');
    await wait(1500);
    report(since(jump) === 'sfx_land_snow ×1', 'a jump ends in a landing sound', since(jump));
    // From the start position up the open cargo ramp: the ship's floor from the ramp on.
    settings.cargoRampOpen = true;
    await until(() => ship.rampAmount === 1, 4000);
    await wait(500);
    put(new T.Vector3(0, 0.05, 0));
    view.yaw = yawToward(inside.x, inside.z);
    view.pitch = 0.15;
    await wait(400);
    // Her height at the moment each step plays (looked at afterwards, she has moved on).
    const heights = { sfx_step_snow: [], sfx_step_ship: [] };
    const play = audio.play;
    audio.play = (id, ...rest) => {
      heights[id]?.push(character.position.y);
      return play.call(audio, id, ...rest);
    };
    const from = character.position.clone();
    key('KeyW', true);
    await until(() => heights.sfx_step_ship.length >= 2, 10000);
    key('KeyW', false);
    await wait(300);
    audio.play = play;
    const reached = `she went ${character.position.distanceTo(from).toFixed(1)} m, to ${fmt(character.position)}`;
    const wrong = heights.sfx_step_snow.filter((y) => y > 0.15).length + heights.sfx_step_ship.filter((y) => y < 0.15).length;
    report(heights.sfx_step_snow.length > 0 && heights.sfx_step_ship.length > 0 && wrong === 0, 'walking up the ramp: snow steps on the ground, ship steps from the ramp on', `${heights.sfx_step_snow.length} snow, ${heights.sfx_step_ship.length} ship (the lowest at ${Math.min(...heights.sfx_step_ship).toFixed(2)} m); on the wrong surface: ${wrong}; ${reached}`);
    // The ladder: a hand on a rung when she takes hold, and as she climbs.
    const grabs = count('sfx_ladder_grab');
    put(ladder.bottom.clone().addScaledVector(ladder.face, -0.6));
    view.yaw = yawToward(ladder.face.x, ladder.face.z);
    await wait(300);
    key('KeyW', true);
    await until(() => ladders.state.is === 'on' && ladders.state.s === 1, 8000);
    key('KeyW', false);
    await wait(800);
    const expected = 1 + Math.floor((ladder.top.y - ladder.bottom.y) / 0.35);
    report(count('sfx_ladder_grab') - grabs === expected, 'the ladder: a sound taking hold, then every 0.35 m climbed', `${count('sfx_ladder_grab') - grabs} for ${(ladder.top.y - ladder.bottom.y).toFixed(2)} m (expected ${expected})`);
    // She's held at the top: off it (a jump) before she's put elsewhere, or the ladder keeps her.
    await tap('Space');
    await until(() => ladders.state.is === 'off', 1000);
    put(away);
    await wait(300);
  }

  // What hangs on a locker door (the polaroid, the poster) swings with it.
  for (const [doorName, hanging] of [['Locker Door.003', 'Polaroid'], ['Locker Door.001', 'Gojira poster']]) {
    // Names as the loader gives them ("Locker_Door003"): compared without spaces, dots or underscores.
    const plain = (name) => name.replace(/[ ._]/g, '');
    const locker = ship.doors.find((d) => plain(d.name) === plain(doorName));
    let thing = null;
    ship.object.traverse((o) => {
      if (plain(o.name) === plain(hanging)) thing = o;
    });
    if (!locker || !thing) {
      report(false, `${hanging} hangs on ${doorName}`, `door: ${!!locker}, ${hanging}: ${!!thing}`);
      continue;
    }
    const where = () => {
      ship.object.updateMatrixWorld(true);
      return new T.Box3().setFromObject(thing).getCenter(new T.Vector3());
    };
    const shut = where();
    locker.toggle();
    const opened = await until(() => locker.amount === 1, 3000);
    const swung = where().distanceTo(shut);
    locker.toggle();
    const closed = await until(() => locker.amount === 0, 3000);
    report(opened && closed && swung > 0.1 && where().distanceTo(shut) < 0.001, `${hanging} swings with ${doorName}`, `moved ${swung.toFixed(2)} m while open`);
  }

  // --- Every door, with her out of the way -----------------------------------------------------
  // (The bulkhead doors would follow her: their automatic opening is off for this check.)
  settings.autoDoors = false;
  put(new T.Vector3(0, 0.05, 0));
  await wait(300);
  const before = ship.doors.map((d) => d.open);
  for (const d of ship.doors) d.open = !d.open;
  const late = () => ship.doors.filter((d) => d.amount !== (d.open ? 1 : 0)).map((d) => `${d.name} at ${d.amount.toFixed(2)}${d.blocked ? ' (waiting for her)' : ''}`).join(', ');
  const there = await until(() => ship.doors.every((d) => d.amount === (d.open ? 1 : 0)), 4000);
  const lateThere = late();
  for (const [i, d] of ship.doors.entries()) d.open = before[i];
  const back = await until(() => ship.doors.every((d) => d.amount === (d.open ? 1 : 0)), 4000);
  const lateBack = late();
  settings.autoDoors = true;
  report(there && back, `all ${ship.doors.length} doors open and close with her out of the way`, `not there after 4 s: ${lateThere || 'none'}; not back after 4 s: ${lateBack || 'none'}; she's at ${fmt(character.position)}`);

  return failed;
}

// ---------------------------------------------------------------------------------------------
// Running it.
// ---------------------------------------------------------------------------------------------
async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('smoke: no Chrome found. Set CHROME_PATH to a Chrome or Edge executable.');
    return 2;
  }
  let server = null;
  if (!(await answers(URL_01))) {
    const { createServer } = await import('vite');
    server = await createServer({ root: PROTOTYPE, logLevel: 'error' });
    await server.listen();
  }
  let failed = 1;
  const errors = [];
  let browser = null;
  try {
    browser = await openBrowser(chromePath, (msg) => {
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        if (text.startsWith('[smoke] ')) console.log(text.slice(8));
        else if (msg.params.type === 'error') errors.push(text);
        else if (text.startsWith('[01-walk] rendering') || text.startsWith('[01-walk] cargo ramp')) console.log(`      ${text}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      }
    });
    const { send } = browser;
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: URL_01 });
    await new Promise((r) => setTimeout(r, 1500));
    // Sound: off until the player does something. A real key press (the page's own simulated keys
    // don't count for the browser, nor does Shift by itself) turns it on: Q, which the game doesn't use.
    const audioState = async () => (await send('Runtime.evaluate', { expression: 'window.__audio?.context.state ?? "no audio"', returnByValue: true })).result.result.value;
    for (let i = 0; i < 40 && (await audioState()) === 'no audio'; i++) await new Promise((r) => setTimeout(r, 250));
    const audioBefore = await audioState();
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81, text: type === 'keyDown' ? 'q' : undefined });
    await new Promise((r) => setTimeout(r, 300));
    const audioAfter = await audioState();
    console.log(`${audioBefore === 'suspended' && audioAfter === 'running' ? 'PASS' : 'FAIL'}  the sound is off until a key is pressed, then on: ${audioBefore} → ${audioAfter}`);
    let failed0 = audioBefore === 'suspended' && audioAfter === 'running' ? 0 : 1;
    // The start screen: a bar and no button while it loads; then the button, which starts the game
    // with a click sound and sends the screen's music away.
    const page = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value;
    const line = (ok, name, detail) => {
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
      if (!ok) failed0++;
    };
    const controls = '({ bar: Boolean(document.querySelector("#start [role=progressbar]")), button: Boolean(document.querySelector("#start button")), ...window.__start() })';
    const before = await page(controls);
    if (before.ready) console.log('NOT CHECKED  the start screen while it loads (everything was loaded before it could be looked at)');
    else line(before.bar && !before.button, 'the start screen shows a bar and no button while it loads', `bar ${before.bar}, button ${before.button}, ${Math.round(before.share * 100)} % loaded`);
    const began = await useStartButton(send);
    // Looked at just after Enter: the button is still there (the screen takes 0.7 s to go).
    const at = await page(controls);
    line(began && at.button, 'once loaded, the button is there and Enter starts the game', `ready ${at.ready}, begun ${at.begun}, button ${at.button}`);
    await new Promise((r) => setTimeout(r, 2500));
    const after = await page('({ screen: document.querySelector("#start").childElementCount, click: window.__audio.started.ui_click ?? 0, theme: window.__audio.started.mus_part1_theme ?? 0, playing: window.__audio.playing() })');
    line(after.screen === 0, 'the start screen is gone after the button is used', `${after.screen} elements left`);
    line(after.click === 1, 'the button makes its click once', `ui_click started ${after.click} times`);
    line(after.theme === 1 && !after.playing.includes('mus_part1_theme'), 'the music plays on the start screen (the sound was on) and has stopped 2.5 s after the button', `started ${after.theme} times; playing now: ${after.playing.join(', ') || 'nothing'}`);
    const result = await send('Runtime.evaluate', { expression: `(${checks.toString()})()`, awaitPromise: true, returnByValue: true });
    if (result.result.exceptionDetails) {
      console.log(`FAIL  the checks ran to the end: ${result.result.exceptionDetails.exception?.description ?? result.result.exceptionDetails.text}`);
    } else {
      failed = result.result.result.value + failed0;
    }
    console.log(`${errors.length === 0 ? 'PASS' : 'FAIL'}  no errors in the browser console${errors.length ? `: ${errors.slice(0, 5).join(' | ')}` : ''}`);
    if (errors.length) failed++;
    console.log('NOT CHECKED  gamepad (no controller in a headless browser)');
  } catch (err) {
    console.error(`smoke: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser?.close();
    await server?.close();
  }
  console.log(failed === 0 ? '\nsmoke: all checks passed' : `\nsmoke: ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

process.exit(await main());
