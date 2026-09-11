"""Command line after '--' for headless runs: --out DIR --size N --samples N --seed N --quick --tiers a,b --gpu --heat"""
import sys, argparse
def parse():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--out', default='build/blender/out'); p.add_argument('--size', type=int, default=2048)
    p.add_argument('--samples', type=int, default=64); p.add_argument('--seed', type=int, default=719)
    p.add_argument('--quick', action='store_true'); p.add_argument('--tiers', default='hero,mid,lod')
    p.add_argument('--gpu', action='store_true'); p.add_argument('--heat', action='store_true'); p.add_argument('--spec', default='scripts/asset-spec.json')
    p.add_argument('--chick', action='store_true'); p.add_argument('--preview', action='store_true')
    a = p.parse_args(argv)
    if a.quick: a.size = min(a.size, 1024); a.samples = min(a.samples, 16)
    a.tiers = [t for t in a.tiers.split(',') if t]
    return a
