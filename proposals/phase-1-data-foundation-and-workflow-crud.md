# Proposal: Phase 1 — Data Foundation & Workflow CRUD

## Summary

Establish the data model and basic CRUD operations for workflows, steps, and runs. After this phase, a user can create a workflow via the API or CLI, list their workflows, check status, and cancel — and see their workflows on the web dashboard. No agents execute yet; workflows stay in `pending` status. This phase validates the full vertical: database schema, API endpoints, CLI commands, and web UI all working together against real data.

## Acceptance Criteria

### Database & Data Model

1. A `workflows` table exists in PostgreSQL with columns: `id` (uuid PK), `task` (text, not null), `repo` (text, not null), `branch` (text, not null), `requirements` (text, nullable), `proposal` (text, nullable), `pr_number` (integer, nullable), `status` (text, not null, one of: pending/running/complete/failed/cancelled), `iteration` (integer, not null, default 0), `max_iters` (integer, not null, default 8), `error` (text, nullable), `created_by` (uuid FK to users, not null), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now()).

2. A `steps` table exists with columns: `id` (uuid PK), `workflow_id` (uuid FK to workflows, not null), `iteration` (integer, not null), `type` (text, not null, one of: plan/dev/ci/review/e2e/e2e_verify/signoff), `status` (text, not null, one of: pending/running/passed/failed), `started_at` (timestamptz, nullable), `finished_at` (timestamptz, nullable), `detail` (text, nullable).

3. A `runs` table exists with columns: `id` (uuid PK), `step_id` (uuid FK to steps, not null), `workflow_id` (uuid FK to workflows, not null), `agent_role` (text, not null), `iteration` (integer, not null), `prompt` (text, not null), `response` (text, nullable), `exit_code` (integer, nullable), `duration_secs` (numeric, nullable), `created_at` (timestamptz, default now()).

### Workflow API

4. `POST /v1/workflows` accepts `{ task, repo, branch?, requirements?, max_iters? }` and returns a 201 with the created workflow (status: pending, iteration: 0). The workflow is scoped to the authenticated user. If `branch` is not provided, it defaults to `cadence/<short-id>`.

5. `GET /v1/workflows` returns a paginated list of workflows belonging to the authenticated user, ordered by `created_at` descending. Supports `?status=` filter.

6. `GET /v1/workflows/:id` returns the full workflow object including its current steps (for the latest iteration). Returns 404 if the workflow doesn't exist or doesn't belong to the user.

7. `POST /v1/workflows/:id/cancel` transitions the workflow to `cancelled` if it is in a non-terminal state (pending or running). Returns 409 if already terminal.

8. `GET /v1/workflows/:id/steps` returns all steps for the workflow, ordered by iteration and step type. Supports `?iteration=` filter.

9. `GET /v1/workflows/:id/runs` returns all runs for the workflow, ordered by `created_at`. Supports `?agent_role=` and `?iteration=` filters.

### CLI Commands

10. `cadence run --task <text> --repo <owner/repo> [--branch <name>] [--requirements <path>] [--max-iters <n>]` creates a workflow via the API and prints the workflow ID and status. The command returns immediately after creation (no streaming yet).

11. `cadence list` displays a table of the user's workflows showing: ID (short), task (truncated), repo, status, iteration, and age.

12. `cadence status <workflow-id>` displays the workflow's current state including all steps for the current iteration with their statuses and timing.

13. `cadence cancel <workflow-id>` sends a cancel request and confirms the cancellation.

### Web Client

14. The dashboard page (`/dashboard`) displays a list of the user's workflows in a table. Each row shows: task (truncated), repo, status (with color coding), iteration count, and created time. Clicking a row navigates to the workflow detail page.

15. Workflow status is color-coded throughout the UI: pending (gray), running (blue), complete (green), failed (red), cancelled (yellow).

### Auth & Tenancy

16. All workflow, step, and run endpoints require authentication. Workflows are scoped to the authenticated user — a user cannot see or modify another user's workflows.

## Technical Considerations

- **Database migrations**: New tables should be created via the existing migration system (node-pg-migrate). Migrations should be idempotent and ordered. The workflows table needs a foreign key to the existing users table.
- **Existing patterns**: The server already has a DAO/service/route layering pattern (see user-dao, user-service, auth routes). New workflow/step/run code should follow this same pattern.
- **CLI output**: The Rust CLI already has an `output.rs` module for formatting. New commands should use this for consistent output, supporting both human-readable and `--json` modes.
- **Branch naming**: Default branch name should follow the pattern `cadence/<workflow-id-short>` unless explicitly provided.
- **Pagination**: The `GET /v1/workflows` endpoint should support cursor-based or offset pagination from the start to avoid breaking changes later.
- **OpenAPI schema**: The `schema.yaml` should be updated with the new endpoints and types.

## Out of Scope

- **Workflow execution** — Workflows are created in `pending` status and stay there. The engine that picks up and runs workflows is Phase 2.
- **Real-time updates (SSE)** — No streaming endpoint yet. The CLI `run` command returns after creation.
- **GitHub integration** — No PR creation, CI polling, or diff reading.
- **Agent execution** — No agents are invoked.
- **Workflow detail page** — The web client shows a list only; the full detail page with step timeline is Phase 2.
- **`cadence proposal` and `cadence logs` commands** — These depend on data that doesn't exist until agents run.
