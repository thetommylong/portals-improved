// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { Temporal } from "@js-temporal/polyfill";
import { beforeAll, describe, expect, it, vi } from "vitest";

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

vi.mock("./registry", () => ({
  buildCompactIndex: () => "- getCampus: look up a campus",
}));

describe("formatNowForPrompt / buildSystemPrompt", () => {
  let formatNowForPrompt: typeof import("./system").formatNowForPrompt;
  let buildSystemPrompt: typeof import("./system").buildSystemPrompt;

  beforeAll(async () => {
    ({ formatNowForPrompt, buildSystemPrompt } = await import("./system"));
  });

  it("formats an ISO-8601 datetime with offset and zone (not localized)", () => {
    const now = Temporal.ZonedDateTime.from(
      "2026-11-10T22:30:15+07:00[Asia/Ho_Chi_Minh]",
    );
    expect(formatNowForPrompt(now)).toBe(
      "2026-11-10T22:30:15+07:00[Asia/Ho_Chi_Minh]",
    );
    expect(formatNowForPrompt(now)).not.toMatch(/November|thg|ICT/i);
  });

  it("embeds current time and a generic portal prompt", () => {
    const now = Temporal.ZonedDateTime.from("2026-11-10T09:05:00+00:00[UTC]");
    const prompt = buildSystemPrompt(
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
      undefined,
      now,
    );

    expect(prompt).toContain("student portal");
    expect(prompt).not.toMatch(/FPT/i);
    expect(prompt).toContain("## Current time");
    expect(prompt).toContain("2026-11-10T09:05:00+00:00[UTC]");
    expect(prompt).toContain("## Session context");
  });
});
