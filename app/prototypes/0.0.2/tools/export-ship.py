"""Export the Zamboni from its reference file: the ship, its props and room lights, plus a collision mesh.

Normally run by ``npm run export:ship`` (app/prototypes/0.0.2/tools/export.mjs), which does all of the below and
prints what changed. By hand: with Blender from the command line. The .blend is opened read-only:
nothing is saved back.

    blender -b "resources/models/The Zamboni 1.21.blend" --python app/prototypes/0.0.2/tools/export-ship.py -- \
        --out <raw>/zamboni-ship.glb --collider-out <raw>/zamboni-ship-col.glb

then cap the textures at 512 px and compress both (Meshopt) into public/test/, from app/prototypes/0.0.2/:

    npx gltf-transform resize <raw>/zamboni-ship.glb <raw>/zamboni-ship-512.glb --width 512 --height 512
    npx gltf-transform meshopt <raw>/zamboni-ship-512.glb assets/test/zamboni-ship.glb
    npx gltf-transform meshopt <raw>/zamboni-ship-col.glb assets/test/zamboni-ship-col.glb

**What is exported is a list**, ``ship-export-list.json`` (owner, 2026-10-19: the owner turns
collections on and off while working; until then the collections switched on in the file were the
criterion). The collections are switched as ``export-collections.json`` says, whatever the file
has; a new one stays off and is flagged. The list names the parts, the props (each
with the group it's merged into and its ``seeThrough`` tag, so moving a prop to another collection
changes nothing in the game), the collision pieces and the light markers. ``NOTE:`` lines flag what
doesn't fit: listed but not in the file (renamed, deleted), or in the file and not listed (new: add
it to the list to export it). How each thing behaves in the game is set in the file with custom
properties (doc/architecture/asset-pipeline.md, "Naming contract"):

- Parts (``part``): exported as their own objects, with modifiers applied (mirrors, booleans,
  geometry nodes). What hangs on a door (the poster on a locker door) is exported with it. A part
  posed by an armature (the engineering display) is baked in its posed place first.
- Props: the listed render-visible meshes, curves and text objects (the list was made from the
  ship's collections, not those tagged ``export: false``), baked to a mesh in place. Big ones (BIG and up) stay separate objects and go into the collider as convex hulls;
  props tagged ``interact`` or ``id`` (the rack's jetpacks, her locker's clothes) stay separate too, keeping their ``interact``,
  ``device``, ``id``, ``kind``, ``outfit`` and ``behind`` tags (small ones don't collide);
  small ones are merged into one object per group ("Props <group>": the collection they were in
  when the list was made), one draw call per material. A prop that hangs on a part (a child of it, or of a prop that is) is exported with it,
  as a child object: a big one as its own object, the small ones merged into one ("Props <part>", or
  the prop's own name when it's alone), so they move, show and hide with it (owner, 2026-10-15: the
  pallet's lantern, the cabinets' contents, the fire extinguishers on their clamps). Every prop is tagged ``prop: true`` (the game doesn't let them cast shadows: inside
  the hull the sun doesn't reach them, and it halves their draw calls) and takes its group's
  ``seeThrough`` tag from the list (the cockpit's props are never cut).
- Lights: glTF can't carry area lights, so the room lights are marker empties in the file
  (``lightRoom``, ``lightColor``, ``lightEnergy``), written with one ``light`` property.
- Moving parts (doors, hatches, sliding doors, the window, the lever, what's tagged ``moving``) are
  exported in their rest poses, recorded in ``rest-poses.json`` (rest_poses.py), whatever pose the
  file has them in, and their actions are dropped; a ``POSE:`` line for each correction, for a
  moving part with no record and for a record with no part.
- Doors (``doorAxis``, ``doorAngle``, ``doorToGround``, ``doorStartOpen``; at rest, so closed) are
  written with one ``door`` property: the hinge axis (glTF axes, in the ship's space), the open
  angle (radians), ``toGround`` and ``startOpen``.
- Sliding doors (``doorSlide``, ``doorDistance``, ``doorAuto``; at rest, so closed): the bulkhead
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
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bake_materials import bake_node_materials
from export_collections import show, switch_collections
from rest_poses import drop_actions, is_moving, put_at_rest
from scale_check import check_scale

# What's exported (ship-export-list.py made it; edit it to add or remove things).
LIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ship-export-list.json')
# The ship's collections: looked through for props that aren't listed (to flag them). The boolean
# cutters' collection is off for exports (export-collections.json): they render, but never go in.
SHIP_COLLECTION = 'Ship'
# Props this big or bigger (largest side, Blender units = m) stay separate objects with a
# collider; smaller ones are merged per room and don't collide. (0.25 before the file took the
# game's scale, 2026-10-19: x 1.4856.)
BIG = 0.371
# Tags that only this script reads: not written to the exported file.
EXPORT_ONLY = ['part', 'collider', 'moving', 'doorAxis', 'doorAngle', 'doorToGround', 'doorStartOpen', 'doorSlide', 'doorDistance', 'doorAuto', 'lightRoom', 'lightColor', 'lightEnergy']
AXES = {'X': 0, 'Y': 1, 'Z': 2}

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--collider-out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

switch_collections()  # as export-collections.json says, whatever the file has
check_scale()

with open(LIST, encoding='utf-8') as f:
    listed = json.load(f)
in_scene = list(bpy.context.view_layer.objects)
# What's listed is exported, hidden in the file or not.
listed_names = set(listed['parts']) | {p['name'] for p in listed['props']} | set(listed['collision']) | set(listed['lights'])
show([ob for ob in in_scene if ob.name in listed_names], render=True)


def find(names, what):
    """The listed objects that are in the file; the others flagged."""
    found = []
    for name in names:
        ob = bpy.data.objects.get(name)
        if ob is None or ob not in in_scene:
            print(f'NOTE: {what} {name!r} is in the list but not in the file (renamed or deleted?): not exported')
        else:
            found.append(ob)
    return found


objects = find(listed['parts'], 'part')
if not objects:
    sys.exit('None of the listed parts is in the file: this script exports the reference file (The Zamboni 1.21.blend or later).')
names = set(listed['parts'])
for ob in in_scene:
    if ob.get('part') and ob.name not in names:
        print(f'NOTE: part {ob.name!r} is tagged in the file but not in the list: not exported')
doors = [ob for ob in objects if 'doorAxis' in ob or 'doorSlide' in ob]
# What hangs on a door moves with it (the poster on a locker door): listed with the parts.
door_children = [c for door in doors for c in door.children_recursive if c in objects and not c.get('part')]
for door in doors:
    for c in door.children_recursive:
        if c not in objects and not c.get('part'):
            print(f'NOTE: {c.name!r} hangs on the door {door.name!r} but is not in the list: not exported')
moving = doors + door_children + [ob for ob in objects if ob.get('moving')]

# A part on an armature that isn't exported (the joystick, turned by its armature's damped track
# towards her hand: 2026-10-24): taken off it where the armature stands without its constraints,
# its armature modifier dropped; the game turns it about its origin (`hinge`), so it moves too.
for ob in objects:
    rig = ob.parent
    if rig is None or rig.type != 'ARMATURE' or rig in in_scene:
        continue
    world = rig.matrix_basis @ ob.matrix_parent_inverse @ ob.matrix_basis
    ob.parent = None
    ob.matrix_world = world
    for m in [m for m in ob.modifiers if m.type == 'ARMATURE']:
        ob.modifiers.remove(m)
    if ob.animation_data:
        ob.animation_data_clear()
    moving.append(ob)
    print(f'UNRIGGED: {ob.name!r} off its armature {rig.name!r} (not exported), at its unconstrained place')

# Every moving part at its rest pose, whatever the file has (rest_poses.py): nothing animated.
drop_actions([ob for ob in objects if is_moving(ob)])
put_at_rest([ob for ob in objects if is_moving(ob)], in_scene)

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
    """The ship's collections that are on (not those tagged ``export: false``), in the outliner's order."""
    collection = layer.collection
    if layer.exclude or collection.get('export', True) is False:
        return
    inside = inside or collection.name == SHIP_COLLECTION
    if inside:
        yield collection
    for child in layer.children:
        yield from prop_collections(child, inside)


class Group:
    """Listed props merged together, and their ``seeThrough`` tag (in place of a collection)."""

    def __init__(self, name):
        self.name = name
        self.objects = []
        self.tags = {}

    def __contains__(self, key):
        return key in self.tags

    def __getitem__(self, key):
        return self.tags[key]


groups = {}
for entry in listed['props']:
    group = groups.setdefault(entry['group'], Group(entry['group']))
    if 'seeThrough' in entry:
        group.tags['seeThrough'] = entry['seeThrough']
    for ob in find([entry['name']], 'prop'):
        if is_prop(ob):
            group.objects.append(ob)
        else:
            print(f'NOTE: prop {ob.name!r} is in the list but is no longer a prop (a part now, render-hidden, on an armature?): not exported')
prop_names = {entry['name'] for entry in listed['props']}
for collection in prop_collections(bpy.context.view_layer.layer_collection):
    for ob in collection.objects:
        if ob.name not in prop_names and is_prop(ob):
            print(f'NOTE: {ob.name!r} (in {collection.name!r}) would be a prop but is not in the list: not exported')
            prop_names.add(ob.name)
listed_sources = objects + [ob for g in groups.values() for ob in g.objects]


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
prop_of = {}  # source -> its prop, for the props of its own (big or tagged)
for collection in groups.values():
    small = []
    hanging = {}  # part -> its small props
    for ob in collection.objects:
        if ob.get('export', True) is False:  # baked already (listed twice)
            continue
        anchor = anchor_of(ob)
        big = largest_side(ob) >= BIG
        # Something she can use (a rack's jetpack) stays an object of its own, whatever its size,
        # so the game can find it and hide it.
        if (big or 'interact' in ob or 'id' in ob) and ob.type == 'MESH':
            mesh = baked_mesh(ob)
            name = ob.name
            ob.name = name + ' (source)'
            ob['export'] = False  # nothing is saved: so an object in two collections is baked once
            prop = add_prop(name, mesh, collection)
            hang_on(prop, anchor)
            prop_of[ob] = prop
            for key in ('interact', 'device', 'id', 'kind', 'outfit', 'behind'):
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

# A thing with an id whose parent in the file is another one (the parka on its coat hanger, item
# 75) hangs on it, so the two move together. Only things with ids: the game moves those.
for ob, prop in prop_of.items():
    p = ob.parent
    while p and p not in objects and p not in prop_of:
        p = p.parent
    if p in prop_of and 'id' in ob and 'id' in p:
        hang_on(prop, prop_of[p])
        print(f'HANGS: {prop.name!r} on {prop_of[p].name!r}')

for mat in sorted({s.material for ob in props for s in ob.material_slots if s.material} - {s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Light markers.
markers = find(listed['lights'], 'light marker')
for ob in in_scene:
    if 'lightRoom' in ob and ob not in markers:
        print(f'NOTE: light marker {ob.name!r} is not in the list: not exported')
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
col_objects = find(listed['collision'], 'collision piece')
for ob in in_scene:
    if ob.type == 'MESH' and ob.name.endswith('_col') and ob not in col_objects:
        print(f'NOTE: collision piece {ob.name!r} is not in the list: not exported')
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
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0074)  # m (0.005 Blender units before 2026-10-19, x 1.4856)
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

# Ids (the game's structure, pass 1): an ``ID:`` line for each, which export.mjs compares with the last
# taken export (one gone or changed stops it) and writes to ids.json; a duplicate stops it here, and a
# thing the game uses (a door, something to use, a moving part) without an id is flagged.
USED = ('door', 'interact', 'device', 'moving', 'opensWith', 'controls')
seen = {}
for ob in objects + props:
    if 'id' in ob:
        seen.setdefault(ob['id'], []).append(ob)
    elif any(key in ob for key in USED):
        print(f'NOTE: {ob.name!r} is used by the game but has no id')
for id_, obs in sorted(seen.items()):
    if len(obs) > 1:
        print(f'STOP: the id {id_!r} is on {len(obs)} objects: {", ".join(repr(o.name) for o in obs)} (a duplicated object keeps its tags)')
    ob = obs[0]
    collection = ob.users_collection[0].name if ob.users_collection else ''
    print(f'ID: {id_} = {ob.get("kind", "?")}, {ob.name!r} in {collection!r}')
# The tags that name another thing do it by id (pass 6b): one naming no id stops the export.
for ob in objects + props:
    for key in ('controls', 'opensWith'):
        if key in ob and ob[key] not in seen:
            print(f'STOP: {ob.name!r} {key} {ob[key]!r}, which is no id')

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
        # Only the active scene: another scene's name (the file's 'Boombox') would take the name
        # of the object called the same in the game (GLTFLoader gives it 'Boombox_1').
        use_active_scene=True, export_apply=True, export_yup=True, **options,
    )


# What the exporter can't follow in a material (a colour ramp before the emission, a procedural
# texture) is baked to an image first: see bake_materials.py.
baked_materials = bake_node_materials(objects + props, os.path.join(os.path.dirname(os.path.abspath(args.out)), 'baked'), candidates=listed_sources)

export(objects + props + markers, args.out, export_extras=True)
# The collider: positions only (no normals, UVs or materials).
export(colliders, args.collider_out, export_normals=False, export_texcoords=False, export_materials='NONE')
print('EXPORTED', args.out, args.collider_out)
print(f'objects: {len(objects)}, props: {prop_count["big"]} big, {prop_count["small"]} small merged into {len(props) - len(big_props)} objects, lights: {len(markers)}, collision pieces: {len(col_objects)} ({len(through)} reach through), baked materials: {baked_materials}, collider triangles: {len(col_mesh.polygons)}, convex hulls: {hulls}')
