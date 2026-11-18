// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { AgentEvent } from "../../sdk/types";

export type ChatRenderItem =
  | { kind: "event"; event: AgentEvent }
  | { kind: "tool"; call: AgentEvent; result?: AgentEvent };

/** Pair consecutive tool_call + tool_result into one accordion row. */
export function groupChatEvents(events: AgentEvent[]): ChatRenderItem[] {
  const out: ChatRenderItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.type === "tool_call") {
      const next = events[i + 1];
      if (next?.type === "tool_result" && next.toolName === e.toolName) {
        out.push({ kind: "tool", call: e, result: next });
        i++;
        continue;
      }
      out.push({ kind: "tool", call: e });
      continue;
    }
    if (e.type === "tool_result") {
      out.push({
        kind: "tool",
        call: { type: "tool_call", toolName: e.toolName },
        result: e,
      });
      continue;
    }
    out.push({ kind: "event", event: e });
  }
  return out;
}
