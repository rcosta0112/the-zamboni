"""One scale for the ship file and the game (owner, 2026-10-19; plan:
doc/plans/features/scale-normalization.md). A record script: run on the owner's file, it writes a
new version and leaves the file it read as it was.

    blender -b --python app/prototypes/0.0.2/tools/normalize-scale.py -- --src "<1.20.blend>" --out "<1.21.blend>"

(From the project root, through a node script: resources/ isn't named in a shell command.)

Until 2026-10-19 the game scaled the ship by F (her height in the game, 1.23 m, over her exported
model's, 0.828), the player export shrank her armature to 0.826 and the crew export resized each
character around their hips. This script puts all three into the file, so the file is the game 1:1
(1 Blender unit = 1 m) and the exports need no factor:

- Every object without a parent, in every scene: location and scale x F around the origin (not
  applied: modifiers, shared meshes and children follow). Object-level location and scale keys of
  the actions they use x F. ``doorDistance`` x F (a distance in the ship's space). Lights: size x F,
  power x F^2 (Blender's renders stay the same; the game doesn't read them). Cameras: clip and focus
  distances x F.
- Dr. Green's armatures (the player's two, and her placed copies): resized to the game's size (the
  player's around their origin, at her feet; the seated copies around their hips), then the scale
  is applied: armature scale 1, bones resized, her meshes and what hangs on her bones kept in place,
  her actions' bone location keys scaled so the motion is unchanged. She stands 1.23 tall.
- The other characters (Dr. Kaufman, Dr. Ogawa, Adam): resized around their hips as the crew export
  did (HEIGHTS: their height relative to Dr. Green). Their armature scale isn't applied (some share
  actions at different scales).
- ``Archive`` is only scaled with everything else.

Run again on a file that's done (Dr. Green's armature at scale 1, 1.23 tall), it reports 0 changes
and writes nothing.
"""

import argparse
import sys

import bpy
from bpy_extras import anim_utils
from mathutils import Matrix, Vector

# The game's ship scale until 2026-10-19 (probed: `__ship().object.scale.x`).
F = 1.485642
# Her height in the game (settings.zamboniHeight) and the player export's armature scale until now.
HEIGHT = 1.23
PLAYER_SCALE = 0.826
# Her armatures: the player's (resized at their origin, her feet) and her seated copies (at the hips).
GREEN_PLAYER = ['Dr. Green Parka', 'Dr. Green Jump suit']
GREEN_SEATED = ['Dr. Green Jump suit Baked', 'Dr. Green Jump suit Baked.001', 'Dr. Green Jump suit Baked.002']
# The crew export's sizes (export-ship-crew.py until 2026-10-19): standing height relative to
# Dr. Green; None: the correction measured on her copy `Dr. Green Jump suit Baked.001`.
GREEN_CREW_FILE = 0.828
HEIGHTS = {'Dr. Kaufman': 0.650 / 0.828, 'Dr. Ogawa': 1.0, 'Adam': None}
CHARACTERS = {
    'Dr. Kaufman': ['Dr. Kaufman', 'Dr. Kaufman.002'],
    'Dr. Ogawa': ['Dr. Ogawa.001', 'Dr. Ogawa Jumpsuit.001', 'Dr. Ogawa Jumpsuit.002'],
    'Adam': ['Adam', 'Adam.002', 'Adam Blue.001', 'Adam Blue.002'],
}
ARCHIVE = 'Archive'

parser = argparse.ArgumentParser()
parser.add_argument('--src', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

# Opened with its UI, so the owner's layout is kept in the new file.
bpy.ops.wm.open_mainfile(filepath=args.src)

changes = 0


def note(text):
    global changes
    changes += 1
    print('CHANGE:', text)


def update():
    bpy.context.view_layer.update()


def deforms(o, armature):
    return o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == armature for m in o.modifiers)


def skinned_parts(armature):
    return [o for o in bpy.data.objects if deforms(o, armature)]


def loose_parts(armature):
    """Meshes it deforms that aren't under it (they don't follow it by themselves)."""
    return [o for o in skinned_parts(armature) if o not in armature.children_recursive and not (o.parent and deforms(o.parent, armature))]


def standing_height(armature):
    """Height of the armature's skinned meshes in the rest pose (world), as the crew export measured it."""
    armature.data.pose_position = 'REST'
    update()
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for part in skinned_parts(armature):
        ev = part.evaluated_get(dg)
        mesh = ev.to_mesh()
        zs += [(part.matrix_world @ v.co).z for v in mesh.vertices]
        ev.to_mesh_clear()
    armature.data.pose_position = 'POSE'
    update()
    return max(zs) - min(zs)


def world_points(objects):
    """Evaluated vertices of these objects, in world space (for checking that nothing moved)."""
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objects:
        if o.type != 'MESH':
            pts.append(o.matrix_world.translation.copy())
            continue
        ev = o.evaluated_get(dg)
        mesh = ev.to_mesh()
        pts += [o.matrix_world @ v.co for v in mesh.vertices]
        ev.to_mesh_clear()
    return pts


def channelbags(ob):
    """(action, slot, channelbag) for the object's action and its NLA strips."""
    out = []
    ad = ob.animation_data
    if not ad:
        return out
    pairs = [(ad.action, ad.action_slot)] + [(s.action, s.action_slot) for t in ad.nla_tracks for s in t.strips]
    for action, slot in pairs:
        if action and slot:
            bag = anim_utils.action_get_channelbag_for_slot(action, slot)
            if bag:
                out.append((action, slot, bag))
    return out


def scale_keys(fcurve, factor):
    for k in fcurve.keyframe_points:
        k.co.y *= factor
        k.handle_left.y *= factor
        k.handle_right.y *= factor
    fcurve.update()


green = bpy.data.objects.get(GREEN_PLAYER[0])
if green is None:
    sys.exit(f'normalize-scale: no {GREEN_PLAYER[0]!r} in the file')
if abs(green.scale.x - 1) < 1e-4:
    print('normalize-scale: already done (Dr. Green at scale 1): 0 changes, nothing written')
    sys.exit(0)

# Measured before anything moves: the crew export's factors (ratios, the same at any scale).
green_correction = GREEN_CREW_FILE / standing_height(bpy.data.objects['Dr. Green Jump suit Baked.001'])
crew_factor = {}
for character, names in CHARACTERS.items():
    for name in names:
        ob = bpy.data.objects.get(name)
        if ob is None:
            print(f'NOTE: {character}: no {name!r} in the file')
            continue
        ratio = HEIGHTS[character]
        crew_factor[name] = green_correction if ratio is None else GREEN_CREW_FILE * ratio / standing_height(ob)

# 1. Everything x F around the origin.
roots = [o for o in bpy.data.objects if o.parent is None]
for o in roots:
    o.location = o.location * F
    o.delta_location = o.delta_location * F
    o.scale = o.scale * F
    for c in o.constraints:
        if c.type not in ('IK',) and not c.name.startswith('CameraShakify'):
            print(f'NOTE: {o.name}: constraint {c.type} {c.name!r} on a scaled object: check it')
note(f'{len(roots)} objects without a parent: location and scale x {F}')

done_bags = set()
child_bags = {(a.name, s.handle) for o in bpy.data.objects if o.parent for a, s, _ in channelbags(o)}
for o in roots:
    for action, slot, bag in channelbags(o):
        key = (action.name, slot.handle)
        if key in done_bags:
            continue
        done_bags.add(key)
        if key in child_bags:
            print(f'NOTE: action {action.name!r} is used by objects with and without a parent: its object keys scaled for {o.name}')
        curves = [fc for fc in bag.fcurves if fc.data_path in ('location', 'delta_location', 'scale', 'delta_scale')]
        for fc in curves:
            scale_keys(fc, F)
        if curves:
            note(f'action {action.name!r} ({o.name}): {len(curves)} object-level location/scale curves x {F}')

for o in bpy.data.objects:
    if 'doorDistance' in o:
        o['doorDistance'] = o['doorDistance'] * F
        note(f'{o.name}: doorDistance x {F} = {o["doorDistance"]:.4f}')

for light in bpy.data.lights:
    if light.type == 'SUN':
        continue
    light.energy *= F * F
    light.shadow_soft_size *= F
    if light.type == 'AREA':
        light.size *= F
        light.size_y *= F
    if getattr(light, 'use_custom_distance', False):
        light.cutoff_distance *= F
    note(f'light {light.name!r} ({light.type}): power x F^2, size x F')

for cam in bpy.data.cameras:
    cam.clip_start *= F
    cam.clip_end *= F
    cam.ortho_scale *= F
    cam.dof.focus_distance *= F
    note(f'camera {cam.name!r}: clip and focus distances x F')

update()

# 2. Dr. Green: to the game's size, then the scale applied.
def resize_about(ob, factor, centre):
    m = Matrix.Translation(centre) @ Matrix.Scale(factor, 4) @ Matrix.Translation(-centre)
    ob.matrix_world = m @ ob.matrix_world


target = PLAYER_SCALE * F
done_bone_bags = set()

# Applying needs the objects selectable: excluded collections included and hidden objects shown
# while it works, then put back as they were before saving.
# Every collection's own setting, recorded before anything changes (setting a collection's
# exclusion sets its children's too), then put back parents first.
# (Kept by their path of names: the layer collections are rebuilt when operators run.)
excluded = []


def record(layer, path=()):
    excluded.append((path, layer.exclude))
    for child in layer.children:
        record(child, path + (child.name,))


def layer_at(path):
    layer = bpy.context.view_layer.layer_collection
    for name in path:
        layer = layer.children[name]
    return layer


record(bpy.context.view_layer.layer_collection)
for path, _ in excluded:
    if path:
        layer_at(path).exclude = False
update()
hidden = {}
for name in GREEN_PLAYER + GREEN_SEATED:
    ob = bpy.data.objects.get(name)
    if ob is None:
        print(f'NOTE: no {name!r} in the file')
        continue
    factor = target / ob.scale.x
    centre = ob.matrix_world.translation.copy() if name in GREEN_PLAYER else ob.matrix_world @ ob.pose.bones['Body'].head
    loose = loose_parts(ob)
    for o in [ob, *loose]:
        resize_about(o, factor, centre)
    update()
    s = ob.scale.x
    if name in GREEN_SEATED:
        # Not applied: her seated copies share their armature data with other characters.
        note(f'{name}: x {factor:.4f} around the hips (scale {s:.4f}, not applied), standing {standing_height(ob):.4f} tall')
        continue
    family = list(dict.fromkeys([ob, *ob.children_recursive, *loose, *(c for o in loose for c in o.children_recursive)]))
    before = {o.name: world_points([o]) for o in family}

    # Her actions' bone location keys: in the armature's units, which become world units.
    for action, slot, bag in channelbags(ob):
        if (action.name, slot.handle) in done_bone_bags:
            print(f'NOTE: action {action.name!r} is shared by two of her armatures: its bone keys scaled once')
            continue
        done_bone_bags.add((action.name, slot.handle))
        curves = [fc for fc in bag.fcurves if fc.data_path.startswith('pose.bones[') and fc.data_path.endswith('.location')]
        for fc in curves:
            scale_keys(fc, s)
        if curves:
            note(f'action {action.name!r} ({name}): {len(curves)} bone location curves x {s:.5f}')
    # The pose as it stands (what no action drives), in the same units.
    for pb in ob.pose.bones:
        pb.location = pb.location * s

    # The armature alone first; then every part put back where it was (what hangs on a bone moves
    # when the bone is resized), then its own scale applied.
    placed = {o.name: o.matrix_world.copy() for o in family if o is not ob}

    def apply_scale(objects):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:
            hidden[o.name] = (o.hide_get(), o.hide_viewport, o.hide_select)
            o.hide_set(False)
            o.hide_viewport = False
            o.hide_select = False
            o.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True, properties=False)
        update()

    apply_scale([ob])
    for n, m in placed.items():
        bpy.data.objects[n].matrix_world = m
    update()
    shared = [o.name for o in family if o is not ob and o.type in ('MESH', 'CURVE') and o.data.users > 1]
    parts = [o for o in family if o is not ob and o.name not in shared]
    if parts:
        apply_scale(parts)
    after = {o.name: world_points([o]) for o in family}
    off = {n: max(((a - b).length for a, b in zip(after[n], before[n])), default=0) if len(after[n]) == len(before[n]) else float('inf') for n in before}
    moved = max(off.values(), default=0)
    if moved > 1e-4:
        for n, d in off.items():
            o = bpy.data.objects[n]
            print(f'NOTE: {n} ({o.type}, parent {o.parent.name if o.parent else None} {o.parent_type}{" " + o.parent_bone if o.parent_bone else ""}): moved {d:.6f}')
        sys.exit(f'normalize-scale: {name}: applying the scale moved her by {moved:.6f}: nothing written')
    note(f'{name}: scale {s:.5f} applied (moved {moved:.1e}); standing {standing_height(ob):.4f} tall' + (f'; shared meshes not applied: {shared}' if shared else ''))

# 3. The other characters, around their hips, as the crew export resized them.
for name, factor in crew_factor.items():
    ob = bpy.data.objects[name]
    hips = ob.matrix_world @ ob.pose.bones['Body'].head
    loose = loose_parts(ob)
    for o in [ob, *loose]:
        resize_about(o, factor, hips)
    update()
    note(f'{name}: x {factor:.4f} around the hips, standing {standing_height(ob):.4f} tall' + (f' (with {[o.name for o in loose]})' if loose else ''))

for n, (hide, viewport, select) in hidden.items():
    o = bpy.data.objects[n]
    o.hide_viewport = viewport
    o.hide_select = select
    try:
        o.hide_set(hide)
    except RuntimeError:
        pass
for path, exclude in excluded:
    if path and exclude:
        layer_at(path).exclude = True
update()
# Setting a parent's exclusion from a script sets its children's too: a collection that was
# included under an excluded parent comes back excluded with it.
under = [' / '.join(path) for path, exclude in excluded if path and layer_at(path).exclude != exclude]
if under:
    print(f'NOTE: excluded with their parent (they were included under it): {under}')
print(f'normalize-scale: {changes} changes; Dr. Green stands {standing_height(green):.4f} at scale {green.scale.x:.4f}')
bpy.ops.wm.save_as_mainfile(filepath=args.out)
print('SAVED', args.out)
