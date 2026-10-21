// Tuning panel (lil-gui, which ships with three). "Copy values" puts the current settings
// on the clipboard as JSON, to paste back into settings.ts or the prototype's README. "Copy view"
// puts her position and the camera's angles there, to reproduce a screenshot.

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

export function createTuningPanel(onChange: { pixelRatio: () => void }, describeView: () => object) {
  const gui = new GUI({ title: `Tuning · ${__VERSION__}  ( \` or View button )` });

  const move = gui.addFolder('Movement');
  move.add(settings, 'walkSpeed', 0.5, 4, 0.1).name('walk speed (m/s)');
  move.add(settings, 'runSpeed', 2, 12, 0.1).name('run speed (m/s)');
  move.add(settings, 'indoorWalkSpeed', 0.5, 4, 0.1).name('indoor walk speed (m/s)');
  move.add(settings, 'indoorRunSpeed', 0.5, 12, 0.1).name('indoor run speed (m/s)');
  move.add(settings, 'acceleration', 1, 60, 0.5).name('acceleration (m/s²)');
  move.add(settings, 'deceleration', 5, 200, 1).name('deceleration (m/s²)');
  move.add(settings, 'turnSmoothTime', 0.02, 0.6, 0.01).name('turn smoothing (s)');
  move.add(settings, 'indoorDirectMove').name('indoors: moves the way the stick points');
  move.add(settings, 'collisionBoxes').name('collision boxes (shown with colliders)');

  const jump = gui.addFolder('Jump');
  jump.add(settings, 'jumpHeight', 0.2, 3, 0.05).name('height (m)');
  jump.add(settings, 'indoorJumpHeight', 0.2, 3, 0.05).name('height indoors (m)');
  jump.add(settings, 'gravity', 5, 50, 0.5).name('gravity (m/s²)');

  const fly = gui.addFolder('Jetpack');
  fly.add(settings, 'wearingJetpack').name('wearing a jetpack').listen();
  fly.add(settings, 'outfit', ['jumpsuit', 'parka']).name('outfit').listen();
  fly.add(settings, 'parachute').name('auto-parachute');
  fly.add(settings, 'parachuteMinDrop', 2, 20, 0.5).name('auto-parachute: lowest fall (m)');
  fly.add(settings, 'parachuteLandingSpeed', 0.5, 6, 0.1).name('auto-parachute: landing speed (m/s)');
  fly.add(settings, 'parachuteBurst', 0.1, 1, 0.01).name('auto-parachute: burst on the lowest fall (s)');
  fly.add(settings, 'flySpeed', 1, 40, 0.5).name('top speed (m/s)');
  fly.add(settings, 'flyThrust', 1, 60, 0.5).name('flight: thrust (m/s²)');
  fly.add(settings, 'flyVerticalFollow', 0.2, 10, 0.1).name('flight: up/down follows the camera (/s)');
  fly.add(settings, 'cruiseSpeed', 0.5, 15, 0.1).name('flight from (m/s)');
  fly.add(settings, 'hoverDriftSpeed', 0.1, 5, 0.1).name('hover: drift up to (m/s)');
  fly.add(settings, 'hoverStickShare', 0.1, 0.95, 0.01).name('hover: drift on the stick up to');
  fly.add(settings, 'flyAcceleration', 1, 60, 0.5).name('hover drift: acceleration (m/s²)');
  fly.add(settings, 'flyDeceleration', 5, 200, 1).name('hover drift: deceleration (m/s²)');
  fly.add(settings, 'flightBlendTime', 0, 1.5, 0.05).name('hover ↔ flight handover (s)');
  fly.add(settings, 'cameraMinPitchFlyingDeg', -80, 0, 1).name('camera min pitch, flying (°)');
  fly.add(settings, 'flyLowest', 0, 5, 0.1).name('lowest flight (m)');
  fly.add(settings, 'flyGroundDrag', 0, 30, 0.5).name('flight: ground contact drag (m/s²)');
  fly.add(settings, 'glideDrag', 0, 20, 0.1).name('glide: speed lost (m/s²)');
  fly.add(settings, 'glideLift', 0, 1, 0.05).name('glide: gravity cancelled at top speed');
  fly.add(settings, 'glideSink', 0.5, 20, 0.5).name('glide: fastest fall at top speed (m/s)');
  fly.add(settings, 'skidFriction', 1, 60, 0.5).name('skid: speed lost (m/s²)');
  fly.add(settings, 'flyTriggerOff', 0, 0.3, 0.01).name('R2: off below');
  fly.add(settings, 'hoverLow', 0.05, 0.95, 0.01).name('R2: hover from');
  fly.add(settings, 'hoverHigh', 0.05, 0.95, 0.01).name('R2: hover to');
  fly.add(settings, 'hoverHysteresis', 0, 0.15, 0.01).name('R2: hover band widens by');
  fly.add(settings, 'flyClimbSpeed', 0.5, 20, 0.5).name('R2: climb speed (also Space) (m/s)');
  fly.add(settings, 'flyDescendSpeed', 0.5, 20, 0.5).name('R2: descend speed (m/s)');
  fly.add(settings, 'flyVerticalAcceleration', 1, 60, 0.5).name('R2: vertical acceleration (m/s²)');
  fly.add(settings, 'jetSoundFollowsTrigger').name('jet sound follows R2');
  fly.add(settings, 'jetSoundLowLevel', 0, 1, 0.01).name('jet sound: level at R2 bottom');
  fly.add(settings, 'jetSoundLowRate', 0.5, 1, 0.01).name('jet sound: pitch at R2 bottom');
  fly.add(settings, 'jetSoundHighRate', 1, 1.5, 0.01).name('jet sound: pitch at R2 top');
  fly.add(settings, 'exhaustGlow').name('exhaust glow');
  fly.add(settings, 'exhaustSize', 0.01, 0.3, 0.005).name('glow: size (share of screen)');
  fly.add(settings, 'exhaustCore', 0.05, 1, 0.01).name('glow: white core (share)');
  fly.addColor(settings, 'exhaustCoreColor').name('glow: core colour');
  fly.addColor(settings, 'exhaustHaloColor').name('glow: halo colour');
  fly.add(settings, 'exhaustHalo', 0, 3, 0.05).name('glow: halo brightness');
  fly.add(settings, 'exhaustLowLevel', 0, 1, 0.01).name('glow: at R2 bottom (follows jet sound switch)');
  fly.add(settings, 'exhaustFlicker', 0, 0.6, 0.01).name('glow: flicker (share)');
  fly.add(settings, 'exhaustFlickerRate', 1, 60, 1).name('glow: flicker rate (/s)');
  fly.add(settings, 'exhaustShake', 0, 0.03, 0.001).name('glow: shake (m)');
  fly.add(settings, 'exhaustOut', 0, 0.2, 0.005).name('glow: out of the nozzle (m)');
  fly.add(settings, 'exhaustTowardCamera', 0, 0.3, 0.01).name('glow: toward the camera (m)');

  const cam = gui.addFolder('Camera');
  cam.add(settings, 'cameraDistanceIndoors', 1, 12, 0.1).name('distance indoors (m)');
  cam.add(settings, 'cameraDistanceOutdoors', 1, 12, 0.1).name('distance outdoors (m)');
  cam.add(settings, 'cameraHeight', 0.5, 2.5, 0.05).name('aim height (m)');
  cam.add(settings, 'cameraFollowSharpness', 1, 40, 0.5).name('follow sharpness');
  cam.add(settings, 'cameraMinPitchDeg', -45, 0, 1).name('min pitch (°)');
  cam.add(settings, 'cameraMaxPitchDeg', 10, 89, 1).name('max pitch (°)');
  cam.add(settings, 'cameraWallGap', 0, 0.6, 0.01).name('gap to walls (m)');
  cam.add(settings, 'cameraMinDistance', 0.1, 1.5, 0.01).name('closest to her (m)');
  cam.add(settings, 'cameraFadeStart', 0.2, 3, 0.05).name('she fades from (m)');
  cam.add(settings, 'cameraFadeEnd', 0, 2, 0.05).name('she is gone at (m)');

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
  look.add(settings, 'sunThroughGlass').name('sun through glass');
  look.add(settings, 'shadowMapSize', [1024, 2048, 4096]).name('shadow map (px)');
  look.add(settings, 'shadowRangeIndoors', 8, 40, 1).name('shadow range indoors (m)');
  look.add(settings, 'shadowRangeOutdoors', 8, 100, 1).name('shadow range outdoors (m)');
  look.add(settings, 'worldIndoors', 0, 1, 0.05).name('world light indoors');
  look.add(settings, 'sunlitRoomWarmth', 0, 1, 0.05).name('warm light: crew q., cockpit');
  look.add(settings, 'metalReflections', 0, 2, 0.05).name('metal reflections');
  look.add(settings, 'haze').name('distance haze');
  look.add(settings, 'hazeNear', 0, 150, 1).name('haze starts (m)');
  look.add(settings, 'hazeFar', 20, 400, 1).name('haze full (m)');
  look.add(settings, 'showGrid').name('grid');
  look.add(settings, 'showColliders').name('show colliders');
  look.add(settings, 'cargoRampOpen').name('cargo ramp open').listen();

  const interact = gui.addFolder('Interaction');
  interact.add(settings, 'interactReach', 0.3, 3, 0.05).name('reach (m)');
  interact.add(settings, 'talkReach', 0.3, 3, 0.05).name('talk reach (m)');
  interact.add(settings, 'interactMaxAngleDeg', 5, 90, 1).name('max from centre (°)');
  interact.add(settings, 'dialogueCharMs', 0, 120, 1).name('text: ms a character');
  interact.add(settings, 'dialogueTypeEvery', 0, 6, 1).name('text: a key sound every');
  interact.add(settings, 'doorSeconds', 0.1, 3, 0.05).name('door open time (s)');
  interact.add(settings, 'slideSeconds', 0.1, 3, 0.05).name('sliding door time (s)');
  interact.add(settings, 'leverDelay', 0, 2, 0.05).name('window after its lever (s)');
  interact.add(settings, 'autoDoors').name('bulkhead doors open by themselves');
  interact.add(settings, 'autoDoorDistance', 0.5, 4, 0.05).name('...when she is within (m)');
  interact.add(settings, 'doorsPush').name('doors push her');
  interact.add(settings, 'climbSpeed', 0.3, 4, 0.05).name('climb speed (m/s)');
  interact.add(settings, 'ladderFloat', 0, 2, 0.05).name('float off the ladder top (s)');

  const lights = gui.addFolder('Room lights');
  lights.add(settings, 'roomLights', ['nearest 4', 'all']).name('on');
  lights.add(settings, 'roomLightIntensity', 0, 20, 0.1).name('brightness');
  lights.add(settings, 'roomLightRange', 1, 20, 0.5).name('range (m)');

  const sound = gui.addFolder('Sound');
  sound.add(settings, 'soundMute').name('mute');
  sound.add(settings, 'volumeMaster', 0, 1, 0.01).name('volume: everything');
  sound.add(settings, 'volumeMusic', 0, 1, 0.01).name('volume: music');
  sound.add(settings, 'volumeAmbience', 0, 1, 0.01).name('volume: ambience');
  sound.add(settings, 'volumeSfx', 0, 1, 0.01).name('volume: effects');
  sound.add(settings, 'volumeUi', 0, 1, 0.01).name('volume: interface');
  sound.add(settings, 'volumeInteraction', 0, 3, 0.05).name('interaction sounds');
  sound.add(settings, 'volumeSteps', 0, 3, 0.05).name('footsteps');
  sound.add(settings, 'shipFlying').name('ship flying (its noise)').listen();
  sound.add(settings, 'shipNoiseA', 0, 1, 0.01).name('ship noise: flight sound');
  sound.add(settings, 'shipNoiseB', 0, 1, 0.01).name('ship noise: landing sound');
  sound.add(settings, 'shipNoiseOutdoors', 0, 1, 0.05).name('ship noise outside the ship');
  sound.add(settings, 'windIndoors', 0, 1, 0.01).name('wind inside the ship');
  sound.add(settings, 'windCargoOpen', 0, 1, 0.01).name('wind in the cargo bay, ramp + door open');
  sound.add(settings, 'boomboxFullWithin', 0.5, 10, 0.1).name('boombox: full within (m)');
  sound.add(settings, 'boomboxGoneAt', 2, 40, 0.5).name('boombox: silent at (m)');
  sound.add(settings, 'boomboxVibration', 0, 5, 0.1).name('boombox: vibration');

  const cut = gui.addFolder('See-through hull');
  cut.add(settings, 'seeThrough').name('on (inside the ship)');
  cut.add(settings, 'cutRadius', 0.2, 4, 0.05).name('radius (m)');
  cut.add(settings, 'cutSoftness', 0, 1.5, 0.05).name('edge softness (m)');
  cut.add(settings, 'cutTargetHeight', 0.2, 1.5, 0.05).name('target height (m)');
  cut.add(settings, 'holeEnd', ['square', 'vertical', 'round']).name("hole's far end");
  cut.add(settings, 'holeBeyond', -0.5, 1.5, 0.05).name('hole goes past her (m)');
  cut.add(settings, 'singleSided').name('single-sided materials');
  cut.add(settings, 'cutOwnColour').name('cut edge in own colour');
  cut.add(settings, 'cutShade', 0, 1, 0.05).name('own colour brightness');
  cut.addColor(settings, 'cutBackColor').name('cut edge colour');
  cut.addColor(settings, 'hullGapColour').name('hull gap colour');
  cut.add(settings, 'hullGapBlack').name('hull gap black');
  cut.add(settings, 'holeOnlyWhenHidden').name('hole only when hidden');
  // See-through from scratch (owner, 2026-10-14): the rules' settings are left out of the panel
  // until their rule comes back (settings.seeThroughStage).
  cut.add(settings, 'cameraCollision').name('camera collision (outside)');
  cut.add(settings, 'cameraInsideHull').name('camera stays inside the hull');
  cut.add(settings, 'cameraCollidesFurniture').name('camera in front of crew quarters furniture');
  cut.add(settings, 'cameraCollidesBulkheads').name('camera in front of bulkheads, their doors');

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
  // Where she is and where the camera looks, to reproduce a screenshot in a check (probe-01.mjs).
  gui
    .add({ view: () => void navigator.clipboard.writeText(JSON.stringify(describeView())) }, 'view')
    .name('Copy view (for a screenshot)');

  // Everything starts collapsed: the folders, and the panel itself.
  for (const folder of gui.foldersRecursive()) folder.close();
  gui.close();
  return gui;
}
