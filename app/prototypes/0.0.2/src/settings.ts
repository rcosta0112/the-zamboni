// Tunable values, edited live in the tuning panel. Starting values come from Part 1
// (Big Moon Tiny Moon, Main.unity) where they exist; see doc/plans/prototypes/01-walk.md.

import type { Outfit } from './model';

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
  // Inside the ship she moves the way the stick points at once, and her body turns after (owner,
  // 2026-10-13: she set off in an arc and caught on things). Off: she moves the way she faces.
  indoorDirectMove: true,

  // Jump. Part 1's jump was switched off, so these are new starting points.
  jumpHeight: 1.0,
  // Inside the ship: at 1.0 her head reached the ceilings. 0.6 gets her onto the cargo hold's chests
  // (0.5 m) and not onto the sledge.
  indoorJumpHeight: 0.6,
  gravity: 20,

  // She wears a jetpack: taken from the cargo hold's rack, or switched here (the rack follows).
  // Shows it on her back, hides her little backpack, moves her hood out of its way; she can fly.
  wearingJetpack: false,
  // What she wears (item 72): the jumpsuit (and sneakers) indoors, the parka (and boots) outside.
  // She starts in the jumpsuit; the `outfit` command sets it.
  outfit: 'jumpsuit' as Outfit,
  // Her locker's hanger when the parka goes on or off (item 75): a swing of up to hangerSwing
  // degrees about its hook, hangerSwingRate swings a second, gone after hangerSwingTime.
  hangerSwing: 5,
  hangerSwingRate: 0.8,
  hangerSwingTime: 1.5,
  // The jetpack (held: R2, Space), with momentum (owner, 2026-10-14: "similar to the ship in
  // Asteroids"; plan: doc/plans/features/jetpack-hover-and-flight.md). No gravity while it's on.
  // Hover, while she's slow: R2 sets her height (below), and the stick's first hoverStickShare of
  // its travel sets a drift of up to hoverDriftSpeed, eased in and out at flyAcceleration and
  // flyDeceleration (Part 1's 6 and 120 m/s²); past that share it thrusts. Flight, from cruiseSpeed
  // until she's back under hoverDriftSpeed with the stick in its drift share: thrust (flyThrust
  // times the push) where the stick points, forward being where the camera looks, and a drag that
  // holds her top speed at flySpeed (Part 1's fly speed). The handover takes flightBlendTime.
  flySpeed: 20,
  flyThrust: 12,
  flyAcceleration: 6,
  flyDeceleration: 120,
  hoverDriftSpeed: 1.5,
  cruiseSpeed: 4,
  hoverStickShare: 0.6,
  flightBlendTime: 0.3,
  // In flight her vertical speed follows the camera's aim this fast (share of the gap per second):
  // tighter than the drag, so a climb left from hovering doesn't carry her on up.
  flyVerticalFollow: 2,
  // In flight the camera can go below her, so she can fly upward (Part 1's camera could go
  // 1.3 m under her).
  cameraMinPitchFlyingDeg: -40,
  // In flight, below this height (m) a dive levels off, so she doesn't skim the ground; touching it
  // with the jet on costs her this much speed (m/s²).
  flyLowest: 1.0,
  flyGroundDrag: 4,
  // The jet cut out (R2 let go) faster than her run speed: she glides. Her speed falls off by
  // glideDrag (m/s²); on the way down glideLift of gravity is cancelled at fly speed (less as she
  // slows), and her fall is held to glideSink (m/s) at fly speed, up to twice that at her run speed,
  // where the glide ends.
  // On the ground at speed with the jet off she skids, losing skidFriction (m/s²), to a stop.
  glideDrag: 3,
  glideLift: 0.7,
  glideSink: 6,
  skidFriction: 15,
  // The auto-parachute (owner, 2026-10-14): after a fall of at least parachuteMinDrop (a bit under
  // the ship's 6.5 m), the jetpack she wears fires by itself near the ground and slows her to
  // parachuteLandingSpeed (from 15 cm above the ground). On a fall of exactly that drop it brakes for parachuteBurst seconds (at
  // 0.5 s it fires about 2.9 m up); the braking that gives is the same for every fall, so a longer one
  // fires higher and for longer. Until the owner's change of 2026-10-14 it fired at her height on
  // that fall (0.16 s); "twice as long" as it was, as measured from start to landing (the last 15 cm
  // at landing speed included), is 0.5 here, not 0.33. Plan: doc/plans/features/auto-parachute.md
  parachute: true,
  parachuteMinDrop: 5.5,
  parachuteLandingSpeed: 2,
  parachuteBurst: 0.5,

  // Hovering, R2 sets her vertical speed (owner, 2026-10-14): off below flyTriggerOff, descending
  // in the lower third, holding her height in the middle third, climbing in the upper third, eased
  // at flyVerticalAcceleration. A digital R2, or Space, counts as R2 held fully (climbing at
  // flyClimbSpeed, Part 1's rise). In flight R2's depth doesn't matter.
  flyTriggerOff: 0.05,
  hoverLow: 0.33,
  hoverHigh: 0.67,
  // Once hovering, the band widens by this much on each side, so a shaky finger stays in it.
  hoverHysteresis: 0.03,
  flyClimbSpeed: 5, // Part 1's rise: a quarter of fly speed
  flyDescendSpeed: 5,
  flyVerticalAcceleration: 6, // Part 1's acceleration
  // The jet sound's level and pitch follow the trigger (a way to hear the hover band).
  jetSoundFollowsTrigger: true,
  // At the trigger's bottom: level (share of full) and speed; at its top, full level and this speed.
  // Level follows the trigger squared, so it drops off faster toward the bottom (owner, 2026-10-14:
  // stronger, quieter at the lower end).
  jetSoundLowLevel: 0.08,
  jetSoundLowRate: 0.75,
  jetSoundHighRate: 1.15,
  // The exhaust glow (item 38): Part 1's, from the owner's video (2026-12-25 capture): a white core
  // and a cyan halo, together about 10 % of the screen's height. One sprite per nozzle, overlapping;
  // its size is a share of the screen's height. With an analog R2 (and jetSoundFollowsTrigger) it
  // follows the trigger squared down to exhaustLowLevel, size and brightness, as the sound's level.
  // Flicker: a new size this many times a second, up to this share either way; shake: up to this far (m).
  exhaustGlow: true,
  exhaustSize: 0.12,
  exhaustCore: 0.4, // the white core's radius, share of the sprite's
  exhaustCoreColor: '#ffffff',
  exhaustHaloColor: '#3fe6dc',
  exhaustHalo: 1.6,
  exhaustLowLevel: 0.35,
  exhaustFlicker: 0.15,
  exhaustFlickerRate: 30,
  exhaustShake: 0.004,
  exhaustOut: 0.14, // m, from the nozzles down and back: below the jetpack, behind it (owner, 2026-10-14)
  exhaustTowardCamera: 0.06, // m, so the jetpack's surface doesn't cut through it

  // Camera
  // Fixed distances, no zoom (owner, 2026-10-12): the camera eases from one to the other when she
  // crosses the ship's "inside" test. Starting values: the owner is tuning them.
  cameraDistanceIndoors: 3.5,
  cameraDistanceOutdoors: 4.5,
  cameraHeight: 1.0,
  cameraFollowSharpness: 12,
  cameraMinPitchDeg: 0, // owner, 2026-10-12: fixes several see-through problems
  cameraMaxPitchDeg: 70,
  // Close to her (owner, 2026-10-21): the camera stops this far in front of what's behind her, as
  // close to her as it needs (no 1 m floor any more), and she fades out between the two distances.
  cameraWallGap: 0.25, // m, in front of the obstacle
  cameraMinDistance: 0.15, // m from her focus point; the near plane is 0.1
  cameraFadeStart: 1.0, // m: fully shown at this distance or farther
  cameraFadeEnd: 0.5, // m: gone at this distance or closer (her shadow stays)

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
  // m around her covered by the sun's shadow (smaller = sharper, but far shadows disappear). Eased
  // between the two as she goes in and out. Outdoors 25 until 2026-10-14: the ship's shadow was gone
  // from 40 m (it's cut from about 43 m at 50); a texel is 2 × range / map size (2.4 cm at 50 m).
  shadowRangeIndoors: 25, // the sun patches inside stay sharp
  shadowRangeOutdoors: 50,
  sunThroughGlass: true, // the ship's glass doesn't block the sun (off: it casts a shadow, as until 2026-10-12)
  haze: true, // distance haze in the horizon colour, hides the floor's edge
  hazeNear: 60,
  hazeFar: 190,
  showGrid: false, // faint 1 m / 10 m grid for judging speed
  showColliders: false, // the ship's collision mesh as a wireframe
  cargoRampOpen: true, // the Zamboni's cargo ramp, down to the ground (the way in: starts open)
  cargoRampByKeypad: null as boolean | null, // not for tuning: what the keypad last asked of the ramp, until it gets there

  // Interaction: point (the screen centre) at something within her reach and press E / Circle.
  interactReach: 1.0, // m, from her chest to the object's bounds
  interactDotReach: 1.2, // m: the dots show this far (whichever way she faces; owner, 2026-10-22)
  interactMaxAngleDeg: 30, // how far across from the screen centre a target may be
  // ...and how far up or down (owner, 2026-10-22: the camera can't tilt up indoors); up and down
  // count a third as much as across when choosing
  interactMaxVerticalDeg: 60,
  // Her facing's cone, across (owner, 2026-10-22: the camera and her facing each have one; the one
  // the player moved last aims)...
  interactFacingAngleDeg: 45,
  // ...and how little counts as moving it: the camera turned (°), she turned (°) or stepped (m) in a frame
  aimByCameraDeg: 0.3,
  aimByFacingDeg: 0.3,
  aimByStep: 0.003,
  talkReach: 1.6, // m, from her chest to a character's bounds: further than a thing's (across the crew quarters' table)
  // The dialogue box (dialogue.ts): the typewriter's speed; with *reduced motion* the line is there at once.
  dialogueCharMs: 35, // ms a character; 0: the whole line at once
  dialogueTypeEvery: 2, // a typewriter key's sound every this many characters typed (not on spaces); 0: silent
  dialogueDebounce: 0.15, // s: a press this soon after the last is ignored (a double press skips nothing unread)
  dialogueCooldown: 1, // s after a conversation ends before anything can be used (the press that ended it doesn't start it again)
  doorSeconds: 0.6, // to open or close a door
  slideSeconds: 0.3, // the same for a sliding door (bulkhead doors, the engineering window, its lever)
  leverDelay: 0.6, // the window starts this long after its lever is used (s): the lever is heard first
  // The bulkhead doors open when she's near (off: only from their panels). Off for now (owner,
  // 2026-10-13); the code stays, and the scripted check turns it on for itself.
  autoDoors: false,
  // m, from her to the closed door: nearer than this, it opens. With the slide time, it must be open
  // before she gets there at a run (3.5 m/s indoors): at 0.6 s she ran into the leaves. Not much
  // further either: at 2 m the cockpit's door stays open for most of the cockpit.
  autoDoorDistance: 1.5,
  doorsPush: true, // a moving door pushes her out of its way (off: it just stops against her)
  climbSpeed: 1.2, // m/s along a ladder
  ladderFloat: 0.6, // s she floats after leaving a ladder at its top, to walk onto the floor (0.44 m away)
  // The collision boxes of colliders.ts (the crew quarters' walls, the sledge, the chests, the
  // window's slope): off, she collides with the ship's own shapes only, to compare.
  collisionBoxes: true,

  // See-through hull (inside the ship) and camera collision (outside)
  seeThrough: true,
  // See-through from scratch (owner, 2026-10-14): 'hull only' draws the ship's shell alone (both
  // decks, the crew too); 'all rules' is the version on main, kept to take the rules back from.
  seeThroughStage: 'hull only' as 'hull only' | 'all rules',
  cutRadius: 1.44, // m, radius of the capsule from the camera to Dr. Green's chest (1.2 + 20%)
  cutSoftness: 0.25, // m, width of the dithered edge (0 = hard edge)
  cutTargetHeight: 0.75, // m above her feet: the end of the capsule (chest)
  // The hole's far end (owner, 2026-10-15: try them): square to the line of sight (as before), a
  // vertical plane, or round (a hemisphere that closes there, so the hole narrows near her).
  holeEnd: 'round' as 'square' | 'vertical' | 'round', // owner, 2026-10-15: round, 0 m past her
  holeBeyond: 0, // m: how far past her chest the hole goes (the old end: -0.07 at 3.5 m, square to the line of sight)
  cutBackColor: '#1b2327', // inside faces of cut surfaces (when not in their own colour)
  cutOwnColour: true, // inside faces in the surface's own colour, darkened
  cutShade: 0.35, // how much of its own colour the inside keeps
  hullGapBlack: false, // the gap painted black instead of the gap colour, to compare (owner, 2026-10-15)
  hullGapColour: '#284644', // the gap between the hull's two skins, where the hole cuts them: one flat colour, unlit (owner, 2026-10-14; the hull's dark teal at 60 %)
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
  cameraCollidesFurniture: true, // inside: in front of the crew quarters' furniture: a box round the bunks and galley, one round the lockers and shelves, the couch, table and their walls (owner, 2026-10-15)
  cameraCollidesBulkheads: true, // inside: in front of the two bulkheads and their doors (owner, 2026-10-15: try it)
  cameraInsideHull: true, // inside: stops at the hull, its glass and its doors (owner, 2026-10-15; until then only kept out of the wall)

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
  volumeUi: 1, // the interface's sounds (the start button's click)
  volumeInteraction: 1, // the placeholder sounds of doors, panels, the lever, the ramp and the ladder, as a set
  volumeSteps: 1, // her footsteps and landings
  shipFlying: false, // the ship's noise (in prototype 01 it stands on the ground: off at the start)
  shipNoiseA: 0.5, // the level of each of its two sounds (a: the long flight recording; b: the landing)
  shipNoiseB: 0.5,
  shipNoiseOutdoors: 0.4, // its level outside the ship, as a share of inside
  // The wind (owner, 2026-10-14): full outside; inside, as a share of that: faint, and louder in the
  // cargo bay with the ramp and the side door open (each by the size of its opening).
  windIndoors: 0.08,
  windCargoOpen: 0.4, // in the cargo bay with both open; with one, less (wind.ts)
  boomboxFullWithin: 1.5, // m from the listener (the camera): at full volume within this...
  boomboxGoneAt: 12, // ...and silent from here. A guess: UE's values aren't readable
  boomboxVibration: 1, // how much it shakes while a track plays (0 = still)

  // Rendering
  maxPixelRatio: 2, // below 1 renders fewer pixels than the screen has (down to 0.1)
  pixelated: true, // stretch a low-resolution render with hard, square pixels instead of smoothing it
};

export type Settings = typeof settings;
