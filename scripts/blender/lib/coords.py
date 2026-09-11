"""Site space is Y-up, +Z forward. Blender is Z-up, -Y forward. glTF export with export_yup maps (x,y,z)->(x,z,-y)."""
import json
def site_to_bl(p): return (p[0], -p[2], p[1])
def bl_to_site(p): return (p[0], p[2], -p[1])
def load_spec(path):
    with open(path) as f: return json.load(f)
