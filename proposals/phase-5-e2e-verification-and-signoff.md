# Proposal: Phase 5 — E2E Verification & Signoff

## Summary

Add the E2E agent, E2E verifier, and signoff step to complete the full pipeline. After this phase, Cadence runs the entire sequence: plan → dev → CI → review → E2E → E2E verify → signoff. A workflow that passes all stages transitions to `complete`, and the PR is ready for human review. Failures in E2E or verification trigger regression back to dev, just like CI and review failures. This is the phase where Cadence delivers its full value proposition: a verified pull request.

## Acceptance Criteria

### E2E Agent

1. The `e2e` step invokes the E2E agent with the proposal and acceptance criteria. The agent sets up a local environment, runs real user journeys, and produces an evidence artifact. The step passes if the agent exits successfully.

2. The E2E agent is executed via pi agent core with the E2E system prompt, allowed tools (Bash, Edit, Read, Write, Glob, Grep), and model. The agent's prompt and response are recorded as a Run.

3. The E2E agent posts its evidence as a PR comment using the tools specified in the system prompt (showboat for evidence compilation).

### E2E Verifier

4. The `e2e_verify` step invokes the E2E verifier agent with the proposal and the evidence artifact from the E2E step. The agent outputs a structured JSON verdict. If `e2e_pass` is `true`, the step passes. If `false`, the step fails with the verifier's feedback as failure context.

5. The E2E verifier agent is executed via pi agent core with the E2E verifier system prompt, allowed tools (Bash, Read, Glob, Grep — read-only), and model. The agent's prompt and response are recorded as a Run.

### Signoff

6. The `signoff` step is a bookkeeping step that marks the workflow as `complete`. No agent is invoked. The workflow status transitions from `running` to `complete`.

### Regression from E2E Failures

7. When the `e2e` step fails, the workflow regresses to dev with the E2E failure output as context. When the `e2e_verify` step fails, the workflow regresses to dev with the verifier's feedback as context.

8. The dev agent's prompt for E2E regressions includes the specific evidence gaps or failures identified by the E2E agent or verifier, so the dev agent knows what behavior to fix.

### CLI

9. `cadence run` prints the final status when the workflow completes: the PR URL and a confirmation that all checks passed. On failure after max iterations, it prints the last failure context.

### Web Client

10. The workflow detail page shows all steps including E2E, E2E verify, and signoff with their statuses and timing. The full step timeline is visible for each iteration.

11. When a workflow reaches `complete` status, the detail page shows a success state with the PR link prominently displayed.

## Technical Considerations

- **E2E environment**: The E2E agent needs to set up a running local environment of the target project. This requires the cloned repo and the ability to run build/start commands. The agent's working directory should be the same clone used by the dev agent (or a fresh one with the latest branch state).
- **Evidence artifact passing**: The E2E agent produces an evidence artifact (via showboat). The verifier needs access to this artifact. Options: (a) store the evidence as a Run response and pass it to the verifier's prompt, (b) store it as a file in a shared location, or (c) read it from the PR comment. Option (a) is simplest and keeps everything in the database.
- **E2E tools**: The E2E system prompt references `uvx showboat` and `uvx rodney`. These tools need to be available in the agent's environment. Ensure the server's agent execution environment has `uvx` available.
- **Timeout considerations**: E2E steps may take longer than planning or review. The timeout should be configurable per role, with a higher default for E2E (e.g., 600 seconds).
- **Full regression coverage**: With this phase, all four failure-triggering steps (ci, review, e2e, e2e_verify) can cause regression. The failure context format should be consistent so the dev agent can handle any type of feedback.

## Out of Scope

- **Auto-merge** — Cadence produces a PR ready for human review. Auto-merge is explicitly not included.
- **Custom agent prompts** — System prompts are hardcoded from the product brief. User-customizable prompts are a follow-up.
- **Billing and usage tracking** — No metering or cost tracking.
- **Concurrent workflow execution** — Still one workflow at a time. A job queue is a follow-up.
