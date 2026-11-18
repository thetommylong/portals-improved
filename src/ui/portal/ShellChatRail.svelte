<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import type { AgentContext } from "../../sdk/types";
  import { t } from "../../i18n.svelte";

  const CHAT_WIDTH_MIN = 280;
  const CHAT_WIDTH_MAX = 640;

  let {
    open = $bindable(false),
    present = $bindable(false),
    width = $bindable(340),
    agentContext,
    ChatSidebarComp,
    onClose,
    onClosed,
  }: {
    open: boolean;
    present: boolean;
    width: number;
    agentContext: AgentContext | null;
    ChatSidebarComp: typeof import("./ChatSidebar.svelte").default | null;
    onClose: () => void;
    onClosed: () => void;
  } = $props();

  function onResizeStart(e: PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: PointerEvent) => {
      const delta = startX - ev.clientX;
      width = Math.min(
        CHAT_WIDTH_MAX,
        Math.max(CHAT_WIDTH_MIN, startWidth + delta),
      );
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

  function onResizeKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 32 : 16;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      width = Math.min(CHAT_WIDTH_MAX, width + step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      width = Math.max(CHAT_WIDTH_MIN, width - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      width = CHAT_WIDTH_MIN;
    } else if (e.key === "End") {
      e.preventDefault();
      width = CHAT_WIDTH_MAX;
    }
  }

  function onRailTransitionEnd(e: TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    // Desktop animates width; mobile animates transform.
    if (e.propertyName !== "width" && e.propertyName !== "transform") return;
    if (open) return;
    present = false;
    onClosed();
  }
</script>

{#if present}
  <div
    class="chat-rail"
    class:open
    style={`--chat-w: ${width}px`}
    ontransitionend={onRailTransitionEnd}
  >
    <aside
      class="chat-panel"
      style={`width: ${width}px;`}
      aria-label={t("aria.assistant")}
      aria-hidden={!open}
      inert={!open}
    >
      <!-- splitter: APG uses role=separator + tabindex; svelte a11y disagrees with that combo -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="chat-resize-handle"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={CHAT_WIDTH_MIN}
        aria-valuemax={CHAT_WIDTH_MAX}
        aria-label={t("aria.resizeAssistant")}
        onpointerdown={onResizeStart}
        onkeydown={onResizeKeydown}
      ></div>
      {#if agentContext && ChatSidebarComp}
        <ChatSidebarComp {agentContext} onclose={onClose} />
      {:else}
        <div class="chat-loading">{t("chat.loadingContext")}</div>
      {/if}
    </aside>
  </div>
{/if}
