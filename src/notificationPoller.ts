// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { runtime } from "./adapters/runtime.svelte";
import { t } from "./i18n.svelte";
import { diffNewUnread, notificationToastLabel } from "./notificationDiff";
import { isAuthFailure, isOfflineFailure, notifyOfflineOnce } from "./offline";
import { notify } from "./notifications";

export const NOTIFICATION_POLL_MS = 60_000;
/** Avoid toast storms when many land in one tick. */
const MAX_TOASTS_PER_TICK = 3;
const FETCH_RECORDS = 30;

export interface NotificationPollerOptions {
  userId: string;
  /** Badge / panel sync. */
  onUnread: (count: number) => void;
  intervalMs?: number;
}

/**
 * Poll portal inbox: keep unread badge fresh and toast newly arrived unread
 * items. Pauses while the document is hidden; runs one catch-up on visible.
 */
export function startNotificationPoller(
  opts: NotificationPollerOptions,
): () => void {
  const intervalMs = opts.intervalMs ?? NOTIFICATION_POLL_MS;
  const seen = new Set<string>();
  let seeded = false;
  let stopped = false;
  let inFlight = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async () => {
    if (stopped || inFlight) return;
    if (typeof document !== "undefined" && document.hidden) return;
    inFlight = true;
    try {
      const res = await runtime.adapter.getNotificationsByRecords(
        opts.userId,
        FETCH_RECORDS,
      );
      if (stopped) return;
      opts.onUnread(res.numberOfUnreadNotifications);
      const fresh = diffNewUnread(res.notifications, seen, !seeded);
      seeded = true;
      for (const n of fresh.slice(0, MAX_TOASTS_PER_TICK)) {
        notify(notificationToastLabel(n), "info");
      }
    } catch (err) {
      // Keep last badge; auth latch owns reauth — never toast offline for that.
      if (!isAuthFailure(err) && isOfflineFailure(err)) {
        notifyOfflineOnce(t("toast.offline"));
      }
    } finally {
      inFlight = false;
    }
  };

  const onVisibility = () => {
    if (!document.hidden) void tick();
  };

  void tick();
  timer = setInterval(() => void tick(), intervalMs);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    stopped = true;
    if (timer != null) clearInterval(timer);
    timer = null;
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
