"""What the ship export takes from a .blend, as a list (owner, 2026-10-19: what goes into the game is
a list, not what's switched on in the file; the owner turns collections on and off while working).

    blender -b "<file.blend>" --python app/prototypes/0.0.2/tools/ship-export-list.py -- --out <list.json> [--everything]

Lists the objects ``export-ship.py`` exported until 2026-10-19, by the rules it had then:

- ``parts``: objects tagged ``part`` (and what hangs on a door), from the collections included in
  the view layer;
- ``props``: render-visible meshes, curves and text in the ``Ship`` collection's included
  collections (not tagged ``export: false``, not on an armature, not ``*_col``), each with the
  collection it came from (small props are merged per collection, ``Props <collection>``) and that
  collection's ``seeThrough`` tag;
- ``collision``: ``*_col`` meshes; ``lights``: light markers (``lightRoom``).

The ``Game`` collection is included even when it's switched off, as the export did. With
``--everything`` every collection counts, switched on or not: for comparing a file with the list.

Made once from `The Zamboni 1.19.blend` (what the game had on 2026-10-19), into
``ship-export-list.json``, which the export now reads.
"""

import argparse
import json
import sys

import bpy

SHIP_COLLECTION = 'Ship'
GAME_COLLECTION = 'Game'

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--everything', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])


def include(layer, inside=False):
    inside = inside or args.everything or layer.collection.name == GAME_COLLECTION
    if inside:
        layer.exclude = False
    for child in layer.children:
        include(child, inside)


include(bpy.context.view_layer.layer_collection)
bpy.context.view_layer.update()

in_scene = list(bpy.context.view_layer.objects)
parts = [ob for ob in in_scene if ob.get('part')]
doors = [ob for ob in parts if 'doorAxis' in ob or 'doorSlide' in ob]
door_children = [c for door in doors for c in door.children_recursive if c not in parts]
parts += door_children


def is_prop(ob):
    if ob in parts or ob.get('export', True) is False or ob.hide_render or ob.type not in ('MESH', 'CURVE', 'FONT'):
        return False
    if ob.name.endswith('_col'):
        return False
    return not (ob.parent and ob.parent.type == 'ARMATURE')


def prop_collections(layer, inside=False):
    collection = layer.collection
    if layer.exclude or collection.get('export', True) is False:
        return
    inside = inside or collection.name == SHIP_COLLECTION
    if inside:
        yield collection
    for child in layer.children:
        yield from prop_collections(child, inside)


props = []
seen = set()
for collection in prop_collections(bpy.context.view_layer.layer_collection):
    for ob in collection.objects:
        if ob.name in seen or not is_prop(ob):
            continue
        seen.add(ob.name)
        entry = {'name': ob.name, 'group': collection.name}
        if 'seeThrough' in collection:
            entry['seeThrough'] = collection['seeThrough']
        props.append(entry)

result = {
    'parts': [ob.name for ob in parts],
    'props': props,
    'collision': [ob.name for ob in in_scene if ob.type == 'MESH' and ob.name.endswith('_col')],
    'lights': [ob.name for ob in in_scene if 'lightRoom' in ob],
}
with open(args.out, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=1, ensure_ascii=False)
    f.write('\n')
print(f'LIST: {len(result["parts"])} parts, {len(props)} props, {len(result["collision"])} collision pieces, {len(result["lights"])} lights -> {args.out}')
