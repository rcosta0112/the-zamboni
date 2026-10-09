// Tuning panel (lil-gui, which ships with three). "Copy values" puts the current settings
// on the clipboard as JSON, to paste back into settings.ts or the prototype's README.

import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { settings } from './settings';

const ANTIALIAS_KEY = 'zamboni-01-antialias';

/** Anti-aliasing (MSAA) is fixed when the renderer is created, so it's kept in local storage and applied on reload. */
export function antialiasEnabled(): boolean {
  try {
    return localStorage.getItem(ANTIALIAS_KEY) !== '0';
  } catch {
    return true;
  }
}

export function createTuningPanel(onChange: { cameraDistance: () => void; pixelRatio: () => void }) {
  const gui = new GUI({ title: 'Tuning  ( ` or View button )' });

  const move = gui.addFolder('Movement');
  move.add(settings, 'walkSpeed', 0.5, 4, 0.1).name('walk speed (m/s)');
  move.add(settings, 'runSpeed', 2, 12, 0.1).name('run speed (m/s)');
  move.add(settings, 'indoorWalkSpeed', 0.5, 4, 0.1).name('indoor walk speed (m/s)');
  move.add(settings, 'indoorRunSpeed', 0.5, 12, 0.1).name('indoor run speed (m/s)');
  move.add(settings, 'acceleration', 1, 60, 0.5).name('acceleration (m/s²)');
  move.add(settings, 'deceleration', 5, 200, 1).name('deceleration (m/s²)');
  move.add(settings, 'turnSmoothTime', 0.02, 0.6, 0.01).name('turn smoothing (s)');

  const jump = gui.addFolder('Jump');
  jump.add(settings, 'jumpHeight', 0.2, 3, 0.05).name('height (m)');
  jump.add(settings, 'gravity', 5, 50, 0.5).name('gravity (m/s²)');

  const cam = gui.addFolder('Camera');
  cam.add(settings, 'cameraDistance', settings.cameraMinDistance, settings.cameraMaxDistance, 0.1)
    .name('distance (m)')
    .onChange(onChange.cameraDistance);
  cam.add(settings, 'cameraHeight', 0.5, 2.5, 0.05).name('aim height (m)');
  cam.add(settings, 'cameraFollowSharpness', 1, 40, 0.5).name('follow sharpness');
  cam.add(settings, 'cameraMinPitchDeg', -45, 0, 1).name('min pitch (°)');
  cam.add(settings, 'cameraMaxPitchDeg', 10, 89, 1).name('max pitch (°)');

  const input = gui.addFolder('Input');
  input.add(settings, 'stickLookSpeed', 0.5, 6, 0.1).name('stick look (rad/s)');
  input.add(settings, 'mouseSensitivity', 0.0005, 0.01, 0.0001).name('mouse sensitivity');
  input.add(settings, 'stickDeadZone', 0, 0.4, 0.01).name('stick dead zone');
  input.add(settings, 'invertY').name('invert Y').listen();

  const model = gui.addFolder('Character model');
  model.add(settings, 'showModel').name('show model (off = capsule)');
  model.add(settings, 'characterModel', { 'Zamboni Dr. Green': 'zamboni', 'Part 1 Dr. Green': 'part1' }).name('model');
  model.add(settings, 'zamboniHeight', 0.5, 2, 0.01).name('Zamboni height (m)');
  model.add(settings, 'modelScale', 0.5, 2, 0.01).name('scale');
  model.add(settings, 'modelYawOffsetDeg', -180, 180, 90).name('facing offset (°)');
  model.add(settings, 'walkAnimSpeed', 0.5, 4, 0.05).name('walk cycle at (m/s)');
  model.add(settings, 'runAnimSpeed', 2, 12, 0.1).name('run cycle at (m/s)');
  model.add(settings, 'animStartBlend', 0, 0.5, 0.01).name('start blend (s)');
  model.add(settings, 'animStopBlend', 0, 0.8, 0.01).name('stop blend (s)');

  const look = gui.addFolder('Look');
  look.add(settings, 'toneMapping', ['ACES', 'AgX', 'Neutral']).name('tone mapping');
  look.add(settings, 'exposure', 0.3, 3, 0.01).name('exposure');
  look.add(settings, 'sunElevationDeg', 5, 85, 1).name('sun elevation (°)');
  look.add(settings, 'sunAzimuthDeg', -180, 180, 1).name('sun direction (°)');
  look.add(settings, 'sunIntensity', 0, 15, 0.1).name('sun strength');
  look.add(settings, 'worldStrength', 0, 3, 0.05).name('world strength');
  look.add(settings, 'haze').name('distance haze');
  look.add(settings, 'hazeNear', 0, 150, 1).name('haze starts (m)');
  look.add(settings, 'hazeFar', 20, 400, 1).name('haze full (m)');
  look.add(settings, 'showGrid').name('grid');
  look.add(settings, 'showColliders').name('show colliders');
  look.add(settings, 'cargoRampOpen').name('cargo ramp open');

  const cut = gui.addFolder('See-through hull');
  cut.add(settings, 'seeThrough').name('on (inside the ship)');
  cut.add(settings, 'cutRadius', 0.2, 4, 0.05).name('radius (m)');
  cut.add(settings, 'cutSoftness', 0, 1.5, 0.05).name('edge softness (m)');
  cut.add(settings, 'cutTargetHeight', 0.2, 1.5, 0.05).name('target height (m)');
  cut.add(settings, 'cutOwnColour').name('cut edge in own colour');
  cut.add(settings, 'cutShade', 0, 1, 0.05).name('own colour brightness');
  cut.addColor(settings, 'cutBackColor').name('cut edge colour');
  cut.add(settings, 'holeOnlyWhenHidden').name('hole only when hidden');
  cut.add(settings, 'dividersWhole').name('bulkheads cut as a whole');
  cut.add(settings, 'bulkheadsAlwaysVisible').name('bulkheads always visible');
  cut.add(settings, 'furnitureLook', { 'hole': 'hole', 'whole-object fade': 'fade' }).name('furniture look');
  cut.add(settings, 'furnitureMinVisibility', 0, 0.9, 0.05).name('fade: min visibility');
  cut.add(settings, 'furnitureFadeTime', 0, 1, 0.05).name('furniture fade (s)');
  cut.add(settings, 'furnitureHoldTime', 0, 1.5, 0.05).name('clear before back (s)');
  cut.add(settings, 'wayAheadDistance', 0, 3, 0.1).name('way ahead (m)');
  cut.add(settings, 'furnitureNearPart', 0, 1, 0.05).name('furniture cut near camera');
  cut.add(settings, 'furnitureWaist', 0, 1, 0.05).name('...above (share of her height)');
  cut.add(settings, 'furnitureCoverage', 0, 1, 0.05).name('cut if it hides more than');
  cut.add(settings, 'showOccluders').name('tint cut furniture');
  cut.add(settings, 'cameraCollision').name('camera collision (outside)');

  const render = gui.addFolder('Rendering');
  render.add(settings, 'maxPixelRatio', 0.1, 3, 0.05).name('max pixel ratio').onChange(onChange.pixelRatio);
  render.add(settings, 'pixelated').name('pixelated upscale').onChange(onChange.pixelRatio);
  render.add({ antialias: antialiasEnabled() }, 'antialias').name('anti-aliasing (reloads)').onChange((on: boolean) => {
    try {
      localStorage.setItem(ANTIALIAS_KEY, on ? '1' : '0');
    } catch {
      /* storage unavailable: the setting isn't kept */
    }
    location.reload();
  });

  gui
    .add(
      {
        copy: () => {
          void navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
        },
      },
      'copy',
    )
    .name('Copy values');

  gui.close();
  return gui;
}
