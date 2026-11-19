// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import {
  ApiHttpError,
  apiErrorKind,
  apiErrorTitleKey,
  parseApiErrorBody,
} from "./apiHttpError";

describe("parseApiErrorBody", () => {
  it("reads OpenAI error envelope", () => {
    expect(
      parseApiErrorBody({
        error: {
          message: "Rate limit reached for requests",
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      }),
    ).toEqual({
      apiCode: "rate_limit_exceeded",
      apiMessage: "Rate limit reached for requests",
    });
  });

  it("parses JSON strings", () => {
    expect(
      parseApiErrorBody(
        '{"error":{"message":"nope","code":"invalid_api_key"}}',
      ),
    ).toEqual({ apiCode: "invalid_api_key", apiMessage: "nope" });
  });
});

describe("apiErrorKind / title key", () => {
  it("maps common HTTP statuses", () => {
    expect(apiErrorKind(401)).toBe("auth");
    expect(apiErrorKind(403)).toBe("forbidden");
    expect(apiErrorKind(418)).toBe("teapot");
    expect(apiErrorKind(429)).toBe("rate_limit");
    expect(apiErrorKind(503)).toBe("server");
    expect(apiErrorTitleKey(429)).toBe("chat.apiErrorTitle.rateLimit");
    expect(apiErrorTitleKey(418)).toBe("chat.apiErrorTitle.teapot");
  });
});

describe("ApiHttpError", () => {
  it("exposes status and friendly message line", () => {
    const err = new ApiHttpError(429, {
      error: { message: "slow down", code: "rate_limit_exceeded" },
    });
    expect(err.status).toBe(429);
    expect(err.apiCode).toBe("rate_limit_exceeded");
    expect(err.apiMessage).toBe("slow down");
    expect(err.message).toBe("API 429: slow down");
  });
});
