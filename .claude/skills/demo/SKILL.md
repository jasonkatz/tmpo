---
name: demo
description: Create an executable demo document that demonstrates and tests end-to-end behavior using showboat
disable-model-invocation: true
argument-hint: [filename]
allowed-tools: Bash(showboat *), Bash(git diff *), Bash(git log *), Bash(agent-browser *)
---

# Demo

Use `showboat` to create a self-verifying demo document that proves end-to-end behavior actually works. The document should read like a narrative walkthrough a reviewer can follow, and can be re-verified at any time with `showboat verify`.

The focus is on **E2E proof** — exercising real user workflows through the project's CLI and/or UI, not unit tests or route tests.

## Workflow

1. **Understand what changed.** Run `git diff` and `git log` to see recent changes. Read relevant files if needed to understand the context.

2. **Initialize the document.** Pick a descriptive title based on the changes.

   ```
   showboat init <file> "<Title>"
   ```

   Use the filename from `$ARGUMENTS` if provided, otherwise default to `demo.md`.

3. **Write the narrative.** Alternate between `showboat note` for commentary and `showboat exec` for proof. Structure the document as:

   - **Context:** A brief note explaining what was changed and why.
   - **Setup:** Any prerequisite steps (starting a server, seeding data, setting env vars).
   - **CLI demonstration:** If the project has a CLI, use it to exercise the changed behavior end-to-end. Run real commands a user would run and capture the output.
   - **UI demonstration:** If the changes affect the UI, use `agent-browser` to verify the behavior visually. Capture screenshots with `showboat image` to embed visual proof in the document.
   - **Error handling:** Demonstrate that invalid inputs, edge cases, and error paths behave correctly.
   - **Teardown:** Clean up any resources created during the demo (test data, running processes).

4. **React to failures.** `showboat exec` prints output to stdout and preserves the command's exit code. If a command fails:
   - Read the output to understand the failure.
   - Use `showboat pop` to remove the failed entry from the document.
   - Fix the issue, then re-record the command.
   - If the failure is expected/intentional (e.g., demonstrating error handling), keep it and add a note explaining why.

5. **Keep it concise.** A good demo is 4-10 exec blocks. Enough to prove the workflows work end-to-end, short enough to review quickly.

## CLI testing

When the project has a CLI, prefer it as the primary way to demonstrate behavior. CLI commands exercise the full stack (CLI → API → service → database) and produce concrete, diffable output.

- Use the CLI the way a real user would — create resources, query them, modify them, delete them.
- Use `--json` output when available to make assertions stable and machine-readable.
- Chain commands to show realistic workflows: create a resource, then retrieve it, then modify it.
- Demonstrate both success and failure cases (e.g., missing required flags, invalid IDs).

## UI testing with agent-browser

When changes affect the UI, use `agent-browser` to verify behavior through the browser. This is especially valuable for visual changes, interactive flows, and anything that can't be fully exercised through the CLI.

- Use `showboat image` to capture screenshots as visual proof.
- Focus on user-facing workflows: can a user complete the task the change was designed to support?
- Verify that UI state reflects backend changes (e.g., after creating a resource via CLI, confirm it appears in the UI).

## Guidelines

- Use `showboat note` for prose — never put explanations inside exec blocks.
- Pipe multiline code or text via stdin when it's cleaner: `echo "..." | showboat note <file>`.
- Prefer specific, targeted commands over broad ones. `dubl sessions create --workspace ws_123` is better than running the entire test suite.
- If the project has a build step, include it early to prove the code compiles/builds.
- End with a `showboat verify` to confirm the document is self-consistent.
