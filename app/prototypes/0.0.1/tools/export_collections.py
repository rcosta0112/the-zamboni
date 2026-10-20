"""Which of the file's collections are on for an export (owner, 2026-10-19): the table in
``export-collections.json`` (and doc/architecture/asset-pipeline.md). How they're switched in the
file doesn't matter: every export switches them as the table says, in memory (nothing is saved).

A collection that isn't in the table stays off, and is flagged (``NOTE:``): add it to the table to
export what's in it. A collection on under one that's off stays off (Blender switches children off
with their parent).
"""

import json
import os

import bpy

TABLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'export-collections.json')


def switch_collections():
    with open(TABLE, encoding='utf-8') as f:
        table = json.load(f)

    def walk(layer, parent_on):
        name = layer.collection.name
        if name not in table:
            print(f'NOTE: collection {name!r} is new (not in export-collections.json): not exported')
        on = parent_on and table.get(name, False)
        layer.exclude = not on
        for child in layer.children:
            walk(child, on)

    for layer in bpy.context.view_layer.layer_collection.children:
        walk(layer, True)
    bpy.context.view_layer.update()
    # The file may be saved in pose or edit mode: the exports select objects, which needs object mode.
    active = bpy.context.view_layer.objects.active
    if active and active.mode != 'OBJECT':
        print(f'NOTE: the file was saved in {active.mode.lower()} mode on {active.name!r}: object mode for the export')
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except RuntimeError:
            bpy.context.view_layer.objects.active = None


def show(objects, render=False):
    """These objects shown in memory, whatever the file has: Blender doesn't evaluate an object
    hidden in the viewport (`Hull_Merged`, hidden while the owner worked, left the collider without
    the hull, 2026-10-19). `render`: also shown in renders (what the export list names is exported,
    hidden or not)."""
    hidden = []
    for ob in objects:
        if ob.hide_viewport or ob.hide_get() or (render and ob.hide_render):
            hidden.append(ob.name)
        ob.hide_viewport = False
        ob.hide_set(False)
        if render:
            ob.hide_render = False
    if hidden:
        print(f'NOTE: hidden in the file, shown for the export: {", ".join(sorted(hidden))}')
    bpy.context.view_layer.update()
