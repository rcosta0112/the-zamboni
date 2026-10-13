// Headless Chrome for the scripted checks (smoke-01.mjs, probe-01.mjs): no dependencies, Chrome's
// DevTools protocol over Node's own WebSocket (Node 22). Chrome is found in its usual places; set
// CHROME_PATH to use another.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function findChrome() {
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

/** Whether something answers at this address (a dev server already running). */
export async function answers(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

/**
 * Prototype 01's start screen: wait for its button (it's there once everything is loaded), then use
 * it with Enter, as a player would. A real key, sent through DevTools: the page's own simulated
 * keys don't turn the sound on. False if the button never came or the game didn't begin.
 */
export async function useStartButton(send, timeout = 90000) {
  const state = async () => (await send('Runtime.evaluate', { expression: 'window.__start?.() ?? null', returnByValue: true })).result.result.value;
  const until = async (test, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (test(await state())) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  };
  if (!(await until((s) => s?.ready, timeout))) return false;
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: type === 'keyDown' ? '\r' : undefined });
  return until((s) => s?.begun, 3000);
}

/**
 * Start Chrome with one blank page. `onEvent` gets every DevTools event (console calls,
 * exceptions). Returns `send(method, params)` and `close()`.
 */
export async function openBrowser(chromePath, onEvent = () => {}) {
  const profile = mkdtempSync(join(tmpdir(), 'zamboni-smoke-'));
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720', '--enable-unsafe-webgpu', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const close = async () => {
    chrome.kill();
    await new Promise((r) => setTimeout(r, 500));
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* Chrome still holds a file: the folder is in the system's temp directory */
    }
  };
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
      onEvent(msg);
    };
    const send = (method, params = {}) =>
      new Promise((done) => {
        const id = ++nextId;
        waiting.set(id, done);
        socket.send(JSON.stringify({ id, method, params }));
      });
    return {
      send,
      close: async () => {
        socket.close();
        await close();
      },
    };
  } catch (err) {
    await close();
    throw err;
  }
}
