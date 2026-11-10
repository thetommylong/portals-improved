// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { echoUserMessage, isClearCommand } from "./chatEcho";

describe("isClearCommand", () => {
  it("matches /clear with optional trailing args/whitespace", () => {
    expect(isClearCommand("/clear")).toBe(true);
    expect(isClearCommand("  /CLEAR  ")).toBe(true);
    expect(isClearCommand("/clear now")).toBe(true);
  });

  it("rejects other commands and prose", () => {
    expect(isClearCommand("/clearer")).toBe(false);
    expect(isClearCommand("/key sk-test")).toBe(false);
    expect(isClearCommand("please /clear")).toBe(false);
  });
});

describe("echoUserMessage", () => {
  it("redacts /key secrets from the light-DOM echo", () => {
    expect(echoUserMessage("/key sk-live-super-secret")).toBe("/key ••••");
    expect(echoUserMessage("/KEY sk-a sk-b")).toBe("/KEY ••••");
  });

  it("leaves bare /key and other messages intact", () => {
    expect(echoUserMessage("/key")).toBe("/key");
    expect(echoUserMessage("/help")).toBe("/help");
    expect(echoUserMessage("hello")).toBe("hello");
  });
});
