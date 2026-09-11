"""Pipeline smoke test: loft a capsule, subdivide, UV, rig 3 bones with analytic weights, bake 256² maps, export glTF."""
import sys, os, math, bpy
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.args import parse
from lib.log import log, timer
from lib import geom, uv, rig, materials as M, bake, export
a = parse(); os.makedirs(a.out, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
def ring(t, j, n):
    ang = j / n * 2 * math.pi; r = 0.05 * math.sin(math.pi * t) ** 0.6 + 0.002
    x, y = geom.superellipse(ang, r, r * 0.8, 2.0, 1.6)
    return (x, 0.1 + t * 0.3 + y, 0.0)
obj = geom.loft('capsule', ring, 24, 16); geom.subdivide(obj, 1); uv.smart_uv(obj)
bones = [{'name': 'root', 'at': [0, .1, 0]}, {'name': 'mid', 'parent': 'root', 'at': [0, .25, 0]}, {'name': 'top', 'parent': 'mid', 'at': [0, .4, 0]}]
segs = [{'bone': 'root', 'a': 'root', 'd': [0, .15, 0], 'r': .08, 'w': 1}, {'bone': 'mid', 'a': 'mid', 'd': [0, .15, 0], 'r': .08, 'w': 1}, {'bone': 'top', 'a': 'top', 'd': [0, .05, 0], 'r': .08, 'w': 1}]
arm = rig.armature_from_table('rig', bones); rig.weights_from_segments(obj, bones, segs); rig.bind(obj, arm)
m, nt, bsdf, out = M.new_material('smoke'); n = M.noise(nt, 30); cr = M.ramp(nt, [(0, (.8, .7, .6, 1)), (1, (.3, .2, .15, 1))])
nt.links.new(n.outputs['Fac'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], bsdf.inputs['Base Color'])
b = M.bump(nt, .4, .003); nt.links.new(n.outputs['Fac'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
obj.data.materials.append(m)
bake.setup(samples=8, gpu=a.gpu)
maps = bake.bake_material(obj, m, 256, a.out, 'smoke', passes=('COLOR', 'NORMAL', 'AO', 'ROUGH'), quick=True)
# swap the procedural tree for the baked images so the export references files
for kind, path in maps.items():
    img = bpy.data.images.load(path); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    if kind == 'COLOR': nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    elif kind == 'ROUGH': img.colorspace_settings.name = 'Non-Color'; nt.links.new(tex.outputs['Color'], bsdf.inputs['Roughness'])
    elif kind == 'NORMAL': img.colorspace_settings.name = 'Non-Color'; nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
nt.links.remove(b.outputs['Normal'].links[0]) if b.outputs['Normal'].links else None
obj['slot'] = 0
rep = export.export([obj], os.path.join(a.out, 'smoke.gltf'), armature=arm, extras={'tris': geom.tri_count(obj)})
log('SMOKE_OK', rep)
