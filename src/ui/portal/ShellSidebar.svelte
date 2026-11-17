<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import { notify } from "../../notifications";
  import { t } from "../../i18n.svelte";
  import {
    SIDEBAR_WIDTH_MAX,
    SIDEBAR_WIDTH_MIN,
    shellChrome,
  } from "../../shellChrome.svelte";
  import Icon from "../Icon.svelte";
  import { ALL_NAV_ITEMS, type NavItem, type PageId } from "./navCatalog";

  let {
    open = $bindable(false),
    activeNav = $bindable<PageId>("home"),
    narrow = false,
    name = "",
    rollNumber = "",
    avatar = null,
  }: {
    open?: boolean;
    activeNav?: PageId;
    narrow?: boolean;
    name?: string;
    rollNumber?: string;
    avatar?: string | null;
  } = $props();

  let sidebarResizing = $state(false);

  const navItems = $derived.by(() => {
    const f = runtime.adapter.features;
    const supported: Record<PageId, boolean> = {
      home: f.schedule,
      feedback: f.feedback,
      homeworks: f.homeworks,
      marks: f.marks,
      clubs: f.clubs,
      events: f.events,
      standing: f.standing,
    };
    return ALL_NAV_ITEMS.filter((item) => supported[item.id]);
  });

  const avatarInitials = $derived.by(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  });

  function onNav(item: NavItem) {
    if (item.id === activeNav) return;
    const f = runtime.adapter.features;
    const supported: Record<PageId, boolean> = {
      home: f.schedule,
      feedback: f.feedback,
      homeworks: f.homeworks,
      marks: f.marks,
      clubs: f.clubs,
      events: f.events,
      standing: f.standing,
    };
    if (!supported[item.id]) {
      notify(t("toast.viewUnavailable", { label: t(item.label) }), "info");
      return;
    }
    activeNav = item.id;
    if (narrow) open = false;
  }

  function onSidebarResizeStart(e: PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = shellChrome.sidebarWidth;
    sidebarResizing = true;
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      shellChrome.setSidebarWidth(startWidth + delta, false);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      sidebarResizing = false;
      shellChrome.setSidebarWidth(shellChrome.sidebarWidth);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onSidebarResizeKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 32 : 16;
    const width = shellChrome.sidebarWidth;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      shellChrome.setSidebarWidth(width + step);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      shellChrome.setSidebarWidth(width - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      shellChrome.setSidebarWidth(SIDEBAR_WIDTH_MIN);
    } else if (e.key === "End") {
      e.preventDefault();
      shellChrome.setSidebarWidth(SIDEBAR_WIDTH_MAX);
    }
  }
</script>

<div
  class="sidebar-rail"
  class:collapsed={!open}
  class:resizing={sidebarResizing}
  style={!narrow ? `--sidebar-w: ${shellChrome.sidebarWidth}px` : undefined}
>
  <aside
    class="sidebar"
    style={!narrow ? `width: ${shellChrome.sidebarWidth}px` : undefined}
    aria-hidden={!open}
    inert={!open}
  >
    <div class="profile">
      {#if avatar}
        <img
          class="avatar"
          src={avatar}
          alt={t("aria.avatar", { name: name || "" })}
        />
      {:else}
        <div
          class="avatar avatar-fallback"
          aria-label={t("aria.avatar", { name: name || "" })}
          role="img"
        >
          {avatarInitials}
        </div>
      {/if}
      <p class="profile-name">{name || "..."}</p>
      <p class="profile-roll">{rollNumber}</p>
    </div>

    <nav class="nav" aria-label={t("header.aria.mainNav")}>
      {#each navItems as item (item.id)}
        <button
          class="nav-item"
          class:active={activeNav === item.id}
          aria-current={activeNav === item.id ? "page" : undefined}
          onclick={() => onNav(item)}
        >
          <Icon class="nav-icon" name={item.icon} size={22} />
          <span>{t(item.label)}</span>
        </button>
      {/each}
    </nav>

    {#if !narrow}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="sidebar-resize-handle"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        aria-valuenow={shellChrome.sidebarWidth}
        aria-valuemin={SIDEBAR_WIDTH_MIN}
        aria-valuemax={SIDEBAR_WIDTH_MAX}
        aria-label={t("aria.resizeSidebar")}
        onpointerdown={onSidebarResizeStart}
        onkeydown={onSidebarResizeKeydown}
      ></div>
    {/if}
  </aside>
</div>

<style>
  /*
   * Rail clips; inner sidebar keeps a fixed 260px width so the profile/nav
   * slide away instead of squashing as width animates to 0.
   */
  .sidebar-rail {
    flex-shrink: 0;
    align-self: stretch;
    width: var(--sidebar-w, 260px);
    overflow: hidden;
    transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .sidebar-rail.collapsed {
    width: 0;
  }

  .sidebar-rail.resizing {
    transition: none;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
    width: var(--sidebar-w, 260px);
    min-width: var(--sidebar-w, 260px);
    height: 100%;
    background: var(--surface-raised);
    border: none;
    border-right: 1px solid var(--border-subtle);
    border-radius: 0;
    padding: 22px 24px;
    overflow: hidden;
    opacity: 1;
    transform: translateX(0);
    position: relative;
    top: auto;
    left: auto;
    box-shadow: none;
    transition:
      opacity 0.22s ease,
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .sidebar-rail.collapsed .sidebar {
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
  }

  .sidebar-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 6px;
    cursor: col-resize;
    touch-action: none;
    z-index: 5;
  }

  .sidebar-resize-handle:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: -2px;
  }

  .sidebar-resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    right: 2px;
    width: 2px;
    background: transparent;
    transition: background 0.15s ease;
  }

  .sidebar-resize-handle:hover::after,
  .sidebar-resize-handle:focus-visible::after,
  .sidebar-rail.resizing .sidebar-resize-handle::after {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .profile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 8px 0 14px;
  }

  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    background: var(--text);
    object-fit: cover;
    display: block;
    align-self: center;
    margin-inline: auto;
  }

  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--accent) 22%, var(--surface-raised));
    color: var(--accent-strong);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .profile-name {
    font-size: 16px;
    color: var(--text);
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-roll {
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: var(--hit-nav);
    min-height: var(--hit-nav);
    flex-shrink: 0;
    padding: 4px 12px;
    border: none;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 14px;
    color: var(--text);
    text-align: left;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .nav-item:hover {
    background: color-mix(in srgb, var(--surface0) 55%, transparent);
  }

  .nav-item.active {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--text);
  }

  .nav-item.active:hover {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .nav-item:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .nav-item :global(.nav-icon) {
    box-sizing: content-box;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    /* Match header icon optical centering (path weight sits low in the viewBox). */
    translate: 0 -0.5px;
  }

  .sidebar .nav-item {
    transition: background 0.12s ease;
  }

  @media (max-width: 768px) {
    .sidebar-rail {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 20;
      width: min(300px, 84vw);
      overflow: visible;
      transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      transform: translateX(0);
    }

    .sidebar-rail.collapsed {
      width: min(300px, 84vw);
      transform: translateX(-105%);
    }

    .sidebar {
      display: flex;
      width: 100%;
      min-width: 0;
      height: 100%;
      border-radius: 0 16px 16px 0;
      overflow-y: auto;
      transform: none;
      opacity: 1;
      box-shadow: 8px 0 32px rgba(0, 0, 0, 0.35);
      transition: none;
    }

    .sidebar-rail.collapsed .sidebar {
      transform: none;
      opacity: 1;
      pointer-events: none;
      box-shadow: none;
    }
  }
</style>
