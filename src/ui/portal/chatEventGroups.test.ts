// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { groupChatEvents } from "./chatEventGroups";
import type { AgentEvent } from "../../sdk/types";

describe("groupChatEvents", () => {
  it("pairs consecutive matching tool_call + tool_result", () => {
    const events: AgentEvent[] = [
      { type: "message", role: "user", content: "hi" },
      { type: "tool_call", toolName: "get_marks", toolArgs: { a: 1 } },
      { type: "tool_result", toolName: "get_marks", content: "ok" },
      { type: "message", role: "assistant", content: "done" },
    ];
    const grouped = groupChatEvents(events);
    expect(grouped).toHaveLength(3);
    expect(grouped[1]).toMatchObject({
      kind: "tool",
      call: { toolName: "get_marks" },
      result: { content: "ok" },
    });
  });

  it("keeps pending tool_call alone until result arrives", () => {
    const events: AgentEvent[] = [
      {
        type: "tool_call",
        toolName: "search_functions",
        toolArgs: { query: "x" },
      },
    ];
    expect(groupChatEvents(events)).toEqual([
      {
        kind: "tool",
        call: events[0],
        result: undefined,
      },
    ]);
  });

  it("does not pair mismatched tool names", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", toolName: "a", toolArgs: {} },
      { type: "tool_result", toolName: "b", content: "x" },
    ];
    const grouped = groupChatEvents(events);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({ kind: "tool", call: { toolName: "a" } });
    expect(grouped[1]).toMatchObject({
      kind: "tool",
      result: { toolName: "b" },
    });
  });

  it("skips ephemeral thinking/retry/done events", () => {
    const events: AgentEvent[] = [
      { type: "thinking" },
      { type: "retry", attempt: 1, delayMs: 1000, maxAttempts: 6 },
      { type: "message", role: "assistant", content: "ok" },
      { type: "done" },
    ];
    expect(groupChatEvents(events)).toEqual([
      { kind: "event", event: events[2] },
    ]);
  });
});
