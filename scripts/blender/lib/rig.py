"""Armature from the site's bone table (site coordinates) and deterministic analytic skin weights (port of index.html autoSkin)."""
import bpy, math
from mathutils import Vector
from .coords import site_to_bl, bl_to_site

def armature_from_table(name, bones, scale=1.0, leaf_len=0.02):
    arm = bpy.data.armatures.new(name); obj = bpy.data.objects.new(name, arm); bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    by = {}
    children = {}
    for b in bones: children.setdefault(b.get('parent'), []).append(b)
    for b in bones:
        eb = arm.edit_bones.new(b['name']); head = Vector(site_to_bl([v * scale for v in b['at']])); eb.head = head
        kids = children.get(b['name'], [])
        if kids: tail = Vector(site_to_bl([v * scale for v in kids[0]['at']]))
        else: tail = head + Vector((0, -leaf_len * scale, 0))  # leaf bones point forward (site +Z)
        if (tail - head).length < 1e-4: tail = head + Vector((0, -leaf_len * scale, 0))
        eb.tail = tail; eb.use_deform = True; eb.roll = 0.0; by[b['name']] = eb
    for b in bones:
        if b.get('parent'): by[b['name']].parent = by[b['parent']]; by[b['name']].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return obj

def _seg_dist(p, a, b):
    ab = b - a; l2 = ab.length_squared
    t = 0.0 if l2 < 1e-12 else max(0.0, min(1.0, (p - a).dot(ab) / l2))
    return (p - (a + ab * t)).length

def weights_from_segments(obj, bones, segs, scale=1.0, overrides=None, max_influences=4):
    """Analytic falloff weights per vertex (site space). overrides: dict bone -> predicate(site_point) forcing weight 1."""
    pos = {b['name']: Vector([v * scale for v in b['at']]) for b in bones}
    seglist = [(s['bone'], pos[s['a']], pos[s['a']] + Vector(s['d']) * scale, s['r'] * scale, s.get('w', 1.0)) for s in segs]
    me = obj.data
    groups = {b['name']: obj.vertex_groups.get(b['name']) or obj.vertex_groups.new(name=b['name']) for b in bones}
    per_group = {n: [] for n in groups}
    for v in me.vertices:
        p = Vector(bl_to_site(v.co))
        forced = None
        if overrides:
            for bone, pred in overrides.items():
                if pred(p): forced = bone; break
        if forced:
            per_group[forced].append((v.index, 1.0)); continue
        cand = []; best = None; bestD = 1e9
        for bone, a, b, r, w in seglist:
            d = _seg_dist(p, a, b)
            if d < bestD: bestD = d; best = bone
            if d < r:
                ww = (1 - d / r) ** 2 * w
                if ww > 1e-4: cand.append((bone, ww))
        cand.sort(key=lambda c: -c[1]); cand = cand[:max_influences]
        tot = sum(c[1] for c in cand)
        if tot <= 0: per_group[best].append((v.index, 1.0)); continue
        for bone, ww in cand: per_group[bone].append((v.index, ww / tot))
    for name, items in per_group.items():
        for idx, w in items: groups[name].add([idx], w, 'REPLACE')
    return groups

def assign_all(obj, bone):
    for g in obj.vertex_groups: g.remove(range(len(obj.data.vertices)))
    g = obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
    g.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')

def bind(obj, arm_obj):
    mod = obj.modifiers.new('arm', 'ARMATURE'); mod.object = arm_obj; mod.use_vertex_groups = True
    obj.parent = arm_obj
    return mod
