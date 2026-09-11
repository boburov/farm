"""Worker surfaces: tailored torso with sleeves, trousers, mitten palms, boots, plus a face with neck, eyes, pupils, hair cap,
baseball cap, hairnet and hard hat shells. Names avoid the 19 bone names; weights are analytic (site segs) or whole-object.
No textures: the site applies its own cloth/skin/gear materials and recolours parts per role."""
import sys, os, math, json, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.args import parse
from lib.log import log, timer
from lib import geom, rig, export
from lib.coords import load_spec
a = parse(); spec = load_spec(a.spec); W = spec['worker']; MAN = W['landmarks']; BONES = W['bones']; SEGS = W['segs']
os.makedirs(a.out, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
def lerp(p, q, t): return p + (q - p) * t
def sample(k, t):
    n = len(k) - 1; f = max(0.0, min(1.0, t)) * n; i = min(int(f), n - 1); u = f - i; u = u * u * (3 - 2 * u); return lerp(k[i], k[i + 1], u)
def radii(rx, ry): return lambda t: (sample(rx, t), sample(ry, t))
def white(o): geom.set_color(o, (1, 1, 1))
objs = {}
# torso: hips to neck, chest flattened front/back, shoulders widening then closing at the neck
def torso_shape(t, ang, rx, ry):
    px, py = geom.superellipse(ang, rx, ry, 2.4, 2.4)
    if t > .55 and t < .92: px *= 1 + .14 * math.sin(math.pi * (t - .55) / .37)      # shoulders
    return px, py
trunk = geom.sweep('trunk', [(0, .90, 0), (0, 1.00, 0), (0, 1.12, -.005), (0, 1.26, 0), (0, 1.38, .004), (0, 1.445, .0)],
                   radii([.150, .156, .146, .170, .175, .062], [.098, .102, .094, .108, .100, .052]), 30, 24, True, True, torso_shape)
sleeves = []
for side in (-1, 1):
    sl = geom.sweep('sleeve' + str(side), [(side * .150, 1.405, 0), (side * .186, 1.345, 0), (side * .186, 1.24, -.004), (side * .185, 1.155, 0), (side * .186, 1.04, .0), (side * .186, .93, .0)],
                    radii([.064, .062, .056, .050, .046, .040], [.062, .060, .054, .048, .044, .038]), 24, 14, True, True); sleeves.append(sl)
objs['torso'] = geom.join([trunk] + sleeves, 'torso'); white(objs['torso'])
pelvis = geom.sweep('pelvis', [(0, 1.00, 0), (0, .94, 0), (0, .88, 0)], radii([.150, .166, .160], [.098, .108, .104]), 6, 24, True, True)
legs = []
for side in (-1, 1):
    lg = geom.sweep('leg' + str(side), [(side * .092, .93, 0), (side * .095, .84, 0), (side * .095, .68, -.004), (side * .095, .52, 0), (side * .095, .45, -.004), (side * .095, .28, -.002), (side * .095, .10, .002)],
                    radii([.092, .097, .086, .073, .072, .064, .058], [.092, .097, .086, .073, .072, .064, .058]), 28, 16, True, True); legs.append(lg)
objs['trousers'] = geom.join([pelvis] + legs, 'trousers'); white(objs['trousers'])
palms = []
for side in (-1, 1):
    pm = geom.sweep('palm' + str(side), [(side * .185, .935, 0), (side * .185, .90, .010), (side * .185, .862, .015), (side * .185, .832, .026)], radii([.032, .039, .037, .014], [.020, .024, .022, .010]), 14, 12, True, True)
    th = geom.ellipsoid('thumb' + str(side), (side * .160, .905, .030), (.012, .022, .012), 10, 6); palms += [pm, th]
objs['palms'] = geom.join(palms, 'palms'); white(objs['palms'])
boots = []
for side in (-1, 1):
    bt = geom.sweep('boot' + str(side), [(side * .095, .10, -.085), (side * .095, .095, -.03), (side * .095, .085, .06), (side * .095, .070, .150), (side * .095, .058, .195)],
                    radii([.062, .065, .066, .060, .030], [.060, .060, .050, .040, .024], ), 18, 14, True, True, lambda t, ang, rx, ry: geom.superellipse(ang, rx, ry, 2.2, 4.0))
    sole = geom.sweep('sole' + str(side), [(side * .095, .012, -.09), (side * .095, .012, .20)], lambda t: (.068, .013), 2, 12, True, True, lambda t, ang, rx, ry: geom.superellipse(ang, rx, ry, 3.0, 3.0)); boots += [bt, sole]
objs['boots'] = geom.join(boots, 'boots'); white(objs['boots'])
# head: face ovoid with brow, nose, chin and ears; neck; eyes; hair cap; hats
HY = 1.615
def face_shape(t, ang, rx, ry):
    px, py = geom.superellipse(ang, rx, ry, 2.2, 2.0)
    return px, py
face = geom.sweep('face_src', [(0, 1.44, 0), (0, 1.52, .0), (0, 1.56, .008), (0, 1.62, .012), (0, 1.68, .006), (0, 1.715, 0)],
                  radii([.052, .058, .072, .078, .074, .030], [.054, .062, .082, .088, .084, .036]), 20, 16, True, True, face_shape, x0=(1, 0, 0))
def face_displace(p):
    x, y, z = p; d = [0, 0, 0]
    if z > 0:
        d[2] += .006 * math.exp(-((y - 1.635) / .018) ** 2) * math.exp(-(x / .05) ** 2)      # brow
        d[2] += .012 * math.exp(-((y - 1.60) / .014) ** 2) * math.exp(-(x / .012) ** 2)     # nose
        d[2] += .005 * math.exp(-((y - 1.555) / .014) ** 2) * math.exp(-(x / .03) ** 2)     # chin
        d[2] -= .004 * math.exp(-((y - 1.615) / .012) ** 2) * math.exp(-((abs(x) - .028) / .012) ** 2)  # eye sockets
    return d
geom.displace(face, face_displace)
ears = [geom.ellipsoid('ear' + str(s), (s * .078, 1.61, -.005), (.008, .020, .014), 10, 7) for s in (-1, 1)]
objs['face'] = geom.join([face] + ears, 'face'); geom.subdivide(objs['face'], 1); white(objs['face'])
objs['eyes'] = geom.join([geom.ellipsoid('eye' + str(s), (s * .028, 1.615, .062), (.012, .010, .008), 12, 8) for s in (-1, 1)], 'eyes'); white(objs['eyes'])
objs['pupils'] = geom.join([geom.ellipsoid('pupil' + str(s), (s * .028, 1.615, .069), (.005, .005, .003), 8, 6) for s in (-1, 1)], 'pupils'); white(objs['pupils'])
hair = geom.sweep('hair_src', [(0, 1.60, -.02), (0, 1.66, -.012), (0, 1.735, 0)], radii([.084, .086, .020], [.092, .092, .024]), 10, 20, False, True); objs['hair'] = hair; white(hair)
capd = geom.sweep('cap_src', [(0, 1.655, 0), (0, 1.70, .0), (0, 1.748, 0)], radii([.088, .084, .018], [.094, .090, .020]), 8, 20, False, True)
peak = geom.sweep('peak', [(0, 1.662, .07), (0, 1.658, .150)], lambda t: (.075 - .02 * t, .010), 3, 12, True, True, lambda t, ang, rx, ry: geom.superellipse(ang, rx, ry, 4.0, 4.0))
objs['cap'] = geom.join([capd, peak], 'cap'); white(objs['cap'])
net = geom.sweep('net_src', [(0, 1.61, -.01), (0, 1.68, -.004), (0, 1.752, 0)], radii([.090, .088, .020], [.098, .096, .022]), 8, 20, False, True); objs['net'] = net; white(net)
dome = geom.sweep('helmet_src', [(0, 1.63, 0), (0, 1.70, .0), (0, 1.775, 0)], radii([.098, .094, .020], [.104, .100, .022]), 8, 20, False, True)
brim = geom.sweep('brim', [(0, 1.632, 0), (0, 1.625, 0)], lambda t: (.118, .120), 2, 20, True, True); objs['helmet'] = geom.join([dome, brim], 'helmet'); white(objs['helmet'])
# weights + export
arm = rig.armature_from_table('rig', BONES)
for key, o in objs.items():
    if key in ('face', 'eyes', 'pupils', 'hair', 'cap', 'net', 'helmet'): rig.assign_all(o, 'head')
    else: rig.weights_from_segments(o, BONES, SEGS)
    rig.bind(o, arm); o['slot'] = W['slots'][key]; o.name = key; o.data.name = key
tris = {k: geom.tri_count(o) for k, o in objs.items()}
export.export(list(objs.values()), os.path.join(a.out, 'worker-surfaces.gltf'), armature=arm, extras={'triangles': sum(tris.values()), 'parts': tris})
log('worker-surfaces:', sum(tris.values()), tris); log('WORKER_OK')
