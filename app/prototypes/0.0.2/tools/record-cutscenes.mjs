// A video of the cutscenes, for reference (owner, 2026-10-28). From this version's folder:
//
//     node tools/record-cutscenes.mjs [<out.mp4>] [--query scene=opening]
//
// A new game in the game's own mode, recorded from the start button through cutscene 1 and cutscene 2
// until a moment after cutscene 2 ends (`--query scene=opening`: cutscene 2 alone). The page's frames
// as Chrome draws them (DevTools screencast, about 55 fps), with their times: the video plays in real
// time, at 60 fps, H.264 (ffmpeg). No sound (the test browser is muted); the page is 1264×569, wider
// than a normal window, and the dev overlays (frame rate, *Tuning*) are in the picture. The frames go
// to `.export/record/` (not in git), the video to <out.mp4> (default `.export/cutscenes.mp4`).
// Uses the dev server on port 5202 (start it first). About 80 s for both.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { answers, findChrome, openBrowser, useStartButton } from './browser.mjs';

const PROTOTYPE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const queryAt = args.indexOf('--query');
const query = queryAt >= 0 ? args.splice(queryAt, 2)[1] : null;
const out = resolve(args[0] ?? join(PROTOTYPE, '.export', 'cutscenes.mp4'));
const url = 'http://localhost:5202/' + (query ? `?${query}` : '');
const frames = join(PROTOTYPE, '.export', 'record');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
if (!(await answers(url))) {
  console.error('record: no dev server on 5202 (npm run dev in app/)');
  process.exit(2);
}

const times = [];
let browser = null;
browser = await openBrowser(findChrome(), (msg) => {
  if (msg.method === 'Page.screencastFrame') {
    writeFileSync(join(frames, `f${String(times.length).padStart(5, '0')}.jpg`), Buffer.from(msg.params.data, 'base64'));
    times.push(msg.params.metadata.timestamp);
    void browser.send('Page.screencastFrameAck', { sessionId: msg.params.sessionId });
  } else if (msg.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
});
const { send } = browser;
const value = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result?.value;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  for (let i = 0; i < 200 && !(await value('Boolean(window.__audio)')); i++) await pause(250);
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'q', code: 'KeyQ', windowsVirtualKeyCode: 81, text: type === 'keyDown' ? 'q' : undefined });
  // Recording starts once the button is there, just before it's used.
  for (let i = 0; i < 450 && !(await value('window.__start?.().ready')); i++) await pause(200);
  await send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1280, maxHeight: 720 });
  if (!(await useStartButton(send))) throw new Error('the start button never came, or the game did not begin');
  const start = Date.now();
  let watched = false, endedAt = null;
  while (Date.now() - start < 300000 && !(endedAt && Date.now() - endedAt > 1500)) {
    await pause(250);
    const playing = await value('window.__watched?.()?.playing');
    if (playing) watched = true;
    if (watched && !playing && endedAt === null) endedAt = Date.now();
  }
  await send('Page.stopScreencast');
  await pause(500);
  if (!endedAt) console.log('cutscene 2 never ended: recorded 5 minutes');
} finally {
  await browser.close();
}

// Each frame shown until the next one came: real time, whatever the frame rate was.
let list = '';
times.forEach((t, i) => (list += `file 'f${String(i).padStart(5, '0')}.jpg'\nduration ${((times[i + 1] ?? t + 1 / 60) - t).toFixed(4)}\n`));
list += `file 'f${String(times.length - 1).padStart(5, '0')}.jpg'\n`;
writeFileSync(join(frames, 'list.txt'), list);
mkdirSync(dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frames, 'list.txt'), '-vf', 'fps=60,crop=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', out], { stdio: 'inherit' });
console.log(`${times.length} frames, ${(times.at(-1) - times[0]).toFixed(1)} s → ${out}`);
