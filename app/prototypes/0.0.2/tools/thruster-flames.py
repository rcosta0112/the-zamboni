# The thrusters' flames from the owner's fly-by (SC-121): reads `The Zamboni 1.10 - fly by animation.blend`
# (never saves it) and writes `public/ship/thruster-flames.json`, the cones flames.ts draws behind the
# turbines: `Turbine.004` (behind the big ones) and `Turbine.005` (the small), as their modifiers make
# them, in the ship file's coordinates (1.22: the 1.10 ship's own space scaled by SCALE), with each
# vertex's share along its cone (the *Thruster 2* material's Generated Y: 0 at the nozzle). Re-run
# when the fly-by's flames change:
#   blender -b "resources/models/The Zamboni 1.10 - fly by animation.blend" --python app/prototypes/0.0.2/tools/thruster-flames.py
# (from the project's root).

import bpy, json, os

SCALE = 1.4856  # 1.10's units to the game's metres
CONES = ['Turbine.004', 'Turbine.005']
OUT = os.path.join(os.getcwd(), 'app', 'prototypes', '0.0.2', 'public', 'ship', 'thruster-flames.json')

scene = bpy.context.scene
ship = bpy.data.objects['Ship.001']
# The ship at rest: its keys without their noise.
for fc in [fc for layer in ship.animation_data.action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]:
    for mod in fc.modifiers:
        mod.mute = True
scene.frame_set(scene.frame_start)
depsgraph = bpy.context.evaluated_depsgraph_get()
to_ship = ship.matrix_world.inverted()

positions, along, indices = [], [], []
for name in CONES:
    obj = bpy.data.objects[name].evaluated_get(depsgraph)
    mesh = obj.to_mesh()
    ys = [v.co.y for v in mesh.vertices]
    low, size = min(ys), max(max(ys) - min(ys), 1e-6)
    first = len(positions) // 3
    m = to_ship @ obj.matrix_world
    for v in mesh.vertices:
        p = (m @ v.co) * SCALE
        positions += [round(c, 4) for c in p]
        along.append(round((v.co.y - low) / size, 4))
    mesh.calc_loop_triangles()
    for tri in mesh.loop_triangles:
        indices += [first + i for i in tri.vertices]
    obj.to_mesh_clear()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', newline='\n') as f:
    json.dump({'positions': positions, 'along': along, 'indices': indices}, f, separators=(',', ':'))
print(f'thruster flames: {len(along)} vertices, {len(indices) // 3} triangles, written to {OUT}')
