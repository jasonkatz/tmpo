import { Workflow } from "../dao/workflow-dao";
import { logger } from "../utils/logger";
import { spawn } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

export interface E2eResult {
  e2ePass: boolean;
  evidence: string;
  exitCode: number;
  durationSecs: number;
  response: string;
}

const E2E_TIMEOUT_MS = 600_000; // 10 minutes

export async function runE2eAgent(
  workflow: Workflow,
  githubToken: string
): Promise<E2eResult> {
  const startTime = Date.now();
  const workDir = await mkdtemp(join(tmpdir(), "cadence-e2e-"));

  try {
    // Clone the repo at the working branch
    const cloneUrl = `https://x-access-token:${githubToken}@github.com/${workflow.repo}.git`;
    await execCommand("git", ["clone", "-b", workflow.branch, "--depth", "1", cloneUrl, workDir], {
      timeoutMs: 120_000,
    });

    const prompt = buildE2ePrompt(workflow);

    // Run the E2E agent with read-write tools (needs Bash for build/start/test commands)
    const result = await execCommand(
      "claude",
      ["-p", prompt, "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash"],
      {
        cwd: workDir,
        timeoutMs: E2E_TIMEOUT_MS,
      }
    );

    const durationSecs = Math.round((Date.now() - startTime) / 1000);
    const e2ePass = result.exitCode === 0;

    return {
      e2ePass,
      evidence: result.stdout,
      exitCode: result.exitCode,
      durationSecs,
      response: result.stdout,
    };
  } catch (error) {
    const durationSecs = Math.round((Date.now() - startTime) / 1000);
    const message = error instanceof Error ? error.message : String(error);
    logger.error("E2E agent failed", {
      workflowId: workflow.id,
      error: message,
    });

    return {
      e2ePass: false,
      evidence: "",
      exitCode: 1,
      durationSecs,
      response: message,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function buildE2ePrompt(workflow: Workflow): string {
  const parts = [
    `You are an end-to-end testing agent. Your job is to verify the implementation by running real user journeys against it and producing evidence that the acceptance criteria are met.`,
    ``,
    `**Task:** ${workflow.task}`,
    `**Repository:** ${workflow.repo}`,
    `**Branch:** ${workflow.branch}`,
    ``,
    `## Proposal`,
    ``,
    workflow.proposal || "(No proposal provided)",
    ``,
    `## Instructions`,
    ``,
    `1. Read and understand the codebase and the acceptance criteria from the proposal above.`,
    `2. Set up the local environment: install dependencies, build, and start the application.`,
    `3. Run real user journeys that exercise each acceptance criterion.`,
    `4. Use \`uvx rodney\` for browser automation if the project has a web UI.`,
    `5. Use \`uvx showboat\` to capture screenshots or other evidence of each user journey succeeding.`,
    `6. Produce a clear evidence artifact summarizing what you tested and the results.`,
    ``,
    `## Evidence Output`,
    ``,
    `At the end of your response, output a summary of the evidence you collected. For each acceptance criterion, describe what user journey you ran and whether it passed. Include any showboat evidence references.`,
    ``,
    `If all user journeys pass, the E2E step succeeds. If any fail, describe what went wrong so the dev agent can fix it.`,
  ];

  return parts.join("\n");
}

function execCommand(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {}
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let _stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      _stderr += data.toString();
    });

    const timer = opts.timeoutMs
      ? setTimeout(() => {
          proc.kill("SIGTERM");
          reject(new Error(`Command timed out after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs)
      : null;

    proc.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, exitCode: code ?? 1 });
    });

    proc.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });
}
