<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { runtime } from "../adapters/runtime.svelte";
  import type { AgentContext } from "../sdk/types";
  import { notify, notifyAction } from "../notifications";
  import { startNotificationPoller } from "../notificationPoller";
  import { t } from "../i18n.svelte";
  import UnavailableState from "./portal/UnavailableState.svelte";
  import NotificationsPanel from "./portal/NotificationsPanel.svelte";
  import ShellHeader from "./portal/ShellHeader.svelte";
  import ShellSettings from "./portal/ShellSettings.svelte";
  import ShellSidebar from "./portal/ShellSidebar.svelte";
  import type { PageId } from "./portal/navCatalog";
  import { applyTheme, theme } from "../theme.svelte";
  import { shellChrome } from "../shellChrome.svelte";
  import { pointer } from "../pointer.svelte";
  import { pageLoading } from "./portal/pageLoading.svelte";
  import ViewChunkSkeleton from "./portal/ViewChunkSkeleton.svelte";
  // Nav views + ChatSidebar load lazily per activeNav / chatOpen so heavy
  // modules (Marks predictor, standing, feedback, marked/DOMPurify) stay out
  // of the initial System.register entry execute path.

  let { userId }: { userId: string } = $props();

  // Narrow Google Sans Flex to fixed width + needed weights (no Material Symbols).
  const FONT_URL =
    "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wdth,wght@100,400;100,600;100,700&display=swap";
  if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
    for (const [rel, href, crossOrigin] of [
      ["preconnect", "https://fonts.googleapis.com", undefined],
      ["preconnect", "https://fonts.gstatic.com", "anonymous"],
    ] as const) {
      if (document.querySelector(`link[rel="${rel}"][href="${href}"]`))
        continue;
      const pre = document.createElement("link");
      pre.rel = rel;
      pre.href = href;
      if (crossOrigin) pre.crossOrigin = crossOrigin;
      document.head.appendChild(pre);
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
  }

  const isMobile = window.matchMedia("(max-width: 768px)");
  let narrow = $state(isMobile.matches);

  $effect(() => {
    const sync = () => {
      narrow = isMobile.matches;
    };
    isMobile.addEventListener("change", sync);
    return () => isMobile.removeEventListener("change", sync);
  });

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
  /** Stays true during the close animation so the chat rail can slide out. */
  let chatPresent = $state(false);
  let agentContext = $state<AgentContext | null>(null);
  let ChatSidebarComp = $state<
    typeof import("./portal/ChatSidebar.svelte").default | null
  >(null);
  let ScheduleViewComp = $state<
    typeof import("./portal/ScheduleView.svelte").default | null
  >(null);
  let MarksViewComp = $state<
    typeof import("./portal/MarksView.svelte").default | null
  >(null);
  let FeedbackViewComp = $state<
    typeof import("./portal/FeedbackView.svelte").default | null
  >(null);
  let HomeworksViewComp = $state<
    typeof import("./portal/HomeworksView.svelte").default | null
  >(null);
  let EventsViewComp = $state<
    typeof import("./portal/EventsView.svelte").default | null
  >(null);
  let StandingViewComp = $state<
    typeof import("./portal/StandingView.svelte").default | null
  >(null);
  let ClubsViewComp = $state<
    typeof import("./portal/ClubsView.svelte").default | null
  >(null);
  const CHAT_WIDTH_MIN = 280;
  const CHAT_WIDTH_MAX = 640;
  let chatWidth = $state(340);

  $effect(() => {
    if ((!chatOpen && !chatPresent) || ChatSidebarComp) return;
    void import("./portal/ChatSidebar.svelte").then((m) => {
      ChatSidebarComp = m.default;
    });
  });

  $effect(() => {
    const nav = activeNav;
    switch (nav) {
      case "home":
        if (!ScheduleViewComp) {
          void import("./portal/ScheduleView.svelte").then((m) => {
            if (activeNav !== nav) return;
            ScheduleViewComp = m.default;
          });
        }
        break;
      case "marks":
        if (!MarksViewComp) {
          void import("./portal/MarksView.svelte").then((m) => {
            if (activeNav !== nav) return;
            MarksViewComp = m.default;
          });
        }
        break;
      case "feedback":
        if (!FeedbackViewComp) {
          void import("./portal/FeedbackView.svelte").then((m) => {
            if (activeNav !== nav) return;
            FeedbackViewComp = m.default;
          });
        }
        break;
      case "homeworks":
        if (!HomeworksViewComp) {
          void import("./portal/HomeworksView.svelte").then((m) => {
            if (activeNav !== nav) return;
            HomeworksViewComp = m.default;
          });
        }
        break;
      case "events":
        if (!EventsViewComp) {
          void import("./portal/EventsView.svelte").then((m) => {
            if (activeNav !== nav) return;
            EventsViewComp = m.default;
          });
        }
        break;
      case "standing":
        if (!StandingViewComp) {
          void import("./portal/StandingView.svelte").then((m) => {
            if (activeNav !== nav) return;
            StandingViewComp = m.default;
          });
        }
        break;
      case "clubs":
        if (!ClubsViewComp) {
          void import("./portal/ClubsView.svelte").then((m) => {
            if (activeNav !== nav) return;
            ClubsViewComp = m.default;
          });
        }
        break;
    }
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
  let pages = $state<
    Partial<Record<PageId, PageRef>> & {
      home?: SchedulePageRef;
    }
  >({});
  let settingsOpen = $state(false);
  let settingsBtn: HTMLButtonElement | undefined = $state();
  let overflowBtn: HTMLButtonElement | undefined = $state();

  pointer.start();

  $effect(() => {
    void theme.flavor;
    void theme.accent;
    applyTheme();
  });

  function closeSettings() {
    if (!settingsOpen) return;
    settingsOpen = false;
  }

  function openSettings() {
    if (settingsOpen) return;
    lastTrigger =
      (narrow ? overflowBtn : settingsBtn) ??
      (document.activeElement as HTMLElement);
    if (narrow) sidebarOpen = false;
    settingsOpen = true;
  }

  function prepareOverflowOpen() {
    lastTrigger = document.activeElement as HTMLElement;
    if (narrow) sidebarOpen = false;
  }

  $effect(() => {
    let banner: { dismiss: () => void } | null = null;

    runtime.adapter.onAuthRequired(() => {
      if (banner) return;
      banner = notifyAction({
        message: t("toast.authRequired"),
        actionLabel: t("toast.authRequiredAction"),
        type: "error",
        onDismiss: () => {
          banner = null;
          runtime.adapter.clearAuthRequired();
        },
        onAction: async () => {
          const ok = await runtime.adapter.reauthenticate();
          if (!ok) {
            notify(t("toast.authFailed"), "error");
            throw new Error("reauth failed");
          }
          notify(t("toast.authRestored"), "success");
        },
      });
    });

    return () => {
      runtime.adapter.onAuthRequired(null);
      banner?.dismiss();
      banner = null;
    };
  });

  $effect(() => {
    void userId;
    runtime.adapter
      .getUserById(userId)
      .then((user) => {
        name = user.name;
        rollNumber = user.rollNumber;
      })
      .catch(() => {
        notify(t("toast.profileFailed"), "error");
      });

    runtime.adapter.getUserImage(userId).then((image) => {
      if (image) avatar = image;
    });
  });

  $effect(() => {
    if (!runtime.adapter.features.notifications) return;
    void userId;
    return startNotificationPoller({
      userId,
      onUnread: (n) => {
        unreadCount = n;
      },
    });
  });

  $effect(() => {
    void userId;
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

  const viewChunkPending = $derived.by(() => {
    const f = runtime.adapter.features;
    switch (activeNav) {
      case "home":
        return f.schedule && !ScheduleViewComp;
      case "marks":
        return f.marks && !MarksViewComp;
      case "feedback":
        return f.feedback && !FeedbackViewComp;
      case "homeworks":
        return f.homeworks && !HomeworksViewComp;
      case "events":
        return f.events && !EventsViewComp;
      case "standing":
        return f.standing && !StandingViewComp;
      case "clubs":
        return f.clubs && !ClubsViewComp;
    }
  });

  const contentRefreshing = $derived(pageLoading.active || viewChunkPending);

  function onNotifications() {
    if (notifOpen) {
      restoreFocus();
    } else {
      lastTrigger = document.activeElement as HTMLElement;
      if (narrow) sidebarOpen = false;
    }
    notifOpen = !notifOpen;
  }

  function closeChat() {
    if (!chatOpen) return;
    chatOpen = false;
  }

  function toggleChat() {
    if (chatOpen) {
      closeChat();
    } else {
      lastTrigger = document.activeElement as HTMLElement;
      if (narrow) sidebarOpen = false;
      chatPresent = true;
      requestAnimationFrame(() => {
        chatOpen = true;
      });
    }
  }

  function onContentScrim() {
    if (sidebarOpen) {
      toggleSidebar();
      return;
    }
    if (narrow && chatOpen) closeChat();
  }

  function onChatRailTransitionEnd(e: TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    // Desktop animates width; mobile animates transform.
    if (e.propertyName !== "width" && e.propertyName !== "transform") return;
    if (chatOpen) return;
    chatPresent = false;
    restoreFocus();
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

<div class="shell" class:chrome-floating={shellChrome.chrome === "floating"}>
  <a class="skip-link" href="#fsp-main">{t("aria.skipToMain")}</a>
  <h1 class="shell-title">{t("aria.appName")}</h1>

  <ShellHeader
    {activeNav}
    {scheduleDate}
    {chatOpen}
    {settingsOpen}
    {unreadCount}
    {contentRefreshing}
    showChat={runtime.adapter.features.session}
    showNotifications={runtime.adapter.features.notifications}
    {narrow}
    bind:settingsBtn
    bind:overflowBtn
    onToggleSidebar={toggleSidebar}
    onGoToday={() => pages.home?.goToday()}
    onGoPrev={() => pages.home?.goTo(-1)}
    onGoNext={() => pages.home?.goTo(1)}
    onToggleChat={toggleChat}
    onToggleSettings={() => {
      if (settingsOpen) closeSettings();
      else openSettings();
    }}
    onOpenSettings={openSettings}
    onCloseSettings={closeSettings}
    onRefresh={refresh}
    {onNotifications}
    onPrepareOverflowOpen={prepareOverflowOpen}
  >
    {#snippet settingsPanel()}
      <ShellSettings bind:open={settingsOpen} {narrow} trigger={settingsBtn} />
    {/snippet}
  </ShellHeader>

  <div class="content">
    <div
      class="scrim"
      class:visible={sidebarOpen || (narrow && chatOpen)}
      role="presentation"
      aria-hidden={!(sidebarOpen || (narrow && chatOpen))}
      onclick={onContentScrim}
      onkeydown={(e) => {
        if (e.key !== "Escape") return;
        if (sidebarOpen) toggleSidebar();
        else if (narrow && chatOpen) closeChat();
      }}
    ></div>

    <ShellSidebar
      bind:open={sidebarOpen}
      bind:activeNav
      {narrow}
      {name}
      {rollNumber}
      {avatar}
    />

    <main id="fsp-main" class="main" tabindex="-1">
      {#if activeNav === "homeworks"}
        {#if runtime.adapter.features.homeworks}
          {#if HomeworksViewComp}
            <HomeworksViewComp studentId={userId} bind:this={pages.homeworks} />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "feedback"}
        {#if runtime.adapter.features.feedback}
          {#if FeedbackViewComp}
            <FeedbackViewComp studentId={userId} bind:this={pages.feedback} />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "marks"}
        {#if runtime.adapter.features.marks}
          {#if MarksViewComp}
            <MarksViewComp studentId={userId} bind:this={pages.marks} />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "events"}
        {#if runtime.adapter.features.events}
          {#if EventsViewComp}
            <EventsViewComp studentId={userId} bind:this={pages.events} />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "standing"}
        {#if runtime.adapter.features.standing}
          {#if StandingViewComp}
            <StandingViewComp studentId={userId} bind:this={pages.standing} />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "clubs"}
        {#if runtime.adapter.features.clubs}
          {#if ClubsViewComp}
            <ClubsViewComp studentId={userId} bind:this={pages.clubs} />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "home"}
        {#if runtime.adapter.features.schedule}
          {#if ScheduleViewComp}
            <ScheduleViewComp
              studentId={userId}
              ondatelabel={(label) => (scheduleDate = label)}
              bind:this={pages.home}
            />
          {:else}
            <ViewChunkSkeleton />
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {/if}
    </main>

    {#if chatPresent && runtime.adapter.features.session}
      <div
        class="chat-rail"
        class:open={chatOpen}
        style={`--chat-w: ${chatWidth}px`}
        ontransitionend={onChatRailTransitionEnd}
      >
        <aside
          class="chat-panel"
          style={`width: ${chatWidth}px;`}
          aria-label={t("aria.assistant")}
          aria-hidden={!chatOpen}
          inert={!chatOpen}
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
            <ChatSidebarComp {agentContext} onclose={closeChat} />
          {:else}
            <div class="chat-loading">{t("chat.loadingContext")}</div>
          {/if}
        </aside>
      </div>
    {/if}
  </div>

  {#if runtime.adapter.features.notifications && notifOpen}
    <NotificationsPanel
      {userId}
      open={notifOpen}
      refreshToken={unreadCount}
      onclose={() => (notifOpen = false)}
      onunread={(n: number) => (unreadCount = n)}
    />
  {/if}
</div>

<style>
  .skip-link {
    position: absolute;
    left: 12px;
    top: 12px;
    z-index: 2;
    padding: 8px 12px;
    border-radius: var(--radius-control);
    background: var(--surface-raised);
    color: var(--accent-strong);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transform: translateY(-200%);
  }

  .skip-link:focus {
    transform: translateY(0);
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }

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
    gap: 0;
    height: 100%;
    padding: 0;
  }

  .content {
    display: flex;
    align-items: stretch;
    gap: 0;
    flex: 1;
    min-height: 0;
    padding: 0;
    background: var(--surface-base);
  }

  .scrim {
    display: none;
  }

  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: var(--surface-sunken);
    border-radius: 0;
    overflow: hidden;
  }

  .chat-rail {
    flex-shrink: 0;
    width: 0;
    overflow: hidden;
    transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .chat-rail.open {
    width: var(--chat-w, 340px);
  }

  .chat-panel {
    box-sizing: border-box;
    width: 340px;
    min-width: var(--chat-w, 340px);
    height: 100%;
    background: var(--surface-raised);
    border: none;
    border-left: 1px solid var(--border-subtle);
    border-radius: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
    opacity: 0;
    transform: translateX(16px);
    transition:
      opacity 0.22s ease,
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .chat-rail.open .chat-panel {
    opacity: 1;
    transform: translateX(0);
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

  /*
   * Classic floating chrome — inset padded shell with rounded raised panels.
   * Toggled via settings (shellChrome); flush tiled layout is the default.
   */
  .shell.chrome-floating {
    gap: 12px;
    padding: 16px 20px;
  }

  /* Header lives in ShellHeader — :global so floating chrome still reaches it. */
  .shell.chrome-floating :global(.header) {
    background: var(--mantle);
    border-bottom: none;
    border-radius: var(--radius-surface);
    padding: 10px 36px;
  }

  .shell.chrome-floating .content {
    gap: 10px;
    background: transparent;
  }

  .shell.chrome-floating .content:has(:global(.sidebar-rail.collapsed)) {
    gap: 0;
  }

  /* Sidebar lives in ShellSidebar — :global so floating chrome still reaches it. */
  .shell.chrome-floating :global(.sidebar) {
    background: var(--base);
    border-right: none;
    border-radius: var(--radius-surface);
  }

  .shell.chrome-floating .main {
    background: var(--mantle);
    border-radius: var(--radius-surface);
  }

  .shell.chrome-floating .chat-panel {
    background: var(--base);
    border-left: none;
    border-radius: var(--radius-surface);
  }

  @media (max-width: 768px) {
    .shell,
    .shell.chrome-floating {
      gap: 0;
      padding: 0;
    }

    :global(.header),
    .main,
    :global(.sidebar),
    .shell.chrome-floating :global(.header),
    .shell.chrome-floating .main,
    .shell.chrome-floating :global(.sidebar) {
      border-radius: 0;
    }

    .content,
    .shell.chrome-floating .content {
      gap: 0;
      padding: 0;
    }

    .shell.chrome-floating .content:has(:global(.sidebar-rail.collapsed)) {
      gap: 0;
    }

    :global(.header),
    .shell.chrome-floating :global(.header) {
      padding: 10px 16px;
    }

    .shell.chrome-floating :global(.header) {
      border-bottom: 1px solid var(--border-subtle);
    }

    .shell.chrome-floating :global(.sidebar) {
      border-right: none;
    }

    .shell.chrome-floating .main {
      background: var(--surface-base);
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

    .chat-rail {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      top: auto;
      z-index: 20;
      width: 100%;
      height: 80vh;
      margin-bottom: 0;
      overflow: visible;
      transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      transform: translateY(105%);
    }

    .chat-rail.open {
      width: 100%;
      height: 80vh;
      transform: translateY(0);
    }

    .chat-panel {
      width: 100% !important;
      min-width: 0;
      height: 100%;
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35);
      opacity: 1;
      transform: none;
      transition: none;
    }

    .chat-resize-handle {
      display: none;
    }
  }
</style>
