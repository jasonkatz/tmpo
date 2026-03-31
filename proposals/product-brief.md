# Product Brief: Cadence

## The Problem

Shipping code still requires a human to sit in the loop for every step: write the code, wait for CI, read the review, fix the nits, run the tests, confirm the tests check out, merge. Each step is a context switch. Most of these steps are mechanical once the intent is clear.

Cadence removes that burden. You describe what you want, point it at a repo, and it delivers a pull request that has been implemented, reviewed, tested, and verified — ready for a human to approve and merge.

## What Cadence Does

Cadence is an autonomous software delivery pipeline. It orchestrates multiple AI agents through a fixed sequence of stages — implementation, CI, code review, end-to-end testing, verification, and sign-off — with built-in feedback loops. When any stage fails, the pipeline regresses to implementation with the failure context, and the cycle repeats until the work is done or a retry limit is reached.

The output is always a GitHub pull request.

## Core Concepts

Cadence has four primitives: **Workflows**, **Steps**, **Agents**, and **Runs**.

### Workflow

A Workflow is the top-level unit of work. One task, one repo, one pull request.

```
Workflow
├── id            uuid
├── task          text              # what to build, in natural language
├── repo          text              # owner/repo
├── branch        text              # feature branch (default: dev/<id>)
├── requirements  text | null       # path to a requirements file in the repo
├── pr_number     integer | null    # set after the first push to GitHub
├── status        WorkflowStatus
├── iteration     integer           # 0 = fresh, 1+ = in progress
├── max_iters     integer           # cap before forced failure (default: 8)
├── error         text | null       # set on terminal failure
├── created_by    uuid              # the user who started it
├── created_at    timestamp
├── updated_at    timestamp
```

**WorkflowStatus:**

```
                    ┌─────────────────────────────┐
                    │                             │
                    ▼                             │
pending ──► running ──► complete          cancelled
                │                             ▲
                │                             │
                └──► failed                   │
                       │                      │
                       └──────────────────────┘
                         (can cancel from any
                          non-terminal state)
```

- `pending` — created, waiting to execute
- `running` — actively progressing through steps
- `complete` — all steps passed; the PR is ready for human review
- `failed` — hit the iteration limit or encountered an unrecoverable error
- `cancelled` — stopped by the user

Status is intentionally coarse. Detailed progress lives in Steps.

### Step

A Step is one stage of the pipeline within a single iteration. Steps are the unit of progress tracking.

```
Step
├── id            uuid
├── workflow_id   uuid
├── iteration     integer           # which iteration this step belongs to
├── type          StepType
├── status        StepStatus
├── started_at    timestamp | null
├── finished_at   timestamp | null
├── detail        text | null       # human-readable outcome summary
```

**StepType** — the fixed pipeline stages, always executed in this order:

| Stage       | What happens                                             |
|-------------|----------------------------------------------------------|
| dev         | Agent implements the task, commits, and pushes           |
| ci          | Poll GitHub Actions until pass, fail, or timeout         |
| review      | Agent reads the PR diff and approves or leaves comments  |
| e2e         | Agent runs end-to-end tests against a local environment  |
| e2e_verify  | Agent checks E2E evidence against the original requirements |
| signoff     | Pipeline marks the workflow complete                     |

**StepStatus:**

```
pending ──► running ──► passed
                │
                └──► failed ──► (triggers regression to dev)
```

When a Step fails, the Workflow increments its iteration counter and creates a fresh set of Steps starting from `dev`. The failure context — CI logs, review comments, test output — is carried forward into the new dev Step's prompt.

Steps within an iteration always execute sequentially. The pipeline never skips a step or runs them out of order.

### Agent

An Agent is a configured AI actor that executes a Step. Each agent role has a fixed identity: a system prompt, a set of allowed tools, and a default model.

```
Agent (configuration, not a database record)
├── role          AgentRole
├── model         text               # which Claude model to use
├── budget_usd    float | null       # spend cap per invocation
├── timeout_secs  integer            # max wall-clock time
├── system_prompt text               # role-specific instructions
├── allowed_tools text[]             # tools the agent can use
```

**Agent roles:**

| Role          | Executes    | Can write code? | Tools                                  |
|---------------|-------------|-----------------|----------------------------------------|
| dev           | dev         | Yes             | Bash, Edit, Read, Write, Glob, Grep    |
| reviewer      | review      | No (read-only)  | Bash, Read, Glob, Grep                 |
| e2e           | e2e         | Yes             | Bash, Edit, Read, Write, Glob, Grep    |
| e2e_verifier  | e2e_verify  | No (read-only)  | Bash, Read, Glob, Grep                 |

`ci` and `signoff` steps don't use agents. `ci` polls GitHub Actions. `signoff` is bookkeeping.

Agents are not stored in the database. They are constructed from configuration at execution time, with optional per-role overrides for model and budget.

### Run

A Run is a single agent invocation — one prompt in, one response out. Runs are the observability primitive.

```
Run
├── id            uuid
├── step_id       uuid
├── workflow_id   uuid
├── agent_role    AgentRole
├── iteration     integer
├── prompt        text
├── response      text | null
├── exit_code     integer | null
├── duration_secs float | null
├── created_at    timestamp
```

A Step may produce multiple Runs (e.g., the dev step does implementation and then updates the PR description). Runs are append-only and immutable.

## Pipeline Execution

A single iteration proceeds as follows:

```
1. [dev]         Agent implements the task, commits, pushes to the branch
2. [ci]          Pipeline polls GitHub Actions until pass/fail/timeout
3. [review]      Agent reads the PR diff, approves or leaves comments
4. [e2e]         Agent spins up a local environment, runs real user journeys
5. [e2e_verify]  Agent checks E2E evidence against the requirements
6. [signoff]     Pipeline marks the workflow complete, PR is ready
```

When a step fails, the pipeline regresses:

```
ci failed       → new iteration; dev prompt includes CI failure logs
review failed   → new iteration; dev prompt includes review comments
e2e failed      → new iteration; dev prompt includes test failure output
e2e_verify fail → new iteration; dev prompt includes verifier feedback
```

Every agent gets a fresh session on each iteration. The dev agent's prompt is augmented with the failure context so it knows exactly what to fix.

If the iteration counter exceeds `max_iters`, the workflow transitions to `failed`.

## System Architecture

Cadence is three components: a **server**, a **web client**, and a **CLI**.

### Server

The server is the brain. It owns all state, orchestrates all execution, and exposes an API that the CLI and web client consume.

**Responsibilities:**

- **Workflow lifecycle** — create, execute, cancel
- **Agent orchestration** — spawn Claude CLI subprocesses, manage sessions, collect outputs
- **State persistence** — all data lives in PostgreSQL
- **GitHub integration** — PR creation, CI polling, comment management
- **Auth and tenancy** — users authenticate via Auth0; workflows are scoped to users
- **Real-time updates** — SSE or WebSocket streams for live progress
- **Notifications** — webhook callbacks on workflow and step transitions
- **Run logging** — every agent invocation is recorded and queryable

**Technology:** TypeScript, Express, Bun, PostgreSQL, Auth0.

Agent execution happens by shelling out to the `claude` CLI. The server manages the subprocess lifecycle, captures stdout/stderr, and records the results as Runs.

### Web Client

The web client is the primary interface for monitoring and managing workflows.

**Views:**

- **Dashboard** — all workflows with status, repo, PR link, iteration count, and elapsed time
- **Workflow detail** — step-by-step progress with live updates, expandable agent logs (prompt and response), links to the PR and CI runs
- **New workflow** — form to specify task, repo, branch, requirements, and model overrides

Real-time updates arrive via SSE or WebSocket. When a step completes or a workflow transitions, the UI updates without polling.

**Technology:** React, TypeScript, Vite, Tailwind CSS.

### CLI

The CLI is a thin client for users who prefer the terminal.

```bash
# Start a workflow
cadence run --task "add user profiles with avatar upload" --repo acme/webapp

# Start with a requirements doc
cadence run --task "implement billing" --repo acme/api --requirements docs/billing-spec.md

# Provide feedback on a completed PR to iterate further
cadence run --task "implement billing" --repo acme/api --feedback "webhook handler needs idempotency"

# Check status
cadence status <workflow-id>
cadence list

# View agent logs
cadence logs <workflow-id>
cadence logs <workflow-id> --agent dev

# Cancel
cadence cancel <workflow-id>
```

The CLI sends requests to the server and streams status updates back. It does not execute agents or manage state.

**Technology:** Rust.

## Data Model

### PostgreSQL Schema

**users**

| Column     | Type        | Notes                              |
|------------|-------------|------------------------------------|
| id         | uuid        | Primary key                        |
| auth0_id   | text        | Auth0 subject identifier, indexed  |
| email      | text        | Indexed                            |
| name       | text        | Nullable                           |
| created_at | timestamptz | Default now()                      |

**workflows**

| Column       | Type        | Notes                              |
|--------------|-------------|------------------------------------|
| id           | uuid        | Primary key                        |
| task         | text        | Natural language task description   |
| repo         | text        | owner/repo                         |
| branch       | text        | Feature branch name                |
| requirements | text        | Nullable; path to requirements file|
| pr_number    | integer     | Nullable; set after first push     |
| status       | text        | pending/running/complete/failed/cancelled |
| iteration    | integer     | Current iteration count            |
| max_iters    | integer     | Default 8                          |
| error        | text        | Nullable; set on failure           |
| created_by   | uuid        | FK to users                        |
| created_at   | timestamptz | Default now()                      |
| updated_at   | timestamptz | Default now()                      |

**steps**

| Column      | Type        | Notes                              |
|-------------|-------------|------------------------------------|
| id          | uuid        | Primary key                        |
| workflow_id | uuid        | FK to workflows                    |
| iteration   | integer     | Which iteration this belongs to    |
| type        | text        | dev/ci/review/e2e/e2e_verify/signoff |
| status      | text        | pending/running/passed/failed      |
| started_at  | timestamptz | Nullable                           |
| finished_at | timestamptz | Nullable                           |
| detail      | text        | Nullable; outcome summary          |

**runs**

| Column        | Type        | Notes                            |
|---------------|-------------|----------------------------------|
| id            | uuid        | Primary key                      |
| step_id       | uuid        | FK to steps                      |
| workflow_id   | uuid        | FK to workflows (denormalized)   |
| agent_role    | text        | dev/reviewer/e2e/e2e_verifier    |
| iteration     | integer     | Denormalized for query convenience |
| prompt        | text        | What was sent to the agent       |
| response      | text        | Nullable; what the agent returned|
| exit_code     | integer     | Nullable                         |
| duration_secs | float       | Nullable                         |
| created_at    | timestamptz | Default now()                    |

## Authentication

Users authenticate via Auth0. The server validates JWT bearer tokens on every request. On first login, the server creates a user record by extracting claims (`sub`, `email`, `name`) from the token.

The CLI authenticates via Auth0's device authorization flow and stores the token locally. The web client uses Auth0's SPA SDK with PKCE.

All workflows are scoped to the user who created them.

## Notifications

The server fires webhook callbacks on state transitions. Users configure a webhook URL and select which events to receive:

- Workflow started
- Step completed (pass or fail)
- Workflow completed
- Workflow failed

## Design Principles

1. **Fixed pipeline, flexible agents.** The stage ordering and regression behavior are invariant. Agent configuration (model, budget, timeout, system prompt) is tunable per role.

2. **Observe everything.** Every agent invocation is recorded as a Run. Users can always answer "what did the agent do and why?"

3. **Fail loud, retry smart.** When a step fails, the pipeline doesn't silently retry the same thing. It regresses to the dev stage with explicit failure context, giving the agent the information it needs to fix the problem.

4. **Thin clients, thick server.** The CLI and web client are display layers. All orchestration, state, and execution lives on the server. Workflows survive client disconnects, laptop sleeps, and network outages.

5. **Sequential by design.** Steps execute in order within an iteration. No parallelism, no conditional branching, no step skipping. This makes the pipeline predictable and debuggable.
