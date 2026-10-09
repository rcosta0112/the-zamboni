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
- Props: every other render-visible mesh, curve and text object in the room collections
  (PROP_COLLECTIONS), baked to a mesh in place. Big ones (BIG and up) stay separate objects and go
  into the collider as convex hulls; small ones are merged into one object per room collection
  ("Props <collection>"), one draw call per material. Props in the cockpit are always visible.
  Every prop is tagged ``prop: true`` (the game doesn't let them cast shadows: inside the hull the
  sun doesn't reach them, and it halves their draw calls).
- Lights: glTF can't carry area lights, so the room lights (LIGHTS, plus one new light in the
  cockpit, which has none) are written as empties named "light ..." with a ``light`` custom
  property (room, colour, energy). The other lights in the file are reported as flagged.
- Everything is cut by the see-through hull except what's tagged ``cuttable: false`` (custom
  property, exported as glTF extras, read by the game as ``userData.cuttable``). The script tags
  NEVER_CUT unless the object already has that property: this list stands in until the tags are
  set in Blender.
- Tags the see-through hull's structure group (``structure: true``: hull, walls, ceilings, doors,
  hatches...; untagged objects are furniture) from STRUCTURE_GROUP the same way, and the
  exceptions: ``seeThrough: "keep"`` (KEEP), ``seeThrough: "solid"`` (SOLID) and ``divider: true``
  (DIVIDERS).
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

# Never cut by the see-through hull: outside the hull, the camera never looks through them from
# inside. (Floors need no tag: the game never cuts upward-facing surfaces below her feet.)
NEVER_CUT = {'Landing Gear Front', 'Landing Gear Back Left', 'Landing Gear Back Right'}

# The see-through hull's structure group: always cut by the hole. Everything else is furniture, cut
# only while it hides her. (Walls and seat.* mix walls and seats: structure.)
STRUCTURE_GROUP = {
    'Hull_Merged', 'Windshield', 'Door', 'Top Hatch', 'Top Hatch Bottom', 'Hatch.002',
    'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit', 'Crew Quarters Ceiling',
    'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002', 'Door Boolean.001',
    'Door Cockpit', 'Door Cockpit 2', 'Door Engineering', 'Door Engineering 2',
    'Ceiling Light.001', 'Ceiling Light.002', 'Ceiling Light.003', 'Ceiling Light.004',
    'Turbine Left', 'Turbine Right', 'Turbine.001', 'Turbine.002', 'Lab Window', 'Lab Window.001',
    # The cargo ramp: closed, it's the cargo bay's back wall (the game never cuts it while open).
    'Door Cargo',
}

# Furniture the see-through rules never cut for hiding her (owner: the 3D printer's frame and ray
# let her show through, and it frames the shot).
KEEP = {'3d Printer'}
# Always visible on her deck, never cut (owner's test, 2026-10-09): every piece of furniture in the
# cockpit (the seats' parts follow their seat), the machine on the engineering ceiling, the red sled.
COCKPIT = {
    'Seat', 'Seat.001', 'Seat.002', 'Seat.004', 'Dashboard Body', 'Dashboard Body.001',
    'Dashboard Body.002', 'Dials.002', 'Monitor.001', 'Monitor.003', 'Monitor.004',
}
SOLID = COCKPIT | {'Contraption', 'Sledge'}
# Interior dividers: always visible while the camera is inside the ship; from outside, cut by the
# hole or as a whole (a toggle in the game). Their child objects (the doors) follow.
DIVIDERS = {
    'Bulkhead Cargo', 'Bulkhead Cockpit',
    'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002',
}

# Moving parts get their own collider in the game, so they're left out of zamboni_col.
MOVING = {'Door Cargo'}
# Furniture denser than this goes into the collider as its convex hull. Never structure: a convex
# hull of the hull would be a solid block.
DENSE_TRIS = 2000
STRUCTURE = set(EXTERIOR) | {'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit'}

# Collections excluded from the view layer in the file that hold interior objects.
INCLUDE_COLLECTIONS = ['Crew Quarters', 'Stuff', 'Galley', 'Shelf', 'Table', 'Engineering', 'Contraption', 'Cargo Bay']

# Props: the rest of what's in these collections (not their sub-collections: the crew, Hidden...).
PROP_COLLECTIONS = ['Crew Quarters', 'Stuff', 'Galley', 'Shelf', 'Table', 'Engineering', 'Cargo Bay', 'Cockpit', 'Hull', 'Parts']
# Not props: the unmerged hull (not rendered), a hidden door panel, an old Dr. Kaufman, an empty.
NOT_PROPS = {'Hull', 'Door Panel', 'Dr. Kaufman', 'Dr. KaufmanMesh', 'Cockpit Center'}
# Props this big or bigger (largest side, Blender units: ~0.4 m in the game) stay separate objects
# with a collider; smaller ones are merged per room and don't collide.
BIG = 0.25

# Room lights (owner, 2026-10-09: one or two ambient lights per room; the rest flagged). Positions
# from these lights in the file; brightness is set in the game.
LIGHTS = {
    'Area.002': 'cargo bay', 'Area.003': 'cargo bay',
    'Area.001': 'engineering', 'Area.015': 'engineering',
    'Area.013': 'crew quarters', 'Area.007': 'crew quarters',
}
# The cockpit has no light in the file: one is added above its centre (Blender units).
COCKPIT_LIGHT_ABOVE_CENTRE = 0.6

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
# Child objects (the seats' backrests, the bulkhead's doors) are exported with their parents and
# can be tagged too.
for ob in objects + [child for parent in objects for child in parent.children_recursive]:
    if 'cuttable' not in ob and ob.name in NEVER_CUT:
        ob['cuttable'] = False
        tagged += 1
    if 'structure' not in ob and ob.name in STRUCTURE_GROUP:
        ob['structure'] = True
        tagged += 1
    if 'seeThrough' not in ob and ob.name in KEEP:
        ob['seeThrough'] = 'keep'
        tagged += 1
    if 'seeThrough' not in ob and ob.name in SOLID:
        ob['seeThrough'] = 'solid'
        tagged += 1
    if 'divider' not in ob and ob.name in DIVIDERS:
        ob['divider'] = True
        tagged += 1

# Props: baked to meshes in place (modifiers applied, curves and text turned into meshes).
depsgraph = bpy.context.evaluated_depsgraph_get()
listed = {ob.name for ob in objects}


def is_prop(ob):
    if ob.name in listed or ob.name in NOT_PROPS or ob.hide_render or ob.type not in ('MESH', 'CURVE', 'FONT'):
        return False
    # Posed crew meshes belong to their character (Monitor Arm is a rigged lamp, a prop).
    return not (ob.parent and ob.parent.type == 'ARMATURE' and ob.parent.name != 'Monitor Arm')


def baked_mesh(ob):
    mesh = bpy.data.meshes.new_from_object(ob.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    mesh.transform(ob.matrix_world)
    if ob.matrix_world.is_negative:
        mesh.flip_normals()
    if mesh.uv_layers:
        mesh.uv_layers[0].name = 'UVMap'  # so merged props share one UV layer
    return mesh


def largest_side(ob):
    from mathutils import Vector
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return max(max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3))


props, big_props = [], []
prop_count = {'big': 0, 'small': 0}
for cname in PROP_COLLECTIONS:
    small = []
    for ob in bpy.data.collections[cname].objects:
        if not is_prop(ob):
            continue
        if largest_side(ob) >= BIG and ob.type == 'MESH':
            mesh = baked_mesh(ob)
            name = ob.name
            ob.name = name + ' (source)'
            prop = bpy.data.objects.new(name, mesh)
            prop['prop'] = True
            bpy.context.scene.collection.objects.link(prop)
            if cname == 'Cockpit':
                prop['seeThrough'] = 'solid'
            props.append(prop)
            big_props.append(prop)
            prop_count['big'] += 1
        else:
            small.append(ob)
    if not small:
        continue
    # Merge this room's small props: one mesh, its materials combined.
    bm_props = bmesh.new()
    materials = []
    for ob in small:
        mesh = baked_mesh(ob)
        remap = []
        for mat in mesh.materials:
            if mat not in materials:
                materials.append(mat)
            remap.append(materials.index(mat))
        first = len(bm_props.faces)
        bm_props.from_mesh(mesh)
        bm_props.faces.ensure_lookup_table()
        for face in bm_props.faces[first:]:
            if remap:
                face.material_index = remap[face.material_index] if face.material_index < len(remap) else remap[0]
        bpy.data.meshes.remove(mesh)
        prop_count['small'] += 1
    merged = bpy.data.meshes.new(f'Props {cname}')
    bm_props.to_mesh(merged)
    bm_props.free()
    for mat in materials:
        merged.materials.append(mat)
    prop = bpy.data.objects.new(f'Props {cname}', merged)
    prop['prop'] = True
    bpy.context.scene.collection.objects.link(prop)
    if cname == 'Cockpit':
        prop['seeThrough'] = 'solid'
    props.append(prop)

for mat in sorted({s.material for ob in props for s in ob.material_slots if s.material} - {s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Light markers.
markers = []
for name, room in LIGHTS.items():
    source = bpy.data.objects[name]
    marker = bpy.data.objects.new(f'light {room} ({name})', None)
    marker.matrix_world = source.matrix_world.copy()
    marker['light'] = {'room': room, 'color': list(source.data.color), 'energy': source.data.energy}
    bpy.context.scene.collection.objects.link(marker)
    markers.append(marker)
centre = bpy.data.objects['Cockpit Center'].matrix_world.translation
marker = bpy.data.objects.new('light cockpit (new)', None)
marker.location = (centre.x, centre.y, centre.z + COCKPIT_LIGHT_ABOVE_CENTRE)
marker['light'] = {'room': 'cockpit', 'color': [1.0, 1.0, 1.0], 'energy': 20.0}
bpy.context.scene.collection.objects.link(marker)
markers.append(marker)
flagged = sorted(ob.name for ob in bpy.data.objects if ob.type == 'LIGHT' and ob.name not in LIGHTS)
print(f'FLAGGED LIGHTS (not imported): {flagged}')
print(f'cockpit light at {tuple(round(v, 2) for v in marker.location)}')

# Collision mesh: evaluated copies (modifiers applied) of everything except moving parts.
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
# Big props: their convex hulls (already baked in place).
for prop in big_props:
    part = bmesh.new()
    part.from_mesh(prop.data)
    bmesh.ops.convex_hull(part, input=part.verts, use_existing_faces=False)
    hull_mesh = bpy.data.meshes.new('hull')
    part.to_mesh(hull_mesh)
    part.free()
    bm.from_mesh(hull_mesh)
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


export(objects + props + markers, args.out, export_extras=True)
# The collider: positions only (no normals, UVs or materials).
export([collider], args.collider_out, export_normals=False, export_texcoords=False, export_materials='NONE')
print('EXPORTED', args.out, args.collider_out)
print(f'objects: {len(objects)}, props: {prop_count["big"]} big, {prop_count["small"]} small merged into {len(props) - len(big_props)} objects, lights: {len(markers)}, tags set: {tagged}, collider triangles: {len(col_mesh.polygons)}, convex hulls: {hulls}')
