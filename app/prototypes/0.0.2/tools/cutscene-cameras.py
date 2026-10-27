"""Cutscene 2's cameras from the ship file into `public/conversations/opening.json` (2026-10-26).

The owner's cameras in 1.22 (`Scenes` > `01-cutscene-flight-2` > `cameras`): `cutscene-2-<who>`, one
per speaker, and `cutscene-2-cockpit`, the wide shot that opens it (owner: "use the wide angle as
the opening shot"; held alone `HOLD` seconds before the first line). Per camera: `at`, its place;
`forward` and `up`, its -Z and +Y axes; all in Blender coordinates (the ship's space, as the rest of
the file); `fov`, its view across (degrees: with the sensor fit *Auto* on a landscape frame, the
sensor's width is the frame's). The knot and the wait already in the file are kept. Reads the
.blend, never saves it. Re-run when the cameras change. Run from the project root:

    blender -b "resources/models/The Zamboni 1.22.blend" --python app/prototypes/0.0.2/tools/cutscene-cameras.py
"""

import json
import math
import os

import bpy

OUT = os.path.join(os.getcwd(), 'app', 'prototypes', '0.0.2', 'public', 'conversations', 'opening.json')
PREFIX = 'cutscene-2-'
# The cameras' names after the prefix -> the speaker's id in the story (`opening` is the wide shot).
WHO = {'cockpit': 'opening', 'adam-red': 'adam-red', 'adam-blue': 'adam-blue', 'dr-green': 'green', 'dr-ogawa': 'ogawa'}
HOLD = 4.0


def r(v):
    return [round(x, 4) for x in v]


scene = bpy.context.scene
landscape = scene.render.resolution_x * scene.render.pixel_aspect_x >= scene.render.resolution_y * scene.render.pixel_aspect_y
data = json.load(open(OUT, encoding='utf-8'))
shots = {}
for ob in sorted(bpy.data.objects, key=lambda o: o.name):
    if ob.type != 'CAMERA' or not ob.name.startswith(PREFIX):
        continue
    who = WHO.get(ob.name[len(PREFIX):])
    if who is None:
        print(f'CAMERA: NOTE {ob.name!r}: no speaker for it (WHO), left out')
        continue
    cam = ob.data
    if cam.type != 'PERSP' or cam.sensor_fit == 'VERTICAL' or not landscape:
        print(f'CAMERA: NOTE {ob.name!r}: {cam.type}, sensor fit {cam.sensor_fit}: the view across may not be the file\'s')
    m = ob.matrix_world
    rot = m.to_3x3().normalized()
    fov = math.degrees(2 * math.atan(cam.sensor_width / 2 / cam.lens))
    shots[who] = {'camera': {'at': r(m.translation), 'forward': r(-rot.col[2]), 'up': r(rot.col[1]), 'fov': round(fov, 2)}}
    print(f'CAMERA: {ob.name} -> {who}: at {r(m.translation)}, {cam.lens:.2f} mm, {fov:.1f} deg across')

missing = [w for w in WHO.values() if w not in shots]
if missing:
    print(f'CAMERA: NOTE no camera for {missing}')
data['opening'] = {'shot': 'opening', 'hold': HOLD} if 'opening' in shots else None
data['shots'] = shots
if data['opening'] is None:
    del data['opening']
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
print('CAMERA: written', OUT)
