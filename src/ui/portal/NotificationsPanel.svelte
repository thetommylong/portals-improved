<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import type { Notification, NotificationsResult } from "../../types/portal";

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
        typeCodes = new Map(
          types.map((t) => [t.notificationTypeId, t.code]),
        );
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
    void load();
  });

  $effect(() => {
    if (open && loadedOnce) {
      void load();
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
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
</script>

{#if open}
  <div
    class="notif-backdrop"
    role="presentation"
    onclick={onclose}
    onkeydown={(e) => { if (e.key === "Escape") onclose(); }}
  >
    <div
      class="notif-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Notifications"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="notif-header">
        <span class="notif-title">Notifications</span>
        {#if result}
          <span class="notif-unread">{result.numberOfUnreadNotifications} unread</span>
        {/if}
        <button
          type="button"
          class="notif-close"
          aria-label="Close"
          onclick={onclose}
        >
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="notif-list">
        {#if loading && !result}
          <p class="notif-status">Loading…</p>
        {:else if error}
          <p class="notif-status">Failed to load notifications</p>
        {:else if result && result.notifications.length === 0}
          <p class="notif-status">No notifications</p>
        {:else if result}
          {#each result.notifications as n (n.notificationId)}
            <button
              type="button"
              class="notif-item"
              class:unread={!n.isRead}
              class:clickable={!n.isRead}
              disabled={n.isRead}
              aria-label={n.isRead ? n.title : `Mark as read: ${n.title}`}
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
{/if}

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
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    overflow: hidden;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: notif-in 0.2s ease-out both;
  }

  .notif-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .notif-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .notif-unread {
    flex: 1;
    font-size: 11px;
    color: var(--accent);
  }

  .notif-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 2px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s ease, background 0.15s ease;
  }

  .notif-close:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--text) 16%, transparent);
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
    color: var(--overlay0);
  }

  .notif-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
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
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .notif-item-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notif-type {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .notif-time {
    flex: 1;
    font-size: 10px;
    color: var(--overlay0);
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
    color: var(--subtext0);
    word-break: normal;
    overflow-wrap: break-word;
  }
</style>
