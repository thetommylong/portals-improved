<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { scale } from "svelte/transition";
  import { createAgent } from "../../sdk";
  import type {
    AgentEvent,
    AgentContext,
    ConfirmRequest,
  } from "../../sdk/types";
  import {
    getBaseUrl,
    isConfigured,
    needsNonDefaultHostConfirm,
    OutboundUrlError,
    setApiKey,
    setBaseUrl,
    validateOutboundUrl,
  } from "../../sdk/openai";
  import { runtime } from "../../adapters/runtime.svelte";
  import { notify } from "../../notifications";
  import ChatMessage from "./ChatMessage.svelte";
  import ConfirmCard from "./ConfirmCard.svelte";
  import ModelPicker from "./ModelPicker.svelte";
  import Icon from "../Icon.svelte";
  import { t } from "../../i18n.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { echoUserMessage, isClearCommand } from "./chatEcho";
  import { modalScale } from "./popTransition";

  let {
    agentContext,
    onclose,
  }: {
    agentContext: AgentContext;
    onclose: () => void;
  } = $props();

  const agent = $derived(createAgent(agentContext, runtime.adapter));
  let messages = $state<AgentEvent[]>([]);
  let input = $state("");
  let sending = $state(false);
  let modelPickerOpen = $state(false);
  let confirmRequest = $state<ConfirmRequest | null>(null);
  let scrollEl: HTMLDivElement | undefined = $state();
  let panelEl = $state<HTMLDivElement>();
  let textareaEl = $state<HTMLTextAreaElement>();
  let clearCancelBtn = $state<HTMLButtonElement>();
  let focusHandle = $state<OverlayFocusHandle | null>(null);
  let configured = $state(isConfigured());
  let setupKey = $state("");
  let setupUrl = $state(getBaseUrl());
  let clearConfirm = $state(false);
  const mobileChat = window.matchMedia("(max-width: 768px)");
  let isMobileChat = $state(mobileChat.matches);

  const HELP_CHIPS = [
    "/help",
    "/models",
    "/key",
    "/url",
    "/model",
    "/clear",
  ] as const;

  function focusComposer() {
    requestAnimationFrame(() => {
      if (configured) {
        textareaEl?.focus();
      } else {
        panelEl?.querySelector<HTMLElement>("#chat-setup-key")?.focus();
      }
    });
  }

  $effect(() => {
    const _len = messages.length;
    void _len;
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  });

  $effect(() => {
    const sync = () => {
      isMobileChat = mobileChat.matches;
    };
    mobileChat.addEventListener("change", sync);
    return () => mobileChat.removeEventListener("change", sync);
  });

  $effect(() => {
    if (!panelEl) return;
    focusComposer();

    // Desktop side panel: keep schedule/nav reachable. Mobile overlay: trap.
    if (!isMobileChat) {
      function onKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.preventDefault();
          onclose();
        }
      }
      panelEl.addEventListener("keydown", onKeydown);
      return () => {
        panelEl?.removeEventListener("keydown", onKeydown);
      };
    }

    focusHandle = attachOverlayFocus(panelEl, onclose);
    focusComposer();
    return () => {
      focusHandle?.release();
      focusHandle = null;
    };
  });

  $effect(() => {
    if (!clearConfirm) return;
    requestAnimationFrame(() => clearCancelBtn?.focus());
  });

  function saveSetup() {
    const key = setupKey.trim();
    const url = setupUrl.trim();
    if (!key) return;

    if (url) {
      let validated: string;
      try {
        validated = validateOutboundUrl(url);
      } catch (err) {
        const message =
          err instanceof OutboundUrlError
            ? err.message
            : t("chat.baseUrlInvalid");
        notify(t("chat.baseUrlRejected", { message }), "error");
        return;
      }
      if (
        needsNonDefaultHostConfirm(validated) &&
        !window.confirm(t("chat.baseUrlConfirm", { url: validated }))
      ) {
        return;
      }
      try {
        setBaseUrl(validated);
      } catch (err) {
        const message =
          err instanceof OutboundUrlError
            ? err.message
            : t("chat.baseUrlInvalid");
        notify(t("chat.baseUrlRejected", { message }), "error");
        return;
      }
    }

    setApiKey(key);
    setupKey = "";
    configured = true;
    messages = [
      ...messages,
      {
        type: "message",
        content: t("chat.apiKeySaved"),
        role: "assistant",
      },
    ];
    focusComposer();
  }

  function requestClear() {
    if (messages.length === 0) {
      agent.clear();
      messages = [];
      clearConfirm = false;
      return;
    }
    clearConfirm = true;
  }

  function confirmClear() {
    agent.clear();
    messages = [];
    clearConfirm = false;
  }

  function cancelClear() {
    clearConfirm = false;
    focusComposer();
  }

  function insertChip(cmd: string) {
    if (cmd === "/clear") {
      requestClear();
      return;
    }
    input = cmd === "/help" || cmd === "/models" ? cmd : `${cmd} `;
    textareaEl?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    if (confirmRequest) return;

    input = "";

    // Typed /clear must wipe the light-DOM transcript as well as LLM history.
    if (isClearCommand(text)) {
      agent.clear();
      messages = [];
      clearConfirm = false;
      return;
    }

    sending = true;
    // Never put /key secrets into light-DOM chat messages.
    messages = [
      ...messages,
      { type: "message", content: echoUserMessage(text), role: "user" },
    ];

    await agent.send(
      text,
      (event) => {
        if (event.type === "confirm" && event.confirmRequest) {
          confirmRequest = event.confirmRequest;
          return;
        }
        if (event.type === "done") {
          sending = false;
          return;
        }
        messages = [...messages, event];
      },
      (req) =>
        new Promise<boolean>((resolve) => {
          confirmRequest = { ...req, resolve };
        }),
      () => {
        // Streaming deltas are applied to the shared message event object via deep reactivity.
      },
    );

    sending = false;
    confirmRequest = null;
    configured = isConfigured();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<div
  class="chat-sidebar"
  bind:this={panelEl}
  role={isMobileChat ? "dialog" : "complementary"}
  aria-modal={isMobileChat ? true : undefined}
  aria-label={t("chat.assistant")}
  tabindex="-1"
>
  <div class="chat-header">
    <span class="chat-title">{t("chat.assistant")}</span>
    <div class="chat-actions">
      <button
        type="button"
        class="chat-icon-btn"
        aria-label={t("chat.selectModel")}
        onclick={() => (modelPickerOpen = true)}
      >
        <Icon name="smart_toy" size={22} />
      </button>
      <button
        type="button"
        class="chat-icon-btn"
        aria-label={t("chat.clear")}
        onclick={requestClear}
      >
        <Icon name="delete_sweep" size={22} />
      </button>
    </div>
  </div>

  <div
    class="chat-messages"
    bind:this={scrollEl}
    aria-live="polite"
    aria-relevant="additions"
  >
    {#if !configured}
      <div class="chat-setup" role="group" aria-label={t("chat.setupTitle")}>
        <p class="chat-setup-lead">{t("chat.setupLead")}</p>
        <label class="chat-setup-label" for="chat-setup-key"
          >{t("chat.setupKey")}</label
        >
        <input
          id="chat-setup-key"
          class="chat-setup-input"
          type="password"
          autocomplete="off"
          bind:value={setupKey}
          placeholder={t("chat.setupKeyPlaceholder")}
        />
        <label class="chat-setup-label" for="chat-setup-url"
          >{t("chat.setupUrl")}</label
        >
        <input
          id="chat-setup-url"
          class="chat-setup-input"
          type="url"
          autocomplete="off"
          bind:value={setupUrl}
          placeholder={t("chat.setupUrlPlaceholder")}
        />
        <button
          type="button"
          class="chat-setup-save"
          disabled={!setupKey.trim()}
          onclick={saveSetup}
        >
          {t("chat.setupSave")}
        </button>
        <p class="chat-setup-hint">{t("chat.setupSlashHint")}</p>
      </div>
    {/if}

    {#each messages as event, i (i)}
      {#if event.type === "confirm" && event.confirmRequest}
        <ConfirmCard request={event.confirmRequest} />
      {:else}
        <ChatMessage {event} />
      {/if}
    {/each}

    {#if clearConfirm}
      <div
        class="chat-clear-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-clear-title"
        aria-describedby="chat-clear-body"
        transition:scale={modalScale()}
      >
        <p id="chat-clear-title" class="chat-clear-title">
          {t("chat.clearConfirmTitle")}
        </p>
        <p id="chat-clear-body">{t("chat.clearConfirmBody")}</p>
        <div class="chat-clear-actions">
          <button type="button" class="chat-clear-yes" onclick={confirmClear}
            >{t("chat.clearConfirmYes")}</button
          >
          <button
            type="button"
            class="chat-clear-no"
            bind:this={clearCancelBtn}
            onclick={cancelClear}>{t("chat.clearConfirmNo")}</button
          >
        </div>
      </div>
    {/if}

    {#if confirmRequest}
      <div class="confirm-inline">
        <ConfirmCard request={confirmRequest} />
      </div>
    {/if}
  </div>

  <div class="chat-chips" role="group" aria-label={t("chat.helpChipsAria")}>
    {#each HELP_CHIPS as chip (chip)}
      <button type="button" class="chat-chip" onclick={() => insertChip(chip)}>
        {chip}
      </button>
    {/each}
  </div>

  <div class="chat-input">
    <textarea
      bind:this={textareaEl}
      aria-label={t("chat.placeholder")}
      placeholder={t("chat.placeholder")}
      bind:value={input}
      onkeydown={handleKeydown}
      rows={1}
      disabled={sending}></textarea>
    <button
      type="button"
      class="send-btn"
      aria-label={t("chat.send")}
      onclick={send}
      disabled={sending || !input.trim()}
    >
      <Icon name="arrow_upward" size={22} />
    </button>
  </div>
</div>

<ModelPicker open={modelPickerOpen} onclose={() => (modelPickerOpen = false)} />

<style>
  .chat-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 14px;
  }

  .chat-sidebar:focus-visible {
    outline: none;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 48px;
    flex-shrink: 0;
  }

  .chat-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .chat-actions {
    display: flex;
    gap: 4px;
  }

  .chat-icon-btn {
    display: inline-grid;
    place-items: center;
    width: var(--hit-icon);
    height: var(--hit-icon);
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .chat-icon-btn > :global(.fsp-icon) {
    display: block;
    translate: 0 -0.5px;
  }

  .chat-icon-btn:hover {
    background: var(--surface-base);
    color: var(--text);
  }

  .chat-icon-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .chat-setup {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 12px;
    background: var(--surface-base);
    border: 1px solid var(--border-subtle);
  }

  .chat-setup-lead {
    margin: 0 0 4px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
  }

  .chat-setup-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .chat-setup-input {
    width: 100%;
    box-sizing: border-box;
    border: none;
    border-radius: 8px;
    padding: 10px 12px;
    background: var(--base);
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
  }

  .chat-setup-input:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .chat-setup-save {
    margin-top: 4px;
    align-self: flex-start;
    min-height: 36px;
    padding: 0 14px;
    border: none;
    border-radius: 8px;
    background: var(--accent-strong);
    color: var(--base);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .chat-setup-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chat-setup-hint {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .chat-clear-confirm {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 8px 0;
    padding: 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--red) 8%, var(--surface-base));
    border: 1px solid color-mix(in srgb, var(--red) 25%, transparent);
  }

  .chat-clear-title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .chat-clear-confirm p {
    margin: 0;
    font-size: 13px;
    color: var(--text);
  }

  .chat-clear-actions {
    display: flex;
    gap: 8px;
  }

  .chat-clear-yes,
  .chat-clear-no {
    flex: 1;
    min-height: 36px;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .chat-clear-yes {
    background: var(--red);
    color: var(--mantle);
  }

  .chat-clear-no {
    background: var(--surface-base);
    color: var(--text);
  }

  .chat-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 14px 8px;
    flex-shrink: 0;
  }

  .chat-chip {
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--surface-base);
    color: var(--accent);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .chat-chip:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .chat-chip:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .chat-input {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 12px 14px;
    flex-shrink: 0;
  }

  .chat-input textarea {
    flex: 1;
    resize: none;
    border: none;
    border-radius: 12px;
    padding: 10px 14px;
    background: var(--surface-base);
    color: var(--text);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    outline: none;
    min-height: 40px;
    max-height: 120px;
    transition: background 0.15s ease;
  }

  .chat-input textarea::placeholder {
    color: var(--text-secondary);
  }

  .chat-input textarea:focus-visible {
    background: var(--surface1);
  }

  .chat-input textarea:disabled {
    opacity: 0.5;
  }

  .send-btn {
    width: var(--hit-icon);
    height: var(--hit-icon);
    min-width: var(--hit-icon);
    min-height: var(--hit-icon);
    border: none;
    border-radius: 10px;
    background: var(--accent-strong);
    color: var(--base);
    cursor: pointer;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }

  .send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .send-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }

  .send-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .confirm-inline {
    margin-top: 4px;
  }
</style>
