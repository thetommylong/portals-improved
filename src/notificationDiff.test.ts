// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { diffNewUnread, notificationToastLabel } from "./notificationDiff";
import type { Notification } from "./types/portal";

function n(
  id: string,
  opts: { isRead?: boolean; title?: string; content?: string } = {},
): Notification {
  return {
    notificationId: id,
    notificationTypeId: "t",
    fromUserId: "",
    groupId: "",
    relationId: "",
    userId: "u",
    appliedUserId: "u",
    isRead: opts.isRead ?? false,
    canBroadcast: false,
    previousValueJson: "",
    currentValueJson: "",
    title: opts.title ?? id,
    content: opts.content ?? "",
    campusId: "",
    userType: "student",
    createdDate: "",
    updatedDate: "",
  };
}

describe("diffNewUnread", () => {
  it("seeds without returning items", () => {
    const seen = new Set<string>();
    expect(diffNewUnread([n("a"), n("b")], seen, true)).toEqual([]);
    expect([...seen].sort()).toEqual(["a", "b"]);
  });

  it("returns only new unread after seed", () => {
    const seen = new Set<string>(["a"]);
    const out = diffNewUnread(
      [n("a"), n("b"), n("c", { isRead: true }), n("d")],
      seen,
      false,
    );
    expect(out.map((x) => x.notificationId)).toEqual(["b", "d"]);
    expect(seen.has("c")).toBe(true);
  });
});

describe("notificationToastLabel", () => {
  it("prefers title, truncates long content", () => {
    expect(notificationToastLabel(n("x", { title: " Hello " }))).toBe("Hello");
    const long = "a".repeat(130);
    expect(notificationToastLabel(n("x", { title: "", content: long }))).toBe(
      `${"a".repeat(117)}…`,
    );
  });
});
