<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { fade, scale } from "svelte/transition";
  import { runtime } from "../adapters/runtime.svelte";
  import type { AgentContext } from "../sdk/types";
  import { notify } from "../notifications";
  import { i18n, t, type MessageKey } from "../i18n.svelte";
  import UnavailableState from "./portal/UnavailableState.svelte";
  import NotificationsPanel from "./portal/NotificationsPanel.svelte";
  import {
    ACCENTS,
    DARK_FLAVORS,
    FLAVOR_OPTIONS,
    applyTheme,
    theme,
  } from "../theme.svelte";
  import {
    CHROME_OPTIONS,
    SIDEBAR_WIDTH_MAX,
    SIDEBAR_WIDTH_MIN,
    shellChrome,
  } from "../shellChrome.svelte";
  import { pointer } from "../pointer.svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";
  import {
    attachOverlayFocus,
    type OverlayFocusHandle,
  } from "./portal/overlayFocus";
  import { pageLoading } from "./portal/pageLoading.svelte";
  import { backdropFade, modalScale, popScale } from "./portal/popTransition";
  // Nav views + ChatSidebar load lazily per activeNav / chatOpen so heavy
  // modules (Marks predictor, standing, feedback, marked/DOMPurify) stay out
  // of the initial System.register entry execute path.

  type PageId =
    | "home"
    | "feedback"
    | "homeworks"
    | "marks"
    | "clubs"
    | "events"
    | "standing";

  interface NavItem {
    id: PageId;
    label: MessageKey;
    icon: IconName;
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
  const avatarInitials = $derived.by(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  });
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
  let sidebarResizing = $state(false);

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
  let settingsPop: HTMLDivElement | undefined = $state();

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

  /** Arrow/Home/End navigation for settings role=radiogroup clusters. */
  function onRadioGroupKeydown(
    e: KeyboardEvent,
    options: readonly string[],
    current: string,
    set: (value: string) => void,
  ) {
    const keys = [
      "ArrowRight",
      "ArrowDown",
      "ArrowLeft",
      "ArrowUp",
      "Home",
      "End",
    ];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = Math.max(0, options.indexOf(current));
    let next = i;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (i + 1) % options.length;
    else next = (i - 1 + options.length) % options.length;
    const value = options[next];
    if (value === undefined) return;
    set(value);
    const group = e.currentTarget as HTMLElement;
    const radios = group.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[next]?.focus();
  }

  $effect(() => {
    if (!settingsOpen || !settingsPop) return;
    const handle: OverlayFocusHandle = attachOverlayFocus(
      settingsPop,
      closeSettings,
    );
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      const pop = settingsPop;
      if (pop && pop.contains(e.target)) return;
      const btn = settingsBtn;
      if (btn && btn.contains(e.target)) return;
      closeSettings();
    }
    document.addEventListener("pointerdown", onPointerdown);
    return () => {
      document.removeEventListener("pointerdown", onPointerdown);
      handle.release();
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

    if (runtime.adapter.features.notifications) {
      runtime.adapter
        .getNotificationsByRecords(userId, 1)
        .then((res) => {
          unreadCount = res.numberOfUnreadNotifications;
        })
        .catch(() => {
          /* badge stays at last known */
        });
    }
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

<div class="shell" class:chrome-floating={shellChrome.chrome === "floating"}>
  <a class="skip-link" href="#fsp-main">{t("aria.skipToMain")}</a>
  <h1 class="shell-title">{t("aria.appName")}</h1>

  <header class="header">
    <div class="header-left">
      <button
        class="icon-btn"
        aria-label={t("aria.toggleMenu")}
        onclick={toggleSidebar}
      >
        <Icon name="menu" size={22} />
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
          <Icon name="chat" size={22} />
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
              closeSettings();
            } else {
              lastTrigger = document.activeElement as HTMLElement;
              if (narrow) sidebarOpen = false;
              settingsOpen = true;
            }
          }}
        >
          <Icon name="settings" size={22} />
        </button>
        {#if settingsOpen}
          <div class="settings-layer" class:as-modal={narrow}>
            {#if narrow}
              <div
                class="settings-scrim"
                role="presentation"
                onclick={closeSettings}
                transition:fade={backdropFade()}
              ></div>
            {/if}
            <div
              class="settings-pop"
              bind:this={settingsPop}
              role="dialog"
              aria-modal="true"
              aria-label={t("aria.appearance")}
              tabindex="-1"
              transition:scale={narrow ? modalScale() : popScale()}
            >
              <p class="settings-title">{t("settings.theme")}</p>
              <div
                class="settings-flavors"
                role="radiogroup"
                tabindex="0"
                aria-label={t("settings.flavor")}
                onkeydown={(e) =>
                  onRadioGroupKeydown(e, FLAVOR_OPTIONS, theme.flavor, (v) =>
                    theme.setFlavor(v as (typeof FLAVOR_OPTIONS)[number]),
                  )}
              >
                {#each FLAVOR_OPTIONS as option (option)}
                  <button
                    class="settings-flavor"
                    class:selected={theme.flavor === option}
                    role="radio"
                    aria-checked={theme.flavor === option}
                    tabindex={theme.flavor === option ? 0 : -1}
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
                  tabindex="0"
                  aria-label={t("settings.darkFlavor")}
                  onkeydown={(e) =>
                    onRadioGroupKeydown(
                      e,
                      DARK_FLAVORS,
                      theme.systemDark,
                      (v) =>
                        theme.setSystemDark(v as (typeof DARK_FLAVORS)[number]),
                    )}
                >
                  {#each DARK_FLAVORS as dark (dark)}
                    <button
                      class="settings-flavor"
                      class:selected={theme.systemDark === dark}
                      role="radio"
                      aria-checked={theme.systemDark === dark}
                      tabindex={theme.systemDark === dark ? 0 : -1}
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
                tabindex="0"
                aria-label={t("settings.accentColor")}
                onkeydown={(e) =>
                  onRadioGroupKeydown(e, ACCENTS, theme.accent, (v) =>
                    theme.setAccent(v as (typeof ACCENTS)[number]),
                  )}
              >
                {#each ACCENTS as accent (accent)}
                  <button
                    class="accent-dot"
                    class:selected={theme.accent === accent}
                    style={`background: var(--${accent});`}
                    role="radio"
                    aria-checked={theme.accent === accent}
                    tabindex={theme.accent === accent ? 0 : -1}
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
              <p class="settings-title">{t("settings.layout")}</p>
              <div
                class="settings-flavors"
                role="radiogroup"
                tabindex="0"
                aria-label={t("settings.layoutGroup")}
                onkeydown={(e) =>
                  onRadioGroupKeydown(
                    e,
                    CHROME_OPTIONS,
                    shellChrome.chrome,
                    (v) =>
                      shellChrome.setChrome(
                        v as (typeof CHROME_OPTIONS)[number],
                      ),
                  )}
              >
                {#each CHROME_OPTIONS as option (option)}
                  <button
                    class="settings-flavor"
                    class:selected={shellChrome.chrome === option}
                    role="radio"
                    aria-checked={shellChrome.chrome === option}
                    tabindex={shellChrome.chrome === option ? 0 : -1}
                    onclick={() => shellChrome.setChrome(option)}
                  >
                    {option === "flush"
                      ? t("settings.layoutFlush")
                      : t("settings.layoutFloating")}
                  </button>
                {/each}
              </div>
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
          </div>
        {/if}
      </div>
      <button
        class="icon-btn"
        class:spinning={contentRefreshing}
        aria-label={t("aria.refresh")}
        aria-busy={contentRefreshing}
        onclick={refresh}
      >
        <Icon name="refresh" size={22} />
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
          <Icon
            name={unreadCount > 0 ? "notifications_active" : "notifications"}
            size={22}
          />
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

    <div
      class="sidebar-rail"
      class:collapsed={!sidebarOpen}
      class:resizing={sidebarResizing}
      style={!narrow ? `--sidebar-w: ${shellChrome.sidebarWidth}px` : undefined}
    >
      <aside
        class="sidebar"
        style={!narrow ? `width: ${shellChrome.sidebarWidth}px` : undefined}
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

    <main id="fsp-main" class="main" tabindex="-1">
      {#if activeNav === "homeworks"}
        {#if runtime.adapter.features.homeworks}
          {#if HomeworksViewComp}
            <HomeworksViewComp studentId={userId} bind:this={pages.homeworks} />
          {:else}
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "feedback"}
        {#if runtime.adapter.features.feedback}
          {#if FeedbackViewComp}
            <FeedbackViewComp studentId={userId} bind:this={pages.feedback} />
          {:else}
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "marks"}
        {#if runtime.adapter.features.marks}
          {#if MarksViewComp}
            <MarksViewComp studentId={userId} bind:this={pages.marks} />
          {:else}
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "events"}
        {#if runtime.adapter.features.events}
          {#if EventsViewComp}
            <EventsViewComp studentId={userId} bind:this={pages.events} />
          {:else}
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "standing"}
        {#if runtime.adapter.features.standing}
          {#if StandingViewComp}
            <StandingViewComp studentId={userId} bind:this={pages.standing} />
          {:else}
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
          {/if}
        {:else}
          <UnavailableState />
        {/if}
      {:else if activeNav === "clubs"}
        {#if runtime.adapter.features.clubs}
          {#if ClubsViewComp}
            <ClubsViewComp studentId={userId} bind:this={pages.clubs} />
          {:else}
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
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
            <div class="view-loading" role="status">
              {t("nav.loadingView")}
            </div>
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
    animation: refresh-spin 0.75s linear infinite;
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

  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: var(--surface-base);
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

  .chat-loading,
  .view-loading {
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
    height: var(--hit-step);
    min-height: var(--hit-step);
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

  .settings-layer {
    display: contents;
  }

  .settings-scrim {
    display: none;
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
    transform-origin: top right;
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
    min-height: var(--hit-step);
    padding: 6px 4px;
    cursor: pointer;
    transition:
      background 0.12s ease,
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }

  .settings-flavor:focus-visible,
  .accent-dot:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .settings-flavor:active {
    transform: scale(0.99);
  }

  .settings-flavor:hover {
    background: var(--surface1);
  }

  .settings-flavor.selected {
    border-color: var(--accent);
    color: var(--accent-strong);
    font-weight: 600;
    box-shadow: 0 0 0 2px var(--accent);
  }

  .settings-accents {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--hit-dot), 1fr));
    gap: 6px;
    margin-bottom: 14px;
  }

  .accent-dot {
    width: var(--hit-dot);
    height: var(--hit-dot);
    padding: var(--hit-dot-pad);
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    justify-self: center;
    background-clip: content-box;
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

  /*
   * Classic floating chrome — inset padded shell with rounded raised panels.
   * Toggled via settings (shellChrome); flush tiled layout is the default.
   */
  .shell.chrome-floating {
    gap: 12px;
    padding: 16px 20px;
  }

  .shell.chrome-floating .header {
    background: var(--mantle);
    border-bottom: none;
    border-radius: var(--radius-surface);
    padding: 10px 36px;
  }

  .shell.chrome-floating .content {
    gap: 10px;
    background: transparent;
  }

  .shell.chrome-floating .content:has(.sidebar-rail.collapsed) {
    gap: 0;
  }

  .shell.chrome-floating .sidebar {
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

    .header,
    .main,
    .sidebar,
    .shell.chrome-floating .header,
    .shell.chrome-floating .main,
    .shell.chrome-floating .sidebar {
      border-radius: 0;
    }

    .content,
    .shell.chrome-floating .content {
      gap: 0;
      padding: 0;
    }

    .shell.chrome-floating .content:has(.sidebar-rail.collapsed) {
      gap: 0;
    }

    .header,
    .shell.chrome-floating .header {
      padding: 10px 16px;
    }

    .shell.chrome-floating .header {
      border-bottom: 1px solid var(--border-subtle);
    }

    .shell.chrome-floating .sidebar {
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

    .header-nav {
      margin-left: 8px;
      gap: 6px;
    }

    .toolbar-btn {
      padding: 0 10px;
      font-size: 12px;
    }

    .schedule-date {
      font-size: 13px;
      margin-left: 2px;
    }

    .settings-layer.as-modal {
      display: grid;
      place-items: center;
      position: fixed;
      inset: 0;
      z-index: 25;
      padding: 16px;
    }

    .settings-layer.as-modal .settings-scrim {
      display: block;
      position: absolute;
      inset: 0;
      margin: 0;
      border: none;
      padding: 0;
      background: color-mix(in srgb, var(--mantle) 55%, transparent);
      cursor: pointer;
    }

    .settings-layer.as-modal .settings-pop {
      position: relative;
      top: auto;
      right: auto;
      z-index: 1;
      width: min(320px, 100%);
      max-height: 80vh;
      overflow-y: auto;
      transform-origin: center center;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
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
