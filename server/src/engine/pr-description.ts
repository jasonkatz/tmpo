import { logger } from "../utils/logger";
import { spawn } from "child_process";

const PR_DESC_TIMEOUT_MS = 60_000; // 1 minute

export function buildPrDescriptionPrompt(task: string, proposal: string): string {
  return [
    `You are writing the title and description for a GitHub pull request.`,
    ``,
    `**Task:** ${task}`,
    ``,
    `## Proposal`,
    ``,
    proposal,
    ``,
    `## Instructions`,
    ``,
    `Write a PR title and body. The title should be concise and descriptive like a good commit message — under 72 characters, imperative mood, no period. The body should briefly describe what was done (not what was asked), covering the key changes in 2-4 sentences. Use plain language, no markdown headers.`,
    ``,
    `Use exactly this format:`,
    ``,
    `TITLE: <your title here>`,
    ``,
    `BODY:`,
    `<your description here>`,
  ].join("\n");
}

export function parsePrDescription(
  response: string,
  fallbackTask: string
): { title: string; body: string } {
  const titleMatch = response.match(/^TITLE:\s*(.+)$/m);
  if (!titleMatch) {
    return { title: fallbackTask.substring(0, 72), body: "" };
  }

  let title = titleMatch[1].trim();
  if (title.length > 72) {
    title = title.substring(0, 69) + "...";
  }

  const bodyMatch = response.match(/^BODY:\s*\n([\s\S]*)$/m);
  const body = bodyMatch ? bodyMatch[1].trim() : "";

  return { title, body };
}

export async function generatePrDescription(
  task: string,
  proposal: string
): Promise<{ title: string; body: string }> {
  const prompt = buildPrDescriptionPrompt(task, proposal);

  try {
    const result = await execCommand(
      "claude",
      ["-p", prompt, "--allowedTools", ""],
      { timeoutMs: PR_DESC_TIMEOUT_MS }
    );

    return parsePrDescription(result.stdout, task);
  } catch (error) {
    logger.warn("Failed to generate PR description, using fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { title: task.substring(0, 72), body: proposal };
  }
}

function execCommand(
  cmd: string,
  args: string[],
  opts: { timeoutMs?: number } = {}
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
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
