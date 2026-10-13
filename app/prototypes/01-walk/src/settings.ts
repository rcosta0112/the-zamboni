// Tunable values, edited live in the tuning panel. Starting values come from Part 1
// (Big Moon Tiny Moon, Main.unity) where they exist; see doc/plans/prototypes/01-walk.md.

export const settings = {
  // Movement (m/s, m/s²). Part 1: walk 1.5, run 7, acceleration 0.1/frame ≈ 6 m/s²,
  // deceleration 20× acceleration. Outdoor speeds; inside the ship the indoor ones apply.
  walkSpeed: 1.5,
  runSpeed: 7,
  indoorWalkSpeed: 1.5,
  indoorRunSpeed: 3.5,
  acceleration: 6,
  deceleration: 120,
  // Seconds to turn toward the movement direction (Part 1: 0.2).
  turnSmoothTime: 0.2,

  // Jump. Part 1's jump was switched off, so these are new starting points.
  jumpHeight: 1.0,
  gravity: 20,

  // Camera
  // Fixed distances, no zoom (owner, 2026-10-12): the camera eases from one to the other when she
  // crosses the ship's "inside" test. Starting values: the owner is tuning them.
  cameraDistanceIndoors: 3.5,
  cameraDistanceOutdoors: 4.5,
  cameraHeight: 1.0,
  cameraFollowSharpness: 12,
  cameraMinPitchDeg: 0, // owner, 2026-10-12: fixes several see-through problems
  cameraMaxPitchDeg: 70,

  // Input
  stickLookSpeed: 2.6, // rad/s at full right-stick deflection
  mouseSensitivity: 0.0025, // rad per pixel
  stickDeadZone: 0.15,
  invertY: true, // inverted by default in prototypes; production builds default to normal

  // Character model: 'zamboni' (the crew file's Dr. Green with Part 1's animations, retargeted)
  // or 'part1' (Part 1's Dr. Green, 1.23 m tall as authored).
  showModel: true,
  characterModel: 'zamboni' as 'zamboni' | 'part1',
  modelScale: 1,
  modelYawOffsetDeg: 0, // extra facing correction on top of each model's own
  // The Zamboni Dr. Green is ~0.75 m tall in the crew file; scaled to Part 1's height by default.
  zamboniHeight: 1.23,
  zamboniBaseYawDeg: 180,
  retargetYawFixDeg: 0, // applied when retargeting at load; needs a reload to change
  // Speeds (m/s) at which the walk and run cycles play at normal speed, so feet match the ground.
  walkAnimSpeed: 1.5,
  runAnimSpeed: 7,
  // Seconds for the animation to ease toward the character's speed (time constant).
  animStartBlend: 0.08,
  animStopBlend: 0.18,

  // Look: lighting from Part 1's Blender scenes (Camp Site 1.01.blend): yellow sun, blue gradient
  // world as ambient. Blender used Filmic, which three.js doesn't have; compared side by side with
  // the owner's reference render, ACES at 0.85 came closest (AgX: grey, salmon reds; Neutral:
  // over-saturated).
  toneMapping: 'ACES' as 'ACES' | 'AgX' | 'Neutral',
  exposure: 0.85,
  sunElevationDeg: 20, // Blender sun rotation (1.227, 0, -0.902) → ~20° elevation
  sunAzimuthDeg: -52, // 0 = behind the starting camera; negative = to its left
  sunIntensity: 7.5, // Blender sun strength (same units)
  worldStrength: 1.0, // Blender world strength
  worldIndoors: 0.5, // the world's (blue) light while she's inside the ship, as a share of its strength outside
  metalReflections: 0.5, // how strongly metal reflects the sky gradient
  sunlitRooms: ['crew quarters', 'cockpit'], // rooms with windows (the markers' `room`): their lights are tinted
  sunlitRoomWarmth: 0.6, // 0 = the marker's own colour, 1 = the sun's colour
  shadowMapSize: 4096, // px; 2048 until 2026-10-12 (steps on the edges of the sun patches inside)
  shadowRange: 25, // m around her covered by the sun's shadow (smaller = sharper, but far shadows disappear)
  sunThroughGlass: true, // the ship's glass doesn't block the sun (off: it casts a shadow, as until 2026-10-12)
  haze: true, // distance haze in the horizon colour, hides the floor's edge
  hazeNear: 60,
  hazeFar: 190,
  showGrid: false, // faint 1 m / 10 m grid for judging speed
  showColliders: false, // the ship's collision mesh as a wireframe
  cargoRampOpen: true, // the Zamboni's cargo ramp, down to the ground (the way in: starts open)

  // Interaction: point (the screen centre) at something within her reach and press E / Circle.
  interactReach: 1.0, // m, from her chest to the object's bounds
  interactMaxAngleDeg: 30, // how far from the screen centre a target may be
  highlight: 0, // the target's lift toward white (0 = no highlight: the prompt sits at the target instead)
  doorSeconds: 0.6, // to open or close a door
  slideSeconds: 0.3, // the same for a sliding door (bulkhead doors, the engineering window, its lever)
  leverDelay: 0.6, // the window starts this long after its lever is used (s): the lever is heard first
  autoDoors: true, // the bulkhead doors open when she's near (off: only from their panels)
  // m, from her to the closed door: nearer than this, it opens. With the slide time, it must be open
  // before she gets there at a run (3.5 m/s indoors): at 0.6 s she ran into the leaves. Not much
  // further either: at 2 m the cockpit's door stays open for most of the cockpit.
  autoDoorDistance: 1.5,
  doorsPush: true, // a moving door pushes her out of its way (off: it just stops against her)
  climbSpeed: 1.2, // m/s along a ladder

  // See-through hull (inside the ship) and camera collision (outside)
  seeThrough: true,
  cutRadius: 1.44, // m, radius of the capsule from the camera to Dr. Green's chest (1.2 + 20%)
  cutSoftness: 0.25, // m, width of the dithered edge (0 = hard edge)
  cutTargetHeight: 0.75, // m above her feet: the end of the capsule (chest)
  cutBackColor: '#1b2327', // inside faces of cut surfaces (when not in their own colour)
  cutOwnColour: true, // inside faces in the surface's own colour, darkened
  cutShade: 0.35, // how much of its own colour the inside keeps
  singleSided: true, // the ship's materials as in the file (backface culling); off: double-sided, with the dark cut surface
  holeOnlyWhenHidden: true, // the hole opens only while something solid hides her (glass doesn't count)
  dividersWhole: false, // bulkheads (divider: true) cut as a whole, by the furniture rules, instead of by the hole
  bulkheadsAlwaysVisible: true, // bulkheads, their doors and what's attached to them: never cut while she's on their deck
  // Furniture on her deck is cut only while it hides her (or the way ahead).
  furnitureLook: 'hole' as 'hole' | 'fade', // hole: the same hole as structure; fade: the whole object dithers out
  furnitureMinVisibility: 0, // fade look: how much of the object stays (0 = gone, 0.25 = a ghost)
  furnitureFadeTime: 0.2, // s, to fade out or back in
  furnitureHoldTime: 0.3, // s it must be clear before it comes back (stops flicker at the edge)
  wayAheadDistance: 1.0, // m ahead of her feet, protected while she walks (furniture taller than her waist)
  furnitureCoverage: 0.34, // cut furniture that hides her head or more than this share of her
  furnitureWaist: 0.5, // her waist, as a share of her height: near the camera, furniture is cut only above it
  furnitureNearPart: 0.5, // furniture in the hole is cut anyway on this part of the way from the camera to her (0 = never)
  showOccluders: false, // debug: tint furniture that is being cut
  cameraCollision: true, // outside the ship

  // Room lights inside the ship: the 4 nearest her are on (budget), or all of them to compare.
  roomLights: 'nearest 4' as 'nearest 4' | 'all',
  roomLightIntensity: 1.6, // per light (three's units; ≈ a 20 W Blender light: 20 / 4π)
  roomLightRange: 6, // m, where a light's reach ends

  // Sound (placeholders from the UE prototype; the levels are the owner's to set)
  soundMute: false,
  volumeMaster: 1,
  volumeMusic: 1,
  volumeAmbience: 1,
  volumeSfx: 1,
  volumeInteraction: 1, // the placeholder sounds of doors, panels, the lever, the ramp and the ladder, as a set
  volumeSteps: 1, // her footsteps and landings
  shipFlying: false, // the ship's noise (in prototype 01 it stands on the ground: off at the start)
  shipNoiseA: 0.5, // the level of each of its two sounds (a: the long flight recording; b: the landing)
  shipNoiseB: 0.5,
  shipNoiseOutdoors: 0.4, // its level outside the ship, as a share of inside
  boomboxFullWithin: 1.5, // m from the listener (the camera): at full volume within this...
  boomboxGoneAt: 12, // ...and silent from here. A guess: UE's values aren't readable
  boomboxVibration: 1, // how much it shakes while a track plays (0 = still)

  // Rendering
  maxPixelRatio: 2, // below 1 renders fewer pixels than the screen has (down to 0.1)
  pixelated: true, // stretch a low-resolution render with hard, square pixels instead of smoothing it
};

export type Settings = typeof settings;
