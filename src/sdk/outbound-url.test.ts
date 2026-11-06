// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import {
  OutboundUrlError,
  needsNonDefaultHostConfirm,
  validateOutboundUrl,
} from "./outbound-url";

describe("validateOutboundUrl", () => {
  it("allows https URLs and strips trailing slashes", () => {
    expect(validateOutboundUrl("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1",
    );
  });

  it("allows http on localhost and loopback", () => {
    expect(validateOutboundUrl("http://localhost:11434/v1")).toBe(
      "http://localhost:11434/v1",
    );
    expect(validateOutboundUrl("http://127.0.0.1:8080/")).toBe(
      "http://127.0.0.1:8080",
    );
    expect(validateOutboundUrl("http://[::1]/v1")).toBe("http://[::1]/v1");
    expect(validateOutboundUrl("http://ollama.localhost/v1")).toBe(
      "http://ollama.localhost/v1",
    );
  });

  it("rejects http on non-loopback hosts", () => {
    expect(() => validateOutboundUrl("http://example.com/v1")).toThrow(
      OutboundUrlError,
    );
    expect(() => validateOutboundUrl("http://192.168.1.10/v1")).toThrow(
      OutboundUrlError,
    );
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => validateOutboundUrl("ftp://example.com/")).toThrow(
      OutboundUrlError,
    );
    expect(() => validateOutboundUrl("javascript:alert(1)")).toThrow(
      OutboundUrlError,
    );
    expect(() => validateOutboundUrl("data:text/plain,hi")).toThrow(
      OutboundUrlError,
    );
  });

  it("rejects unparseable input", () => {
    expect(() => validateOutboundUrl("not a url")).toThrow(OutboundUrlError);
  });
});

describe("needsNonDefaultHostConfirm", () => {
  it("is false for the default OpenAI host", () => {
    expect(needsNonDefaultHostConfirm("https://api.openai.com/v1")).toBe(false);
  });

  it("is true for other hosts including loopback", () => {
    expect(needsNonDefaultHostConfirm("https://llm.example.com/v1")).toBe(true);
    expect(needsNonDefaultHostConfirm("http://localhost:11434/v1")).toBe(true);
  });
});
