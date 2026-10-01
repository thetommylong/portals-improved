<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { createAgent } from "../../sdk";
  import type { AgentEvent, AgentContext, ConfirmRequest } from "../../sdk/types";
  import { isConfigured } from "../../sdk/openai";
  import ChatMessage from "./ChatMessage.svelte";
  import ConfirmCard from "./ConfirmCard.svelte";
  import ModelPicker from "./ModelPicker.svelte";

  let { agentContext }: { agentContext: AgentContext } = $props();

  let agent = $state(createAgent(agentContext));
  let messages = $state<AgentEvent[]>([]);
  let input = $state("");
  let sending = $state(false);
  let modelPickerOpen = $state(false);
  let confirmRequest = $state<ConfirmRequest | null>(null);
  let scrollEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!isConfigured()) {
      messages = [
        {
          type: "message",
          content:
            "Welcome! Set your API key first:\n\n/key <your-api-key>\n\nThen optionally:\n/url <custom-base-url>\n/model <model-id>",
          role: "assistant",
        },
      ];
    }
  });

  $effect(() => {
    // Depend on messages length to scroll when new messages arrive
    messages.length;
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  });

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    if (confirmRequest) return;

    input = "";
    sending = true;
    messages = [...messages, { type: "message", content: text, role: "user" }];

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
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function approveConfirm() {
    if (confirmRequest) {
      confirmRequest.resolve(true);
      confirmRequest = null;
    }
  }

  function rejectConfirm() {
    if (confirmRequest) {
      confirmRequest.resolve(false);
      confirmRequest = null;
    }
  }
</script>

<div class="chat-sidebar">
  <div class="chat-header">
    <span class="chat-title">AI Assistant</span>
    <div class="chat-actions">
      <button
        class="chat-icon-btn"
        aria-label="Select model"
        onclick={() => (modelPickerOpen = true)}
      >
        <span class="material-symbols-rounded" aria-hidden="true">smart_toy</span>
      </button>
      <button
        class="chat-icon-btn"
        aria-label="Clear chat"
        onclick={() => {
          agent.clear();
          messages = [];
        }}
      >
        <span class="material-symbols-rounded" aria-hidden="true">delete_sweep</span>
      </button>
    </div>
  </div>

  <div class="chat-messages" bind:this={scrollEl}>
    {#each messages as event, i (i)}
      {#if event.type === "confirm" && event.confirmRequest}
        <ConfirmCard request={event.confirmRequest} />
      {:else}
        <ChatMessage {event} />
      {/if}
    {/each}

{#if confirmRequest}
      <div class="confirm-inline">
        <ConfirmCard request={confirmRequest} />
      </div>
    {/if}

   </div>

  <div class="chat-input">
    <textarea
      placeholder="Ask about your portal data..."
      bind:value={input}
      onkeydown={handleKeydown}
      rows={1}
      disabled={sending}
    ></textarea>
    <button
      class="send-btn"
      aria-label="Send"
      onclick={send}
      disabled={sending || !input.trim()}
    >
      <span class="material-symbols-rounded" aria-hidden="true">arrow_upward</span>
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
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--subtext0);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .chat-icon-btn:hover {
    background: var(--surface0);
    color: var(--text);
  }

  .chat-icon-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .chat-icon-btn span {
    font-size: 20px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
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
    background: var(--surface0);
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
    color: var(--subtext0);
  }

  .chat-input textarea:focus-visible {
    background: var(--surface1);
  }

  .chat-input textarea:disabled {
    opacity: 0.5;
  }

  .send-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 10px;
    background: var(--accent);
    color: var(--base);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }

  .send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .send-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .send-btn span {
    font-size: 18px;
  }

  .confirm-inline {
    margin-top: 4px;
  }
</style>
