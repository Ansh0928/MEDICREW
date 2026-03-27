---
name: Session hygiene — spawn subagents for tasks
description: User wants all non-trivial work done in separate agent sessions to prevent context bloat
type: feedback
---

Start all non-trivial tasks (anything beyond a quick answer or single file edit) in a separate agent session using the Agent tool. Never let the main conversation session accumulate tool calls from implementation work.

**Why:** Context bloat degrades performance and makes the session unwieldy.

**How to apply:** For any task that will require 3+ tool calls, dispatch a subagent. Keep this session lean.
