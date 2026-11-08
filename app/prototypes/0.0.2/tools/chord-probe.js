// The temple's chord (the synth, doc/architecture/audio.md) heard near the temple, not from 400 m off. Run:
//   node tools/probe-01.mjs tools/chord-probe.js --game --query scene=landed
const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const THREE = w.__THREE;
const shown = await until(() => w.__landmarks()?.shown.get('temple'), 20000);
if (!shown) { report(false, 'temple shown'); return results; }
const audio = w.__audio;
await audio.unlock();
await wait(500);
report(audio.context.state === 'running', 'audio context running', audio.context.state);
const an = new AnalyserNode(audio.context, { fftSize: 32768 });
audio.listener.getInput().connect(an);
const measure = () => {
  const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
  let s = 0; for (const x of d) s += x * x;
  const f = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(f);
  const hz = (i) => (i * audio.context.sampleRate) / an.fftSize;
  const peaks = [];
  for (let i = 2; i < 1500; i++) if (f[i] > f[i - 1] && f[i] >= f[i + 1] && f[i] > -75) peaks.push([Math.round(hz(i)), Math.round(f[i])]);
  peaks.sort((a, b) => b[1] - a[1]);
  return { rms: Math.sqrt(s / d.length), peaks: peaks.slice(0, 6) };
};
const view = w.__view;
view.update = () => {};
const at = shown.object.getWorldPosition(new THREE.Vector3());
const place = (dist) => {
  view.camera.position.copy(at).add(new THREE.Vector3(dist, 3, 0));
  view.camera.lookAt(at);
  view.camera.updateMatrixWorld();
};
place(400);
await wait(2500);
const far = measure();
report(far.peaks.every(([h]) => Math.abs(h - 131) > 3), 'not heard 400 m off', JSON.stringify(far.peaks));
place(15);
await wait(3000);
const near = measure();
const has = (h) => near.peaks.some(([p]) => Math.abs(p - h) < 3);
report(has(131) && (has(196) || has(220) || has(247)), 'heard 15 m off: C3 and the line (G3/A3/B3)', `rms ${near.rms.toFixed(4)} ${JSON.stringify(near.peaks)}`);
return results;
