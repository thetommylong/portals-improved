<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import type { Snippet } from "svelte";
  import { scale } from "svelte/transition";
  import { t } from "../../i18n.svelte";
  import Icon from "../Icon.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { popScale } from "./popTransition";

  let {
    activeNav,
    scheduleDate,
    chatOpen,
    settingsOpen,
    unreadCount,
    contentRefreshing,
    showChat,
    showNotifications,
    narrow,
    settingsBtn = $bindable<HTMLButtonElement | undefined>(),
    overflowBtn = $bindable<HTMLButtonElement | undefined>(),
    settingsPanel,
    onToggleSidebar,
    onGoToday,
    onGoPrev,
    onGoNext,
    onToggleChat,
    onToggleSettings,
    onOpenSettings,
    onCloseSettings,
    onRefresh,
    onNotifications,
    onPrepareOverflowOpen,
  }: {
    activeNav: string;
    scheduleDate: string;
    chatOpen: boolean;
    settingsOpen: boolean;
    unreadCount: number;
    contentRefreshing: boolean;
    showChat: boolean;
    showNotifications: boolean;
    narrow: boolean;
    settingsBtn?: HTMLButtonElement;
    overflowBtn?: HTMLButtonElement;
    settingsPanel?: Snippet;
    onToggleSidebar: () => void;
    onGoToday: () => void;
    onGoPrev: () => void;
    onGoNext: () => void;
    onToggleChat: () => void;
    onToggleSettings: () => void;
    onOpenSettings: () => void;
    onCloseSettings: () => void;
    onRefresh: () => void;
    onNotifications: () => void;
    onPrepareOverflowOpen: () => void;
  } = $props();

  let overflowOpen = $state(false);
  let overflowPop: HTMLDivElement | undefined = $state();
  let refreshBtn: HTMLButtonElement | undefined = $state();

  function closeOverflow() {
    if (!overflowOpen) return;
    overflowOpen = false;
  }

  function toggleOverflow() {
    if (overflowOpen) {
      closeOverflow();
      return;
    }
    onPrepareOverflowOpen();
    onCloseSettings();
    overflowOpen = true;
  }

  $effect(() => {
    if (!overflowOpen || !overflowPop) return;
    const handle: OverlayFocusHandle = attachOverlayFocus(
      overflowPop,
      closeOverflow,
    );
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      if (overflowPop?.contains(e.target)) return;
      if (overflowBtn?.contains(e.target)) return;
      closeOverflow();
    }
    document.addEventListener("pointerdown", onPointerdown);
    return () => {
      document.removeEventListener("pointerdown", onPointerdown);
      handle.release();
    };
  });

  $effect(() => {
    if (!narrow) closeOverflow();
  });

  /**
   * Header refresh / more_vert spin: keep the silly infinite spin, then ease
   * out to a small overshoot and ease out back to upright. Overshoot is not
   * tied to load progress.
   */
  let spinPhase = $state<"idle" | "spin">("idle");
  const SETTLE_OUT_MS = 165;
  const SETTLE_BACK_MS = 140;
  const OVERSHOOT_DEG = 14;

  function iconRotationDeg(el: Element): number {
    const cs = getComputedStyle(el);
    // Prefer individual `rotate` — Gecko often leaves transform as none while
    // a `rotate` keyframe animation is running (matrix read → 0 → snap).
    const rot = cs.rotate;
    if (rot && rot !== "none") {
      const n = Number.parseFloat(rot);
      if (Number.isFinite(n)) {
        let deg = n;
        while (deg > 180) deg -= 360;
        while (deg < -180) deg += 360;
        return deg;
      }
    }
    const t = cs.transform;
    if (!t || t === "none") return 0;
    const m = new DOMMatrixReadOnly(t);
    let deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    while (deg > 180) deg -= 360;
    while (deg < -180) deg += 360;
    return deg;
  }

  function spinningIconHosts(): HTMLElement[] {
    const hosts: HTMLElement[] = [];
    if (narrow) {
      if (overflowBtn) hosts.push(overflowBtn);
    } else if (refreshBtn) {
      hosts.push(refreshBtn);
    }
    const menuRefresh = overflowPop?.querySelector<HTMLElement>(
      ".overflow-item.spinning",
    );
    if (menuRefresh) hosts.push(menuRefresh);
    return hosts;
  }

  function springIconsHome(): void {
    const hosts = spinningIconHosts();
    const jobs = hosts.map((host) => {
      const icon = host.querySelector<HTMLElement>(".fsp-icon");
      return { icon, deg: icon ? iconRotationDeg(icon) : 0 };
    });
    if (jobs.every((j) => !j.icon)) {
      spinPhase = "idle";
      return;
    }

    // Freeze CSS spin on the live nodes, then two ease-out hops (to overshoot,
    // then home). Hold element refs so class churn can't remount mid-flight.
    for (const { icon, deg } of jobs) {
      if (!icon) continue;
      icon.getAnimations().forEach((a) => a.cancel());
      icon.style.animation = "none";
      icon.style.rotate = `${deg}deg`;
    }
    spinPhase = "idle";

    for (const { icon, deg } of jobs) {
      if (!icon) continue;
      // Ease past upright to the far side, then ease back to 0.
      const overshoot = deg >= 0 ? -OVERSHOOT_DEG : OVERSHOOT_DEG;
      void (async () => {
        try {
          const out = icon.animate(
            [{ rotate: `${deg}deg` }, { rotate: `${overshoot}deg` }],
            {
              duration: SETTLE_OUT_MS,
              easing: "ease-out",
              fill: "forwards",
            },
          );
          await out.finished;
          out.commitStyles();
          out.cancel();

          const back = icon.animate(
            [{ rotate: `${overshoot}deg` }, { rotate: "0deg" }],
            {
              duration: SETTLE_BACK_MS,
              easing: "ease-out",
              fill: "forwards",
            },
          );
          await back.finished;
          back.commitStyles();
          back.cancel();
        } catch {
          // Animation canceled (new refresh) — leave cleanup to the next run.
        } finally {
          icon.style.animation = "";
          icon.style.rotate = "";
        }
      })();
    }
  }

  $effect(() => {
    if (contentRefreshing) {
      spinPhase = "spin";
      return;
    }
    if (spinPhase !== "spin") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spinPhase = "idle";
      return;
    }
    springIconsHome();
  });
</script>

<header class="header">
  <div class="header-left">
    <button
      class="icon-btn"
      aria-label={t("aria.toggleMenu")}
      onclick={onToggleSidebar}
    >
      <Icon name="menu" size={22} />
    </button>
    <div class="header-nav">
      {#if activeNav === "home"}
        <button class="toolbar-btn" onclick={onGoToday}>
          {t("header.today")}
        </button>
        <button
          class="toolbar-btn toolbar-nav"
          aria-label={t("header.aria.previous")}
          onclick={onGoPrev}
        >
          ‹
        </button>
        <button
          class="toolbar-btn toolbar-nav"
          aria-label={t("header.aria.next")}
          onclick={onGoNext}
        >
          ›
        </button>
        <span class="schedule-date">{scheduleDate}</span>
      {/if}
    </div>
  </div>
  <div class="header-right" data-onboarding="header">
    {#if showChat}
      <button
        class="icon-btn header-action"
        class:active={chatOpen}
        data-onboarding="chat"
        aria-label={t("aria.toggleAssistant")}
        aria-expanded={chatOpen}
        onclick={onToggleChat}
      >
        <Icon name="chat" size={22} />
      </button>
    {/if}
    <div class="settings-wrap">
      <button
        class="icon-btn header-action"
        class:active={settingsOpen}
        bind:this={settingsBtn}
        aria-label={t("aria.appearance")}
        aria-expanded={settingsOpen}
        onclick={onToggleSettings}
      >
        <Icon name="settings" size={22} />
      </button>
      {@render settingsPanel?.()}
    </div>
    <button
      class="icon-btn header-action"
      class:spinning={spinPhase === "spin"}
      bind:this={refreshBtn}
      aria-label={t("aria.refresh")}
      aria-busy={contentRefreshing}
      onclick={onRefresh}
    >
      <Icon name="refresh" size={22} />
    </button>
    {#if showNotifications}
      <button
        class="icon-btn header-action"
        class:has-badge={unreadCount > 0}
        aria-label={unreadCount > 0
          ? t("aria.notificationsUnread", { n: unreadCount })
          : t("aria.notificationsNone")}
        onclick={onNotifications}
      >
        <Icon
          name={unreadCount > 0 ? "notifications_active" : "notifications"}
          size={22}
        />
        {#if unreadCount > 0}
          <span class="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        {/if}
      </button>
    {/if}

    <div class="overflow-wrap">
      <button
        class="icon-btn"
        class:active={overflowOpen || chatOpen || settingsOpen}
        class:has-badge={unreadCount > 0}
        class:spinning={spinPhase === "spin"}
        bind:this={overflowBtn}
        aria-label={t("aria.moreActions")}
        aria-expanded={overflowOpen}
        aria-haspopup="menu"
        onclick={toggleOverflow}
      >
        <Icon name="more_vert" size={22} />
        {#if unreadCount > 0}
          <span class="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        {/if}
      </button>
      {#if overflowOpen}
        <div
          class="overflow-pop"
          bind:this={overflowPop}
          role="menu"
          aria-label={t("aria.moreActions")}
          tabindex="-1"
          transition:scale={popScale()}
        >
          {#if showChat}
            <button
              class="overflow-item"
              class:active={chatOpen}
              role="menuitem"
              data-onboarding="chat"
              onclick={() => {
                closeOverflow();
                onToggleChat();
              }}
            >
              <Icon name="chat" size={20} />
              <span>{t("header.actionAssistant")}</span>
            </button>
          {/if}
          <button
            class="overflow-item"
            class:active={settingsOpen}
            role="menuitem"
            onclick={() => {
              closeOverflow();
              onOpenSettings();
            }}
          >
            <Icon name="settings" size={20} />
            <span>{t("header.actionAppearance")}</span>
          </button>
          <button
            class="overflow-item"
            class:spinning={spinPhase === "spin"}
            role="menuitem"
            aria-busy={contentRefreshing}
            onclick={() => {
              closeOverflow();
              onRefresh();
            }}
          >
            <Icon name="refresh" size={20} />
            <span>{t("header.actionRefresh")}</span>
          </button>
          {#if showNotifications}
            <button
              class="overflow-item"
              class:has-badge={unreadCount > 0}
              role="menuitem"
              onclick={() => {
                closeOverflow();
                onNotifications();
              }}
            >
              <Icon
                name={unreadCount > 0
                  ? "notifications_active"
                  : "notifications"}
                size={20}
              />
              <span>{t("header.actionNotifications")}</span>
              {#if unreadCount > 0}
                <span class="overflow-count"
                  >{unreadCount > 99 ? "99+" : unreadCount}</span
                >
              {/if}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface-raised);
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    border-radius: 0;
    padding: 10px 20px;
    flex-shrink: 0;
    height: auto;
    line-height: normal;
  }

  .header-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .icon-btn {
    display: inline-grid;
    place-items: center;
    /* Sized via --hit-* from pointer mode (media + last pointerType). */
    min-width: var(--hit-icon);
    min-height: var(--hit-icon);
    width: var(--hit-icon);
    height: var(--hit-icon);
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    color: var(--text);
    transition: transform 0.15s ease;
    position: relative;
  }

  .icon-btn > :global(.fsp-icon) {
    display: block;
    /* Material-derived paths sit slightly low in the 24 box; nudge optically. */
    translate: 0 -0.5px;
  }

  .icon-btn.spinning > :global(.fsp-icon) {
    animation: refresh-spin 0.85s linear infinite;
  }

  @keyframes refresh-spin {
    to {
      rotate: 360deg;
    }
  }

  .icon-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .icon-btn.active {
    color: var(--accent-strong);
  }

  .icon-btn .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-control);
    background: var(--red);
    color: var(--mantle);
    font-size: 11px;
    font-weight: 700;
    font-family: "Google Sans Flex", system-ui, sans-serif;
  }

  .badge {
    transition: transform 0.15s ease;
  }

  .header-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 14px;
    min-width: 0;
  }

  /* Tag+class beats shared.css `button[class] { background: transparent }`. */
  button.toolbar-btn {
    height: var(--hit-step);
    min-height: var(--hit-step);
    padding: 0 16px;
    border: none;
    border-radius: 8px;
    background: var(--surface-base);
    color: var(--text);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  button.toolbar-btn:hover {
    background: var(--surface1);
  }

  button.toolbar-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  button.toolbar-btn.toolbar-nav {
    min-width: var(--hit-step);
    min-height: var(--hit-step);
    width: var(--hit-step);
    height: var(--hit-step);
    padding: 0;
    /* Track button hit size (30→16 fine, 44→~23 coarse). */
    font-size: calc(var(--hit-step) * 16 / 30);
    line-height: 1;
  }

  .schedule-date {
    margin-left: 10px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .settings-wrap {
    position: relative;
  }

  .overflow-wrap {
    display: none;
    position: relative;
  }

  .overflow-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    min-width: 200px;
    padding: 6px;
    background: var(--base);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    transform-origin: top right;
  }

  .overflow-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
  }

  .overflow-item:hover,
  .overflow-item:focus-visible {
    background: var(--surface-hover);
  }

  .overflow-item:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: -2px;
  }

  .overflow-item.active {
    color: var(--accent-strong);
  }

  .overflow-item.spinning > :global(.fsp-icon) {
    animation: refresh-spin 2.2s linear infinite;
  }

  .overflow-count {
    margin-left: auto;
    min-width: 18px;
    padding: 0 5px;
    border-radius: var(--radius-control);
    background: var(--red);
    color: var(--mantle);
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
  }

  @media (max-width: 768px) {
    .header {
      padding: 10px 16px;
    }

    .header-action {
      display: none;
    }

    .overflow-wrap {
      display: block;
    }

    .header-nav {
      margin-left: 8px;
      gap: 6px;
    }

    button.toolbar-btn {
      padding: 0 12px;
      font-size: 12px;
    }

    button.toolbar-btn.toolbar-nav {
      padding: 0;
    }

    .schedule-date {
      font-size: 13px;
      margin-left: 2px;
    }
  }
</style>
