// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenAIResponse, ToolCall } from "./types";

vi.stubGlobal("window", {
  location: { hostname: "localhost", search: "" },
});
vi.stubGlobal("GM_getValue", () => "");
vi.stubGlobal("GM_setValue", () => {});

vi.mock("../adapters/runtime.svelte", () => ({
  runtime: { adapter: {} },
  hasLiveAdapter: () => false,
  isMockForced: () => true,
}));

vi.mock("../i18n.svelte", () => ({
  t: (key: string) => key,
}));

const gmOpenAI = vi.hoisted(() => vi.fn());
const gmOpenAIStream = vi.hoisted(() => vi.fn());
const callApiFunction = vi.hoisted(() =>
  vi.fn(async (_name: string, _args: Record<string, unknown>) => ({
    ok: true,
  })),
);

vi.mock("./openai", () => ({
  gmOpenAI: (...args: unknown[]) => gmOpenAI(...args),
  gmOpenAIStream: (...args: unknown[]) => gmOpenAIStream(...args),
  getModel: () => "mock-model",
  isConfigured: () => true,
}));

vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return {
    ...actual,
    callApiFunction: (name: string, args: Record<string, unknown>) =>
      callApiFunction(name, args),
    isToolSupported: () => true,
    searchFunctions: () => [],
    getToolDefinitions: () => [],
    getAvailableToolNames: () => ["getCampus"],
  };
});

function toolCall(id: string, name = "getCampus"): ToolCall {
  return {
    id,
    type: "function",
    function: {
      name,
      arguments: JSON.stringify({ campusId: "c1" }),
    },
  };
}

function toolResponse(calls: ToolCall[]): OpenAIResponse {
  return {
    id: "resp",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "",
          tool_calls: calls,
        },
        finish_reason: "tool_calls",
      },
    ],
  };
}

function finalResponse(): OpenAIResponse {
  return {
    id: "resp-final",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "done",
        },
        finish_reason: "stop",
      },
    ],
  };
}

describe("createAgent MAX_TOOL_TURNS batch cap", () => {
  let createAgent: typeof import("./index").createAgent;
  let MAX_TOOL_TURNS: typeof import("./executor").MAX_TOOL_TURNS;
  let MockAdapter: typeof import("../adapters/mock").MockAdapter;

  beforeAll(async () => {
    ({ MAX_TOOL_TURNS } = await import("./executor"));
    ({ createAgent } = await import("./index"));
    ({ MockAdapter } = await import("../adapters/mock"));
  });

  beforeEach(() => {
    gmOpenAI.mockReset();
    gmOpenAIStream.mockReset();
    callApiFunction.mockClear();
  });

  it("does not process more than MAX_TOOL_TURNS tool_calls from one response", async () => {
    const fanOut = Array.from({ length: MAX_TOOL_TURNS + 12 }, (_, i) =>
      toolCall(`tc-${i}`),
    );
    gmOpenAI.mockResolvedValueOnce(toolResponse(fanOut));

    const agent = createAgent(
      {
        studentId: "s1",
        userId: "u1",
        campusId: "c1",
        campusCode: "HN",
        termId: "t1",
        termName: "Fall",
        termOrder: 1,
        academicYear: "2026",
      },
      new MockAdapter(),
    );

    const events: string[] = [];
    let truncated = false;
    await agent.send("fan out", (event) => {
      if (event.type === "tool_call") events.push(event.toolName ?? "");
      if (
        event.type === "error" &&
        event.content?.includes("Tool-call batch truncated")
      ) {
        truncated = true;
      }
    });

    expect(events).toHaveLength(MAX_TOOL_TURNS);
    expect(callApiFunction).toHaveBeenCalledTimes(MAX_TOOL_TURNS);
    expect(gmOpenAI).toHaveBeenCalledTimes(1);
    expect(truncated).toBe(true);
  });

  it("keeps assistant tool_calls in history aligned with executed results", async () => {
    const fanOut = Array.from({ length: MAX_TOOL_TURNS + 5 }, (_, i) =>
      toolCall(`tc-${i}`),
    );
    gmOpenAI
      .mockResolvedValueOnce(toolResponse(fanOut))
      .mockResolvedValueOnce(finalResponse());

    const agent = createAgent(
      {
        studentId: "s1",
        userId: "u1",
        campusId: "c1",
        campusCode: "HN",
        termId: "t1",
        termName: "Fall",
        termOrder: 1,
        academicYear: "2026",
      },
      new MockAdapter(),
    );

    await agent.send("fan out", () => {});
    await agent.send("follow up", () => {});

    expect(gmOpenAI).toHaveBeenCalledTimes(2);
    const secondMessages = gmOpenAI.mock.calls[1][0].messages as Array<
      Record<string, unknown>
    >;
    const assistantWithTools = [...secondMessages]
      .reverse()
      .find((m) => m.role === "assistant" && Array.isArray(m.tool_calls));
    expect(assistantWithTools).toBeDefined();
    const recorded = assistantWithTools!.tool_calls as Array<{ id: string }>;
    expect(recorded).toHaveLength(MAX_TOOL_TURNS);

    const toolResults = secondMessages.filter((m) => m.role === "tool");
    expect(toolResults).toHaveLength(MAX_TOOL_TURNS);
    const resultIds = new Set(toolResults.map((m) => m.tool_call_id as string));
    for (const tc of recorded) {
      expect(resultIds.has(tc.id)).toBe(true);
    }
  });

  it("still allows a normal multi-turn tool loop under the cap", async () => {
    gmOpenAI
      .mockResolvedValueOnce(toolResponse([toolCall("tc-a")]))
      .mockResolvedValueOnce(finalResponse());

    const agent = createAgent(
      {
        studentId: "s1",
        userId: "u1",
        campusId: "c1",
        campusCode: "HN",
        termId: "t1",
        termName: "Fall",
        termOrder: 1,
        academicYear: "2026",
      },
      new MockAdapter(),
    );

    const toolCalls: string[] = [];
    let done = false;
    await agent.send("one tool", (event) => {
      if (event.type === "tool_call") toolCalls.push(event.toolName ?? "");
      if (event.type === "done") done = true;
    });

    expect(toolCalls).toEqual(["getCampus"]);
    expect(done).toBe(true);
    expect(gmOpenAI).toHaveBeenCalledTimes(2);
  });
});
