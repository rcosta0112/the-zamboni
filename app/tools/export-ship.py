"""Export the Zamboni from its reference file: the ship, its props and room lights, plus a collision mesh.

Normally run by ``npm run export:ship`` (app/tools/export.mjs), which does all of the below and
prints what changed. By hand: with Blender from the command line. The .blend is opened read-only:
nothing is saved back.

    blender -b "resources/models/The Zamboni 1.19.blend" --python app/tools/export-ship.py -- \
        --out <raw>/zamboni-ship.glb --collider-out <raw>/zamboni-ship-col.glb

then cap the textures at 512 px and compress both (Meshopt) into app/assets, from app/:

    npx gltf-transform resize <raw>/zamboni-ship.glb <raw>/zamboni-ship-512.glb --width 512 --height 512
    npx gltf-transform meshopt <raw>/zamboni-ship-512.glb assets/test/zamboni-ship.glb
    npx gltf-transform meshopt <raw>/zamboni-ship-col.glb assets/test/zamboni-ship-col.glb

What is exported, and how it behaves in the game, is set in the file with custom properties
(doc/architecture/asset-pipeline.md, "Naming contract"): this script holds no list of objects.
It does what is derived from the scene:

- Parts (``part``): exported as their own objects, with modifiers applied (mirrors, booleans,
  geometry nodes). What hangs on a door (the poster on a locker door) is exported with it. A part
  posed by an armature (the engineering display) is baked in its posed place first.
- Props: every other render-visible mesh, curve and text object in the ship's collections (under
  SHIP_COLLECTION; not the collections or objects tagged ``export: false``), baked to a mesh in
  place. Big ones (BIG and up) stay separate objects and go into the collider as convex hulls;
  props tagged ``interact`` (the rack's jetpacks) stay separate too, keeping their ``interact``
  and ``device`` tags (small ones don't collide);
  small ones are merged into one object per collection ("Props <collection>"), one draw call per
  material. A prop that hangs on a part (a child of it, or of a prop that is) is exported with it,
  as a child object: a big one as its own object, the small ones merged into one ("Props <part>", or
  the prop's own name when it's alone), so they move, show and hide with it (owner, 2026-10-15: the
  pallet's lantern, the cabinets' contents, the fire extinguishers on their clamps). Every prop is tagged ``prop: true`` (the game doesn't let them cast shadows: inside
  the hull the sun doesn't reach them, and it halves their draw calls) and takes its collection's
  ``seeThrough`` tag (the cockpit's props are never cut).
- Lights: glTF can't carry area lights, so the room lights are marker empties in the file
  (``lightRoom``, ``lightColor``, ``lightEnergy``), written with one ``light`` property.
- Doors (``doorAxis``, ``doorAngle``, ``doorToGround``, ``doorStartOpen``; closed in the file) are
  written with one ``door`` property: the hinge axis (glTF axes, in the ship's space), the open
  angle (radians), ``toGround`` and ``startOpen``.
- Sliding doors (``doorSlide``, ``doorDistance``, ``doorAuto``; closed in the file): the bulkhead
  doors, the engineering window, the lever. Written as ``door: {slide, auto}``: the way and the
  distance it slides to open, as one vector (glTF axes, in the ship's space), and whether it opens
  when she's near.
- Each moving part's pivot (its origin) is recorded as ``hinge`` (glTF axes): compression moves
  node origins, so the game builds hinges from this. (Not ``pivot``: three.js r186's GLTFLoader
  reads a ``pivot`` extra on a node with children as its own pivot pattern and consumes it.)
- ``zamboni_col``, in its own file, positions only: every part except the moving ones and those
  tagged ``collider: "none"``, joined into one mesh at full detail; ``collider: "hull"`` parts and
  big props as their convex hulls (not those tagged ``collider: "none"``); and every ``*_col``
  object in the file, whatever collection it's in (the bulkheads' pieces,
  the boxes under the hull). A decimated collider closed openings (the cargo door), so it isn't
  decimated. ``*_col`` objects tagged ``reach: "through"`` (the collision boxes in front of the
  crew quarters' walls and furniture) are left out of it and go into the same file as objects of
  their own, under their own names: they stop her, but the game's reach test passes through them.
- Reports every double-sided material ("PERF:"), as the pipeline requires; nothing is forced.
- Materials whose colour, glow or alpha is made by nodes the glTF exporter can't follow are baked
  to images (bake_materials.py), written to a ``baked`` folder next to ``--out``; each is reported
  ("NODES:").
"""

import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bake_materials import bake_node_materials

# The ship's collections: everything under this one, included in the view layer and not tagged
# ``export: false``, is looked through for props.
SHIP_COLLECTION = 'Ship'
# The light markers and collision pieces: included for the export even when it's excluded from the
# view layer in the file (nothing is saved).
GAME_COLLECTION = 'Game'
# Props this big or bigger (largest side, Blender units: ~0.4 m in the game) stay separate objects
# with a collider; smaller ones are merged per room and don't collide.
BIG = 0.25
# Tags that only this script reads: not written to the exported file.
EXPORT_ONLY = ['part', 'collider', 'moving', 'doorAxis', 'doorAngle', 'doorToGround', 'doorStartOpen', 'doorSlide', 'doorDistance', 'doorAuto', 'lightRoom', 'lightColor', 'lightEnergy']
AXES = {'X': 0, 'Y': 1, 'Z': 2}

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--collider-out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])



def include(layer, inside=False):
    """The game's own collection may be switched off in the file, to keep it out of the way."""
    inside = inside or layer.collection.name == GAME_COLLECTION
    if inside:
        layer.exclude = False
    for child in layer.children:
        include(child, inside)


include(bpy.context.view_layer.layer_collection)
bpy.context.view_layer.update()

in_scene = list(bpy.context.view_layer.objects)
objects = [ob for ob in in_scene if ob.get('part')]
if not objects:
    sys.exit('No object is tagged "part": this script exports the reference file (The Zamboni 1.19.blend or later).')
doors = [ob for ob in objects if 'doorAxis' in ob or 'doorSlide' in ob]
# What hangs on a door moves with it (the poster on a locker door).
door_children = [c for door in doors for c in door.children_recursive if c not in objects]
moving = doors + door_children + [ob for ob in objects if ob.get('moving')]
objects += door_children

for mat in sorted({s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Moving parts: record their pivot (the object origin, which is the hinge) as a custom property,
# in glTF axes (y up). Compression (Meshopt quantisation) folds offsets into node transforms and
# moves node origins, so the game can't rely on them: it builds the hinge from this instead.
for ob in moving:
    x, y, z = ob.matrix_world.translation
    ob['hinge'] = [x, z, -y]

for ob in doors:
    if 'doorSlide' in ob:
        # Sliding along the object's own axis = sliding along this vector in the ship.
        a = (ob.matrix_world.to_3x3().normalized() @ Vector([1.0 if i == AXES[ob['doorSlide']] else 0.0 for i in range(3)])).normalized() * ob['doorDistance']
        ob['door'] = {'slide': [a.x, a.z, -a.y], 'auto': bool(ob.get('doorAuto', False))}
        continue
    # Turning the object about its own axis = turning about this axis in the ship (scale doesn't
    # change the direction; the rotations here are single-axis or a half-turn about Z).
    parent = ob.parent.matrix_world.to_3x3().normalized() if ob.parent else Matrix.Identity(3)
    a = (parent @ ob.rotation_euler.to_matrix() @ Vector([1.0 if i == AXES[ob['doorAxis']] else 0.0 for i in range(3)])).normalized()
    ob['door'] = {
        'axis': [a.x, a.z, -a.y], 'angle': math.radians(ob['doorAngle']),
        'toGround': bool(ob['doorToGround']), 'startOpen': bool(ob['doorStartOpen']),
    }

# Props: baked to meshes in place (modifiers applied, curves and text turned into meshes).
depsgraph = bpy.context.evaluated_depsgraph_get()


def is_prop(ob):
    if ob in objects or ob.get('export', True) is False or ob.hide_render or ob.type not in ('MESH', 'CURVE', 'FONT'):
        return False
    if ob.name.endswith('_col'):
        return False
    # Meshes on an armature are posed characters: they have their own export.
    return not (ob.parent and ob.parent.type == 'ARMATURE')


def baked_mesh(ob):
    mesh = bpy.data.meshes.new_from_object(ob.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    mesh.transform(ob.matrix_world)
    if ob.matrix_world.is_negative:
        mesh.flip_normals()
    if mesh.uv_layers:
        mesh.uv_layers[0].name = 'UVMap'  # so merged props share one UV layer
    return mesh


def largest_side(ob):
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return max(max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3))


def prop_collections(layer, inside=False):
    """The ship's collections, in the outliner's order."""
    collection = layer.collection
    if layer.exclude or collection.get('export', True) is False:
        return
    inside = inside or collection.name == SHIP_COLLECTION
    if inside:
        yield collection
    for child in layer.children:
        yield from prop_collections(child, inside)


def copy_tags(source, target):
    for key in source.keys():
        value = source[key]
        target[key] = value.to_dict() if hasattr(value, 'to_dict') else value


# Parts posed by an armature (the engineering display on its arm) are baked in their posed place:
# the glTF exporter doesn't apply an armature, so they came out in the rest pose, inside the wall.
for i, ob in enumerate(objects):
    if not any(m.type == 'ARMATURE' for m in ob.modifiers):
        continue
    name = ob.name
    baked = bpy.data.objects.new(name + ' (baked)', baked_mesh(ob))
    copy_tags(ob, baked)
    ob.name = name + ' (source)'
    baked.name = name
    bpy.context.scene.collection.objects.link(baked)
    objects[i] = baked
    if ob in moving:
        moving[moving.index(ob)] = baked
    print(f'BAKED (posed by an armature): {name}')
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()

props, big_props, hull_props = [], [], []


def add_prop(name, mesh, collection):
    prop = bpy.data.objects.new(name, mesh)
    prop['prop'] = True
    if 'seeThrough' in collection:
        prop['seeThrough'] = collection['seeThrough']
    bpy.context.scene.collection.objects.link(prop)
    props.append(prop)
    return prop


def anchor_of(ob):
    """The part a prop hangs on (its nearest ancestor that's a part), or None."""
    p = ob.parent
    while p:
        if p in objects:
            return p
        p = p.parent
    return None


def hang_on(prop, anchor):
    """Parent a baked prop (its mesh in world space) to its part, keeping it in place."""
    if anchor:
        prop.parent = anchor
        prop.matrix_parent_inverse = anchor.matrix_world.inverted()


def merge(name, small, collection, anchor=None):
    """Small props merged into one object: one mesh, their materials combined."""
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
        ob['export'] = False
        prop_count['small'] += 1
    merged = bpy.data.meshes.new(name)
    bm_props.to_mesh(merged)
    bm_props.free()
    for mat in materials:
        merged.materials.append(mat)
    hang_on(add_prop(name, merged, collection), anchor)


prop_count = {'big': 0, 'small': 0}
for collection in list(prop_collections(bpy.context.view_layer.layer_collection)):
    small = []
    hanging = {}  # part -> its small props
    for ob in list(collection.objects):
        if not is_prop(ob):
            continue
        anchor = anchor_of(ob)
        big = largest_side(ob) >= BIG
        # Something she can use (a rack's jetpack) stays an object of its own, whatever its size,
        # so the game can find it and hide it.
        if (big or 'interact' in ob) and ob.type == 'MESH':
            mesh = baked_mesh(ob)
            name = ob.name
            ob.name = name + ' (source)'
            ob['export'] = False  # nothing is saved: so an object in two collections is baked once
            prop = add_prop(name, mesh, collection)
            hang_on(prop, anchor)
            for key in ('interact', 'device'):
                if key in ob:
                    prop[key] = ob[key]
            big_props.append(prop)
            if big and ob.get('collider') != 'none':  # tagged: its own *_col mesh collides instead
                hull_props.append(prop)
            prop_count['big'] += 1
        elif anchor:
            hanging.setdefault(anchor, []).append(ob)
        else:
            small.append(ob)
    # What hangs on each part, then the rest of this room's small props.
    for anchor, obs in hanging.items():
        name = obs[0].name if len(obs) == 1 else f'Props {anchor.name}'
        if len(obs) == 1:
            obs[0].name = name + ' (source)'
        merge(name, obs, collection, anchor)
    if small:
        merge(f'Props {collection.name}', small, collection)

for mat in sorted({s.material for ob in props for s in ob.material_slots if s.material} - {s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Light markers.
markers = [ob for ob in in_scene if 'lightRoom' in ob]
for marker in markers:
    marker['light'] = {'room': marker['lightRoom'], 'color': list(marker['lightColor']), 'energy': marker['lightEnergy']}


def add_hull(target, mesh):
    part = bmesh.new()
    part.from_mesh(mesh)
    bmesh.ops.convex_hull(part, input=part.verts, use_existing_faces=False)
    hull_mesh = bpy.data.meshes.new('hull')
    part.to_mesh(hull_mesh)
    part.free()
    target.from_mesh(hull_mesh)


# Collision mesh: evaluated copies (modifiers applied) of every part except the moving ones, then
# the file's own collision pieces.
bm = bmesh.new()
hulls = []
col_objects = [ob for ob in in_scene if ob.type == 'MESH' and ob.name.endswith('_col')]
# Pieces tagged `reach: "through"` (the collision boxes) stay objects of their own: they stop
# her, but the game's reach test passes through them.
through = [ob for ob in col_objects if ob.get('reach') == 'through']
for ob in objects + col_objects:
    how = ob.get('collider', 'mesh')
    if ob in moving or ob in through or how == 'none':
        continue
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.transform(ob.matrix_world)
    if how == 'hull':
        add_hull(bm, mesh)
        hulls.append(ob.name)
    else:
        bm.from_mesh(mesh)
    evaluated.to_mesh_clear()
# Big props: their convex hulls (already baked in place).
for prop in hull_props:
    add_hull(bm, prop.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.005)
bmesh.ops.triangulate(bm, faces=bm.faces)
col_mesh = bpy.data.meshes.new('zamboni_col')
bm.to_mesh(col_mesh)
bm.free()
col_mesh.materials.clear()  # one primitive, no materials: it's never rendered
collider = bpy.data.objects.new('zamboni_col', col_mesh)
bpy.context.scene.collection.objects.link(collider)
# The collision boxes go into the same file as objects of their own (the game makes each a convex
# collider: joined, boxes that touch would become one hull).
colliders = [collider] + through

for ob in objects + markers:
    for key in EXPORT_ONLY:
        if key in ob:
            del ob[key]


def export(selection, path, **options):
    # Every object, not the operator: it leaves hidden objects selected, and they'd be exported.
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    for ob in selection:
        ob.hide_set(False)
        ob.hide_viewport = False
        ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_animations=False,
        export_apply=True, export_yup=True, **options,
    )


# What the exporter can't follow in a material (a colour ramp before the emission, a procedural
# texture) is baked to an image first: see bake_materials.py.
baked_materials = bake_node_materials(objects + props, os.path.join(os.path.dirname(os.path.abspath(args.out)), 'baked'), candidates=in_scene)

export(objects + props + markers, args.out, export_extras=True)
# The collider: positions only (no normals, UVs or materials).
export(colliders, args.collider_out, export_normals=False, export_texcoords=False, export_materials='NONE')
print('EXPORTED', args.out, args.collider_out)
print(f'objects: {len(objects)}, props: {prop_count["big"]} big, {prop_count["small"]} small merged into {len(props) - len(big_props)} objects, lights: {len(markers)}, collision pieces: {len(col_objects)} ({len(through)} reach through), baked materials: {baked_materials}, collider triangles: {len(col_mesh.polygons)}, convex hulls: {hulls}')
