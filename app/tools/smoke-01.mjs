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
    // The player keeps pushing for a moment: she must stay off the ladder, on the floor above.
    let stayedOff = off;
    for (let i = 0; i < 10; i++) {
      await wait(50);
      if (ladders.state.is !== 'off') stayedOff = false;
    }
    key('KeyW', false);
    await wait(250);
    return { attached, off, stayedOff, y: character.position.y, grounded: character.grounded };
  };
  let good = 0;
  const problems = [];
  let exit = null;
  for (let i = 1; i <= 10; i++) {
    const r = await climb();
    const ok = r.attached && r.stayedOff && r.grounded && Math.abs(r.y - ladder.top.y) < 0.15;
    if (ok) good++;
    else problems.push(`climb ${i}: attached ${r.attached}, off ${r.off}, stayed off ${r.stayedOff}, y ${r.y.toFixed(2)} (top ${ladder.top.y.toFixed(2)})`);
    if (ok && !exit) exit = character.position.clone();
  }
  report(good === 10, 'the ladder is climbed and left at the top, 10 times in a row', good === 10 ? `still pushing, she ends at ${fmt(exit)}` : problems.join('; '));
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
    put(exit);
    view.yaw = yawToward(ladder.top.x - exit.x, ladder.top.z - exit.z);
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
    const aimed = await until(() => interaction.target === hatch[0], 1500);
    const shown = prompt.textContent;
    await tap('KeyE');
    const opened = await until(() => top.amount === 1 && bottom.amount === 1, 3000);
    await tap('KeyE');
    const closed = await until(() => top.amount === 0 && bottom.amount === 0, 3000);
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

  // --- Every door, with her out of the way -----------------------------------------------------
  put(new T.Vector3(0, 0.05, 0));
  await wait(300);
  const before = ship.doors.map((d) => d.open);
  for (const d of ship.doors) d.open = !d.open;
  const there = await until(() => ship.doors.every((d) => d.amount === (d.open ? 1 : 0)), 4000);
  for (const [i, d] of ship.doors.entries()) d.open = before[i];
  const back = await until(() => ship.doors.every((d) => d.amount === (d.open ? 1 : 0)), 4000);
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
