# Proposal: Phase 4 — CI Polling, Review Agent & Regression Loop

## Summary

Complete the feedback loop by adding CI status polling, the review agent, and the regression mechanism. After this phase, the pipeline runs plan → dev → CI → review, and when CI or review fails, it regresses to dev with failure context and tries again — up to `max_iters` times. This is the phase that makes the pipeline self-correcting rather than a one-shot attempt.

## Acceptance Criteria

### CI Step

1. The `ci` step polls the GitHub Actions status for the head commit on the workflow's branch (using the PR's head SHA). It passes when all required checks pass, fails when any check fails, and times out after a configurable duration (default: 15 minutes).

2. The CI step reads check-run status from the GitHub API. Polling interval is configurable (default: 30 seconds).

3. If CI times out, the step fails with a detail message indicating the timeout.

### Review Agent

4. The `review` step invokes the reviewer agent with the proposal and the PR diff. The reviewer agent reads the diff from the GitHub API.

5. The reviewer agent outputs a structured JSON verdict. If `review_pass` is `true`, the step passes. If `false`, the step fails and the review comments are captured as failure context.

6. The reviewer agent is executed via pi agent core with the reviewer system prompt, allowed tools (Bash, Read, Glob, Grep — read-only), and model. The agent's prompt and response are recorded as a Run.

7. After the review step passes, the engine stops execution (e2e and signoff steps remain `pending`). E2E is Phase 5.

### Regression Loop

8. When any step fails (ci or review), the workflow's iteration counter increments. A new set of steps is created starting from `dev` (plan is skipped on iteration 2+). The dev agent's prompt includes the failure context from the step that failed.

9. Failure context propagation: CI failure → dev prompt includes CI failure logs. Review failure → dev prompt includes review comments and unmet criteria.

10. When the iteration counter exceeds `max_iters`, the workflow transitions to `failed` with an error message indicating the iteration limit was reached.

11. On regression iterations, the dev agent pushes additional commits to the same branch. No new PR is created.

### CLI Enhancements

12. `cadence run` displays iteration progress — when a regression occurs, it prints the failure reason and the new iteration number.

13. `cadence status <workflow-id>` shows all steps for the current iteration and indicates which iteration the workflow is on.

### Web Client

14. The workflow detail page shows the iteration count and displays steps grouped by iteration. When a regression occurs, the new iteration's steps appear in real-time via SSE.

15. Failed steps show their detail/failure context in an expandable section.

## Technical Considerations

- **CI polling**: The GitHub Checks API (`/repos/{owner}/{repo}/commits/{ref}/check-runs`) returns check-run results. The step should aggregate all check runs and pass only when all have `conclusion: success`. Handle the `queued` and `in_progress` states by continuing to poll.
- **Failure context extraction**: CI failures should include the relevant log output (fetched from GitHub Actions logs API if available, or the check-run output summary). Review failures should include the structured verdict JSON and any PR comments left by the reviewer.
- **Regression step creation**: When creating steps for iteration 2+, skip the `plan` type. The step order is: dev, ci, review, e2e, e2e_verify, signoff.
- **PR diff**: The reviewer agent reads the diff via `gh pr diff` or the GitHub API. The diff should be scoped to the full PR (base branch vs head), not just the latest commit, so the reviewer sees the complete picture.
- **Fresh agent sessions**: Every agent gets a fresh session on each iteration. The dev agent's prompt is augmented with failure context but starts from a clean slate otherwise.

## Out of Scope

- **E2E testing** — The pipeline stops after review. E2E agent and verifier are Phase 5.
- **Signoff** — The signoff step is Phase 5 (after E2E passes).
- **PR comments by reviewer on GitHub** — The reviewer produces a verdict used by the pipeline. Posting inline comments to the PR is a nice-to-have that can be added within this phase or later.
- **Concurrent workflow execution** — Still one workflow at a time.
