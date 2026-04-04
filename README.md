# Cadence

Autonomous software delivery pipeline. Describe a task, point it at a repo, and Cadence orchestrates AI agents to plan, implement, test, review, and ship a pull request — without manual intervention at each step.

## How it works

1. You create a **workflow** with a task description and a target GitHub repository
2. A **planner agent** reads the codebase and generates a structured proposal (summary, acceptance criteria, technical considerations)
3. A **dev agent** implements the proposal using TDD, commits, and opens a PR
4. The system polls **CI**, then a **reviewer agent** evaluates the diff against the proposal
5. An **E2E agent** runs real user journeys; a **verifier agent** checks the evidence against acceptance criteria
6. If any step fails, the workflow **regresses** — the dev agent gets failure context and tries again (up to `max_iters`)
7. When all steps pass, the PR is ready for human review

Every agent invocation is recorded (prompt, response, exit code, duration) for full observability.

## Architecture

```
client/     React + TypeScript + Vite + Tailwind (dashboard, workflow detail, settings)
server/     Bun + TypeScript + Express + PostgreSQL (API, workflow engine, agent orchestration)
cli/        Rust + Clap + Tokio (thin client — run, list, status, proposal, cancel)
```

The server owns all state and orchestration. The CLI and web client are display layers that communicate via REST API and SSE for real-time updates.

## Prerequisites

- [Bun](https://bun.sh)
- Node.js 20+ and Yarn (for client)
- [Rust](https://rustup.rs) (for CLI)
- Docker (for local PostgreSQL)
- Auth0 tenant (SPA for web, M2M for CLI)

## Quick start

```bash
# Install root dependencies (sets up pre-commit hooks)
bun install

# Start the database
docker-compose up -d

# Server
cd server
cp .env.example .env    # configure Auth0, database, encryption key
bun install
bun run migrate:up
bun dev

# Client (new terminal)
cd client
cp .env.example .env    # configure Auth0 client ID and API URL
yarn install
yarn dev

# CLI (new terminal)
cd cli
cargo build
./target/debug/cadence -l login
```

## Usage

### CLI

```bash
cadence run --task "Add rate limiting to the API" --repo owner/repo
cadence list
cadence status <workflow-id>
cadence proposal <workflow-id>
cadence cancel <workflow-id>
```

`cadence run` streams step transitions in real-time. All commands support `--json` for scripting.

### Web

- `/dashboard` — workflow list with status, repo, iteration count
- `/workflows/:id` — step timeline, proposal, real-time progress via SSE
- `/settings` — GitHub token configuration

## API

The server exposes a REST API documented in `server/schema.yaml` (OpenAPI 3.1).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/workflows` | Create a workflow |
| `GET` | `/v1/workflows` | List workflows (filterable by status) |
| `GET` | `/v1/workflows/:id` | Get workflow detail with steps |
| `GET` | `/v1/workflows/:id/steps` | Get steps (filterable by iteration) |
| `GET` | `/v1/workflows/:id/runs` | Get agent runs (filterable by role/iteration) |
| `GET` | `/v1/workflows/:id/events` | SSE stream of step/workflow transitions |
| `POST` | `/v1/workflows/:id/cancel` | Cancel a workflow |
| `GET` | `/v1/settings` | Get GitHub token (masked) |
| `PUT` | `/v1/settings` | Set GitHub token |

All `/v1/` endpoints require a Bearer token (Auth0 JWT).

## Pipeline steps

| Step | Agent | Tools | Purpose |
|------|-------|-------|---------|
| `plan` | Planner | Read, Glob, Grep, Bash (read-only) | Analyze repo, generate proposal |
| `dev` | Dev | Read, Write, Edit, Glob, Grep, Bash | Implement proposal using TDD |
| `ci` | — | GitHub Actions polling | Wait for CI pass/fail |
| `review` | Reviewer | Read, Glob, Grep | Evaluate PR diff against proposal |
| `e2e` | E2E | Read, Write, Bash | Run real user journeys, produce evidence |
| `e2e_verify` | Verifier | Read | Validate evidence against acceptance criteria |
| `signoff` | — | — | Mark workflow complete |

On failure at any step, the workflow regresses to `dev` with failure context (CI logs, review comments, test output). The iteration counter increments until success or `max_iters` is reached.

## Development

### Tests

```bash
cd server && bun test      # 78 tests, ~70ms
cd client && yarn test
cd cli && cargo test
```

Tests use dependency injection — no global module mocks. See [AGENTS.md](./AGENTS.md) for testing rules.

### Lint

```bash
cd server && bun run lint
cd client && yarn lint
cd cli && cargo clippy -- -D warnings
```

Pre-commit hooks (Husky + lint-staged) run linters automatically on staged files.

### Migrations

```bash
cd server
bun run migrate:create -- <name>    # create migration
bun run migrate:up                   # apply
bun run migrate:down                 # rollback
```

## Project status

See `proposals/` for the full six-phase roadmap.

- [x] **Phase 1** — Data foundation, workflow CRUD, CLI, web dashboard
- [x] **Phase 2** — Workflow engine, planner agent, SSE streaming
- [ ] **Phase 3** — Dev agent, GitHub PR integration
- [ ] **Phase 4** — CI polling, review agent, regression loop
- [ ] **Phase 5** — E2E verification, signoff
- [ ] **Phase 6** — Run logs CLI, web client completion

## License

Private.
