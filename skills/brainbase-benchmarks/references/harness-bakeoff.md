# Bake off harnesses on one task

Source: https://docs.brainbaselabs.com/api/usecases/harness-bakeoff, https://docs.brainbaselabs.com/api
(harness table, thread statuses), https://docs.brainbaselabs.com/api/threads/create-thread,
https://docs.brainbaselabs.com/api/files/download-file, https://docs.brainbaselabs.com/api/machines/delete-machine
Snapshot: 2026-11-03

Contents: What it is and when to use it · Prerequisites · Harness values · Endpoints the loop
uses · Grader safety · The script, condensed · Reusing the result inside Benchmarks

## What it is and when to use it

Give the same task to several coding-agent harnesses, each in its own isolated sandbox, wait for
each to settle, download the artifact each produced, grade it locally against tests the agents
never saw, rank by score then wall-time, and tear the sandboxes down. Because the agents only see
the spec and never the tests, the score is hard to game.

This is an API loop over threads, not the Benchmarks feature. Use it when the comparison is
between harnesses: a benchmark belongs to one agent and its variants are models, and agents on
`cursor`, `factory` or `qoder` cannot be benchmarked at all. Use Benchmarks when the comparison is
between versions or models of one agent and you want versioned cases, checks, baselines and trends.

## Prerequisites

- An API key from app.brainbaselabs.com exported as `BRAINBASE_API_KEY`.
- Python with `requests` (`pip install requests`).
- A disposable machine to run the grader on (see the warning below).

## Harness values

The `agent.harness` field accepts these values (from the live runtime registry):

| Harness | Harness value |
| --- | --- |
| Claude Code | `claude_code` |
| Codex | `codex` |
| Cursor | `cursor` |
| Factory Droid | `factory` |
| Kafka (Brainbase's flagship runtime for knowledge work) | `kafka_cloud` |
| OpenCode | `opencode` |
| Qoder | `qoder` |
| Qwen Code | `qwen` |

Not every harness runs on every provider; the use case treats an unavailable combination as an
error row, not a crash. Model IDs belong to `brainbase-llm-gateway`; the docs' example matrix is
reproduced below as the docs give it, and `None` means the harness default.

## Endpoints the loop uses

| Step | Call | Notes |
| --- | --- | --- |
| Start one run per harness | `POST /v2/threads` with `{"agent": {"harness": ..., "model": ...}, "input": TASK, "title": "bakeoff: <harness>"}` | `model` is optional; omit it for the harness default. Send an `Idempotency-Key` header (8–200 chars) to make a retry safe. Response: `thread_id`, `agent_id`, `status`. |
| Wait for the turn to settle | `GET /v2/threads/{thread_id}` | Poll until `status` is one of `success`, `fail`, `need_more_info`, `idle`. The response also carries `machine_id`. |
| Download the artifact | `GET /v2/tasks/{thread_id}/files/download?path=solution.py` | File operations (`files/download`, `files/stat`, `files/tree`) live under `/v2/tasks/{id}/files/*`; the same id under `/v2/threads/{id}` returns 404. `path` is relative to the workspace root. |
| Tear down | `DELETE /v2/machines/{machine_id}` | Destroys the provider sandbox and marks the row DEAD (kept for audit/cost history). Only the machine owner or an agent manager may destroy it. A no-op on an already-dead machine. |

Download admission responses when the task has no usable machine: `409` `machine_not_ready`
(with `Retry-After`, retry), `409` `task_run_busy` (with `Retry-After`, retry),
`409` `task_terminal_no_machine` (no `Retry-After`, never retry), and `402` or `429` when the
payer was refused by the credit gate (do not retry; `detail` holds
`{"code": "credits_exhausted", "message": ...}` with no billing figures).

## Grader safety

`grade` executes whatever each harness returned as `solution.py`, as your user, on the machine
running the script. Nothing contains it: the code can read and write your files, use the
network, and start processes that outlive the 15-second timeout. `python -I` only stops it
importing modules from the working directory and user site-packages. Run the script on a
throwaway VM, a container with no mounts, or a Brainbase sandbox of your own, never on a
workstation with credentials on it. Grading cannot move into the harness's sandbox: the API has
no endpoint that runs a command there, and the hidden tests have to stay hidden from the agent.

## The script, condensed

Shared setup (the matrix is the docs' example):

```python
import concurrent.futures as cf
import os, subprocess, sys, tempfile, time
from pathlib import Path
import requests

BASE = "https://api.brainbaselabs.com"
HEADERS = {"Authorization": f"Bearer {os.environ['BRAINBASE_API_KEY']}"}
TERMINAL = {"success", "fail", "need_more_info", "idle"}

# harness -> model (None uses the harness default).
MATRIX = {
    "claude_code": "claude-sonnet-5",
    "codex": None,
    "opencode": "zai-org/GLM-5.2",
    "qwen": "claude-sonnet-5",
}
```

The task ships the buggy function in the prompt and asks for a fixed `solution.py` with the same
name and signature (`search(arr, target)`: return the leftmost index of `target` in an ascending,
possibly-duplicate list, or `-1`, in O(log n); no extra prints; do not rename). The buggy version
behaves like `bisect_right`, never returns `-1` and lands one past the target, so it scores 0/12.
The twelve hidden `CASES` are `(args, expected)` pairs covering found/unique, not found (in range,
below all, above all), empty list, duplicates → leftmost, single element found/not found, first
and last element, all duplicates, and negatives.

Grader, required by `run_one`:

```python
def grade(solution_src):
    """Run a solution.py source against CASES; return (passed, total, note)."""
    total = len(CASES)
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "solution.py").write_text(solution_src)
        grader = (
            "import importlib.util as u\n"
            "s = u.spec_from_file_location('solution', 'solution.py')\n"
            "m = u.module_from_spec(s); s.loader.exec_module(m)\n"
            f"CASES = {CASES!r}\n"
            "p = 0\n"
            "for args, exp in CASES:\n"
            "    try:\n"
            "        ok = m.search(*args) == exp\n"
            "    except Exception:\n"
            "        ok = False\n"
            "    p += 1 if ok else 0\n"
            "print(f'SCORE {p}/{len(CASES)}')\n"
        )
        (Path(d) / "_grade.py").write_text(grader)
        try:
            r = subprocess.run([sys.executable, "-I", "_grade.py"], cwd=d,
                               capture_output=True, text=True, timeout=15)
        except subprocess.TimeoutExpired:
            return 0, total, "timeout"
    for line in reversed(r.stdout.splitlines()):
        if line.startswith("SCORE"):
            try:
                return int(line.split()[1].split("/")[0]), total, "ok"
            except (IndexError, ValueError):
                break
    return 0, total, "error"
```

Run every harness in its own sandbox:

```python
def wait(thread_id, poll_s=6, timeout_s=900):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        thread = requests.get(f"{BASE}/v2/threads/{thread_id}", headers=HEADERS).json()
        if thread["status"] in TERMINAL:
            return thread
        time.sleep(poll_s)
    raise TimeoutError("thread did not settle")

def run_one(harness, model):
    t0 = time.time()
    row = {"harness": harness, "model": model or "(default)", "status": "error",
           "passed": 0, "total": len(CASES), "note": "-", "secs": 0.0, "machine_id": None}
    try:
        agent = {"harness": harness}
        if model:
            agent["model"] = model
        created = requests.post(f"{BASE}/v2/threads", headers=HEADERS,
                                json={"agent": agent, "input": TASK, "title": f"bakeoff: {harness}"})
        created.raise_for_status()
        tid = created.json()["thread_id"]
        thread = wait(tid)
        row["status"] = thread.get("status", "?")
        row["machine_id"] = thread.get("machine_id")
        dl = requests.get(f"{BASE}/v2/tasks/{tid}/files/download",
                          headers=HEADERS, params={"path": "solution.py"})
        if dl.status_code >= 400:
            row["note"] = "no-file"
            return row
        row["passed"], row["total"], row["note"] = grade(dl.content.decode("utf-8", "replace"))
    except Exception as exc:
        row["note"] = f"error: {str(exc)[:40]}"
    finally:
        row["secs"] = round(time.time() - t0, 1)
    return row

rows = []
with cf.ThreadPoolExecutor(max_workers=len(MATRIX)) as pool:
    for fut in cf.as_completed([pool.submit(run_one, h, m) for h, m in MATRIX.items()]):
        rows.append(fut.result())
```

Rank and tear down:

```python
rows.sort(key=lambda r: (-r["passed"], r["secs"]))
for r in rows:
    print(f"{r['harness']:12} {r['model']:22} {r['status']:9} "
          f"{str(r['passed']) + '/' + str(r['total']):7} {r['secs']:>6}")

for r in rows:
    if r.get("machine_id"):
        requests.delete(f"{BASE}/v2/machines/{r['machine_id']}", headers=HEADERS)
```

Swap in your own broken function and cases to bake off harnesses on the work you care about.

## Reusing the result inside Benchmarks

The docs do not describe a cross-agent comparison view. If the winning harness should get a
standing regression suite, build a benchmark on that agent: a benchmark manifest exported as
JSON or YAML from one agent can be imported into another, since both export and manifest import
are documented operations, but the docs do not promise that scores are comparable across agents.
