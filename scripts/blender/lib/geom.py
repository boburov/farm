"""Mesh construction helpers: ring lofts with closed ends, superellipse profiles, subdivision via the depsgraph, decimation."""
import bpy, bmesh, math
from mathutils import Vector
from .coords import site_to_bl

def superellipse(a, rx, ry, e_top=2.0, e_bot=2.0):
    """Point on a superellipse for angle a; exponent 2 = ellipse, <2 = boxier, >2 = pointier."""
    c, s = math.cos(a), math.sin(a)
    e = e_top if s >= 0 else e_bot
    x = math.copysign(abs(c) ** (2.0 / e), c) * rx
    y = math.copysign(abs(s) ** (2.0 / e), s) * ry
    return x, y

def loft(name, ring_fn, n_rings, n_seg, close_start=True, close_end=True, smooth=True):
    """ring_fn(t, j, n_seg) -> site-space point for ring t in [0,1] and segment j. Builds a quad tube with fan caps.
    Returns the object, with a per-vertex (t,u) list stored in obj['loft_uv'] for cylindrical UVs."""
    verts, uvs = [], []
    for i in range(n_rings + 1):
        t = i / n_rings
        for j in range(n_seg):
            verts.append(site_to_bl(ring_fn(t, j, n_seg))); uvs.append((j / n_seg, t))
    faces = []
    for i in range(n_rings):
        for j in range(n_seg):
            a = i * n_seg + j; b = i * n_seg + (j + 1) % n_seg; c = (i + 1) * n_seg + (j + 1) % n_seg; d = (i + 1) * n_seg + j
            faces.append((a, b, c, d))
    if close_start:
        ci = len(verts); ring = [site_to_bl(ring_fn(0.0, j, n_seg)) for j in range(n_seg)]
        verts.append(tuple(sum(v[k] for v in ring) / n_seg for k in range(3))); uvs.append((0.5, 0.0))
        for j in range(n_seg): faces.append((ci, (j + 1) % n_seg, j))
    if close_end:
        ci = len(verts); base = n_rings * n_seg; ring = [site_to_bl(ring_fn(1.0, j, n_seg)) for j in range(n_seg)]
        verts.append(tuple(sum(v[k] for v in ring) / n_seg for k in range(3))); uvs.append((0.5, 1.0))
        for j in range(n_seg): faces.append((ci, base + j, base + (j + 1) % n_seg))
    obj = mesh_object(name, verts, faces, smooth)
    write_uv(obj, uvs, seam_wrap=True)
    return obj

def mesh_object(name, verts, faces, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.validate(verbose=False); me.update()
    if smooth: me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    obj = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(obj)
    return obj

def write_uv(obj, uvs, name='UVMap', seam_wrap=False):
    """Per-vertex UVs written to loops; with seam_wrap the u=0/1 seam of a tube is unwrapped correctly."""
    me = obj.data
    layer = me.uv_layers.get(name) or me.uv_layers.new(name=name)
    for poly in me.polygons:
        us = [uvs[me.loops[li].vertex_index][0] for li in poly.loop_indices]
        for li in poly.loop_indices:
            u, v = uvs[me.loops[li].vertex_index]
            if seam_wrap and max(us) - min(us) > 0.5 and u < 0.5: u += 1.0
            layer.data[li].uv = (u, v)

def evaluated_copy(obj):
    dg = bpy.context.evaluated_depsgraph_get(); ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    return me

def subdivide(obj, levels=1):
    if levels <= 0: return obj
    mod = obj.modifiers.new('subd', 'SUBSURF'); mod.levels = levels; mod.render_levels = levels; mod.quality = 4
    me = evaluated_copy(obj); old = obj.data; obj.modifiers.clear(); obj.data = me; bpy.data.meshes.remove(old)
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); activate_color(me)
    return obj

def decimate(obj, ratio, symmetry=True):
    mod = obj.modifiers.new('dec', 'DECIMATE'); mod.ratio = ratio; mod.use_collapse_triangulate = True
    mod.use_symmetry = symmetry; mod.symmetry_axis = 'X'
    me = evaluated_copy(obj); old = obj.data; obj.modifiers.clear(); obj.data = me; bpy.data.meshes.remove(old)
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); activate_color(me)
    return obj

def triangulate(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(obj.data); bm.free(); obj.data.update()

def displace(obj, fn):
    """fn(site_point) -> site_offset; applied per vertex."""
    me = obj.data
    from .coords import bl_to_site
    for v in me.vertices:
        p = bl_to_site(v.co); d = fn(p)
        if d: v.co = Vector(site_to_bl((p[0] + d[0], p[1] + d[1], p[2] + d[2])))
    me.update()

def activate_color(me, name='Col'):
    attr = me.color_attributes.get(name)
    if attr:
        me.color_attributes.active_color = attr; me.color_attributes.render_color_index = me.color_attributes.find(name)

def join(objects, name):
    bm = bmesh.new()
    for o in objects:
        me = evaluated_copy(o); bm.from_mesh(me); bpy.data.meshes.remove(me)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); activate_color(me)
    obj = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(obj)
    return obj

def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)

def bounds_site(obj):
    from .coords import bl_to_site
    pts = [bl_to_site(obj.matrix_world @ v.co) for v in obj.data.vertices]
    return [min(p[k] for p in pts) for k in range(3)], [max(p[k] for p in pts) for k in range(3)]


def sweep_frames(path, n_rings, x0=(1, 0, 0)):
    """Centres and rotation-minimizing frames (c, x, y) along a site-space Catmull-Rom path, one per ring."""
    from mathutils import Vector
    pts = [Vector(p) for p in path]
    def catmull(t):
        n = len(pts) - 1; f = max(0.0, min(1.0, t)) * n; i = min(int(f), n - 1); u = f - i
        p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(n, i + 2)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    frames = []; x = Vector(x0)
    for i in range(n_rings + 1):
        t = i / n_rings; c = catmull(t); d = catmull(min(1.0, t + 1e-3)) - catmull(max(0.0, t - 1e-3))
        if d.length < 1e-9: d = Vector((0, 0, 1))
        d.normalize(); x = (x - d * x.dot(d))
        if x.length < 1e-6: x = Vector((1, 0, 0)) - d * d.x
        x.normalize(); y = d.cross(x).normalized(); frames.append((c, x, y))
    return frames

def sweep(name, path, radius_fn, n_rings, n_seg, close_start=True, close_end=True, shape_fn=None, x0=(1, 0, 0)):
    """Tube along a site-space path with rotation-minimizing ring frames. radius_fn(t)->(rx,ry); shape_fn(t,a,rx,ry)->(x,y)."""
    frames = sweep_frames(path, n_rings, x0)
    def ring(t, j, n):
        i = min(n_rings, int(round(t * n_rings))); c, x, y = frames[i]; a = j / n * 2 * math.pi; rx, ry = radius_fn(t)
        if shape_fn: px, py = shape_fn(t, a, rx, ry)
        else: px, py = math.cos(a) * rx, math.sin(a) * ry
        p = c + x * px + y * py
        return (p.x, p.y, p.z)
    return loft(name, ring, n_rings, n_seg, close_start, close_end)

def ellipsoid(name, center, radii, n_u=16, n_v=10):
    """Closed ellipsoid (site coords) as a loft along Y with polar UVs."""
    cx, cy, cz = center; rx, ry, rz = radii
    def ring(t, j, n):
        phi = (t - 0.5) * math.pi; a = j / n * 2 * math.pi
        return (cx + math.cos(phi) * math.cos(a) * rx, cy + math.sin(phi) * ry, cz + math.cos(phi) * math.sin(a) * rz)
    return loft(name, ring, n_v, n_u, True, True)

def uv_rect(obj, rect, name='UVMap'):
    """Remap the object's UVs from 0..1 into the sub-rectangle rect=(u0,v0,u1,v1); tube seams (u>1) are clamped by wrap."""
    layer = obj.data.uv_layers.get(name)
    if not layer: return
    u0, v0, u1, v1 = rect
    for d in layer.data:
        u, v = d.uv; u = u - math.floor(u) if u > 1.0 else max(0.0, u)
        d.uv = (u0 + u * (u1 - u0), v0 + v * (v1 - v0))

def set_color(obj, rgb, name='Col'):
    """Per-vertex colour attribute (linear RGB) used both for baking tints and the runtime tint multiply."""
    me = obj.data
    attr = me.color_attributes.get(name) or me.color_attributes.new(name=name, type='FLOAT_COLOR', domain='POINT')
    col = (rgb[0], rgb[1], rgb[2], 1.0)
    for i in range(len(me.vertices)): attr.data[i].color = col
    me.color_attributes.active_color = attr; me.color_attributes.render_color_index = me.color_attributes.find(name)

def card(name, root, tip, width, bow=0.003, outward=(0, 1, 0), n_len=3, n_wid=2, curl=0.0, uv_cell=(0, 0, 1, 1)):
    """Feather card: a bent quad strip from root to tip (site coords), width across, bowed along `outward` (its normal)."""
    from mathutils import Vector
    a = Vector(root); b = Vector(tip); d = b - a; L = d.length; d.normalize()
    side = d.cross(Vector(outward))
    if side.length < 1e-6: side = Vector((1, 0, 0))
    side.normalize(); nrm = side.cross(d).normalized()
    verts, uvs, faces = [], [], []
    for i in range(n_len + 1):
        t = i / n_len; w = width * (0.35 + 0.65 * math.sin(math.pi * min(1.0, t * 0.9 + 0.1)) ** 0.7)
        lift = math.sin(math.pi * t) * bow + t * t * curl
        for j in range(n_wid + 1):
            x = (j / n_wid - 0.5) * 2
            p = a + d * (t * L) + side * (x * w) + nrm * (lift + (1 - x * x) * w * 0.12)
            verts.append(site_to_bl((p.x, p.y, p.z)))
            u0, v0, u1, v1 = uv_cell; uvs.append((u0 + (j / n_wid) * (u1 - u0), v0 + t * (v1 - v0)))
    for i in range(n_len):
        for j in range(n_wid):
            k = i * (n_wid + 1) + j; faces.append((k, k + 1, k + n_wid + 2, k + n_wid + 1))
    obj = mesh_object(name, verts, faces, True); write_uv(obj, uvs); return obj

def solid_polygon(name, points_yz, x_center, thickness, bevel=0.0012, bevel_segments=2):
    """A plate in the YZ plane (site coords: points are (z,y)) extruded along X with bevelled edges — comb, wattle plates."""
    bm = bmesh.new()
    vs = [bm.verts.new(site_to_bl((x_center, y, z))) for (z, y) in points_yz]
    f = bm.faces.new(vs)
    res = bmesh.ops.solidify(bm, geom=[f] + list(f.edges) + list(f.verts), thickness=thickness)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=bevel_segments, affect='EDGES', profile=0.6)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update(); me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    obj = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(obj)
    # planar UVs from the plate's YZ extent
    layer = me.uv_layers.new(name='UVMap'); zs = [p[0] for p in points_yz]; ys = [p[1] for p in points_yz]
    z0, z1, y0, y1 = min(zs), max(zs), min(ys), max(ys)
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = bl_to_site_v(me.vertices[me.loops[li].vertex_index].co)
            layer.data[li].uv = ((co[2] - z0) / max(1e-6, z1 - z0), (co[1] - y0) / max(1e-6, y1 - y0))
    return obj

def bl_to_site_v(v): return (v[0], v[2], -v[1])
