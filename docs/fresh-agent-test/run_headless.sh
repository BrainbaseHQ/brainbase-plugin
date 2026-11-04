#!/usr/bin/env bash
# usage: run_headless.sh <skill> <prompt>  — fresh headless claude with the plugin loaded, read-only tools, empty cwd, no memory
set -u
T="$(cd "$(dirname "$0")" && pwd)"
PLUGIN="${BRAINBASE_PLUGIN_DIR:-$(cd "$T/../.." && pwd)}"
skill="$1"; prompt="$2"
out="${HEADLESS_OUT:-$T/headless}/$skill"; mkdir -p "$out/cwd"
start=$(date +%s)
( cd "$out/cwd" && claude -p "$prompt" --plugin-dir "$PLUGIN" --model sonnet --output-format stream-json --verbose --no-session-persistence --allowedTools "Read,Glob,Grep,Skill,WebFetch,WebSearch" --max-turns 15 < /dev/null > "$out/stream.jsonl" 2> "$out/stderr.txt" )
echo $? > "$out/exit.txt"; echo $(( $(date +%s) - start )) > "$out/seconds.txt"
python3 - "$out" <<'PY'
import json, sys, os
out=sys.argv[1]; skills=[]; reads=[]; final=""; usage={}
for line in open(os.path.join(out,"stream.jsonl")):
    try: ev=json.loads(line)
    except Exception: continue
    if ev.get("type")=="assistant":
        for b in ev.get("message",{}).get("content",[]):
            if b.get("type")=="tool_use":
                if b["name"]=="Skill": skills.append(b["input"].get("skill") or b["input"].get("name") or str(b["input"]))
                if b["name"]=="Read": reads.append(b["input"].get("file_path",""))
    if ev.get("type")=="result":
        final=ev.get("result","") or ""; usage={"cost_usd":ev.get("total_cost_usd"),"duration_ms":ev.get("duration_ms"),"turns":ev.get("num_turns"),"is_error":ev.get("is_error")}
open(os.path.join(out,"answer.md"),"w").write(final)
meta={"skills_invoked":skills,"plugin_files_read":[r for r in reads if "brainbase-plugin" in r],"other_reads":[r for r in reads if "brainbase-plugin" not in r],**usage}
json.dump(meta,open(os.path.join(out,"meta.json"),"w"),indent=2)
print(os.path.basename(out), "| skills:", skills, "| plugin reads:", len(meta["plugin_files_read"]), "| answer:", len(final), "chars | turns:", usage.get("turns"))
PY
