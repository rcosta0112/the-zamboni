"""Export the temple and its light shaft (the file's ``Temple`` collection) for the landed scene
(2026-11-07, doc/plans/features/temple.md).

Normally run by ``npm run export:temple`` (app/prototypes/0.0.2/tools/export.mjs): Blender, Meshopt,
the comparison with the last taken export, a summary. By hand, with Blender from the command line
(the .blend is opened read-only: nothing is saved back):

    blender -b "resources/models/The Zamboni 1.22.blend" --python app/prototypes/0.0.2/tools/export-temple.py -- \
        --out <raw>/temple.glb

- The ``Temple`` collection is off in export-collections.json (the ship export leaves it out,
  decision 2026-10-08): switched on here, in memory.
- Placed relative to the object ``Temple``'s origin (every object moved by the same amount, in
  memory): the game puts the file where the scene says (``landmarks`` in the scene's file), turned
  as the ship is, so its turn relative to the ship is the file's.
- Each object carries ``landmark: 'temple'``; ``Light Shaft`` (found by its exact name) carries
  ``shaft: true`` and its material's colour: the Blackbody node's temperature turned into a linear
  Rec. 709 colour (``glowColor``, brightest channel 1) and the Emission node's strength
  (``glowStrength``), so that the game tints the shaft and its light as the file does.
- A ``TEMPLE:`` line per object (size, vertices); ``STOP:`` if an object the game needs is missing.
- Reports every double-sided material (``PERF:``), as the pipeline requires.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_collections import show, switch_collections

COLLECTION = 'Temple'
ORIGIN = 'Temple'
SHAFT = 'Light Shaft'
# What the game looks for by name (landmarks.ts).
NEEDED = ('Temple', 'Temple Steps', SHAFT)

argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args(argv)

switch_collections()


def switch_on(layer, path=()):
    """COLLECTION's layer collection and those above it included (True if found under `layer`)."""
    if layer.collection.name == COLLECTION:
        for above in path:
            above.exclude = False
        layer.exclude = False
        return True
    return any(switch_on(child, (*path, layer)) for child in layer.children)


if not any(switch_on(layer) for layer in bpy.context.view_layer.layer_collection.children):
    sys.exit(f'STOP: no collection {COLLECTION!r} in the file: nothing exported')
bpy.context.view_layer.update()

selection = [ob for ob in bpy.data.collections[COLLECTION].all_objects if ob.type == 'MESH']
names = {ob.name for ob in selection}
for name in NEEDED:
    if name not in names:
        print(f'STOP: no mesh {name!r} in {COLLECTION!r} (renamed?): the game needs it')
if ORIGIN not in bpy.data.objects:
    sys.exit(f'STOP: no object {ORIGIN!r}: nothing to place the temple by')
show(selection)

# Relative to the temple's origin (unparented objects moved; children follow their parent).
origin = bpy.data.objects[ORIGIN].matrix_world.translation.copy()
for ob in selection:
    if ob.parent is None or ob.parent not in selection:
        ob.location -= origin
bpy.context.view_layer.update()


def blackbody(kelvin):
    """Planck's law through the CIE 1931 observer (Wyman, Sloan and Shirley's fit) into linear
    Rec. 709, the brightest channel 1: the hue of Blender's Blackbody node."""

    def g(x, mu, s1, s2):
        return math.exp(-0.5 * ((x - mu) / (s1 if x < mu else s2)) ** 2)

    X = Y = Z = 0.0
    for nm in range(380, 781, 5):
        lam = nm * 1e-9
        planck = 1.0 / (lam**5 * (math.exp(1.4387769e-2 / (lam * kelvin)) - 1.0))
        x = 1.056 * g(nm, 599.8, 37.9, 31.0) + 0.362 * g(nm, 442.0, 16.0, 26.7) - 0.065 * g(nm, 501.1, 20.4, 26.2)
        y = 0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1)
        z = 1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8)
        X, Y, Z = X + planck * x, Y + planck * y, Z + planck * z
    r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z
    gr = -0.9689 * X + 1.8758 * Y + 0.0415 * Z
    b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z
    rgb = [max(0.0, c) for c in (r, gr, b)]
    top = max(rgb) or 1.0
    return [round(c / top, 4) for c in rgb]


for ob in selection:
    ob['landmark'] = 'temple'
    if ob.name == SHAFT:
        ob['shaft'] = True
        color, strength = [1.0, 1.0, 1.0], 1.0
        mat = ob.active_material
        nodes = mat.node_tree.nodes if mat and mat.node_tree else []
        emission = next((n for n in nodes if n.type == 'EMISSION'), None)
        if emission:
            strength = emission.inputs['Strength'].default_value
            link = next((l for l in emission.inputs['Color'].links), None)
            if link and link.from_node.type == 'BLACKBODY':
                kelvin = link.from_node.inputs['Temperature'].default_value
                color = blackbody(kelvin)
                print(f'TEMPLE: the shaft\'s Blackbody {kelvin:.0f} K -> {color}, strength {strength:g}')
            else:
                color = list(emission.inputs['Color'].default_value)[:3]
                print(f'NOTE: the shaft\'s Emission colour isn\'t a Blackbody node: its own colour {color}')
        else:
            print(f'NOTE: the shaft\'s material has no Emission node: white')
        ob['glowColor'] = color
        ob['glowStrength'] = strength

for ob in sorted(selection, key=lambda o: o.name):
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    size = [max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3)]
    print(f'TEMPLE: {ob.name}: {size[0]:.2f} x {size[1]:.2f} x {size[2]:.2f} m, {len(ob.data.vertices)} vertices')

materials = {s.material for ob in selection for s in ob.material_slots if s.material}
for mat in sorted(materials, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

bpy.ops.object.select_all(action='DESELECT')
for ob in selection:
    ob.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format='GLB',
    use_selection=True,
    export_animations=False,
    export_apply=True,
    export_yup=True,
    export_extras=True,
)
print('EXPORTED', args.out, [ob.name for ob in selection])
