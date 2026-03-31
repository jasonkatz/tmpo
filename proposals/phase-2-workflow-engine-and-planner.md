# Proposal: Phase 2 — Workflow Engine & Planner Agent

## Summary

Build the workflow engine that picks up pending workflows and drives them through the pipeline, starting with the plan step. After this phase, running `cadence run` creates a workflow, the engine transitions it to `running`, the planner agent reads the repo and generates a structured proposal, and the user can watch progress in real-time via SSE. This is the first phase where an agent actually executes, proving the core orchestration loop works end-to-end.

## Acceptance Criteria

### Workflow Engine

1. After a workflow is created (status: `pending`), the engine picks it up and transitions it to `running`. It creates step records for the first iteration (plan, dev, ci, review, e2e, e2e_verify, signoff) all with status `pending`.

2. Steps execute sequentially in the defined order. Each step transitions from `pending` → `running` → `passed` or `failed`. The `started_at` and `finished_at` timestamps are recorded.

3. The `plan` step invokes the planner agent with the task description, repo, and requirements path. The agent's output (the proposal) is saved to the workflow's `proposal` field and the step transitions to `passed`.

4. If the plan step fails (agent exits non-zero or times out), the workflow transitions to `failed` with an error message.

5. After the plan step passes, the engine stops execution (subsequent steps remain `pending`). The dev step is Phase 3.

6. A cancelled workflow stops executing after its current step completes. No further steps are started.

7. When the iteration counter exceeds `max_iters`, the workflow transitions to `failed` with an error message indicating the iteration limit was reached.

### Agent Execution

8. The plan agent is executed via pi agent core with the planner system prompt, allowed tools (Bash, Read, Glob, Grep — read-only), and model. The agent's prompt and response are recorded as a Run in the database.

9. Each agent invocation records: the full prompt sent, the full response received, the process exit code, and the wall-clock duration in seconds.

10. Agent execution respects a configurable timeout per role (default: 300 seconds). If the timeout is exceeded, the agent process is killed and the step fails.

### Real-Time Progress

11. `GET /v1/workflows/:id/events` returns a Server-Sent Events (SSE) stream. Events are emitted when: a step transitions status, the workflow transitions status, or a new run is created. Each event includes the updated resource as JSON.

12. The SSE connection stays open until the workflow reaches a terminal state (complete, failed, cancelled), at which point the server sends a final event and closes the stream.

### CLI Enhancements

13. `cadence run` now streams progress to stdout after creating the workflow. Each step's status is printed as it transitions. The command blocks until the workflow reaches a terminal state or the user interrupts.

14. `cadence proposal <workflow-id>` prints the workflow's proposal to stdout.

### Web Client

15. The workflow detail page (`/workflows/:id`) shows: the full task description, the proposal (rendered as markdown), the current status, and a step timeline showing each step's status with timing. The page updates in real-time via SSE — step transitions appear without manual refresh.

## Technical Considerations

- **Agent runtime**: The product brief specifies pi agent core as the runtime for spawning and managing agents. The server should integrate this as a dependency for agent lifecycle management.
- **Process isolation**: The planner agent needs access to the target repository. The server should clone or create a worktree of the target repo in a temporary directory for the agent to read.
- **SSE implementation**: Use Express response streaming for SSE. The server should maintain a registry of active SSE connections per workflow and fan-out events to all connected clients.
- **Engine loop**: The engine can be a simple polling loop or event-driven. It should run in-process with the server for now (no separate worker). It processes one workflow at a time.
- **GitHub API access**: The server needs a GitHub token to clone private repos for the planner to read. The token should be configurable via environment variables.
- **Graceful shutdown**: The server should handle SIGTERM by finishing the current step of any running workflow before shutting down, to avoid orphaned agent processes.

## Out of Scope

- **Dev agent execution** — The engine stops after the plan step. Dev, CI, review, E2E, and signoff are subsequent phases.
- **Regression loop** — No iteration cycling yet since only the plan step runs.
- **PR creation** — No GitHub PR integration.
- **Multi-user concurrency** — The engine handles one workflow at a time.
- **Run logs CLI command** — `cadence logs` is a later phase.
- **New workflow form in web client** — Creating workflows via the web is a later phase.
