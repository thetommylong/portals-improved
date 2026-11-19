<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { runtime } from "../adapters/runtime.svelte";
  import type { AgentContext } from "../sdk/types";
  import { notify, notifyAction, pageDocument } from "../notifications";
  import { startNotificationPoller } from "../notificationPoller";
  import { t } from "../i18n.svelte";
  import { burstConfetti } from "./confetti";
  import {
    needsFirstRun,
    needsUpdateToast,
    RELEASES_URL,
    setLastSeenVersion,
  } from "../onboarding";
  import UnavailableState from "./portal/UnavailableState.svelte";
  import NotificationsPanel from "./portal/NotificationsPanel.svelte";
  import OnboardingOverview from "./portal/OnboardingOverview.svelte";
  import OnboardingTour from "./portal/OnboardingTour.svelte";
  import ShellHeader from "./portal/ShellHeader.svelte";
  import ShellSettings from "./portal/ShellSettings.svelte";
  import ShellSidebar from "./portal/ShellSidebar.svelte";
  import type { PageId } from "./portal/navCatalog";
  import { applyTheme, theme } from "../theme.svelte";
  import { shellChrome } from "../shellChrome.svelte";
  import { pointer } from "../pointer.svelte";
  import { pageLoading } from "./portal/pageLoading.svelte";
  import ViewChunkSkeleton from "./portal/ViewChunkSkeleton.svelte";
  import ShellChatRail from "./portal/ShellChatRail.svelte";
  import { ShellViewRegistry } from "./portal/shellViewRegistry.svelte";
  import "./PortalShell.layout.css";
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
    // Survive host-chrome guard (strips unmarked stylesheets).
    link.setAttribute("data-fsp-css", "");
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
  let onboardingOverviewOpen = $state(false);
  let onboardingTourOpen = $state(false);
  let notifOpen = $state(false);
  let unreadCount = $state(0);
  // Local calendar day — not UTC (toISOString drifts near midnight).
  let scheduleDate = $state(
    ((d) =>
      [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-"))(new Date()),
  );
  let scheduleLabel = $state("");
  let scheduleWeekMode = $state(false);
  let lastTrigger = $state<HTMLElement>();
  let chatOpen = $state(false);
  /** Stays true during the close animation so the chat rail can slide out. */
  let chatPresent = $state(false);
  let agentContext = $state<AgentContext | null>(null);
  let ChatSidebarComp = $state<
    typeof import("./portal/ChatSidebar.svelte").default | null
  >(null);
  const views = new ShellViewRegistry();
  let chatWidth = $state(340);

  $effect(() => {
    if ((!chatOpen && !chatPresent) || ChatSidebarComp) return;
    void import("./portal/ChatSidebar.svelte").then((m) => {
      ChatSidebarComp = m.default;
    });
  });

  $effect(() => {
    const nav = activeNav;
    views.ensureLoaded(nav, () => activeNav === nav);
  });

  interface PageRef {
    refresh(): void;
  }
  interface SchedulePageRef extends PageRef {
    goToday(): void;
    setDate(iso: string): void;
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

  function finishOnboarding() {
    onboardingOverviewOpen = false;
    onboardingTourOpen = false;
    setLastSeenVersion();
  }

  function startOnboardingTour() {
    onboardingOverviewOpen = false;
    onboardingTourOpen = true;
    if (narrow) sidebarOpen = true;
  }

  function replayIntro() {
    closeSettings();
    onboardingTourOpen = false;
    onboardingOverviewOpen = true;
  }

  $effect(() => {
    if (needsFirstRun()) {
      onboardingOverviewOpen = true;
      return;
    }
    if (needsUpdateToast()) {
      notifyAction({
        type: "info",
        message: t("toast.updated", { version: __BUILD__.version }),
        actionLabel: t("toast.updatedAction"),
        onAction: () => {
          window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
        },
      });
      requestAnimationFrame(() => {
        const el = pageDocument().querySelector(".fsp-toast-sticky");
        const r = el?.getBoundingClientRect();
        burstConfetti(
          r ? r.left + r.width / 2 : innerWidth * 0.82,
          r ? r.top + r.height / 3 : 80,
        );
      });
      setLastSeenVersion();
    }
  });

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

  const contentRefreshing = $derived(
    pageLoading.active || views.isPending(activeNav, runtime.adapter.features),
  );

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
</script>

<div class="shell" class:chrome-floating={shellChrome.chrome === "floating"}>
  <a class="skip-link" href="#fsp-main">{t("aria.skipToMain")}</a>
  <h1 class="shell-title">{t("aria.appName")}</h1>

  <ShellHeader
    {activeNav}
    {scheduleDate}
    {scheduleLabel}
    {scheduleWeekMode}
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
    onDateChange={(iso) => pages.home?.setDate(iso)}
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
      <ShellSettings
        bind:open={settingsOpen}
        {narrow}
        trigger={settingsBtn}
        onReplayIntro={replayIntro}
      />
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
          {@const HomeworksViewComp = views.HomeworksViewComp}
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
          {@const FeedbackViewComp = views.FeedbackViewComp}
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
          {@const MarksViewComp = views.MarksViewComp}
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
          {@const EventsViewComp = views.EventsViewComp}
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
          {@const StandingViewComp = views.StandingViewComp}
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
          {@const ClubsViewComp = views.ClubsViewComp}
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
          {@const ScheduleViewComp = views.ScheduleViewComp}
          {#if ScheduleViewComp}
            <ScheduleViewComp
              studentId={userId}
              ondatelabel={(info) => {
                scheduleDate = info.iso;
                scheduleLabel = info.label;
                scheduleWeekMode = info.week;
              }}
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

    {#if runtime.adapter.features.session}
      <ShellChatRail
        bind:open={chatOpen}
        bind:present={chatPresent}
        bind:width={chatWidth}
        {agentContext}
        {ChatSidebarComp}
        onClose={closeChat}
        onClosed={restoreFocus}
      />
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

  <OnboardingOverview
    open={onboardingOverviewOpen}
    onDismiss={finishOnboarding}
    onStartTour={startOnboardingTour}
  />
  <OnboardingTour
    open={onboardingTourOpen}
    features={runtime.adapter.features}
    onDone={finishOnboarding}
  />
</div>
