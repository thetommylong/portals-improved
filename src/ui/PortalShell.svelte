<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { runtime } from "../adapters/runtime.svelte";
  import type { AgentContext } from "../sdk/types";
  import { notify } from "../notifications";
  import { i18n, t, type MessageKey } from "../i18n.svelte";
  import UnavailableState from "./portal/UnavailableState.svelte";
  import ScheduleView from "./portal/ScheduleView.svelte";
  import MarksView from "./portal/MarksView.svelte";
  import FeedbackView from "./portal/FeedbackView.svelte";
  import HomeworksView from "./portal/HomeworksView.svelte";
  import NotificationsPanel from "./portal/NotificationsPanel.svelte";
  import {
    ACCENTS,
    DARK_FLAVORS,
    FLAVOR_OPTIONS,
    applyTheme,
    theme,
  } from "../theme.svelte";
  import EventsView from "./portal/EventsView.svelte";
  import StandingView from "./portal/StandingView.svelte";
  import ClubsView from "./portal/ClubsView.svelte";
  // ChatSidebar (and marked/DOMPurify/agent SDK) load lazily when chat opens.

  const NAV_IDS = [
    "home",
    "feedback",
    "homeworks",
    "marks",
    "clubs",
    "events",
    "standing",
  ] as const;
  type PageId = (typeof NAV_IDS)[number];

  interface NavItem {
    id: PageId;
    label: MessageKey;
    icon: string;
  }

  const ALL_NAV_ITEMS: NavItem[] = [
    { id: "home", label: "nav.home", icon: "home" },
    { id: "feedback", label: "nav.feedback", icon: "chat" },
    { id: "homeworks", label: "nav.homeworks", icon: "assignment" },
    { id: "marks", label: "nav.marks", icon: "done_all" },
    { id: "clubs", label: "nav.clubs", icon: "group" },
    { id: "events", label: "nav.events", icon: "event" },
    { id: "standing", label: "nav.standing", icon: "shield_person" },
  ];

  const navItems = $derived.by(() => {
    const f = runtime.adapter.features;
    const supported: Record<NavItem["id"], boolean> = {
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

  let { userId }: { userId: string } = $props();

  const FONT_URL =
    "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wdth,wght@75..100,100..900&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
  if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
  }

  const isMobile = window.matchMedia("(max-width: 768px)");

  let sidebarOpen = $state(!isMobile.matches);
  let activeNav = $state<PageId>("home");
  let name = $state("");
  let rollNumber = $state("");
  let avatar = $state<string | null>(null);
  let notifOpen = $state(false);
  let unreadCount = $state(0);
  let scheduleDate = $state("");
  let lastTrigger = $state<HTMLElement>();
  let chatOpen = $state(false);
  let agentContext = $state<AgentContext | null>(null);
  let ChatSidebarComp = $state<
    typeof import("./portal/ChatSidebar.svelte").default | null
  >(null);
  const CHAT_WIDTH_MIN = 280;
  const CHAT_WIDTH_MAX = 640;
  let chatWidth = $state(340);

  $effect(() => {
    if (!chatOpen || ChatSidebarComp) return;
    void import("./portal/ChatSidebar.svelte").then((m) => {
      ChatSidebarComp = m.default;
    });
  });

  function onChatResizeStart(e: PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    const onMove = (ev: PointerEvent) => {
      const delta = startX - ev.clientX;
      const next = Math.min(
        CHAT_WIDTH_MAX,
        Math.max(CHAT_WIDTH_MIN, startWidth + delta),
      );
      chatWidth = next;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  interface PageRef {
    refresh(): void;
  }
  interface SchedulePageRef extends PageRef {
    goTo(delta: number): void;
    goToday(): void;
  }
  let pages: Partial<Record<PageId, PageRef>> & {
    home?: SchedulePageRef;
    feedback?: FeedbackView;
    homeworks?: HomeworksView;
    events?: EventsView;
    standing?: StandingView;
    clubs?: ClubsView;
  } = {};
  let settingsOpen = $state(false);
  let settingsBtn: HTMLButtonElement | undefined = $state();
  let settingsPop: HTMLDivElement | undefined = $state();

  $effect(() => {
    void theme.flavor;
    void theme.accent;
    applyTheme();
  });

  $effect(() => {
    if (!settingsOpen) return;
    function onKeydown(e: Event) {
      if ((e as KeyboardEvent).key === "Escape") {
        settingsOpen = false;
        restoreFocus();
      }
    }
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      const pop = settingsPop;
      if (pop && pop.contains(e.target)) return;
      const btn = settingsBtn;
      if (btn && btn.contains(e.target)) return;
      settingsOpen = false;
      restoreFocus();
    }
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("pointerdown", onPointerdown);
    return () => {
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("pointerdown", onPointerdown);
    };
  });

  $effect(() => {
    const id = userId;
    runtime.adapter
      .getUserById(id)
      .then((user) => {
        name = user.name;
        rollNumber = user.rollNumber;
      })
      .catch(() => {
        notify(t("toast.profileFailed"), "error");
      });

    runtime.adapter.getUserImage(id).then((image) => {
      if (image) avatar = image;
    });
  });

  $effect(() => {
    const id = userId;
    runtime.adapter.getStudentContext().then(async (ctx) => {
      let termId = "";
      let termName = "Current Term";
      try {
        const term = await runtime.adapter.getDefaultTerm(ctx.campusId);
        termId = term.termId;
        termName = term.semesterName;
      } catch {
        /* keep Current Term fallback */
      }
      agentContext = {
        studentId: ctx.studentId,
        userId: ctx.userId,
        campusId: ctx.campusId,
        campusCode: ctx.campusCode,
        termId,
        termName,
        termOrder: ctx.termOrder,
        academicYear: ctx.academicYear,
      };
    });
  });

  function restoreFocus() {
    requestAnimationFrame(() => lastTrigger?.focus());
  }

  function toggleSidebar() {
    if (sidebarOpen) {
      restoreFocus();
    } else {
      lastTrigger = document.activeElement as HTMLElement;
    }
    sidebarOpen = !sidebarOpen;
  }

  function refresh() {
    pages[activeNav]?.refresh();
  }

  function onNotifications() {
    if (notifOpen) {
      restoreFocus();
    } else {
      lastTrigger = document.activeElement as HTMLElement;
    }
    notifOpen = !notifOpen;
  }

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
    if (isMobile.matches) sidebarOpen = false;
  }

  function toggleChat() {
    chatOpen = !chatOpen;
  }

  function onChatResizeKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 32 : 16;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      chatWidth = Math.min(CHAT_WIDTH_MAX, chatWidth + step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      chatWidth = Math.max(CHAT_WIDTH_MIN, chatWidth - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      chatWidth = CHAT_WIDTH_MIN;
    } else if (e.key === "End") {
      e.preventDefault();
      chatWidth = CHAT_WIDTH_MAX;
    }
  }
</script>

<div class="shell">
  <h1 class="shell-title">{t("aria.appName")}</h1>
  <header class="header">
    <div class="header-left">
      <button
        class="icon-btn"
        aria-label={t("aria.toggleMenu")}
        onclick={toggleSidebar}
      >
        <span class="material-symbols-rounded" aria-hidden="true">menu</span>
      </button>
      <div class="header-nav">
        {#if activeNav === "home"}
          <button class="toolbar-btn" onclick={() => pages.home?.goToday()}>
            {t("header.today")}
          </button>
          <button
            class="toolbar-btn toolbar-nav"
            aria-label={t("header.aria.previous")}
            onclick={() => pages.home?.goTo(-1)}
          >
            ‹
          </button>
          <button
            class="toolbar-btn toolbar-nav"
            aria-label={t("header.aria.next")}
            onclick={() => pages.home?.goTo(1)}
          >
            ›
          </button>
          <span class="schedule-date">{scheduleDate}</span>
        {/if}
      </div>
    </div>
    <div class="header-right">
      {#if runtime.adapter.features.session}
        <button
          class="icon-btn"
          class:active={chatOpen}
          aria-label={t("aria.toggleAssistant")}
          aria-expanded={chatOpen}
          onclick={toggleChat}
        >
          <span class="material-symbols-rounded" aria-hidden="true">chat</span>
        </button>
      {/if}
      <div class="settings-wrap">
        <button
          class="icon-btn"
          class:active={settingsOpen}
          bind:this={settingsBtn}
          aria-label={t("aria.appearance")}
          aria-expanded={settingsOpen}
          onclick={() => {
            if (settingsOpen) {
              restoreFocus();
            } else {
              lastTrigger = document.activeElement as HTMLElement;
            }
            settingsOpen = !settingsOpen;
          }}
        >
          <span class="material-symbols-rounded" aria-hidden="true"
            >settings</span
          >
        </button>
        {#if settingsOpen}
          <div
            class="settings-pop"
            bind:this={settingsPop}
            role="dialog"
            aria-label={t("aria.appearance")}
          >
            <p class="settings-title">{t("settings.theme")}</p>
            <div
              class="settings-flavors"
              role="radiogroup"
              aria-label={t("settings.flavor")}
            >
              {#each FLAVOR_OPTIONS as option (option)}
                <button
                  class="settings-flavor"
                  class:selected={theme.flavor === option}
                  role="radio"
                  aria-checked={theme.flavor === option}
                  onclick={() => theme.setFlavor(option)}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                </button>
              {/each}
            </div>
            {#if theme.flavor === "system"}
              <p class="settings-title">{t("settings.darkGroup")}</p>
              <div
                class="settings-flavors trio"
                role="radiogroup"
                aria-label={t("settings.darkFlavor")}
              >
                {#each DARK_FLAVORS as dark (dark)}
                  <button
                    class="settings-flavor"
                    class:selected={theme.systemDark === dark}
                    role="radio"
                    aria-checked={theme.systemDark === dark}
                    onclick={() => theme.setSystemDark(dark)}
                  >
                    {dark[0].toUpperCase() + dark.slice(1)}
                  </button>
                {/each}
              </div>
            {/if}
            <p class="settings-title">{t("settings.accent")}</p>
            <div
              class="settings-accents"
              role="radiogroup"
              aria-label={t("settings.accentColor")}
            >
              {#each ACCENTS as accent (accent)}
                <button
                  class="accent-dot"
                  class:selected={theme.accent === accent}
                  style={`background: var(--${accent});`}
                  role="radio"
                  aria-checked={theme.accent === accent}
                  aria-label={accent}
                  title={accent}
                  onclick={() => theme.setAccent(accent)}
                ></button>
              {/each}
            </div>
            <p class="settings-title">{t("settings.language")}</p>
            <select
              class="settings-select"
              aria-label={t("settings.languageGroup")}
              value={i18n.locale}
              onchange={(e) => {
                const next = (e.currentTarget as HTMLSelectElement).value;
                if (next === "vi" || next === "en") i18n.setLocale(next);
              }}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
            <hr class="settings-sep" />
            <p class="settings-title">{t("settings.about")}</p>
            <div class="about">
              <span class="about-name">portals-improved</span>
              <span class="about-detail">
                v{__BUILD__.version} · {__BUILD__.commit}
              </span>
              <a
                class="about-link"
                href="https://github.com/thetommylong/portals-improved/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
              >
                AGPL-3.0-only
              </a>
            </div>
          </div>
        {/if}
      </div>
      <button class="icon-btn" aria-label={t("aria.refresh")} onclick={refresh}>
        <span class="material-symbols-rounded" aria-hidden="true">refresh</span>
      </button>
      {#if runtime.adapter.features.notifications}
        <button
          class="icon-btn"
          class:has-badge={unreadCount > 0}
          aria-label={unreadCount > 0
            ? t("aria.notificationsUnread", { n: unreadCount })
            : t("aria.notificationsNone")}
          onclick={onNotifications}
        >
          <span class="material-symbols-rounded" aria-hidden="true"
            >notifications</span
          >
          {#if unreadCount > 0}
            <span class="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <div class="content">
    <div
      class="scrim"
      class:visible={sidebarOpen}
      role="presentation"
      aria-hidden={!sidebarOpen}
      onclick={toggleSidebar}
      onkeydown={(e) => {
        if (e.key === "Escape" && sidebarOpen) toggleSidebar();
      }}
    ></div>

    <aside
      class="sidebar"
      class:collapsed={!sidebarOpen}
      aria-hidden={!sidebarOpen}
      inert={!sidebarOpen}
    >
      <div class="profile">
        {#if avatar}
          <img
            class="avatar"
            src={avatar}
            alt={t("aria.avatar", { name: name || "" })}
          />
        {:else}
          <div class="avatar"></div>
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
            <span class="nav-icon material-symbols-rounded" aria-hidden="true"
              >{item.icon}</span
            >
            <span>{t(item.label)}</span>
          </button>
        {/each}
      </nav>
    </aside>

    <main class="main">
      {#if activeNav === "homeworks"}
        {#if runtime.adapter.features.homeworks}
          <HomeworksView studentId={userId} bind:this={pages.homeworks} />
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "feedback"}
        {#if runtime.adapter.features.feedback}
          <FeedbackView studentId={userId} bind:this={pages.feedback} />
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "marks"}
        {#if runtime.adapter.features.marks}
          <MarksView studentId={userId} bind:this={pages.marks} />
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "events"}
        {#if runtime.adapter.features.events}
          <EventsView studentId={userId} bind:this={pages.events} />
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "standing"}
        {#if runtime.adapter.features.standing}
          <StandingView studentId={userId} bind:this={pages.standing} />
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "clubs"}
        {#if runtime.adapter.features.clubs}
          <ClubsView studentId={userId} bind:this={pages.clubs} />
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "home"}
        {#if runtime.adapter.features.schedule}
          <ScheduleView
            studentId={userId}
            bind:dateLabel={scheduleDate}
            bind:this={pages.home}
          />
        {:else}
          <UnavailableState />
        {/if}
      {/if}
    </main>

    {#if chatOpen && runtime.adapter.features.session}
      <aside
        class="chat-panel"
        style={`width: ${chatWidth}px;`}
        aria-label={t("aria.assistant")}
      >
        <!-- splitter: APG uses role=separator + tabindex; svelte a11y disagrees with that combo -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="chat-resize-handle"
          role="separator"
          tabindex="0"
          aria-orientation="vertical"
          aria-valuenow={chatWidth}
          aria-valuemin={CHAT_WIDTH_MIN}
          aria-valuemax={CHAT_WIDTH_MAX}
          aria-label={t("aria.resizeAssistant")}
          onpointerdown={onChatResizeStart}
          onkeydown={onChatResizeKeydown}
        ></div>
        {#if agentContext && ChatSidebarComp}
          <ChatSidebarComp {agentContext} />
        {:else}
          <div class="chat-loading">{t("chat.loadingContext")}</div>
        {/if}
      </aside>
    {/if}
  </div>

  {#if runtime.adapter.features.notifications}
    <NotificationsPanel
      {userId}
      open={notifOpen}
      onclose={() => (notifOpen = false)}
      onunread={(n: number) => (unreadCount = n)}
    />
  {/if}
</div>

<style>
  .shell-title {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 16px 20px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--mantle);
    border-radius: 16px;
    padding: 10px 36px;
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
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    color: var(--text);
    transition: transform 0.15s ease;
    position: relative;
  }

  .icon-btn > .material-symbols-rounded {
    display: inline-grid;
    place-items: center;
    line-height: 1;
    font-size: 22px;
    translate: 0 -0.5px;
    font-variation-settings:
      "FILL" 0,
      "wght" 400,
      "GRAD" 0,
      "opsz" 24;
  }

  .icon-btn:hover > .material-symbols-rounded,
  .icon-btn.active > .material-symbols-rounded {
    font-variation-settings:
      "FILL" 1,
      "wght" 400,
      "GRAD" 0,
      "opsz" 24;
  }

  .icon-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .icon-btn.active {
    color: var(--accent);
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
    border-radius: 999px;
    background: var(--red);
    color: var(--mantle);
    font-size: 11px;
    font-weight: 700;
    font-family: "Google Sans Flex", system-ui, sans-serif;
  }

  .badge {
    transition: transform 0.15s ease;
  }

  .content {
    display: flex;
    align-items: stretch;
    gap: 10px;
    flex: 1;
    min-height: 0;
  }

  /* When the sidebar is collapsed to zero width, drop the inter-item gap too,
     otherwise the main panel sits 10px (plus the 1px collapsing sidebar) off
     the shell's left edge. :has() keeps the width transition (unlike
     display:none) while removing the phantom spacing. */
  .content:has(.sidebar.collapsed) {
    gap: 0;
  }

  .scrim {
    display: none;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 260px;
    flex-shrink: 0;
    background: var(--base);
    border-radius: 16px;
    padding: 22px 24px;
    overflow: hidden;
    opacity: 1;
    transform: translateX(0);
    position: static;
    height: auto;
    top: auto;
    left: auto;
    border: none;
    box-shadow: none;
    transition:
      opacity 0.22s ease,
      transform 0.22s ease,
      width 0.22s ease,
      padding 0.22s ease;
  }

  .sidebar.collapsed {
    width: 0;
    padding: 0;
    opacity: 0;
    pointer-events: none;
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
    height: 36px;
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

  .nav-icon {
    box-sizing: border-box;
    width: 28px;
    height: 28px;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    font-size: 22px;
    line-height: 1;
    /* Material Symbols sit slightly low in the em box; nudge up optically. */
    translate: 0 -0.5px;
    font-variation-settings:
      "FILL" 0,
      "wght" 400,
      "GRAD" 0,
      "opsz" 24;
  }

  .nav-item.active .nav-icon {
    font-variation-settings:
      "FILL" 1,
      "wght" 400,
      "GRAD" 0,
      "opsz" 24;
  }

  .sidebar .nav-item {
    transition: background 0.12s ease;
  }

  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: var(--mantle);
    border-radius: 16px;
    overflow: hidden;
  }

  .chat-panel {
    width: 340px;
    flex-shrink: 0;
    background: var(--base);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }

  .chat-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 6px;
    cursor: col-resize;
    touch-action: none;
    z-index: 5;
  }

  .chat-resize-handle:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: -2px;
  }

  .chat-resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 2px;
    width: 2px;
    background: transparent;
    transition: background 0.15s ease;
  }

  .chat-resize-handle:hover::after,
  .chat-resize-handle:active::after {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .chat-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .header-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 14px;
    min-width: 0;
  }

  .toolbar-btn {
    height: 30px;
    padding: 0 14px;
    border: none;
    border-radius: 8px;
    background: var(--surface-base);
    color: var(--text);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .toolbar-btn:hover {
    background: var(--base);
  }

  .toolbar-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .toolbar-nav {
    width: 30px;
    padding: 0;
    font-size: 16px;
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

  .settings-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    width: 240px;
    background: var(--base);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    animation: pop-in 0.15s ease-out both;
  }

  .settings-title {
    margin: 0 0 8px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .settings-flavors {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 14px;
  }

  .settings-flavors.trio {
    grid-template-columns: repeat(3, 1fr);
  }

  .settings-flavor {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--text);
    background: var(--surface-base);
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 6px 4px;
    cursor: pointer;
    transition:
      background 0.12s ease,
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }

  .settings-flavor:active {
    transform: scale(0.99);
  }

  .settings-flavor:hover {
    background: var(--surface1);
  }

  .settings-flavor.selected {
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
    box-shadow: 0 0 0 2px var(--accent);
  }

  .settings-accents {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(24px, 1fr));
    gap: 6px;
    margin-bottom: 14px;
  }

  .accent-dot {
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    justify-self: center;
  }

  .accent-dot.selected {
    border-color: var(--text);
  }

  .settings-select {
    display: block;
    width: 100%;
    margin-bottom: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--text);
    background: var(--surface-base);
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .settings-select:hover {
    background: var(--surface1);
  }

  .settings-select:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .settings-sep {
    border: none;
    border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    margin: 12px 0;
  }

  .about {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .about-name {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .about-detail {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .about-link {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    color: var(--info-ink);
    text-decoration: none;
  }

  .about-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .shell {
      gap: 0;
      padding: 0;
    }

    .header,
    .main,
    .sidebar {
      border-radius: 0;
    }

    .content {
      gap: 0;
    }

    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 15;
      background: color-mix(in srgb, var(--mantle) 55%, transparent);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.22s ease,
        visibility 0.22s ease;
    }

    .scrim.visible {
      opacity: 1;
      visibility: visible;
    }

    .sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 20;
      display: flex;
      width: min(300px, 84vw);
      border-radius: 0 16px 16px 0;
      overflow-y: auto;
      transform: translateX(0);
      transition: transform 0.22s ease;
      box-shadow: 8px 0 32px rgba(0, 0, 0, 0.35);
    }

    .sidebar.collapsed {
      display: flex;
      width: min(300px, 84vw);
      padding: 22px 24px;
      opacity: 1;
      pointer-events: auto;
      transform: translateX(-105%);
      box-shadow: none;
    }

    .header-nav {
      margin-left: 8px;
      gap: 6px;
    }

    .toolbar-btn {
      height: 26px;
      padding: 0 10px;
      font-size: 12px;
    }

    .toolbar-nav {
      width: 26px;
    }

    .schedule-date {
      font-size: 13px;
      margin-left: 2px;
    }

    .chat-panel {
      position: fixed;
      top: 0;
      bottom: 0;
      right: 0;
      z-index: 20;
      width: min(340px, 84vw);
      border-radius: 16px 0 0 16px;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.35);
    }
  }
</style>
