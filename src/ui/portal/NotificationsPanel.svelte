<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { untrack } from "svelte";
  import { runtime } from "../../adapters/runtime.svelte";
  import type { Notification, NotificationsResult } from "../../types/portal";
  import { t } from "../../i18n.svelte";
  import Icon from "../Icon.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { notifPanel } from "./popTransition";

  let {
    userId,
    open,
    onclose,
    onunread,
  }: {
    userId: string;
    open: boolean;
    onclose: () => void;
    onunread?: (count: number) => void;
  } = $props();

  let loading = $state(false);
  let result = $state<NotificationsResult | null>(null);
  let error = $state(false);
  let typeCodes = $state<Map<string, string>>(new Map());

  let loadedOnce = false;
  const unreadCount = $derived(result?.numberOfUnreadNotifications ?? 0);

  async function load() {
    if (loading) return;
    loading = true;
    error = false;
    try {
      const [res, types] = await Promise.all([
        runtime.adapter.getNotificationsByRecords(userId, 30),
        typeCodes.size === 0
          ? runtime.adapter.getAllNotificationTypes()
          : Promise.resolve(null),
      ]);
      result = res;
      if (types) {
        typeCodes = new Map(types.map((t) => [t.notificationTypeId, t.code]));
      }
      onunread?.(res.numberOfUnreadNotifications);
      loadedOnce = true;
    } catch {
      if (!loadedOnce) {
        error = true;
      }
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void userId;
    untrack(() => void load());
  });

  $effect(() => {
    if (open && loadedOnce) {
      untrack(() => void load());
    }
  });

  function typeCode(n: Notification): string {
    return typeCodes.get(n.notificationTypeId) ?? "";
  }

  const marking = new Set<string>();

  async function markRead(n: Notification) {
    if (n.isRead || marking.has(n.notificationId)) return;
    marking.add(n.notificationId);
    n.isRead = true;
    try {
      if (runtime.adapter.features.supportsMutations) {
        await runtime.adapter.markNotificationAsRead(n.notificationId);
      }
      if (result) {
        result.numberOfUnreadNotifications = Math.max(
          0,
          result.numberOfUnreadNotifications - 1,
        );
        onunread?.(result.numberOfUnreadNotifications);
      }
    } catch {
      n.isRead = false;
    } finally {
      marking.delete(n.notificationId);
    }
  }

  function relTime(iso: string): string {
    const then = new Date(iso).getTime();
    const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return t("notif.now");
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  let panelEl = $state<HTMLDivElement>();
  let focusHandle = $state<OverlayFocusHandle | null>(null);

  $effect(() => {
    if (!open || !panelEl) return;
    focusHandle = attachOverlayFocus(panelEl, onclose);
    return () => {
      focusHandle?.release();
      focusHandle = null;
    };
  });
</script>

<!-- Mounted only while open (PortalShell {#if}); transition plays on mount/unmount. -->
<div class="notif-backdrop" role="presentation" onclick={onclose}>
  <!-- click stop only: Escape + Tab owned by attachOverlayFocus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="notif-panel"
    role="dialog"
    aria-modal="true"
    aria-label={t("notif.title")}
    tabindex="-1"
    bind:this={panelEl}
    onclick={(e) => e.stopPropagation()}
    transition:notifPanel|global
  >
    <div class="notif-header">
      <div class="notif-heading" class:has-unread={unreadCount > 0}>
        <span class="notif-title">{t("notif.title")}</span>
        {#if unreadCount > 0}
          <span class="notif-unread"
            >{t("notif.unread", { n: unreadCount })}</span
          >
        {/if}
      </div>
      <button
        type="button"
        class="notif-close"
        aria-label={t("aria.close")}
        onclick={onclose}
      >
        <Icon name="close" size={22} />
      </button>
    </div>

    <div class="notif-list">
      {#if loading && !result}
        <p class="notif-status" role="status">{t("status.loading")}</p>
      {:else if error}
        <p class="notif-status" role="status">{t("notif.failed")}</p>
      {:else if result && result.notifications.length === 0}
        <p class="notif-status" role="status">{t("notif.empty")}</p>
      {:else if result}
        {#each result.notifications as n (n.notificationId)}
          <button
            type="button"
            class="notif-item"
            class:unread={!n.isRead}
            class:clickable={!n.isRead}
            disabled={n.isRead}
            aria-label={n.isRead
              ? n.title
              : `${t("notif.markRead")}: ${n.title}`}
            onclick={() => markRead(n)}
          >
            <div class="notif-item-top">
              {#if typeCode(n)}
                <span class="notif-type">{typeCode(n)}</span>
              {/if}
              <span class="notif-time">{relTime(n.createdDate)}</span>
              {#if !n.isRead}
                <span class="notif-dot" aria-hidden="true"></span>
              {/if}
            </div>
            <p class="notif-item-title">{n.title}</p>
            <p class="notif-item-content">{n.content}</p>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .notif-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: transparent;
  }

  .notif-panel {
    position: absolute;
    top: 60px;
    right: 20px;
    display: flex;
    flex-direction: column;
    width: 380px;
    max-width: calc(100vw - 32px);
    max-height: min(560px, calc(100vh - 80px));
    border-radius: 16px;
    background: var(--base);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transform-origin: top right;
  }

  @media (max-width: 768px) {
    .notif-backdrop {
      background: color-mix(in srgb, var(--mantle) 55%, transparent);
    }

    .notif-panel {
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      max-width: none;
      height: 80vh;
      max-height: 80vh;
      border-radius: 0 0 16px 16px;
      border-top: none;
      transform-origin: top center;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }
  }

  .notif-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .notif-heading {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
  }

  /* Keep title on the header midline when unread sits under it. */
  .notif-heading.has-unread {
    translate: 0 0.35em;
  }

  .notif-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .notif-unread {
    font-size: 11px;
    line-height: 1.2;
    color: var(--accent);
  }

  .notif-close {
    display: inline-grid;
    place-items: center;
    width: var(--hit-close);
    height: var(--hit-close);
    padding: 0;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition:
      opacity 0.15s ease,
      background 0.15s ease;
  }

  .notif-close > :global(.fsp-icon) {
    display: block;
    translate: 0 -0.5px;
  }

  .notif-close:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .notif-close:hover {
    opacity: 1;
    background: var(--border-strong);
  }

  @media (max-width: 768px) {
    .notif-close {
      display: none;
    }
  }

  .notif-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
  }

  .notif-status {
    padding: 24px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .notif-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
    appearance: none;
    transition: background 0.12s ease;
  }

  .notif-item:last-child {
    border-bottom: none;
  }

  .notif-item.unread {
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .notif-item.clickable {
    cursor: pointer;
  }

  .notif-item.clickable:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .notif-item.clickable:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: -2px;
  }

  .notif-item-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notif-type {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .notif-time {
    flex: 1;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .notif-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  .notif-item-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    word-break: normal;
    overflow-wrap: break-word;
  }

  .notif-item-content {
    font-size: 11px;
    line-height: 1.45;
    color: var(--text-secondary);
    word-break: normal;
    overflow-wrap: break-word;
  }
</style>
