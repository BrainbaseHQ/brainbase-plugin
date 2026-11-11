---
type: llm
focus: trace
weight: 1
---

answer.md handles the 409 by re-reading the orchestration and retrying once with the fresh revision, without dropping expected_revision
