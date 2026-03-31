# Proposal: Phase 3 — Dev Agent & GitHub Integration

## Summary

Add the dev agent and GitHub PR creation to the pipeline. After this phase, the engine runs plan → dev → creates a PR, and the user gets a link to a real pull request with committed code. This is the first phase that produces a tangible artifact in GitHub — a branch with commits and an open PR. The pipeline still stops after the dev step; CI polling and review come next.

## Acceptance Criteria

### Dev Agent Execution

1. After the plan step passes, the engine executes the `dev` step. The dev agent receives the proposal and implements it: writing code, committing, and pushing to the workflow's branch.

2. The dev agent is executed via pi agent core with the dev system prompt, allowed tools (Bash, Edit, Read, Write, Glob, Grep), and model. The agent's prompt and response are recorded as a Run.

3. The dev agent runs in an isolated working directory — a fresh clone of the target repo. The agent commits and pushes to the workflow's branch.

4. If the dev agent fails (non-zero exit or timeout), the step transitions to `failed` and the workflow transitions to `failed`.

5. After the dev step passes, the engine stops execution (subsequent steps remain `pending`). CI polling is Phase 4.

### GitHub Integration

6. After the first `dev` step pushes code, the server creates a GitHub pull request from the workflow's branch to the repo's default branch. The PR number is saved to the workflow's `pr_number` field.

7. The PR title is derived from the task description (first 72 characters). The PR body includes the proposal.

8. On regression iterations (Phase 4+), the dev agent pushes additional commits to the same branch; no new PR is created.

9. The GitHub token is configurable via environment variable. The server uses it for PR creation and repo cloning.

### CLI Enhancements

10. When the workflow completes the dev step, `cadence run` prints the PR URL to stdout.

11. `cadence status <workflow-id>` now shows the PR number and link when available.

### Web Client

12. The workflow detail page shows the PR link (clickable) when a PR has been created.

13. The dashboard table includes a PR link column for workflows that have a PR.

## Technical Considerations

- **Process isolation**: Each dev agent subprocess should run in its own working directory (a fresh clone of the target repo) to prevent interference between concurrent workflows. The clone should be cleaned up after the step completes.
- **Branch naming**: The workflow's branch field (defaulting to `cadence/<short-id>`) is used as the target branch for the dev agent's pushes and the PR's head branch.
- **Git authentication**: The clone and push operations need the GitHub token for authentication. This can be injected via the `GIT_ASKPASS` mechanism or by configuring the clone URL with the token.
- **PR creation**: Use the GitHub REST API (or Octokit) to create the PR. The server should handle the case where the branch doesn't exist on the remote yet (the dev agent creates it by pushing).
- **Failure context propagation**: When the dev step fails, capture the agent's output as failure context. This context will be used in Phase 4 when regression iterations are implemented.

## Out of Scope

- **CI polling** — The pipeline stops after the dev step. Checking GitHub Actions is Phase 4.
- **Code review** — The review agent is Phase 4.
- **Regression iterations** — The iteration loop (dev → fail → dev with context) is Phase 4. This phase only handles the first iteration's dev step.
- **E2E testing** — E2E agent and verifier are Phase 5.
- **PR comments or inline feedback** — Review comments are Phase 4.
