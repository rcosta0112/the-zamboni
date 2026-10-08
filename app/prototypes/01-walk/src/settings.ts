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
  cameraDistance: 4.5,
  cameraMinDistance: 2.5,
  cameraMaxDistance: 12,
  cameraHeight: 1.0,
  cameraFollowSharpness: 12,
  cameraMinPitchDeg: -10,
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
  haze: true, // distance haze in the horizon colour, hides the floor's edge
  hazeNear: 60,
  hazeFar: 190,
  showGrid: false, // faint 1 m / 10 m grid for judging speed
  showColliders: false, // the ship's collision mesh as a wireframe
  cargoRampOpen: true, // the Zamboni's cargo ramp, down to the ground

  // See-through hull (inside the ship) and camera collision (outside)
  seeThrough: true,
  cutRadius: 1.44, // m, radius of the capsule from the camera to Dr. Green's chest (1.2 + 20%)
  cutSoftness: 0.25, // m, width of the dithered edge (0 = hard edge)
  cutTargetHeight: 0.75, // m above her feet: the end of the capsule (chest)
  cutBackColor: '#1b2327', // inside faces of cut surfaces (when not in their own colour)
  cutOwnColour: true, // inside faces in the surface's own colour, darkened
  cutShade: 0.35, // how much of its own colour the inside keeps
  holeOnlyWhenHidden: true, // the hole opens only while something solid hides her (glass doesn't count)
  dividersWhole: false, // bulkheads (divider: true) cut as a whole, by the furniture rules, instead of by the hole
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

  // Rendering
  maxPixelRatio: 2, // below 1 renders fewer pixels than the screen has (down to 0.1)
  pixelated: true, // stretch a low-resolution render with hard, square pixels instead of smoothing it
};

export type Settings = typeof settings;
