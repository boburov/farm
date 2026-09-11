"""UV unwrapping: angle-based unwrap through operators with a context override, cylindrical fallback."""
import bpy, math
from .log import log

def _edit(obj):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj

def smart_uv(obj, angle=66.0, margin=0.02):
    try:
        _edit(obj)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode='OBJECT'); return True
    except Exception as e:
        log('smart_uv failed, keeping cylindrical UVs:', e)
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
        return False

def pack(objects, margin=0.01):
    try:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.select_all(action='SELECT'); bpy.ops.uv.pack_islands(margin=margin, rotate=True)
        bpy.ops.object.mode_set(mode='OBJECT'); return True
    except Exception as e:
        log('pack_islands failed:', e)
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
        return False
