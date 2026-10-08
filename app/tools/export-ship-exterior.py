"""Export the Zamboni's exterior (outer hull and outside parts) with a simple collision mesh.

Run with Blender from the command line. The .blend is opened read-only: nothing is saved back.

    blender -b "resources/models/The Zamboni 1.18.blend" --python app/tools/export-ship-exterior.py -- \
        --out app/assets/test/zamboni-exterior.glb

- Exports the objects in EXTERIOR with modifiers applied (mirrors, booleans, geometry nodes).
- Includes the cargo bay (floor, front wall, ceiling) so the player can walk in through the ramp.
- Adds ``zamboni_col``: a decimated copy of the same objects, joined into one mesh, for collision
  (``*_col`` in the naming contract: never rendered). Moving parts (the cargo ramp, ``Door Cargo``)
  are left out of it: the game gives them their own collider that moves with them.
- Reports every double-sided material ("PERF:"), as the pipeline requires; nothing is forced.
"""

import argparse
import sys

import bmesh
import bpy

EXTERIOR = [
    'Hull_Merged',
    'Windshield',
    'Turbine Left',
    'Turbine Right',
    'Turbine.001',
    'Turbine.002',
    'Landing Gear Front',
    'Landing Gear Back Left',
    'Landing Gear Back Right',
    'Door',
    'Door Cargo',
    'Top Hatch',
    'Lab Window',
    'Lab Window.001',
    # Cargo bay, so the player can walk in through the open ramp:
    'Floor Bottom',  # cargo bay floor
    'Bulkhead Cargo',  # its front wall
    'Floor Top.001',  # its ceiling (the upper deck)
]
# Moving parts get their own collider in the game, so they're left out of zamboni_col.
MOVING = {'Door Cargo'}

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--collider-ratio', type=float, default=1.0, help='decimate ratio for the collision mesh (1 = full detail; lower values can close openings like the cargo door)')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

objects = [bpy.data.objects[name] for name in EXTERIOR]

for mat in sorted({s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Collision mesh: evaluated copies (modifiers applied) of every exterior object, joined, decimated.
depsgraph = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
for ob in objects:
    if ob.name in MOVING:
        continue
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.transform(ob.matrix_world)
    bm.from_mesh(mesh)
    evaluated.to_mesh_clear()
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01)
col_mesh = bpy.data.meshes.new('zamboni_col')
bm.to_mesh(col_mesh)
bm.free()
col_mesh.materials.clear()  # one primitive, no materials: it's never rendered
for poly in col_mesh.polygons:
    poly.material_index = 0
collider = bpy.data.objects.new('zamboni_col', col_mesh)
bpy.context.scene.collection.objects.link(collider)
decimate = collider.modifiers.new('Decimate', 'DECIMATE')
decimate.ratio = args.collider_ratio
bpy.context.view_layer.update()
col_tris = len(collider.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().loop_triangles)

bpy.ops.object.select_all(action='DESELECT')
for ob in [*objects, collider]:
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format='GLB',
    use_selection=True,
    export_animations=False,
    export_apply=True,
    export_yup=True,
)
print('EXPORTED', args.out, f'collider triangles: {col_tris}')
