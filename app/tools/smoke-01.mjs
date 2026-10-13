// Scripted check of prototype 01 (`npm run smoke`, in app/): drives it in headless Chrome and
// prints one PASS / FAIL line per check, from the "Done when" lists in doc/plans/backlog-passes.md.
// No dependencies: Chrome's DevTools protocol over Node's own WebSocket (Node 22), Vite's own API
// for the dev server (it uses the one already running on port 5201 if there is one). The checks
// run inside the page, through the dev hooks on `window` (main.ts) and simulated keys.
// Chrome is found in its usual places; set CHROME_PATH to use another. No gamepad: keyboard only.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  // --- Ladders (4, 5) --------------------------------------------------------------------------
  const ladder = ladders.list[0];
  const foot = ladder.bottom.clone().addScaledVector(ladder.face, -0.45);
  const climb = async () => {
    put(foot);
    view.yaw = yawToward(ladder.face.x, ladder.face.z);
    view.pitch = 0.3;
    await wait(200);
    key('KeyW', true);
    const attached = await until(() => ladders.state.is === 'on', 2000);
    const off = attached && (await until(() => ladders.state.is === 'off', 8000));
    // Where the ladder leaves her (pushing on, she walks to the cockpit bulkhead, beside its doorway).
    const left = character.position.clone();
    // The player keeps pushing for a moment: she must stay off the ladder, on the floor above.
    let stayedOff = off;
    for (let i = 0; i < 10; i++) {
      await wait(50);
      if (ladders.state.is !== 'off') stayedOff = false;
    }
    key('KeyW', false);
    await wait(250);
    return { attached, off, stayedOff, left, y: character.position.y, grounded: character.grounded };
  };
  let good = 0;
  const problems = [];
  let exit = null;
  for (let i = 1; i <= 10; i++) {
    const r = await climb();
    const ok = r.attached && r.stayedOff && r.grounded && Math.abs(r.y - ladder.top.y) < 0.15;
    if (ok) good++;
    else problems.push(`climb ${i}: attached ${r.attached}, off ${r.off}, stayed off ${r.stayedOff}, y ${r.y.toFixed(2)} (top ${ladder.top.y.toFixed(2)})`);
    if (ok && !exit) exit = r.left;
  }
  report(good === 10, 'the ladder is climbed and left at the top, 10 times in a row', good === 10 ? `it leaves her at ${fmt(exit)}` : problems.join('; '));
  if (exit) {
    // Where she's left at the top, she can walk: at least three of the four ways.
    const moved = [];
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) {
      put(exit);
      view.yaw = yawToward(ladder.face.x, ladder.face.z);
      await wait(250);
      key(code, true);
      await wait(500);
      key(code, false);
      await wait(150);
      const d = Math.hypot(character.position.x - exit.x, character.position.z - exit.z);
      moved.push(`${code.slice(3)} ${d.toFixed(2)} m${ladders.state.is === 'off' ? '' : ' (BACK ON THE LADDER)'}`);
      await until(() => ladders.state.is === 'off', 3000);
    }
    report(moved.filter((m) => parseFloat(m.split(' ')[1]) > 0.3).length >= 3 && !moved.some((m) => m.includes('BACK')), 'she can walk away from where the ladder leaves her', moved.join(', '));

    // Down: walking into the opening from the floor above, she falls through; nothing attaches her.
    // (From beside the ladder, toward the wall it faces: the first such spot with floor and room for
    // her. Walking in from where the ladder leaves her, she comes down on the ladder's own top end,
    // 1.2 m above the cargo floor, two times in three: not fixed.)
    const beside = new T.Vector3(ladder.face.z, 0, -ladder.face.x);
    const above = [1, -1]
      .map((s) => ladder.top.clone().addScaledVector(beside, s * 0.9).addScaledVector(ladder.face, 0.25))
      .find((p) => physics.ray(p.clone().setY(p.y + 0.4), DOWN, 0.6, true) && physics.fits(p.clone().setY(p.y + 0.03))) ?? exit;
    put(above);
    view.yaw = yawToward(ladder.top.x - above.x, ladder.top.z - above.z);
    await wait(250);
    let attachedAbove = false;
    key('KeyW', true);
    const start = performance.now();
    while (performance.now() - start < 4000 && !(character.grounded && character.position.y < ladder.bottom.y + 0.3)) {
      if (ladders.state.is !== 'off' && character.position.y > ladder.bottom.y + 0.5) attachedAbove = true;
      await wait(30);
    }
    key('KeyW', false);
    await wait(300);
    report(!attachedAbove && character.grounded && Math.abs(character.position.y - ladder.bottom.y) < 0.3, 'she drops through the open trapdoor', `lands at ${fmt(character.position)} (cargo floor ${ladder.bottom.y.toFixed(2)}); attached on the way: ${attachedAbove}`);

    // Letting go part-way: pushing away, and jump.
    for (const [how, code] of [['pushing away', 'KeyS'], ['jump', 'Space']]) {
      put(foot);
      view.yaw = yawToward(ladder.face.x, ladder.face.z);
      await wait(200);
      key('KeyW', true);
      await until(() => ladders.state.is === 'on' && ladders.state.s > 0.4, 4000);
      const height = character.position.y;
      if (code === 'KeyS') key('KeyW', false);
      key(code, true);
      const landed = await until(() => ladders.state.is === 'off' && character.grounded && character.position.y < ladder.bottom.y + 0.3, 3000);
      key(code, false);
      key('KeyW', false);
      await wait(250);
      report(landed, `${how} lets go of the ladder: she drops`, `from ${height.toFixed(2)} m to ${character.position.y.toFixed(2)} m`);
    }
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

  // --- Every door, with her out of the way -----------------------------------------------------
  // (The bulkhead doors would follow her: their automatic opening is off for this check.)
  settings.autoDoors = false;
  put(new T.Vector3(0, 0.05, 0));
  await wait(300);
  const before = ship.doors.map((d) => d.open);
  for (const d of ship.doors) d.open = !d.open;
  const there = await until(() => ship.doors.every((d) => d.amount === (d.open ? 1 : 0)), 4000);
  for (const [i, d] of ship.doors.entries()) d.open = before[i];
  const back = await until(() => ship.doors.every((d) => d.amount === (d.open ? 1 : 0)), 4000);
  settings.autoDoors = true;
  report(there && back, `all ${ship.doors.length} doors open and close with her out of the way`, ship.doors.filter((d) => d.amount !== (d.open ? 1 : 0)).map((d) => d.name).join(', '));

  return failed;
}

// ---------------------------------------------------------------------------------------------
// Running it.
// ---------------------------------------------------------------------------------------------
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA ?? ''}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => p && existsSync(p));
}

async function answers(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

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
  const profile = mkdtempSync(join(tmpdir(), 'zamboni-smoke-'));
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720', '--enable-unsafe-webgpu', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let failed = 1;
  const errors = [];
  try {
    const browserUrl = await new Promise((done, fail) => {
      let text = '';
      chrome.stderr.on('data', (chunk) => {
        text += chunk;
        const found = /DevTools listening on (ws:\/\/\S+)/.exec(text);
        if (found) done(found[1]);
      });
      chrome.on('exit', () => fail(new Error('Chrome closed before it could be reached')));
      setTimeout(() => fail(new Error('Chrome did not start within 20 s')), 20000);
    });
    const port = new URL(browserUrl).port;
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const socket = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((done, fail) => {
      socket.onopen = done;
      socket.onerror = () => fail(new Error("couldn't connect to Chrome"));
    });
    let nextId = 0;
    const waiting = new Map();
    socket.onmessage = (message) => {
      const msg = JSON.parse(message.data);
      if (msg.id !== undefined) return waiting.get(msg.id)?.(msg);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        if (text.startsWith('[smoke] ')) console.log(text.slice(8));
        else if (msg.params.type === 'error') errors.push(text);
        else if (text.startsWith('[01-walk] rendering') || text.startsWith('[01-walk] cargo ramp')) console.log(`      ${text}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      }
    };
    const send = (method, params = {}) =>
      new Promise((done) => {
        const id = ++nextId;
        waiting.set(id, done);
        socket.send(JSON.stringify({ id, method, params }));
      });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: URL_01 });
    await new Promise((r) => setTimeout(r, 1500));
    const result = await send('Runtime.evaluate', { expression: `(${checks.toString()})()`, awaitPromise: true, returnByValue: true });
    if (result.result.exceptionDetails) {
      console.log(`FAIL  the checks ran to the end: ${result.result.exceptionDetails.exception?.description ?? result.result.exceptionDetails.text}`);
    } else {
      failed = result.result.result.value;
    }
    console.log(`${errors.length === 0 ? 'PASS' : 'FAIL'}  no errors in the browser console${errors.length ? `: ${errors.slice(0, 5).join(' | ')}` : ''}`);
    if (errors.length) failed++;
    console.log('NOT CHECKED  gamepad (no controller in a headless browser)');
    socket.close();
  } catch (err) {
    console.error(`smoke: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    chrome.kill();
    await server?.close();
    await new Promise((r) => setTimeout(r, 500));
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* Chrome still holds a file: the folder is in the system's temp directory */
    }
  }
  console.log(failed === 0 ? '\nsmoke: all checks passed' : `\nsmoke: ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

process.exit(await main());
