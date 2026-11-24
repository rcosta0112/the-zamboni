// The gear's and the turbines' motor sounds on the flight test page (keyedMotorSound, doors.ts). In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/flight-sounds-probe.js --page flight-test.html --stay
//
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
const audio = w.__audio;
await audio.unlock();
await until(() => audio.context.state === 'running', 3000);
report(audio.context.state === 'running', 'sound on', audio.context.state);
await until(() => w.__flight, 30000);
const fl = w.__flight(), sh = w.__ship();
const n = (id) => audio.started[id] ?? 0;
const playing = (id) => audio.playing().includes(id);

// The scene takes a while to begin: the panel refuses until then.
let why = 'not tried';
await until(() => (why = fl.use('power', true)) === null, 60000);
report(why === null, 'engines on', why);
await until(() => (why = fl.use('thrust', 0.5)) === null, 60000);
report(why === null, 'thrust', why);
await until(() => fl.altitude > 5, 30000);
report(n('sfx_gear_up_move') === 0, 'no gear sound before it moves', n('sfx_gear_up_move'));
const refused = fl.use('gearUp', true);
report(refused === null, 'gear up allowed', `${refused}, ${fl.altitude.toFixed(2)} m`);
await wait(1000);
report(true, 'gear key after 1 s', `${fl.keys.gear.toFixed(2)}, ship ${sh.gearRaised}`);
report(n('sfx_gear_up_move') === 1 && playing('sfx_gear_up_move'), 'gear up: its motor runs while it moves', `${n('sfx_gear_up_move')} started`);
await until(() => sh.gearRaised >= 1, 6000);
await wait(400);
report(n('sfx_gear_up_stop') === 1 && !playing('sfx_gear_up_move'), 'gear up: the motor stops, the stop heard once', `stop ${n('sfx_gear_up_stop')}, move ${n('sfx_gear_up_move')}`);
fl.use('tiltForward', true);
await wait(1000);
report(n('sfx_tilt_forward_move') === 1 && playing('sfx_tilt_forward_move'), 'tilt forward: its motor runs', n('sfx_tilt_forward_move'));
await until(() => fl.tilt >= 1, 6000);
await wait(400);
report(n('sfx_tilt_stop') === 1 && !playing('sfx_tilt_forward_move'), 'tilt forward: stopped, the stop once', `stop ${n('sfx_tilt_stop')}`);
fl.use('tiltForward', false);
await wait(1000);
report(n('sfx_tilt_down_move') === 1 && playing('sfx_tilt_down_move'), 'tilt down: its own motor', n('sfx_tilt_down_move'));
await until(() => fl.tilt === 0, 8000);
await wait(400);
report(n('sfx_tilt_stop') === 2, 'tilt down: the stop', n('sfx_tilt_stop'));
await until(() => fl.pace === 0, 30000);
fl.use('gearUp', false);
await wait(1000);
report(n('sfx_gear_down_move') === 1 && playing('sfx_gear_down_move'), 'gear down: its own motor', n('sfx_gear_down_move'));
await until(() => sh.gearRaised === 0, 6000);
await wait(400);
report(n('sfx_gear_down_stop') === 1 && !playing('sfx_gear_down_move'), 'gear down: the stop', n('sfx_gear_down_stop'));
report(n('sfx_gear_up_move') === 1 && n('sfx_tilt_forward_move') === 1, 'no stray restarts', `gear up ${n('sfx_gear_up_move')}, tilt forward ${n('sfx_tilt_forward_move')}`);

return results;
