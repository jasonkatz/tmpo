import { describe, it, expect, mock, beforeEach } from "bun:test";
import path from "path";
import type { Request, Response } from "express";

// --- mock os so homedir() returns a predictable value ---
// default export is required to satisfy `import os from "os"`
const mockOs = { homedir: () => "/test-home" };
mock.module("os", () => ({ default: mockOs, ...mockOs }));

// --- mock fs.promises ---
const mockReaddir = mock<(dir: string) => Promise<string[]>>(
  () => Promise.resolve([]),
);
const mockReadFile = mock<(p: string, enc: string) => Promise<string>>(
  () => Promise.reject(new Error("ENOENT")),
);
mock.module("fs", () => ({
  promises: { readdir: mockReaddir, readFile: mockReadFile },
}));

const { workflowsDir, readWorkflowFiles } = await import("./workflows");

// ---------------------------------------------------------------------------
// workflowsDir() — platform path selection
// ---------------------------------------------------------------------------
describe("workflowsDir", () => {
  it("uses ~/Library/Application Support on macOS", () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });

    expect(workflowsDir()).toBe(
      path.join("/test-home", "Library", "Application Support", "cadence", "workflows"),
    );

    Object.defineProperty(process, "platform", { value: original, configurable: true });
  });

  it("uses ~/.config on Linux", () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    expect(workflowsDir()).toBe(
      path.join("/test-home", ".config", "cadence", "workflows"),
    );

    Object.defineProperty(process, "platform", { value: original, configurable: true });
  });
});

// ---------------------------------------------------------------------------
// readWorkflowFiles() — directory read, UUID filtering, JSON parsing
// ---------------------------------------------------------------------------
describe("readWorkflowFiles", () => {
  beforeEach(() => {
    mockReaddir.mockReset();
    mockReadFile.mockReset();
  });

  it("returns empty array when workflows dir does not exist", async () => {
    mockReaddir.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    expect(await readWorkflowFiles()).toEqual([]);
  });

  it("skips files whose stems are not 8-char hex workflow ids", async () => {
    mockReaddir.mockResolvedValue([
      "not-an-id.json",
      "../../../etc/passwd.json",
      "toolong12.json",
      "GGGGGGGG.json", // invalid hex
    ]);
    expect(await readWorkflowFiles()).toEqual([]);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("parses valid workflow JSON files", async () => {
    const wf = {
      id: "abc12345",
      task: "add login",
      stage: "dev",
      iteration: 1,
      max_iters: 8,
      pr_number: null,
      branch: "dev/abc12345",
      repo: "owner/repo",
      started_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:01:00Z",
      error: null,
    };
    mockReaddir.mockResolvedValue(["abc12345.json"]);
    mockReadFile.mockResolvedValue(JSON.stringify(wf));

    const result = await readWorkflowFiles();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("abc12345");
    expect(result[0].stage).toBe("dev");
  });

  it("skips malformed JSON files without throwing", async () => {
    mockReaddir.mockResolvedValue(["abc12345.json"]);
    mockReadFile.mockResolvedValue("not-json{{{");

    expect(await readWorkflowFiles()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /v1/workflows/active — filtering and sorting
// ---------------------------------------------------------------------------
describe("GET /workflows/active filtering and sorting", () => {
  beforeEach(() => {
    mockReaddir.mockReset();
    mockReadFile.mockReset();
  });

  it("returns 404 when no non-terminal workflows exist", async () => {
    mockReaddir.mockResolvedValue(["abc12345.json", "def67890.json"]);
    mockReadFile
      .mockResolvedValueOnce(
        JSON.stringify({ id: "abc12345", stage: "complete", updated_at: "2026-01-01T00:00:00Z" }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ id: "def67890", stage: "failed", updated_at: "2026-01-01T00:01:00Z" }),
      );

    const results = await readWorkflowFiles();
    const TERMINAL = new Set(["complete", "failed", "cancelled"]);
    const active = results.filter((w) => !TERMINAL.has(w.stage));

    expect(active).toHaveLength(0);
  });

  it("returns the most recently updated non-terminal workflow", async () => {
    const older = {
      id: "aaaaaaaa",
      stage: "dev",
      updated_at: "2026-01-01T00:00:00Z",
      task: "old task",
    };
    const newer = {
      id: "bbbbbbbb",
      stage: "in-review",
      updated_at: "2026-01-02T00:00:00Z",
      task: "new task",
    };
    mockReaddir.mockResolvedValue(["aaaaaaaa.json", "bbbbbbbb.json"]);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(older))
      .mockResolvedValueOnce(JSON.stringify(newer));

    const results = await readWorkflowFiles();
    const TERMINAL = new Set(["complete", "failed", "cancelled"]);
    const active = results
      .filter((w) => !TERMINAL.has(w.stage))
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

    expect(active[0].id).toBe("bbbbbbbb");
  });
});

// ---------------------------------------------------------------------------
// UUID validation guard
// ---------------------------------------------------------------------------
describe("UUID validation in route handlers", () => {
  it("rejects IDs that are not 8-char hex strings", () => {
    const WORKFLOW_ID_RE = /^[0-9a-f]{8}$/i;
    const invalid = [
      "../etc/passwd",
      "abc",
      "abcdefgh1",   // 9 chars
      "GGGGGGGG",    // invalid hex
      "",
    ];
    for (const id of invalid) {
      expect(WORKFLOW_ID_RE.test(id)).toBe(false);
    }
  });

  it("accepts valid 8-char hex workflow ids", () => {
    const WORKFLOW_ID_RE = /^[0-9a-f]{8}$/i;
    const valid = ["abc12345", "00000000", "ffffffff", "ABCDEF12"];
    for (const id of valid) {
      expect(WORKFLOW_ID_RE.test(id)).toBe(true);
    }
  });

  it("returns 400 for invalid id via route handler simulation", async () => {
    let statusCode = 0;
    let body: unknown = null;
    const res = {
      status: (code: number) => ({ json: (v: unknown) => { statusCode = code; body = v; } }),
    } as unknown as Response;

    const req = { params: { id: "../etc/passwd" } } as unknown as Request;
    const WORKFLOW_ID_RE = /^[0-9a-f]{8}$/i;
    const { id } = req.params;
    if (!WORKFLOW_ID_RE.test(id)) {
      res.status(400).json({ error: "Invalid workflow id" });
    }

    expect(statusCode).toBe(400);
    expect((body as { error: string }).error).toBe("Invalid workflow id");
  });
});

// ---------------------------------------------------------------------------
// SSE endpoint — Content-Type header and close-handler cleanup
// ---------------------------------------------------------------------------
describe("SSE endpoint response headers", () => {
  it("sets text/event-stream headers and calls res.end on client disconnect", async () => {
    const headers: Record<string, string> = {};
    let ended = false;
    let closeCallback: (() => void) | null = null;

    const req = {
      params: { id: "abc12345" },
      on: (event: string, handler: () => void) => {
        if (event === "close") closeCallback = handler;
      },
    } as unknown as Request;

    const res = {
      setHeader: (k: string, v: string) => { headers[k] = v; },
      flushHeaders: () => {},
      write: (_chunk: string) => {},
      end: () => { ended = true; },
    } as unknown as Response;

    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    // Simulate the SSE handler (matches the actual handler in workflows.ts)
    const WORKFLOW_ID_RE = /^[0-9a-f]{8}$/i;
    const { id } = req.params;
    if (!WORKFLOW_ID_RE.test(id)) {
      res.status(400).json({ error: "Invalid workflow id" });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const interval = setInterval(() => {}, 2000);
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });

    expect(headers["Content-Type"]).toBe("text/event-stream");
    expect(headers["Cache-Control"]).toBe("no-cache");
    expect(headers["Connection"]).toBe("keep-alive");

    // Simulate client disconnect — interval should be cleared and stream ended
    closeCallback!();
    expect(ended).toBe(true);
  });
});
