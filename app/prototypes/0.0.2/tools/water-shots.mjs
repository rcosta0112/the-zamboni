// Screenshots of the water's test page (water-test.html; plan: doc/plans/features/ice-and-water.md) from
// a few camera positions (the ice also without its stand-in), with the page's console errors (in app/prototypes/0.0.2):
//
//     node tools/water-shots.mjs [<folder>]     (default .export/water/)
//
// Uses the dev server already on port 5202.

import { mkdirSync, writeFileSync } from 'node:fs';
import { findChrome, openBrowser } from './browser.mjs';

const out = process.argv[2] ?? '.export/water';
mkdirSync(out, { recursive: true });
const errors = [];
const { send, close } = await openBrowser(findChrome(), (msg) => {
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) errors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
});
const run = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:5202/water-test.html' });
  for (let i = 0; i < 60 && !(await run('!!window.__water')); i++) await wait(500);
  await wait(3000);
  // [name, camera position, target]
  const views = [
    ['overview', [6, 4.5, 7], [0, -0.2, 0]],
    ['beach', [-3.2, 1.6, 3.2], [-5.2, 0, 0.4]],
    ['low', [5, 0.6, 5], [0, 0, 0]],
    ['top', [0.01, 9, 0.01], [0, 0, 0]],
    ['ice', [9, 2.2, 5], [4, 0.3, 1]],
    // The same without the stand-in (no wrap, no rim): what it adds.
    ['ice-plain', [9, 2.2, 5], [4, 0.3, 1], 'w.ice.set({ wrapStrength: 0, rimStrength: 0 });'],
  ];
  for (const [name, at, target, extra = ''] of views) {
    await run(`(() => { const w = window.__water; ${extra} w.camera.position.set(${at}); w.controls.target.set(${target}); w.controls.update(); })()`);
    await wait(1500);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}/${name}.png`, Buffer.from(shot.result.data, 'base64'));
  }
  console.log(JSON.stringify({ info: await run("document.getElementById('info').textContent"), errors }, null, 2));
} finally {
  await close();
}
