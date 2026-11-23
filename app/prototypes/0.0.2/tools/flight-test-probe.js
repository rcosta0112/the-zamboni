// The flight interfaces' test scene (plan doc/plans/features/non-linear-travel/flight-test-scene.md), pass 0:
// the page and the scene. Grows with each pass (pass 2: the stations and controls; pass 3: take-off and landing). In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/flight-test-probe.js --page flight-test.html --stay --shots .export/flight-test
//
// About 40 s. `--stay`: the start button is never pressed, so the game must begin by itself. Then, from the
// copied checks (piloting-probe.js, seat-probe.js, look-probe.js, conversation-probe.js; those run on the checks'
// story or chapter 1's, so their parts that fit the page are here instead): the scene, nobody's line at the start,
// the crew seated, the ship flying over the travel terrain; her seated, the joystick moving with her hand, she can't
// walk, *Get up* puts her in the aisle with no line; she walks; *Sit down* sits her back (no coffee asked); talking
// to Adam Blue from the aisle: their line, the listening turn; nothing saved. Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const character = w.__character, dialogue = w.__dialogue, physics = w.__physics, look = w.__look(), story = w.__story();
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const press = async () => { key('KeyE', true); key('KeyE', false); await wait(250); };
const tap = async (code) => { key(code, true); key(code, false); await wait(250); };
const prompt = document.querySelector('#prompt');
const verb = () => (prompt.hidden ? '' : prompt.textContent.trim());
const pivot = ship.object.getObjectByName('Joystick hinge');
const angle = () => (pivot ? (2 * Math.acos(Math.min(1, Math.abs(pivot.quaternion.w))) * 180) / Math.PI : NaN);
const f = (n) => n.toFixed(2);

// The page: begun by itself, the scene, no start screen left.
report(await until(() => w.__start().begun, 60000), 'the game begins by itself (no start button pressed)');
await wait(800);
report(w.__director()?.current === 'flight-test', 'the scene is flight-test', w.__director()?.current);
report(!document.querySelector('#start')?.children.length || (await until(() => !document.querySelector('#start').children.length, 3000)), 'the start screen is gone');
report(!w.__cutscene()?.playing && !w.__watched()?.playing && !w.__planetShot?.playing, 'no animatic, cutscene or watched conversation');
report(!dialogue.active, 'no line at the start (chapter 1’s opening taken out)');
report(story?.get('ship_flying') === true && w.__treadmill()?.current === 'ice-plain', 'flying over the travel terrain', `ship_flying ${story?.get('ship_flying')}, terrain ${w.__treadmill()?.current}`);
const crew = ['kaufman', 'ogawa', 'adam-red', 'adam-blue'];
report(crew.every((id) => w.__entity(id)), 'the crew are in the ship', crew.filter((id) => !w.__entity(id)).join(', ') || 'all four');

// Her seat (from piloting-probe.js).
report(character.model?.seated === true, 'she starts seated');
const a1 = angle();
await wait(1500);
const a2 = angle();
report(a1 > 1 && Math.abs(a2 - a1) > 0.05, 'the joystick leans and moves with her hand', `${f(a1)}° then ${f(a2)}°`);
// The turning stick is the one drawn (not merged into a still copy: owner, 2026-11-23, "the joystick does not move").
const stickShown = (() => { const s = ship.object.getObjectByName('Joystick'); let o = s, v = !!s; while (o) { v = v && o.visible; o = o.parent; } return v && !s.userData.mergedInto; })();
report(stickShown, 'the turning joystick is the one drawn (not merged)');
await shot('seated');
const seatedAt = character.position.clone();
key('KeyW', true);
await wait(1000);
key('KeyW', false);
report(character.position.distanceTo(seatedAt) < 0.01, "seated, she doesn't walk", `${f(character.position.distanceTo(seatedAt))} m`);
await wait(300);
report(!verb(), 'at the pilot’s station no prompt (A uses the controls; B gets up)', verb());
await tap('KeyC');
await until(() => character.model?.seated === false, 3000);
await wait(500);
const there = ship.object.localToWorld(new T.Vector3(-0.2, 3.74, 2.6)); // the scene's start (-0.2, -2.6, 3.74) in glTF axes
report(character.model?.seated === false && character.position.distanceTo(there) < 0.05, 'Get up: she is in the aisle', `${f(character.position.distanceTo(there))} m from the start`);
report(angle() < 0.01, 'the joystick upright', `${f(angle())}°`);
await wait(600);
report(!dialogue.active, 'no line as she gets up (chapter 1’s taken out)', dialogue.line?.text);
await shot('standing');

// Talking to Adam Blue from the aisle (from look-probe.js and conversation-probe.js): their line, the listening turn.
look.set(['green', 'adam-blue']);
story.run('talk_adam_blue');
await wait(1000);
report(dialogue.active && dialogue.line, 'Adam Blue answers', dialogue.line ? `${dialogue.line.speaker}: ${dialogue.line.text}` : 'no line');
const a = look.state('adam-blue');
report(Math.abs(a.head) > 3, 'Adam Blue turns their head toward her', `head ${f(a.head)}°, body ${f(a.body)}°`);
await shot('talk-adam-blue');
for (let i = 0; i < 20 && dialogue.active; i++) await press();
report(!dialogue.active, 'the box ends it');
await until(() => !dialogue.cooling, 3000);
await wait(500);

// She walks, then back to the seat.
const before = character.position.clone();
key('KeyS', true);
await wait(1000);
key('KeyS', false);
await wait(300);
report(character.position.distanceTo(before) > 0.5, 'standing, she walks', `${f(character.position.distanceTo(before))} m`);
const back = there.clone();
physics.teleport(back); character.position.copy(back); character.velocity.set(0, 0, 0); character.speed = 0;
const seatAt = new T.Box3().setFromObject(w.__entity('cockpit-seat-pilot').object).getCenter(new T.Vector3()).sub(back);
w.__view.yaw = character.facing = Math.atan2(-seatAt.x, -seatAt.z); // facing the seat
await until(() => /Sit down/.test(verb()), 3000);
report(/Sit down/.test(verb()), 'behind the seat, the prompt reads Sit down', verb() || 'no prompt');
await press();
report(await until(() => character.model?.seated === true, 3000), 'Sit down: seated again, no coffee asked', dialogue.line?.text ?? '');
await wait(600);
report(!dialogue.active && w.__director()?.current === 'flight-test', 'nothing else happens (no scene change)', w.__director()?.current);
await shot('seated-again');

// The stations (pass 2, owner 2026-11-23): seated, the pilot's camera; Tab / Shift+Tab and R1 / L1 among the three.
const tab = async (shift) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', shiftKey: !!shift })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Tab', shiftKey: !!shift })); await wait(400); };
const st = w.__stations?.();
report(!!st && st.current === 'pilot', 'seated again: the pilot station’s camera', st?.current);
const order = [];
const prompts = {};
for (let i = 0; i < 3; i++) { await tab(); order.push(st?.current); prompts[st?.current] = verb(); if (st?.current) await shot(`station-${st.current}`); }
report(order.join(' ') === 'navigation signal pilot', 'Tab cycles the three stations (no third-person view)', order.join(' → '));
report(!prompts.pilot && !prompts.navigation && !prompts.signal, 'no interaction prompt at any station', JSON.stringify(prompts));
await tab(true);
report(st?.current === 'signal', 'Shift+Tab goes back (to signal)', st?.current);
const ogawa = w.__entity('ogawa').object;
report(ogawa.visible === false, 'Ogawa hidden while the signal camera is on');
// A fake pad: the right stick looks round (mouse look needs the pointer captured), then R1 and L1.
const realPads = navigator.getGamepads.bind(navigator);
const buttons = () => Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
const pad = { id: 'fake', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 1, 0], buttons: buttons() };
navigator.getGamepads = () => [pad];
const viewBefore = st.camera.quaternion.clone();
await wait(500);
pad.axes = [0, 0, 0, 0];
await wait(100);
const lookedBy = (viewBefore.angleTo(st.camera.quaternion) * 180) / Math.PI;
report(lookedBy > 5, 'the right stick looks round from the station', `${lookedBy.toFixed(1)}°`);
report(Math.abs(st.camera.fov - 90) < 0.01, 'the lens 90° by default', `${st.camera.fov}°`);
report(st.camera.far === w.__view.camera.far && st.camera.far > 500, 'the station camera sees as far as the game’s (the scenery’s reach)', `${st.camera.far} m, game ${w.__view.camera.far} m`);
const bump = async (i) => { pad.buttons = buttons(); pad.buttons[i] = { pressed: true, touched: true, value: 1 }; await wait(150); pad.buttons = buttons(); await wait(250); };
const lookedAt = st.camera.quaternion.clone();
await bump(5);
report(st?.current === 'pilot', 'R1: the next station (pilot)', st?.current);
report(ogawa.visible === true, 'Ogawa shown again');
await bump(4);
report(st?.current === 'signal', 'L1: the previous one (signal)', st?.current);
const keptBy = (lookedAt.angleTo(st.camera.quaternion) * 180) / Math.PI;
report(keptBy < 0.5, 'back at signal: the look as it was left', `${keptBy.toFixed(2)}° off`);
navigator.getGamepads = realPads;
await wait(100);
// The 2D overlay (owner, 2026-11-23): each station its own; the D-pad / arrows pick and move, A / Enter flips a button.
const ov = w.__overlay();
const overlayEl = document.querySelector('#flight-overlay');
report(ov.state.active && !overlayEl.hidden && ov.state.items.join() === 'band,dial-1,dial-2', 'signal: its overlay shown (band, two dials)', ov.state.items.join());
report(w.__controls().list.every((c) => c.outline.every((o) => !o.visible)) && document.querySelector('#control-label').hidden, 'the overlay on: no 3D outline, no label');
await tap('ArrowDown');
const dialBefore = ov.values.dial1;
await tap('ArrowRight');
report(ov.state.selected === 'dial-1' && Math.abs(ov.values.dial1 - dialBefore - 0.1) < 1e-6 && /Dial 1: 60/.test(overlayEl.textContent), 'down, right: dial 1 up a step, its label too', `${ov.state.selected} ${ov.values.dial1}`);
await tap('ArrowUp');
await tap('Enter');
report(ov.values.band === 'infrared' && overlayEl.querySelector('[data-id="band"]').classList.contains('on'), 'up, Enter: the band to infrared, lit', ov.values.band);
await shot('overlay-signal');
ov.look.on = false; // the 3D controls' checks below
await wait(100);
report(!ov.state.active && overlayEl.hidden, 'the panel’s switch off: the overlay hidden');
// The controls (pass 2, owner 2026-11-23): the meshes in place, split into controls; the D-pad / arrows by direction, the outline, A / Enter uses, a dial grabbed and turned, B lets go.
const ctl = w.__controls();
const counts = ['pilot', 'navigation', 'signal'].map((id) => ctl.list.filter((c) => c.station === id).length);
report(counts.every((n) => n >= 3), 'each station has controls from its console’s meshes', `pilot ${counts[0]}, navigation ${counts[1]}, signal ${counts[2]}`);
const sources = ['Dashboard', 'Navigation_Display', 'Dashboard_Body001'].map((n) => ship.object.getObjectByName(n));
let hidden = 0, merged = 0;
for (const n of sources) n?.traverse((o) => { if (o.isMesh && !o.name.includes('(rest)') && o.visible === false) hidden++; if (o.userData.mergedInto) merged++; });
report(hidden > 0 && merged === 0, 'the consoles kept out of the merge, drawn as their controls and the rest', `${hidden} sources hidden, ${merged} merged`);
const screenX = (c) => c.pivot.getWorldPosition(new T.Vector3()).project(st.camera).x;
report(st.current === 'signal' && ctl.selected?.station === 'signal', 'a control selected at the station (nearest the centre)', ctl.selected?.id);
const outlineShown = (c) => c.outline.every((o) => o.visible);
report(ctl.selected && outlineShown(ctl.selected) && ctl.list.filter(outlineShown).length === 1, 'the selected control alone outlined', `${ctl.list.filter(outlineShown).length} outlined`);
const label = document.querySelector('#control-label');
const box = label?.getBoundingClientRect();
const sel = ctl.selected?.pivot.getWorldPosition(new T.Vector3()).project(st.camera);
const selX = sel ? (sel.x * 0.5 + 0.5) * innerWidth : NaN, selY = sel ? (-sel.y * 0.5 + 0.5) * innerHeight : NaN;
report(label && !label.hidden && /\d/.test(label.textContent) && box.top < selY && box.bottom > selY - 40 && Math.abs((box.left + box.right) / 2 - selX) < 250, 'a label beside the selected control (placeholder text)', `"${label?.textContent}" at ${Math.round(box?.left)}, ${Math.round(box?.top)}; control at ${Math.round(selX)}, ${Math.round(selY)}`);
await shot('control-selected');
const from = ctl.selected;
await tap('ArrowRight');
report(ctl.selected !== from && screenX(ctl.selected) > screenX(from), 'right: the next control to the right on screen', `${from?.id} → ${ctl.selected?.id} (${screenX(from).toFixed(2)} → ${screenX(ctl.selected).toFixed(2)})`);
const right = ctl.selected;
await tap('ArrowLeft');
report(screenX(ctl.selected) < screenX(right), 'left: back leftwards', `${right?.id} → ${ctl.selected?.id} (${screenX(right).toFixed(2)} → ${screenX(ctl.selected).toFixed(2)})`);
const button = ctl.list.find((c) => c.station === 'signal' && c.kind === 'button');
ctl.select(button.id);
await wait(100);
const rest = button.pivot.position.clone();
key('Enter', true); key('Enter', false);
let deepest = 0;
for (let i = 0; i < 10; i++) { await wait(20); deepest = Math.max(deepest, button.pivot.position.distanceTo(rest)); }
await wait(300);
report(deepest > 0.001 && button.pivot.position.distanceTo(rest) < 1e-4, 'Enter on a button: it goes in and comes back', `${(deepest * 1000).toFixed(1)} mm`);
const dial = ctl.list.find((c) => c.station === 'signal' && c.kind === 'dial');
ctl.select(dial.id);
await wait(100);
await tap('Enter');
report(ctl.grabbed === dial, 'Enter on a dial: grabbed', ctl.grabbed?.id);
await tap('ArrowRight');
await tap('ArrowRight');
report(Math.abs(dial.turn) > 0.4 && ctl.selected === dial, 'the arrows turn it (the selection stays)', `${((dial.turn * 180) / Math.PI).toFixed(0)}°`);
await shot('dial-turned');
await tap('Backspace');
report(ctl.grabbed === null && character.model?.seated === true, 'Backspace lets go (she stays seated)', `${ctl.grabbed?.id ?? 'none'}`);
// The mouse's cursor: the control under the screen's centre (the pointer can't be captured here: the hover's pick run directly).
const centred = ctl.list.find((c) => c === ctl.selected);
const under = ctl.under(st.camera, ctl.list.filter((c) => c.station === 'signal'));
report(under !== undefined, 'the hover pick runs (the control under the centre)', under?.id ?? 'none at the centre');
report(document.querySelector('#control-cursor')?.style.display === 'none', 'no cursor without the mouse captured');
// B at signal does nothing more; at the pilot's it gets her up: the game camera.
await tap('KeyC');
report(st.current === 'signal' && character.model?.seated === true, 'at signal, B / C does nothing (no getting up there)', `${st.current}`);
void centred;
await tab();
ov.look.on = true;
await wait(100);
report(ov.state.station === 'pilot' && ov.state.items.length === 6, 'pilot: its own overlay (six controls)', ov.state.items.join());
await tap('ArrowDown');
await tap('ArrowRight');
report(w.__flight().panel.thrust === 0 && w.__flight().readout.lock === 'The engines are off.', 'the overlay’s thrust goes through the locks (refused, engines off)', w.__flight().readout.lock);
await shot('overlay-pilot');
await tap('KeyC');
await until(() => character.model?.seated === false, 3000);
await wait(200);
report(st.current === null && ogawa.visible === true, 'B at the pilot’s: up, the game camera, Ogawa shown', `${st.current}`);
report(overlayEl.hidden, 'standing: no overlay');
report(ctl.list.every((c) => !outlineShown(c)) && document.querySelector('#control-label').hidden, 'standing: no outline, no label');
await tab();
report(st.current === null, 'standing, Tab does nothing', `${st.current}`);

// Pass 3 (owner, 2026-11-23: the controls on the tuning panel for now): take-off, cruise and landing, the locks
// (flight-test/flight.ts, dev hook `__flight().use(key, value)`: as a panel change; the refusal or null).
const fl = w.__flight(), tm = w.__treadmill(), sh = w.__ship();
report(fl.landed && fl.altitude < 0.05, 'starts on the ground, engines off', `${f(fl.altitude)} m, ${fl.readout.state}`);
report(Math.abs(w.__settings.flightHeight - tm.standingHeight()) < 0.05, 'the terrain under the gear', `${f(w.__settings.flightHeight)} vs ${f(tm.standingHeight())}`);
report(sh.gearRaised === 0, 'gear down', sh.gearRaised);
report(w.__audio.noiseKeyed === 0, 'no engine noise', w.__audio.noiseKeyed);
// Refusals.
report(fl.use('thrust', 0.5) === 'The engines are off.' && fl.panel.thrust === 0, 'thrust refused with the engines off', fl.readout.lock);
report(!document.querySelector('#flight-lock').hidden, 'the lock note shows');
report(fl.use('gearUp', true) !== null && !fl.panel.gearUp, 'gear up refused on the ground', fl.readout.lock);
report(fl.use('tiltForward', true) === 'Raise the gear first.', 'tilt forward refused', fl.readout.lock);
// Ramp open, then power refused.
report(fl.use('rampOpen', true) === null, 'ramp opens on the ground, engines off');
await until(() => sh.rampState.amount > 0.5, 6000);
report(fl.use('power', true) === 'Close the ramp first.', 'power refused with the ramp open', fl.readout.lock);
fl.use('rampOpen', false);
await until(() => sh.rampState.amount === 0, 10000);
report(fl.use('power', true) === null, 'engines on');
await until(() => fl.engines >= 1, 5000);
report(w.__audio.noiseKeyed > 0.99, 'engine noise on', w.__audio.noiseKeyed);
report(fl.use('rampOpen', true) !== null, 'ramp refused with the engines on', fl.readout.lock);
// Take off.
report(fl.use('thrust', 0.5) === null, 'thrust 0.5');
await until(() => fl.altitude > 12, 15000);
report(fl.altitude > 12, 'rises', `${f(fl.altitude)} m, ${fl.readout.state}`);
report(fl.use('power', false) !== null, 'power off refused in the air', fl.readout.lock);
report(fl.use('gearUp', true) === null, 'gear up');
await until(() => sh.gearRaised >= 1, 6000);
report(sh.gearRaised === 1, 'the gear raised', sh.gearRaised);
const t0 = tm.travelled;
report(fl.use('tiltForward', true) === null, 'tilt forward');
await wait(2000);
report(sh.turbinesDown[0] < 90, 'the turbines turning forward', `${f(sh.turbinesDown[0])}°`);
await wait(4000);
await shot('pass3-cruising');
report(fl.pace > 0.2 && tm.travelled - t0 > 50, 'moving forward', `pace ${f(fl.pace)}, ${f(tm.travelled - t0)} m travelled, ${fl.readout.state}, ${f(fl.altitude)} m`);
report(fl.use('gearUp', false) !== null, 'gear down refused while tilted forward', fl.readout.lock);
// Land.
fl.use('tiltForward', false);
await until(() => fl.pace === 0 && fl.tilt === 0, 30000);
report(fl.pace === 0, 'stopped, hovering', `${fl.readout.state}, ${f(fl.altitude)} m`);
fl.use('thrust', 0);
await until(() => fl.readout.state.startsWith('held up'), 30000);
await until(() => Math.abs(fl.altitude - 4) < 0.1, 5000);
report(Math.abs(fl.altitude - 4) < 0.3, 'held at 4 m with the gear up', `${f(fl.altitude)} m, ${fl.readout.state}`);
fl.use('gearUp', false);
await until(() => fl.landed, 20000);
report(fl.landed, 'lands with the gear down', `${f(fl.altitude)} m`);
report(fl.use('power', false) === null, 'engines off on the ground');
await until(() => fl.engines === 0, 5000);
report(w.__audio.noiseKeyed === 0, 'the noise off', w.__audio.noiseKeyed);

// Never saved.
const save = await w.__save.read();
report(!save, 'nothing saved', save ? `checkpoint ${save.checkpoint}` : '');
return results;
