// The scanner, passes 1 and 2 (doc/plans/features/gadgets-scanner.md): 2 and the pad's D-pad left bring it
// out into her hands (its clip's one frame); the right mouse button / the pad's R1 **held** turn it
// on: her body (standing) and head turn as she scans; let go, off. 1 swaps to the binoculars.
//
//     node tools/probe-01.mjs tools/scanner-probe.js --shots .export/scanner
//
// About 30 s, outside on the plain (`?test` starts in `landed`). Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const THREE = w.__THREE;
const character = w.__character;
const gadgets = w.__gadgets;
const model = character.model;
const bone = (n) => model.object.getObjectByName(n);
const scanner = bone('Scanner');
const ray = bone('Scanner_Ray') ?? bone('Scanner Ray');
const binoculars = bone('Binoculars001') ?? bone('Binoculars.001');
const body = bone('Body');
const head = bone('Head');
const at = (o) => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const tap = async (code) => { key(code, true); await wait(60); key(code, false); };
const right = (down) => window.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', { button: 2 }));
const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
const pad = { id: 'probe pad', connected: true, axes: [0, 0, 0, 0], buttons, index: 0, mapping: 'standard', timestamp: 0 };
const realPads = navigator.getGamepads.bind(navigator);
const gadgetPrompt = () => { const el = document.querySelector('#gadget-prompt'); return el && !el.hidden ? [...el.querySelectorAll('.pill')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()).join(' | ') : null; };
/** The largest angle (°) a bone's local rotation moves from its first sample, sampled over `ms`. */
const sweep = async (b, ms) => {
  const first = b.quaternion.clone();
  let most = 0;
  for (let t = 0; t < ms; t += 50) {
    await wait(50);
    most = Math.max(most, THREE.MathUtils.radToDeg(first.angleTo(b.quaternion)));
  }
  return most;
};

report(!!scanner && !!ray && !!body && !!head, 'her model has the scanner, its ray, Body and Head', scanner ? `scanner on ${scanner.parent?.name}, ray on ${ray?.parent?.name}` : 'no scanner');
if (!scanner) return results;
report(!scanner.visible && !ray.visible, 'away at first: the scanner and its ray hidden');
// Body's length (its local Y) points up: the scan turns her about the vertical.
body.updateWorldMatrix(true, false);
const up = new THREE.Vector3().setFromMatrixColumn(body.matrixWorld, 1).normalize();
report(up.y > 0.9, "Body's local Y points up (the scan's axis)", `(${up.toArray().map((x) => x.toFixed(2))})`);

await tap('Digit2');
await until(() => gadgets.held >= 1, 2000);
await wait(300);
report(gadgets.shown === 'scanner' && scanner.visible && !binoculars?.visible, '2: the scanner in her hands, the binoculars not', `shown ${gadgets.shown}, held ${gadgets.held}`);
report(!ray.visible, 'held, not on: no ray');
report(gadgetPrompt() === 'Hold to Scan' || /Hold.*to Scan/.test(gadgetPrompt() ?? ''), 'the prompt: Hold … to Scan', gadgetPrompt());
const hands = ['Hand_l', 'Hand_r'].map((n) => at(bone(n)).distanceTo(at(scanner)));
report(hands.every((d) => d < 0.25), 'both hands at the scanner (within 25 cm of its origin)', hands.map((d) => d.toFixed(3)).join(', '));
const stillHead = await sweep(head, 600);
await shot('1-held');

right(true);
await until(() => gadgets.scan >= 1, 2000);
const headTurn = await sweep(head, 2500);
const bodyTurn = await sweep(body, 1500);
report(gadgets.using && headTurn > stillHead + 5, 'right button held: on, her head turns', `scan ${gadgets.scan}; head ${stillHead.toFixed(1)}° → ${headTurn.toFixed(1)}°`);
report(bodyTurn > 3, 'standing, her body turns too', `${bodyTurn.toFixed(1)}°`);
// The ray (pass 2): shown at full size while on, its material the game's.
const rayMesh = ray.isMesh ? ray : ray.getObjectByProperty('isMesh', true);
report(ray.visible && model.scannerRay?.amount === 1 && rayMesh?.material?.name === 'Scanner Ray (game)', "on: the ray shown, full size, the game's material", `visible ${ray.visible}, amount ${model.scannerRay?.amount}, material ${rayMesh?.material?.name}`);
const sounds = w.__audio.playing();
report(sounds.includes('sfx_scanner_loop'), "on: the scanner's loop plays", sounds.join(', ') || 'nothing playing');
await shot('2-scanning');
right(false);
await until(() => gadgets.scan === 0, 2000);
await wait(300);
report(!gadgets.using && gadgets.scan === 0 && scanner.visible, 'let go: off, still in her hands', `scan ${gadgets.scan}`);
report(!ray.visible && !w.__audio.playing().includes('sfx_scanner_loop'), 'let go: the ray hidden, the loop stopped', `ray ${ray.visible}; ${w.__audio.playing().join(', ')}`);
// Halfway on: the ray part-grown (it grows out of the lens).
right(true);
await until(() => gadgets.scan > 0.4, 2000);
const part = model.scannerRay.amount;
const partScale = ray.scale.x;
right(false);
await until(() => gadgets.scan === 0, 2000);
report(part > 0 && part < 1 && partScale < ray.scale.x + 1 && ray.visible === false, 'on its way: the ray part-grown', `amount ${part.toFixed(2)}, scale ${partScale.toFixed(3)}`);

// Walking while scanning: her body's turn is left out (the head's stays).
right(true);
key('KeyW', true);
await wait(900);
await shot('3-walking-scanning');
key('KeyW', false);
right(false);
await wait(800);

await tap('Digit1');
await wait(500);
report(gadgets.shown === 'binoculars' && !scanner.visible && binoculars?.visible, '1: swapped for the binoculars at once', `shown ${gadgets.shown}`);
await tap('Digit1');
await until(() => gadgets.shown === null, 2000);

// The pad: D-pad left, R1 held.
navigator.getGamepads = () => [pad];
buttons[14] = { pressed: true, value: 1 };
await wait(150);
buttons[14] = { pressed: false, value: 0 };
await until(() => gadgets.held >= 1, 2000);
report(gadgets.out === 'scanner', 'the pad: D-pad left brings it out', `out ${gadgets.out}`);
buttons[5] = { pressed: true, value: 1 };
await wait(600);
const padOn = gadgets.using && gadgets.scan > 0.9;
buttons[5] = { pressed: false, value: 0 };
await wait(500);
report(padOn && !gadgets.using, 'the pad: on while R1 is held, off when let go', `on ${padOn}, after ${gadgets.using}`);
buttons[14] = { pressed: true, value: 1 };
await wait(150);
buttons[14] = { pressed: false, value: 0 };
await until(() => gadgets.shown === null, 2000);
navigator.getGamepads = realPads;
report(gadgets.out === null && !scanner.visible, 'D-pad left again: away');
return results;
