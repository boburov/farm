import sys, time
_t0 = time.time()
def log(*a):
    print(f"[{time.time()-_t0:7.1f}s]", *a); sys.stdout.flush()
class timer:
    def __init__(self, label): self.label = label
    def __enter__(self): self.t = time.time(); return self
    def __exit__(self, *e): log(f"{self.label}: {time.time()-self.t:.1f}s")
