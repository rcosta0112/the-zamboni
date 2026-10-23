# Cutscene 1 from the owner's fly-by: reads `The Zamboni 1.10 - fly by animation.blend` (never saves
# it) and writes `public/cutscenes/cutscene-1.json`, the track cutscene.ts plays: the camera every
# STEP frames (its shake, its tracking of the ship and its lens included) and the ship's own movement
# (its noise), both in the ship file's coordinates (1.22: the 1.10 ship moved down to its origin and
# scaled by SCALE). Re-run when the fly-by changes:
#   blender -b "resources/models/The Zamboni 1.10 - fly by animation.blend" --python app/prototypes/0.0.2/tools/flyby-cutscene.py
# (from the project's root). Plan: doc/plans/features/flying-scene.md (cutscene 1, from the fly-by)

import bpy, json, math, os
from mathutils import Vector

SCALE = 1.4856  # 1.10's units to the game's metres
STEP = 1  # frames between keys: every frame, on a curve in the game (`smooth`; every 2 judders)
END = 430  # the last frame used (owner, 2026-10-23; the file runs to 540)
SWAY = 0.5  # the ship's noise, times the file's (owner, 2026-10-23): the camera tracks the calmer ship
OUT = os.path.join(os.getcwd(), 'app', 'prototypes', '0.0.2', 'public', 'cutscenes', 'cutscene-1.json')
FAR = 4000  # m: past the icy plain's haze (3,000)
NEAR = 5  # m: nothing comes closer (the ship stays 30 m off or more); finer depth far off

scene = bpy.context.scene
fps = scene.render.fps / scene.render.fps_base
cam = scene.camera
ship = bpy.data.objects['Ship.001']


def rest(obj, path, i):
    """An animated value without its noise: the curve's own key."""
    for fc in curves(obj.animation_data.action):
        if fc.data_path == path and fc.array_index == i:
            return fc.keyframe_points[0].co[1]
    return 0.0


def curves(action):
    try:
        return list(action.fcurves)
    except AttributeError:  # Blender 5's layered actions
        return [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]


origin = Vector([rest(ship, 'location', i) for i in range(3)])
for fc in curves(ship.animation_data.action):  # in memory: the file is never saved
    for mod in fc.modifiers:
        if mod.type == 'NOISE':
            mod.strength *= SWAY


def fov():
    """The lens's height on screen at 16:9 (the bars keep it near that), from its width: keyed too."""
    across = 2 * math.atan(cam.data.sensor_width / (2 * cam.data.lens))
    return math.degrees(2 * math.atan(math.tan(across / 2) * 9 / 16))


def unwrap(angle, before):
    """The angle nearest the key before, so the game's lerp doesn't spin the long way past ±180°."""
    return angle if before is None else before + (angle - before + 180) % 360 - 180


keys, sway = [], []
start, end = scene.frame_start, min(END, scene.frame_end)
for frame in list(range(start, end, STEP)) + [end]:
    scene.frame_set(frame)
    t = round((frame - start) / fps, 4)
    m = cam.matrix_world
    at = (m.translation - origin) * SCALE
    ahead = -m.col[2].xyz.normalized()  # a camera looks down its -Z
    up = m.col[1].xyz.normalized()
    right = ahead.cross(Vector((0, 0, 1))).normalized()
    level = right.cross(ahead)
    last = keys[-1] if keys else {}
    keys.append({
        't': t,
        'at': [round(v, 3) for v in at],
        'heading': round(unwrap(math.degrees(math.atan2(ahead.y, ahead.x)), last.get('heading')), 3),
        'pitch': round(math.degrees(math.asin(max(-1, min(1, ahead.z)))), 3),
        # Turned about the view, as three.js's `rotateZ` after `lookAt`.
        'roll': round(unwrap(math.degrees(math.atan2(-up.dot(right), up.dot(level))), last.get('roll')), 3),
        'fov': round(fov(), 2),
    })
    offset = (ship.location - origin) * SCALE
    sway.append({
        't': t,
        'offset': [round(v, 4) for v in offset],
        'tilt': [round(math.degrees(ship.rotation_euler[i]), 3) for i in (0, 1)],
    })

track = {
    'id': 'cutscene-1',
    'duration': round((end - start) / fps, 4),
    'shots': [{'start': 0, 'camera': keys, 'smooth': True, 'far': FAR, 'near': NEAR, 'seeThrough': 'off'}],
    'ship': sway,
    'hide': ['her'],
    'events': [],
    'end': [],
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', newline='\n') as f:
    json.dump(track, f, separators=(',', ':'))
fovs = [k['fov'] for k in keys]
print(f'cutscene-1: {len(keys)} keys over {track["duration"]} s, fov {min(fovs):.1f}-{max(fovs):.1f}, written to {OUT}')
