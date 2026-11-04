import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
T=os.path.dirname(os.path.abspath(__file__))
jobs=[l.rstrip("\n").split("\t",1) for l in open(os.path.join(T,"prompts.tsv")) if l.strip()]
def run(j):
    s,p=j; r=subprocess.run([os.path.join(T,"run_headless.sh"),s,p],capture_output=True,text=True); return s, r.returncode, (r.stdout or r.stderr).strip().splitlines()[-1:]
with ThreadPoolExecutor(max_workers=5) as ex:
    for s,rc,last in ex.map(run,jobs): print(s, rc, last, flush=True)
print("ALL-DONE")
