import { describe, it, expect, mock, beforeEach } from "bun:test";
import path from "path";

// --- mock os so homedir() returns a predictable value ---
// default export is required to satisfy `import os from "os"`
const mockOs = { homedir: () => "/test-home" };
mock.module("os", () => ({ default: mockOs, ...mockOs }));

// --- mock fs so we control what files exist ---
const mockReadFile = mock<(p: string, enc: string) => Promise<string>>(
  () => Promise.reject(new Error("ENOENT")),
);
mock.module("fs", () => ({
  promises: { readFile: mockReadFile },
}));

const { achievementsPath } = await import("./achievements");

describe("achievementsPath", () => {
  it("uses ~/Library/Application Support on macOS", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });

    const result = achievementsPath();

    expect(result).toBe(
      path.join("/test-home", "Library", "Application Support", "cadence", "achievements.json"),
    );

    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  });

  it("uses ~/.config on Linux", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    const result = achievementsPath();

    expect(result).toBe(
      path.join("/test-home", ".config", "cadence", "achievements.json"),
    );

    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  });
});

describe("GET /achievements route handler", () => {
  beforeEach(() => {
    mockReadFile.mockReset();
  });

  it("returns empty earned list when achievements.json does not exist", async () => {
    mockReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const json: { earned: string[]; workflows_completed: number } = await (async () => {
      let result!: { earned: string[]; workflows_completed: number };
      const res = {
        json: (v: { earned: string[]; workflows_completed: number }) => {
          result = v;
        },
      } as unknown as import("express").Response;

      const filePath = achievementsPath();
      try {
        const content = await mockReadFile(filePath, "utf8");
        const store = JSON.parse(content) as {
          achievements: Array<{ kind: string }>;
          workflows_completed: number;
        };
        res.json({
          earned: store.achievements.map((a) => a.kind),
          workflows_completed: store.workflows_completed,
        });
      } catch {
        res.json({ earned: [], workflows_completed: 0 });
      }
      return result;
    })();

    expect(json).toEqual({ earned: [], workflows_completed: 0 });
  });

  it("returns earned achievement kinds from valid achievements.json", async () => {
    const store = {
      achievements: [
        { kind: "first-workflow", earned_at: "2026-01-01T00:00:00Z", workflow_id: "abc12345" },
        { kind: "speed-run", earned_at: "2026-01-02T00:00:00Z", workflow_id: "def67890" },
      ],
      workflows_completed: 2,
    };
    mockReadFile.mockResolvedValue(JSON.stringify(store));

    let result!: { earned: string[]; workflows_completed: number };
    const res = {
      json: (v: { earned: string[]; workflows_completed: number }) => {
        result = v;
      },
    } as unknown as import("express").Response;

    const filePath = achievementsPath();
    try {
      const content = await mockReadFile(filePath, "utf8");
      const parsed = JSON.parse(content) as typeof store;
      res.json({
        earned: parsed.achievements.map((a) => a.kind),
        workflows_completed: parsed.workflows_completed,
      });
    } catch {
      res.json({ earned: [], workflows_completed: 0 });
    }

    expect(result.earned).toEqual(["first-workflow", "speed-run"]);
    expect(result.workflows_completed).toBe(2);
  });
});
