---
tags: [brainbase]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, WebFetch, WebSearch]
---

Write a brainbase-orchestration.yaml where a triage agent hands confirmed bugs to a fixer agent, and the triage agent runs every weekday at 09:00 UTC. Explain how the handoff actually happens at runtime.
