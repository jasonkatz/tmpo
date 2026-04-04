import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Workflow } from "../dao/workflow-dao";
import type { WorkflowEvent } from "../events/event-bus";

function makeWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    id: "wf-1",
    task: "add login page",
    repo: "acme/webapp",
    branch: "cadence/abc123",
    requirements: null,
    proposal: null,
    pr_number: null,
    status: "running",
    iteration: 0,
    max_iters: 8,
    error: null,
    created_by: "user-1",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// --- DAO Mocks ---
const mockFindByIdAndUser = mock((_id: string, _userId: string) =>
  Promise.resolve(null as Workflow | null)
);

mock.module("../dao/workflow-dao", () => ({
  workflowDao: {
    findByIdAndUser: mockFindByIdAndUser,
  },
}));

// --- Event Bus Mock ---
let subscribedHandler: ((event: WorkflowEvent) => void) | null = null;
const realSubscribe = (_workflowId: string, handler: (event: WorkflowEvent) => void) => {
  subscribedHandler = handler;
};
const realUnsubscribe = (_workflowId: string, _handler: unknown) => {
  subscribedHandler = null;
};
const mockSubscribe = mock(realSubscribe);
const mockUnsubscribe = mock(realUnsubscribe);

mock.module("../events/event-bus", () => ({
  eventBus: {
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    emit: () => {},
    removeAllListeners: () => {},
  },
}));

const { createEventsHandler } = await import("./events");

// --- Fake Express res ---
function makeFakeRes() {
  const written: string[] = [];
  const headers: Record<string, string> = {};
  let flushed = 0;
  let ended = false;
  const statusCode = 200;

  return {
    written,
    headers,
    statusCode,
    get flushed() { return flushed; },
    get ended() { return ended; },
    writeHead(code: number, hdrs: Record<string, string>) {
      Object.assign(headers, hdrs);
    },
    write(data: string) {
      written.push(data);
      return true;
    },
    flush() {
      flushed++;
    },
    end() {
      ended = true;
    },
    on(_event: string, _cb: () => void) {},
  };
}

describe("events route handler", () => {
  beforeEach(() => {
    mockFindByIdAndUser.mockReset();
    mockSubscribe.mockReset();
    mockSubscribe.mockImplementation(realSubscribe);
    mockUnsubscribe.mockReset();
    mockUnsubscribe.mockImplementation(realUnsubscribe);
    subscribedHandler = null;
  });

  it("should return 404 if workflow not found", async () => {
    mockFindByIdAndUser.mockResolvedValue(null);
    const res = makeFakeRes();
    const next = mock(() => {});

    const handler = createEventsHandler();
    await handler(
      { params: { id: "wf-1" }, user: { id: "user-1" } } as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
      next
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should set SSE headers for valid workflow", async () => {
    mockFindByIdAndUser.mockResolvedValue(makeWorkflow());
    const res = makeFakeRes();
    const next = mock(() => {});

    const handler = createEventsHandler();
    await handler(
      { params: { id: "wf-1" }, user: { id: "user-1" } } as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
      next
    );

    expect(res.headers["Content-Type"]).toBe("text/event-stream");
    expect(res.headers["Cache-Control"]).toBe("no-cache");
    expect(res.headers["Connection"]).toBe("keep-alive");
  });

  it("should subscribe to workflow events", async () => {
    mockFindByIdAndUser.mockResolvedValue(makeWorkflow());
    const res = makeFakeRes();
    const next = mock(() => {});

    const handler = createEventsHandler();
    await handler(
      { params: { id: "wf-1" }, user: { id: "user-1" } } as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
      next
    );

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe.mock.calls[0][0]).toBe("wf-1");
  });

  it("should write SSE-formatted events when emitted", async () => {
    mockFindByIdAndUser.mockResolvedValue(makeWorkflow());
    const res = makeFakeRes();
    const next = mock(() => {});

    const handler = createEventsHandler();
    await handler(
      { params: { id: "wf-1" }, user: { id: "user-1" } } as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
      next
    );

    // Simulate an event being emitted
    subscribedHandler!({
      type: "step:updated",
      workflowId: "wf-1",
      data: { stepId: "step-1", status: "running" },
    });

    // Should have written the SSE-formatted event
    const allData = res.written.join("");
    expect(allData).toContain("event: step:updated");
    expect(allData).toContain('"stepId":"step-1"');
  });

  it("should close connection on workflow:completed event", async () => {
    mockFindByIdAndUser.mockResolvedValue(makeWorkflow());
    const res = makeFakeRes();
    const next = mock(() => {});

    const handler = createEventsHandler();
    await handler(
      { params: { id: "wf-1" }, user: { id: "user-1" } } as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
      next
    );

    subscribedHandler!({
      type: "workflow:completed",
      workflowId: "wf-1",
      data: { status: "complete" },
    });

    const allData = res.written.join("");
    expect(allData).toContain("event: workflow:completed");
    expect(res.ended).toBe(true);
  });
});
