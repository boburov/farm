"""Whole dressed chicken and the 16 retail cuts. Same site frame as the Node generator: neck at -Z, rear (cavity) at +Z,
breast up. Cuts are modelled directly in their rest layout (the spread the beat-4 camera and anchors expect) and carry
extras.home (centroid), extras.dir (explode direction) and extras.attachTo (bones follow their cut).
Run: Blender -b --factory-startup -noaudio --python-exit-code 1 -P scripts/blender/dressed.py -- --out build/blender/dressed
"""
import sys, os, math, random, json, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.args import parse
from lib.log import log, timer
from lib import geom, uv, rig, materials as M, bake, export
from lib.coords import load_spec, site_to_bl, bl_to_site
from mathutils import Vector
a = parse(); spec = load_spec(a.spec); D = spec['dressed']; random.seed(a.seed); os.makedirs(a.out, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
def lerp(p, q, t): return p + (q - p) * t
def sample(knots, t):
    n = len(knots) - 1; f = max(0.0, min(1.0, t)) * n; i = min(int(f), n - 1); u = f - i; u = u * u * (3 - 2 * u); return lerp(knots[i], knots[i + 1], u)
def radii(rx, ry): return lambda t: (sample(rx, t), sample(ry, t))
def flat_bottom(e_top=2.0, e_bot=5.0):   # rounded top, nearly flat underside (the cut face)
    return lambda t, ang, rx, ry: geom.superellipse(ang, rx, ry, e_top, e_bot)
def colour(o, rgb): geom.set_color(o, rgb)
parts = {}   # name -> (object, material key)

# ------------------------------------------------------------- whole dressed bird
CZ = [-.43, -.37, -.28, -.13, .05, .20, .30]; CY = [.29, .31, .31, .31, .29, .245, .20]
RXW = [.040, .082, .187, .255, .249, .187, .088]; RYW = [.034, .052, .141, .187, .180, .130, .079]
def carcass_shape(t, ang, rx, ry):
    px, py = geom.superellipse(ang, rx, ry, 1.9, 2.3)
    if py > 0:   # paired breast domes with the keel groove between them
        w = math.sin(math.pi * min(1.0, max(0.0, (t - .12) / .78))) ** 0.8
        py += (.026 * math.exp(-((abs(px) - .085) / .075) ** 2) - .011 * math.exp(-(px / .013) ** 2)) * w
    return px, py
with timer('whole'):
    path = [(0, CY[i], CZ[i]) for i in range(len(CZ))]
    whole = geom.sweep('whole_src', path, radii(RXW, RYW), 44, 32, True, False, carcass_shape)   # rear ring left open for the cavity
    geom.subdivide(whole, 1); geom.uv_rect(whole, (0, .5, .6, 1)); colour(whole, (1, 1, 1))
    ws = []
    for side in (-1, 1):
        leg = geom.sweep('wleg' + str(side), [(side * .16, .215, .09), (side * .235, .185, .17), (side * .215, .150, .27), (side * .155, .125, .35), (side * .105, .142, .40)],
                         radii([.052, .100, .086, .056, .026], [.044, .088, .078, .052, .024]), 28, 18, True, True)
        geom.uv_rect(leg, (.6 if side > 0 else .8, .75, .8 if side > 0 else 1, 1)); colour(leg, (1, 1, 1)); ws.append(leg)
        wing = geom.sweep('wwing' + str(side), [(side * .200, .310, -.170), (side * .265, .250, -.090), (side * .270, .190, .000), (side * .245, .190, .070), (side * .212, .258, .040), (side * .205, .290, -.010)],
                          radii([.030, .041, .033, .023, .018, .007], [.024, .034, .028, .020, .016, .006]), 30, 16, True, True)
        geom.uv_rect(wing, (.6 if side > 0 else .8, .5, .8 if side > 0 else 1, .75)); colour(wing, (1, 1, 1)); ws.append(wing)
    tailnub = geom.ellipsoid('tailnub', (0, .305, .285), (.028, .020, .030), 12, 8); geom.uv_rect(tailnub, (.55, .5, .6, .55)); colour(tailnub, (1, 1, 1)); ws.append(tailnub)
    neckring = geom.sweep('neckring', [(0, .29, -.432), (0, .29, -.418)], lambda t: (.046, .040), 4, 20, True, True); geom.uv_rect(neckring, (.5, .5, .55, .55)); colour(neckring, (.97, .9, .86)); ws.append(neckring)
    whole_obj = geom.join([whole] + ws, 'whole_all')
    cavity = geom.sweep('cavity', [(0, .20, .301), (0, .205, .277), (0, .21, .24), (0, .215, .234)], radii([.086, .065, .022, .002], [.077, .055, .024, .002]), 20, 24, False, True)
    neckcav = geom.sweep('neckCavity', [(0, .29, -.431), (0, .29, -.411), (0, .29, -.385)], radii([.039, .027, .003], [.033, .023, .003]), 12, 20, False, True)
    for o in (cavity, neckcav):
        geom.uv_rect(o, (.5, .55, .6, .65)); colour(o, (.55, .32, .30))
        import bmesh; bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.to_mesh(o.data); bm.free()
    parts['whole'] = (whole_obj, 'skin'); parts['cavity'] = (cavity, 'cavity'); parts['neckCavity'] = (neckcav, 'cavity')

# ------------------------------------------------------------- cuts (rest layout)
with timer('cuts'):
    for side in (-1, 1):
        sfx = 'L' if side > 0 else 'R'
        # breast fillet: teardrop dome, flat underside, thick end at -z
        cx = .163
        br = geom.sweep('breast' + sfx, [(side * .157, .688, -.18), (side * cx, .705, -.02), (side * .170, .700, .20), (side * .166, .688, .42), (side * .128, .672, .60), (side * .112, .662, .66)],
                        radii([.010, .140, .160, .128, .066, .004], [.008, .086, .102, .088, .042, .003]), 46, 30, True, True, flat_bottom(1.9, 4.5))
        geom.uv_rect(br, (0 if side > 0 else .5, 0, .5 if side > 0 else 1, .7)); colour(br, (1, 1, 1)); parts['breast' + sfx] = (br, 'meat')
        tn = geom.sweep('tender' + sfx, [(side * .095, .604, -.12), (side * .097, .617, .04), (side * .108, .615, .24), (side * .104, .615, .42), (side * .085, .622, .54)],
                        radii([.006, .042, .040, .028, .003], [.005, .031, .031, .020, .002]), 26, 18, True, True, flat_bottom(2.0, 3.5))
        geom.uv_rect(tn, (0 if side > 0 else .5, .7, .5 if side > 0 else 1, 1)); colour(tn, (1, 1, 1)); parts['tender' + sfx] = (tn, 'meat')
        th = geom.sweep('thigh' + sfx, [(side * .29, .46, -.33), (side * .38, .47, -.25), (side * .43, .39, -.12), (side * .43, .29, -.02), (side * .40, .24, .04)],
                        radii([.012, .112, .138, .086, .022], [.010, .092, .112, .078, .020]), 30, 24, True, True, flat_bottom(2.0, 3.0))
        geom.uv_rect(th, (0 if side > 0 else .25, .25, .25 if side > 0 else .5, .5)); colour(th, (1, 1, 1)); parts['thigh' + sfx] = (th, 'skin')
        tb = geom.sweep('thighBone' + sfx, [(side * .30, .47, -.34), (side * .305, .47, -.387), (side * .31, .47, -.415)], radii([.024, .020, .030], [.024, .020, .028]), 12, 12, True, True)
        geom.uv_rect(tb, (.5, .5, .55, .55)); colour(tb, (.93, .90, .82)); parts['thighBone' + sfx] = (tb, 'bone')
        dr = geom.sweep('drum' + sfx, [(side * .42, .28, .03), (side * .44, .215, .105), (side * .415, .115, .18), (side * .355, .020, .23), (side * .321, -.043, .251)],
                        radii([.050, .102, .098, .049, .024], [.046, .094, .090, .046, .022]), 32, 22, True, True)
        geom.uv_rect(dr, (.5 if side > 0 else .75, .25, .75 if side > 0 else 1, .5)); colour(dr, (1, 1, 1)); parts['drum' + sfx] = (dr, 'skin')
        db = geom.sweep('drumBone' + sfx, [(side * .321, -.038, .252), (side * .311, -.089, .265), (side * .312, -.11, .27), (side * .312, -.129, .273)], radii([.019, .017, .027, .010], [.019, .017, .027, .010]), 14, 12, True, True)
        geom.uv_rect(db, (.55, .5, .6, .55)); colour(db, (.93, .90, .82)); parts['drumBone' + sfx] = (db, 'bone')
        wg = geom.sweep('wing' + sfx, [(side * .29, .54, .23), (side * .43, .51, .175), (side * .54, .40, .07), (side * .57, .39, -.012), (side * .61, .47, -.14), (side * .63, .50, -.21), (side * .66, .47, -.26), (side * .67, .39, -.31)],
                        radii([.046, .064, .058, .046, .037, .024, .013, .002], [.040, .050, .040, .034, .026, .018, .010, .002]), 44, 18, True, True)
        geom.uv_rect(wg, (0 if side > 0 else .25, 0, .25 if side > 0 else .5, .25)); colour(wg, (1, 1, 1)); parts['wing' + sfx] = (wg, 'skin')
    def back_shape(t, ang, rx, ry):
        px, py = geom.superellipse(ang, rx, ry, 2.2, 2.0)
        if py > 0: py += .012 * math.exp(-(px / .03) ** 2)   # spine ridge
        return px, py
    bk = geom.sweep('back', [(0, .47, -.49), (0, .47, -.42), (0, .46, -.28), (0, .46, -.06), (0, .49, .15), (0, .52, .32), (0, .54, .39)],
                    radii([.060, .180, .255, .270, .200, .120, .030], [.070, .120, .160, .170, .140, .080, .030]), 40, 30, True, True, back_shape)
    geom.uv_rect(bk, (.5, 0, .75, .25)); colour(bk, (1, 1, 1)); parts['back'] = (bk, 'skin')
    rs = geom.sweep('rest', [(0, .43, -.64), (0, .46, -.59), (0, .47, -.53), (0, .46, -.48)], radii([.006, .080, .100, .066], [.008, .050, .060, .040], ), 18, 20, True, True)
    geom.uv_rect(rs, (.75, 0, 1, .25)); colour(rs, (1, 1, 1)); parts['rest'] = (rs, 'skin')

# ------------------------------------------------------------- materials
def skin_material():
    m, nt, bsdf, out = M.new_material('dressed_skin'); vc = M.color_attribute(nt); coord = nt.nodes.new('ShaderNodeTexCoord')
    pores = M.voronoi(nt, 110, 'DISTANCE_TO_EDGE'); nt.links.new(coord.outputs['UV'], pores.inputs['Vector'])
    follicle = M.voronoi(nt, 110, 'F1'); nt.links.new(coord.outputs['UV'], follicle.inputs['Vector'])
    mottle = M.noise(nt, 9, 4, .55); nt.links.new(coord.outputs['UV'], mottle.inputs['Vector'])
    fine = M.noise(nt, 70, 5, .6); nt.links.new(coord.outputs['UV'], fine.inputs['Vector'])
    tone = M.ramp(nt, [(0, (.94, .78, .62, 1)), (.5, (.96, .86, .70, 1)), (1, (.98, .90, .78, 1))]); nt.links.new(mottle.outputs['Fac'], tone.inputs['Fac'])
    pink = M.ramp(nt, [(0, (.92, .70, .62, 1)), (1, (1, 1, 1, 1))]); nt.links.new(fine.outputs['Fac'], pink.inputs['Fac'])
    mixc = M.mix_rgb(nt, .35, 'MULTIPLY'); nt.links.new(tone.outputs['Color'], mixc.inputs[6]); nt.links.new(pink.outputs['Color'], mixc.inputs[7])
    mixv = M.mix_rgb(nt, 1.0, 'MULTIPLY'); nt.links.new(mixc.outputs[2], mixv.inputs[6]); nt.links.new(vc.outputs['Color'], mixv.inputs[7]); nt.links.new(mixv.outputs[2], bsdf.inputs['Base Color'])
    rough = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(fine.outputs['Fac'], rough.inputs[0]); rough.inputs[1].default_value = .30; rough.inputs[2].default_value = .32; nt.links.new(rough.outputs[0], bsdf.inputs['Roughness'])
    h = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(follicle.outputs['Distance'], h.inputs[0]); h.inputs[1].default_value = -.9; nt.links.new(mottle.outputs['Fac'], h.inputs[2])
    b = M.bump(nt, .35, .0012); nt.links.new(h.outputs[0], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return m
def meat_material():
    m, nt, bsdf, out = M.new_material('dressed_meat'); vc = M.color_attribute(nt); coord = nt.nodes.new('ShaderNodeTexCoord'); mapping = nt.nodes.new('ShaderNodeMapping'); mapping.inputs['Scale'].default_value = (1, 6, 1)
    nt.links.new(coord.outputs['UV'], mapping.inputs['Vector'])
    fibre = M.noise(nt, 40, 6, .7, .4); nt.links.new(mapping.outputs['Vector'], fibre.inputs['Vector'])   # stretched along v = along the fillet
    membrane = M.noise(nt, 6, 3, .5); nt.links.new(coord.outputs['UV'], membrane.inputs['Vector'])
    tone = M.ramp(nt, [(0, (.80, .40, .40, 1)), (.5, (.90, .58, .56, 1)), (1, (.96, .74, .70, 1))]); nt.links.new(fibre.outputs['Fac'], tone.inputs['Fac'])
    white = M.ramp(nt, [(0, (1, 1, 1, 1)), (.62, (1, 1, 1, 1)), (.72, (.98, .92, .90, 1)), (1, (.97, .93, .92, 1))]); nt.links.new(membrane.outputs['Fac'], white.inputs['Fac'])
    mixc = M.mix_rgb(nt, .55, 'MULTIPLY'); nt.links.new(tone.outputs['Color'], mixc.inputs[6]); nt.links.new(white.outputs['Color'], mixc.inputs[7])
    mixv = M.mix_rgb(nt, 1.0, 'MULTIPLY'); nt.links.new(mixc.outputs[2], mixv.inputs[6]); nt.links.new(vc.outputs['Color'], mixv.inputs[7]); nt.links.new(mixv.outputs[2], bsdf.inputs['Base Color'])
    rough = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(fibre.outputs['Fac'], rough.inputs[0]); rough.inputs[1].default_value = .25; rough.inputs[2].default_value = .28; nt.links.new(rough.outputs[0], bsdf.inputs['Roughness'])
    b = M.bump(nt, .3, .0008); nt.links.new(fibre.outputs['Fac'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return m
def bone_material():
    m, nt, bsdf, out = M.new_material('dressed_bone'); vc = M.color_attribute(nt); nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .5; return m
def cavity_material():
    m, nt, bsdf, out = M.new_material('dressed_cavity'); vc = M.color_attribute(nt); nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .45; return m
mats = {'skin': skin_material(), 'meat': meat_material(), 'bone': bone_material(), 'cavity': cavity_material()}
for name, (o, key) in parts.items(): o.data.materials.append(mats[key])

# ------------------------------------------------------------- bakes (skin 2K, meat 1K)
bake.setup(samples=a.samples, gpu=a.gpu); bpy.context.scene.world.light_settings.distance = .15
skin_objs = [o for n, (o, k) in parts.items() if k == 'skin']; meat_objs = [o for n, (o, k) in parts.items() if k == 'meat']
with timer('bake skin'): bake.bake_material(skin_objs, mats['skin'], a.size, a.out, 'dressed-skin', ('COLOR', 'NORMAL', 'AO', 'ROUGH'), ao_samples=a.samples, quick=a.quick)
with timer('bake meat'): bake.bake_material(meat_objs, mats['meat'], max(512, a.size // 2), a.out, 'dressed-meat', ('COLOR', 'NORMAL', 'AO', 'ROUGH'), ao_samples=a.samples, quick=a.quick)
def use_baked(m, base, kinds):
    nt = m.node_tree; bsdf = next(n_ for n_ in nt.nodes if n_.type == 'BSDF_PRINCIPLED')
    for link in list(bsdf.inputs['Base Color'].links + bsdf.inputs['Roughness'].links + bsdf.inputs['Normal'].links): nt.links.remove(link)
    for kind in kinds:
        img = bpy.data.images.load(os.path.join(a.out, 'tex', f'{base}-{kind}.png')); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
        if kind == 'color':
            vc = M.color_attribute(nt); mix = M.mix_rgb(nt, 1.0, 'MULTIPLY'); nt.links.new(vc.outputs['Color'], mix.inputs[6]); nt.links.new(tex.outputs['Color'], mix.inputs[7]); nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
        elif kind == 'rough': img.colorspace_settings.name = 'Non-Color'; nt.links.new(tex.outputs['Color'], bsdf.inputs['Roughness'])
        elif kind == 'normal': img.colorspace_settings.name = 'Non-Color'; nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
use_baked(mats['skin'], 'dressed-skin', ('color', 'normal', 'rough')); use_baked(mats['meat'], 'dressed-meat', ('color', 'normal', 'rough'))

# ------------------------------------------------------------- extras + export
DIRS = D['dirs']; ATTACH = D['attachTo']
final = []
for name, (o, key) in parts.items():
    o.name = name; o.data.name = name
    verts = [bl_to_site(v.co) for v in o.data.vertices]; c = [sum(v[k] for v in verts) / len(verts) for k in range(3)]
    o['home'] = [round(v, 5) for v in c]
    if name in DIRS: o['dir'] = DIRS[name]
    if name in ATTACH: o['attachTo'] = ATTACH[name]; o['dir'] = DIRS[ATTACH[name]]
    final.append(o)
tris = {n: geom.tri_count(o) for n, (o, k) in parts.items()}
rep = export.export(final, os.path.join(a.out, 'poultry-cuts.gltf'), armature=None, extras={'triangles': sum(tris.values()), 'parts': tris})
log('poultry-cuts:', sum(tris.values()), 'tris', tris)
with open(os.path.join(a.out, 'report.json'), 'w') as f: json.dump({'triangles': sum(tris.values()), 'parts': tris}, f, indent=1)
log('DRESSED_OK')
