"""Build the ship's reference file from the owner's file: the scene as it is in the game.

Run with Blender, from the project folder. The file opened is never written to; the result is
saved as a new file, and an existing file is never overwritten.

    blender -b "resources/models/The Zamboni 1.18.blend" --python app/prototypes/0.0.2/tools/build-ship-reference.py -- \
        --out "resources/models/The Zamboni 1.19.blend"

A one-off: once the reference file exists it is edited in Blender, and export-ship.py reads
everything below from it. This script is the record of how it was made (owner, 2026-10-12).

Into the file goes what is scene content:

- Doors closed, as the game needs them (the ramp's one keyframe, which held it open, is removed).
- The objects removed from the game (REMOVED) are deleted.
- Every tag as a custom property on its object (asset-pipeline.md, "Naming contract"):
  ``part``, ``cuttable``, ``structure``, ``seeThrough``, ``divider``, ``collider``, ``moving``,
  ``doorAxis`` / ``doorAngle`` / ``doorToGround`` / ``doorStartOpen``, ``interact``, ``device``,
  ``controls``, ``opensWith``, ``export``. On collections: ``export``, ``seeThrough``.
- The room lights as marker empties (collection "Game Lights"): ``lightRoom``, ``lightColor``,
  ``lightEnergy``.
- Collision pieces as ``*_col`` objects (collection "Game Collision"): the bulkheads' three pieces
  each and, unless --no-fixes, the boxes under the hull and the front thrusters.
- Unless --no-fixes: backface culling on for every material the ship's export uses.

--no-fixes builds the file with no change to what the export gives (apart from the ramp, closed):
used once, to prove the reference against the export before it (the plan's pass 2, stage 2).
"""

import argparse
import os
import sys

import bmesh
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--no-fixes', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])
out = os.path.abspath(args.out)
if os.path.exists(out):
    sys.exit(f'{out} exists: not overwritten. Delete it first if it should be rebuilt.')
if os.path.normcase(out) == os.path.normcase(bpy.data.filepath):
    sys.exit('--out is the file that is open: the source file is never written to.')

# ---------------------------------------------------------------------------------------------
# What the export script listed until 2026-10-12. From here on these live in the file.
# ---------------------------------------------------------------------------------------------

# Fixed parts of the ship: exported as their own objects (everything else render-visible in the
# ship's collections is a prop, baked in place and merged per room when small).
PARTS = [
    # Exterior
    'Hull_Merged', 'Windshield', 'Turbine Left', 'Turbine Right', 'Turbine.001', 'Turbine.002',
    'Landing Gear Front', 'Landing Gear Back Left', 'Landing Gear Back Right',
    'Door', 'Door Cargo', 'Top Hatch', 'Lab Window', 'Lab Window.001',
    # Structure: floors, walls, ceilings, consoles, doors
    'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit',
    'Crew Quarters Ceiling', 'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002',
    'Dashboard Body', 'Dashboard Body.001', 'Dashboard Body.002', 'Door Boolean.001',
    'Door Cockpit', 'Door Cockpit 2', 'Door Engineering', 'Door Engineering 2',
    'Top Hatch Bottom', 'Hatch.002',
    'Ceiling Light.001', 'Ceiling Light.002', 'Ceiling Light.003', 'Ceiling Light.004',
    # Crew quarters and galley
    'Bunks', 'Bunks.001', 'Bunks.002', 'Couch', 'Table', 'Galley', 'Stove',
    'Lockers', 'Locker Door.001', 'Locker Door.003',
    # Cockpit
    'Seat', 'Seat.001', 'Seat.002', 'Seat.004', 'Back seat', 'Back seat.001', 'Back seat.002',
    'Dials.002', 'Monitor.001', 'Monitor.003', 'Monitor.004',
    # Engineering
    'Bench', 'Bench.001', 'Cabinet', 'Cabinet.001', '3d Printer', 'Power Supply', 'Power Supply.001',
    'Stand', 'Monitor Arm.031', 'Contraption',
    # Cargo bay
    'Sledge', 'Pallet', 'Locker', 'Locker Door', 'Head', 'Jetpack Rack', 'Jetpack Rack.001',
    'Ladder Cargo Bay', 'Plane.002',
    # Galley cupboard and fridge doors (children of the galley), the keypads by the side door
    'Galley Door', 'Galley Door.001', 'Galley Door.002', 'Plane.004', 'Plane.006',
]

# Never cut by the see-through hull: outside the hull, the camera never looks through them.
NEVER_CUT = {'Landing Gear Front', 'Landing Gear Back Left', 'Landing Gear Back Right'}

# The see-through hull's structure group: always cut by the hole. Everything else is furniture, cut
# only while it hides her. (Walls and seat.* mix walls and seats: structure. The cargo ramp, closed,
# is the cargo bay's back wall.)
STRUCTURE_GROUP = {
    'Hull_Merged', 'Windshield', 'Door', 'Top Hatch', 'Top Hatch Bottom', 'Hatch.002',
    'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit', 'Crew Quarters Ceiling',
    'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002', 'Door Boolean.001',
    'Door Cockpit', 'Door Cockpit 2', 'Door Engineering', 'Door Engineering 2',
    'Ceiling Light.001', 'Ceiling Light.002', 'Ceiling Light.003', 'Ceiling Light.004',
    'Turbine Left', 'Turbine Right', 'Turbine.001', 'Turbine.002', 'Lab Window', 'Lab Window.001',
    'Door Cargo',
}

# Furniture never cut for hiding her (owner: the 3D printer's frame lets her show through).
KEEP = {'3d Printer'}
# Never cut on her deck (owner's test, 2026-10-09): the cockpit's furniture, the machine on the
# engineering ceiling, the red sled. Props in the cockpit follow from the collection's own tag.
SOLID = {
    'Seat', 'Seat.001', 'Seat.002', 'Seat.004', 'Dashboard Body', 'Dashboard Body.001',
    'Dashboard Body.002', 'Dials.002', 'Monitor.001', 'Monitor.003', 'Monitor.004',
    'Contraption', 'Sledge',
}
SOLID_COLLECTIONS = ['Cockpit']
# Interior dividers: solid while the camera is inside the ship.
DIVIDERS = {
    'Bulkhead Cargo', 'Bulkhead Cockpit',
    'Crew Quarters Sitting Area Walls', 'Walls and seat.001', 'Walls and seat.002',
}

# Doors the player opens and closes (owner, 2026-10-09: every door but the bulkhead ones). Hinged on
# their origin: (the object's own rotation axis, open angle in degrees, opens until it touches the
# ground).
DOORS = {
    'Door': ('Y', -180, True),  # the side door: drops outward until it rests on the ground (a ramp)
    'Hatch.002': ('X', 90, False),  # the trapdoor to the crew quarters (modelled open)
    'Top Hatch': ('X', -100, False),  # roof hatch, outer: flips open, up
    'Top Hatch Bottom': ('X', 90, False),  # roof hatch, inner: flips down
    'Galley Door': ('Z', 100, False),  # fridge
    'Galley Door.001': ('Z', 100, False),  # fridge (modelled open)
    'Galley Door.002': ('Z', 100, False),  # cupboard (modelled open)
    'Locker Door': ('Z', 100, False),  # cargo bay
    'Locker Door.001': ('Z', 100, False),  # crew quarters
    'Locker Door.003': ('Z', 100, False),
}
# Modelled open: closed by setting the hinge axis's rotation to 0 (the others are closed as
# modelled; the cargo locker door's closed rotation is a half-turn).
MODELLED_OPEN = {'Hatch.002', 'Galley Door.001', 'Galley Door.002'}
# Start open in the game (owner, 2026-10-09: the trapdoor, for now; it's hard to aim at from below).
START_OPEN = {'Hatch.002'}
# One interaction moves both (owner, 2026-10-12): the roof hatch's two parts.
OPENS_WITH = {'Top Hatch': 'Top Hatch Bottom', 'Top Hatch Bottom': 'Top Hatch'}
# Owner, 2026-10-09: the upper keypad opens the ramp, the lower one the side door.
PANELS = {'Plane.004': 'Door Cargo', 'Plane.006': 'Door'}
# Moves, but not as a door: the game drives the cargo ramp itself. Its hinge is recorded at export
# and it's left out of the ship's collider, like the doors.
MOVING = {'Door Cargo'}
RAMP = 'Door Cargo'

# Parts denser than this collide as their convex hull. Never these: a convex hull of the hull would
# be a solid block.
DENSE_TRIS = 2000
NEVER_HULL = {
    'Hull_Merged', 'Windshield', 'Turbine Left', 'Turbine Right', 'Turbine.001', 'Turbine.002',
    'Landing Gear Front', 'Landing Gear Back Left', 'Landing Gear Back Right',
    'Door', 'Door Cargo', 'Top Hatch', 'Lab Window', 'Lab Window.001',
    'Floor Bottom', 'Floor Top.001', 'Bulkhead Cargo', 'Bulkhead Cockpit',
}
# Bulkheads collide as three pieces each, left of, right of and above the doorway (owner,
# 2026-10-09, as in the UE prototype): the modelled bulkhead keeps a strip under the doorway that
# she bumped into. Bulkhead: its doorway cutter. The doorway's frame and the sliding doors (inside
# the bulkhead's thickness) don't collide.
BULKHEAD_PIECES = {'Bulkhead Cargo': 'Door Boolean.003', 'Bulkhead Cockpit': 'Door Boolean.004'}
NOT_COLLIDING = {'Door Boolean.001', 'Door Cockpit', 'Door Cockpit 2', 'Door Engineering', 'Door Engineering 2'}

# Never exported: the unmerged hull, a hidden door panel, an old Dr. Kaufman. And the collections
# that hold the crew (they have their own export) and hidden things.
NOT_EXPORTED = {'Hull', 'Door Panel', 'Dr. Kaufman', 'Dr. KaufmanMesh'}
NOT_EXPORTED_COLLECTIONS = ['Crew', 'Crew.001', 'Crew.002', 'Hidden']
# Removed from the game (owner, 2026-10-09): the oscilloscope and its cable on the crew quarters
# floor, the battery charger and its two batteries on the engineering floor, the rungs on the
# cockpit bulkhead by the galley.
REMOVED = [
    'Osciloscope.001', 'Cube.001', 'Osciloscope.002', 'Cable.001',
    'Osciloscope.003', 'Osciloscope.005', 'Power Cell.008', 'Power Cell.009',
    'Ladder Crew Quarters',
]

# Room lights (owner, 2026-10-09: one or two per room). Positions from these lights in the file;
# brightness is set in the game.
LIGHTS = {
    'Area.002': 'cargo bay', 'Area.003': 'cargo bay',
    'Area.001': 'engineering', 'Area.015': 'engineering',
    'Area.013': 'crew quarters', 'Area.007': 'crew quarters',
}
# The cockpit has no light in the file: one is added above its centre (Blender units).
COCKPIT_CENTRE = 'Cockpit Center'
COCKPIT_LIGHT_ABOVE_CENTRE = 0.6

# Collision boxes (owner, 2026-10-12): she got stuck under the hull and sank into the ground under
# the front thrusters. Each box goes from the ground up into the part it stands under.
GROUND_Z = 0.0
FRONT_THRUSTERS = {'Turbine.001': 'Thruster Front Left', 'Turbine.002': 'Thruster Front Right'}

AXES = {'X': 0, 'Y': 1, 'Z': 2}
objects = bpy.data.objects


def log(*parts):
    print('REFERENCE:', *parts)


def world_bounds(ob):
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return Vector([min(c[i] for c in corners) for i in range(3)]), Vector([max(c[i] for c in corners) for i in range(3)])


def new_collection(name, parent):
    collection = bpy.data.collections.new(name)
    parent.children.link(collection)
    return collection


# ---------------------------------------------------------------------------------------------
# Scene content
# ---------------------------------------------------------------------------------------------

for name in REMOVED:
    bpy.data.objects.remove(objects[name], do_unlink=True)
log(f'deleted {len(REMOVED)} objects removed from the game')

# Doors closed. The ramp is held open by an action with a single keyframe: without it, and with no
# rotation of its own, it's closed.
for name in MODELLED_OPEN:
    objects[name].rotation_euler[AXES[DOORS[name][0]]] = 0.0
ramp = objects[RAMP]
ramp.animation_data_clear()
ramp.rotation_euler = (0.0, 0.0, 0.0)
bpy.context.view_layer.update()
log(f'closed {sorted(MODELLED_OPEN)} and the ramp')

parts = [objects[name] for name in PARTS]
for ob in parts:
    ob['part'] = True
    if ob.name in NEVER_CUT:
        ob['cuttable'] = False
    if ob.name in STRUCTURE_GROUP:
        ob['structure'] = True
    if ob.name in KEEP:
        ob['seeThrough'] = 'keep'
    if ob.name in SOLID:
        ob['seeThrough'] = 'solid'
    if ob.name in DIVIDERS:
        ob['divider'] = True
    if ob.name in MOVING:
        ob['moving'] = True
    if ob.name in NOT_COLLIDING or ob.name in BULKHEAD_PIECES:
        ob['collider'] = 'none'
for name, (axis, degrees, to_ground) in DOORS.items():
    ob = objects[name]
    ob['interact'] = 'open'
    ob['doorAxis'] = axis
    ob['doorAngle'] = float(degrees)
    ob['doorToGround'] = to_ground
    ob['doorStartOpen'] = name in START_OPEN
for name, other in OPENS_WITH.items():
    objects[name]['opensWith'] = other
for name, target in PANELS.items():
    ob = objects[name]
    ob['interact'] = 'use'
    ob['device'] = 'panel'
    ob['controls'] = target
for name in NOT_EXPORTED:
    objects[name]['export'] = False
for name in NOT_EXPORTED_COLLECTIONS:
    bpy.data.collections[name]['export'] = False
for name in SOLID_COLLECTIONS:
    bpy.data.collections[name]['seeThrough'] = 'solid'

# Dense furniture collides as its convex hull.
depsgraph = bpy.context.evaluated_depsgraph_get()
hulls = []
for ob in parts:
    if ob.name in NEVER_HULL or 'collider' in ob or 'moving' in ob or 'doorAxis' in ob:
        continue
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    if len(mesh.loop_triangles) > DENSE_TRIS:
        ob['collider'] = 'hull'
        hulls.append(ob.name)
    evaluated.to_mesh_clear()
log(f'tagged {len(parts)} parts; collide as convex hulls: {hulls}')

game = new_collection('Game', bpy.context.scene.collection)
game_lights = new_collection('Game Lights', game)
game_collision = new_collection('Game Collision', game)


def add_marker(name, room, matrix, color, energy):
    marker = objects.new(name, None)
    marker.empty_display_type = 'SPHERE'
    marker.empty_display_size = 0.1
    marker.matrix_world = matrix
    marker['lightRoom'] = room
    marker['lightColor'] = [float(c) for c in color]
    marker['lightEnergy'] = float(energy)
    game_lights.objects.link(marker)


for name, room in LIGHTS.items():
    source = objects[name]
    add_marker(f'light {room} ({name})', room, source.matrix_world.copy(), source.data.color, source.data.energy)
centre = objects[COCKPIT_CENTRE].matrix_world.copy()
centre.translation.z += COCKPIT_LIGHT_ABOVE_CENTRE
add_marker('light cockpit (new)', 'cockpit', centre, (1.0, 1.0, 1.0), 20.0)
log(f'{len(game_lights.objects)} light markers')


def add_col(name, mesh, parent=None):
    ob = objects.new(name, mesh)
    ob.display_type = 'WIRE'
    ob.hide_render = True
    game_collision.objects.link(ob)
    if parent:
        # The mesh is in the scene's space: follow the parent from where it is now.
        ob.parent = parent
        ob.matrix_parent_inverse = parent.matrix_world.inverted()
    return ob


def hull_mesh(name, points):
    bm = bmesh.new()
    for p in points:
        bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts, use_existing_faces=False)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def box_mesh(name, lo, hi):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector([lo[i] + (v.co[i] + 0.5) * (hi[i] - lo[i]) for i in range(3)])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


for name, cutter in BULKHEAD_PIECES.items():
    ob = objects[name]
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    points = [ob.matrix_world @ v.co for v in mesh.vertices]
    evaluated.to_mesh_clear()
    lo, hi = world_bounds(objects[cutter])
    e = 0.002
    for side, piece in (
        ('Left', [p for p in points if p.x <= lo.x + e]),
        ('Right', [p for p in points if p.x >= hi.x - e]),
        ('Top', [p for p in points if p.z >= hi.z - e]),
    ):
        add_col(f'{name} {side}_col', hull_mesh(f'{name} {side}_col', piece), ob)
log('bulkhead collision pieces:', [o.name for o in game_collision.objects])

# ---------------------------------------------------------------------------------------------
# Fixes (owner, 2026-10-12)
# ---------------------------------------------------------------------------------------------

if not args.no_fixes:
    # Boxes from the ground up into what they stand under. Under the hull: inside its lower edge,
    # short of the ramp's hinge at the back, its top below the cargo floor and the side door's sill.
    add_col('Hull Underside_col', box_mesh('Hull Underside_col', (-1.40, -2.45, GROUND_Z), (1.40, 2.10, 0.74)), objects['Hull_Merged'])
    # Under each front thruster: narrower than the thruster, up into its round underside.
    for name, label in FRONT_THRUSTERS.items():
        side = 1.0 if objects[name].matrix_world.translation.x > 0 else -1.0
        x = sorted((side * 1.77, side * 2.67))
        add_col(f'{label}_col', box_mesh(f'{label}_col', (x[0], -2.55, GROUND_Z), (x[1], -1.64, 0.75)), objects[name])
    log('collision boxes:', [o.name for o in game_collision.objects if 'Bulkhead' not in o.name])

    # Single-sided: backface culling on for every material the ship's export uses (owner,
    # 2026-10-12; surfaces that disappear are fixed in Blender). Not the crew's own materials:
    # the characters stay as they are for now.
    def ship_objects(layer, inside=False):
        collection = layer.collection
        if layer.exclude or collection.get('export', True) is False:
            return
        inside = inside or collection.name == 'Ship'
        if inside:
            yield from collection.objects
        for child in layer.children:
            yield from ship_objects(child, inside)

    def is_crew(ob):
        return ob.type == 'ARMATURE' or (ob.parent is not None and ob.parent.type == 'ARMATURE' and not ob.get('part'))

    used = {s.material for ob in ship_objects(bpy.context.view_layer.layer_collection) if not is_crew(ob) and ob.get('export', True) is not False for s in ob.material_slots if s.material}
    changed = sorted(m.name for m in used if not m.use_backface_culling)
    for mat in used:
        mat.use_backface_culling = True
    log(f'backface culling turned on for {len(changed)} of {len(used)} materials: {changed}')
    log('still double-sided (not used by the ship):', sorted(m.name for m in bpy.data.materials if not m.use_backface_culling))

bpy.ops.wm.save_as_mainfile(filepath=out, copy=True)
log('SAVED', out)
