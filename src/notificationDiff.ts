// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { Notification } from "./types/portal";

/**
 * Ids already known from the previous poll. First successful poll only seeds
 * (no toasts); later polls toast unread items whose ids are new.
 */
export function diffNewUnread(
  items: Notification[],
  seen: Set<string>,
  seedOnly: boolean,
): Notification[] {
  const fresh: Notification[] = [];
  for (const n of items) {
    if (seen.has(n.notificationId)) continue;
    seen.add(n.notificationId);
    if (!seedOnly && !n.isRead) fresh.push(n);
  }
  return fresh;
}

export function notificationToastLabel(n: Notification): string {
  const title = n.title?.trim();
  if (title) return title;
  const body = n.content?.trim() ?? "";
  if (body.length <= 120) return body || "Notification";
  return `${body.slice(0, 117)}…`;
}
