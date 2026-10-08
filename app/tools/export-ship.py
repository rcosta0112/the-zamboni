"""Export the Zamboni: exterior, cargo bay and the large interior elements, plus a collision mesh.

Run with Blender from the command line. The .blend is opened read-only: nothing is saved back.

    blender -b "resources/models/The Zamboni 1.18.blend" --python app/tools/export-ship.py -- \
        --out <raw>/zamboni-ship.glb --collider-out <raw>/zamboni-ship-col.glb

then compress both (Meshopt) into app/assets, from app/:

    npx gltf-transform meshopt <raw>/zamboni-ship.glb assets/test/zamboni-ship.glb
    npx gltf-transform meshopt <raw>/zamboni-ship-col.glb assets/test/zamboni-ship-col.glb

- Exports the objects in EXTERIOR and INTERIOR with modifiers applied (mirrors, booleans,
  geometry nodes). Interior collections excluded from the view layer in the file (Crew Quarters,
  Engineering, Cargo Bay...) are included for the export only.
- Small props (mugs, books, chests, computers...) are left for a later step.
- Tags cuttable surfaces with the custom property ``cuttable: true`` (exported as glTF extras,
  read by the game as ``userData.cuttable``) unless the object already has that property: this
  list stands in until the tags are set in Blender.
- Writes ``zamboni_col`` to its own file, positions only: every exported object except moving
  parts, joined into one mesh at full detail (``*_col`` in the naming contract: never rendered).
  Very dense furniture goes in as its convex hull instead. A decimated collider closed openings
  (the cargo door), so it isn't decimated.
- Records each moving part's pivot (its origin) as a custom property ``pivot`` (glTF axes):
  compression moves node origins, so the game builds hinges from this.
- Reports every double-sided material ("PERF:"), as the pipeline requires; nothing is forced.
"""

import argparse
import sys

import bmesh
import bpy

EXTERIOR = [
    'Hull_Merged', 'Windshield', 'Turbine Left', 'Turbine Right', 'Turbine.001', 'Turbine.002',
    'Landing Gear Front', 'Landing Gear Back Left', 'Landing Gear Back Right',
    'Door', 'Door Cargo', 'Top Hatch', 'Lab Window', 'Lab Window.001',
]

INTERIOR = [
    # Structure: floors, walls, ceilings, consoles, doors
    'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit',
    'Crew Quarters Ceiling', 'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002',
    'Dashboard Body', 'Dashboard Body.001', 'Dashboard Body.002', 'Door Boolean.001',
    'Door Cockpit', 'Door Cockpit 2', 'Door Engineering', 'Door Engineering 2',
    'Top Hatch Bottom', 'Hatch.002',
    'Ceiling Light.001', 'Ceiling Light.002', 'Ceiling Light.003', 'Ceiling Light.004',
    # Crew quarters and galley
    'Bunks', 'Bunks.001', 'Bunks.002', 'Couch', 'Table', 'Galley', 'Stove',
    'Lockers', 'Locker Door.001', 'Locker Door.003', 'Ladder Crew Quarters',
    # Cockpit
    'Seat', 'Seat.001', 'Seat.002', 'Seat.004', 'Back seat', 'Back seat.001', 'Back seat.002',
    'Dials.002', 'Monitor.001', 'Monitor.003', 'Monitor.004',
    # Engineering
    'Bench', 'Bench.001', 'Cabinet', 'Cabinet.001', '3d Printer', 'Power Supply', 'Power Supply.001',
    'Stand', 'Monitor Arm.031', 'Contraption',
    # Cargo bay
    'Sledge', 'Pallet', 'Locker', 'Locker Door', 'Head', 'Jetpack Rack', 'Jetpack Rack.001',
    'Ladder Cargo Bay', 'Plane.002',
]

# Surfaces the see-through hull may cut: hull, walls, ceilings, bulkheads, doors, tall furniture,
# the engine pods.
# Low furniture (seats, couch, table, benches...) and the floors stay solid.
CUTTABLE = {
    'Hull_Merged', 'Windshield', 'Door', 'Top Hatch', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit',
    'Crew Quarters Ceiling', 'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002',
    'Door Boolean.001', 'Door Cockpit', 'Door Cockpit 2', 'Door Engineering', 'Door Engineering 2',
    'Top Hatch Bottom', 'Ceiling Light.001', 'Ceiling Light.002', 'Ceiling Light.003', 'Ceiling Light.004',
    'Bunks', 'Bunks.001', 'Bunks.002', 'Galley', 'Lockers', 'Locker Door.001', 'Locker Door.003',
    'Ladder Crew Quarters', 'Cabinet', 'Cabinet.001', 'Contraption', 'Monitor Arm.031',
    'Locker', 'Locker Door', 'Ladder Cargo Bay', 'Head',
    # The engine pods hang outside the hull at deck height and block the view into the ship.
    'Turbine Left', 'Turbine Right', 'Turbine.001', 'Turbine.002',
}

# Moving parts get their own collider in the game, so they're left out of zamboni_col.
MOVING = {'Door Cargo'}
# Furniture denser than this goes into the collider as its convex hull. Never structure: a convex
# hull of the hull would be a solid block.
DENSE_TRIS = 2000
STRUCTURE = set(EXTERIOR) | {'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit'}

# Collections excluded from the view layer in the file that hold interior objects.
INCLUDE_COLLECTIONS = ['Crew Quarters', 'Galley', 'Engineering', 'Contraption', 'Cargo Bay']

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--collider-out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])


def find_layer(layer, name):
    if layer.collection.name == name:
        return layer
    for child in layer.children:
        found = find_layer(child, name)
        if found:
            return found
    return None


for name in INCLUDE_COLLECTIONS:
    layer = find_layer(bpy.context.view_layer.layer_collection, name)
    if layer:
        layer.exclude = False
bpy.context.view_layer.update()

objects = [bpy.data.objects[name] for name in EXTERIOR + INTERIOR]

for mat in sorted({s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Moving parts: record their pivot (the object origin, which is the hinge) as a custom property,
# in glTF axes (y up). Compression (Meshopt quantisation) folds offsets into node transforms and
# moves node origins, so the game can't rely on them: it builds the hinge from this instead.
for name in MOVING:
    ob = bpy.data.objects[name]
    x, y, z = ob.matrix_world.translation
    ob['pivot'] = [x, z, -y]

tagged = 0
for ob in objects:
    if 'cuttable' not in ob and ob.name in CUTTABLE:
        ob['cuttable'] = True
        tagged += 1

# Collision mesh: evaluated copies (modifiers applied) of everything except moving parts.
depsgraph = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
hulls = []
for ob in objects:
    if ob.name in MOVING:
        continue
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.transform(ob.matrix_world)
    mesh.calc_loop_triangles()
    if len(mesh.loop_triangles) > DENSE_TRIS and ob.name not in STRUCTURE:
        part = bmesh.new()
        part.from_mesh(mesh)
        bmesh.ops.convex_hull(part, input=part.verts, use_existing_faces=False)
        hull_mesh = bpy.data.meshes.new('hull')
        part.to_mesh(hull_mesh)
        part.free()
        bm.from_mesh(hull_mesh)
        hulls.append(ob.name)
    else:
        bm.from_mesh(mesh)
    evaluated.to_mesh_clear()
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.005)
bmesh.ops.triangulate(bm, faces=bm.faces)
col_mesh = bpy.data.meshes.new('zamboni_col')
bm.to_mesh(col_mesh)
bm.free()
col_mesh.materials.clear()  # one primitive, no materials: it's never rendered
collider = bpy.data.objects.new('zamboni_col', col_mesh)
bpy.context.scene.collection.objects.link(collider)


def export(selection, path, **options):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in selection:
        ob.hide_set(False)
        ob.hide_viewport = False
        ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_animations=False,
        export_apply=True, export_yup=True, **options,
    )


export(objects, args.out, export_extras=True)
# The collider: positions only (no normals, UVs or materials).
export([collider], args.collider_out, export_normals=False, export_texcoords=False, export_materials='NONE')
print('EXPORTED', args.out, args.collider_out)
print(f'objects: {len(objects)}, cuttable tags set: {tagged}, collider triangles: {len(col_mesh.polygons)}, convex hulls: {hulls}')
