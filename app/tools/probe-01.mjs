// One question to the running prototype 01, instead of the whole scripted check (in app/):
//
//     node tools/probe-01.mjs <file.js> [--shot <out.png>] [--shots <folder>] [--stay]
//     npm run probe -- <file.js>
//
// The file is the body of an async function run in the page once the ship is loaded; what it
// returns is printed as JSON. It has `w` (window, with the dev hooks of main.ts: `__ship()`,
// `__settings`, `__character`…), `T` (three), `ship`, `wait(ms)`, `until(test, ms)` and
// `shot(name)`, which saves a screenshot as <folder>/<name>.png (with `--shots`; otherwise it does
// nothing). With `--shot`, a screenshot of the page is saved after it has run. A key is pressed first (Q, which the
// game doesn't use): the browser keeps the sound off until then. Then the start screen's button is
// used, once it's there; with `--stay` it isn't, and the file runs with the start screen up.
// Console errors are printed.
// Uses the dev server already on port 5201, or starts one. For trying a check out before it goes
// into smoke-01.mjs, and for looking at one thing after a change.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { answers, findChrome, openBrowser, useStartButton } from './browser.mjs';

const URL_01 = 'http://localhost:5201/';
const PROTOTYPE = resolve(dirname(fileURLToPath(import.meta.url)), '../prototypes/01-walk');

const args = process.argv.slice(2);
const shotAt = args.indexOf('--shot');
const shot = shotAt >= 0 ? args.splice(shotAt, 2)[1] : null;
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
if (shots) mkdirSync(shots, { recursive: true });
const soundAt = args.indexOf('--sound'); // from before the key was always pressed
if (soundAt >= 0) args.splice(soundAt, 1);
const stayAt = args.indexOf('--stay');
if (stayAt >= 0) args.splice(stayAt, 1);
if (!args[0]) {
  console.error('probe: node tools/probe-01.mjs <file.js> [--shot <out.png>] [--stay]');
  process.exit(2);
}
const body = readFileSync(args[0], 'utf8');
const chromePath = findChrome();
if (!chromePath) {
  console.error('probe: no Chrome found. Set CHROME_PATH to a Chrome or Edge executable.');
  process.exit(2);
}

let server = null;
if (!(await answers(URL_01))) {
  const { createServer } = await import('vite');
  server = await createServer({ root: PROTOTYPE, logLevel: 'error' });
  await server.listen();
}
let code = 0;
let browser = null;
try {
  browser = await openBrowser(chromePath, (msg) => {
    // shot(name) in the file: the page asks, this captures, the page waits on __probeShotDone.
    if (msg.method === 'Runtime.bindingCalled' && msg.params.name === '__probeShot') {
      const name = msg.params.payload;
      void browser.send('Page.captureScreenshot', { format: 'png' }).then((image) => {
        const file = resolve(shots, `${name}.png`);
        writeFileSync(file, Buffer.from(image.result.data, 'base64'));
        console.log('screenshot:', file);
        return browser.send('Runtime.evaluate', { expression: `window.__probeShotDone = ${JSON.stringify(name)}` });
      });
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') console.log('CONSOLE ERROR', msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    else if (msg.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  });
  const { send } = browser;
  await send('Runtime.enable');
  await send('Page.enable');
  if (shots) await send('Runtime.addBinding', { name: '__probeShot' });
  await send('Page.navigate', { url: URL_01 });
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 80; i++) {
    const ready = await send('Runtime.evaluate', { expression: 'Boolean(window.__audio)', returnByValue: true });
    if (ready.result.result.value) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81, text: type === 'keyDown' ? 'q' : undefined });
  if (stayAt < 0 && !(await useStartButton(send))) throw new Error('the start button never came, or the game did not begin');
  const expression = `(async () => {
    const w = window;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (test, ms) => {
      const start = performance.now();
      while (!test() && performance.now() - start < ms) await wait(30);
      return test();
    };
    const shot = async (name) => {
      if (!w.__probeShot) return;
      w.__probeShot(name);
      await until(() => w.__probeShotDone === name, 10000);
    };
    if (!(await until(() => w.__ship?.() && w.__crew?.() && w.__interaction?.(), 60000))) throw new Error('no ship after 60 s');
    const T = w.__THREE;
    const ship = w.__ship();
    ${body}
  })()`;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.result.exceptionDetails) {
    console.log('FAILED', result.result.exceptionDetails.exception?.description ?? result.result.exceptionDetails.text);
    code = 1;
  } else {
    console.log(JSON.stringify(result.result.result.value, null, 1));
  }
  if (shot) {
    const image = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(shot, Buffer.from(image.result.data, 'base64'));
    console.log('screenshot:', shot);
  }
} catch (err) {
  console.error(`probe: ${err instanceof Error ? err.message : String(err)}`);
  code = 1;
} finally {
  await browser?.close();
  await server?.close();
}
process.exit(code);
