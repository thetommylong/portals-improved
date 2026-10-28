<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import type { AgentEvent } from "../../sdk";
  import { marked } from "marked";
  import DOMPurify from "dompurify";

  let { event }: { event: AgentEvent } = $props();

  const expandedState = new WeakMap<AgentEvent, boolean>();

  function isExpanded(event: AgentEvent): boolean {
    return expandedState.get(event) ?? false;
  }

  function toggleExpanded(event: AgentEvent): void {
    expandedState.set(event, !(expandedState.get(event) ?? false));
  }

  function handleKeydown(event: AgentEvent, e: KeyboardEvent): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpanded(event);
    }
  }

  function getSanitizedHTML(content: string): string {
    const html = marked.parse(content) as string;
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["style"],
      ALLOWED_URI_REGEXP:
        /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  }
</script>

{#if event.type === "message"}
  {#if event.role === "user"}
    <div class="msg user">
      <div class="bubble">{@html getSanitizedHTML(event.content ?? "")}</div>
    </div>
  {:else if event.role === "assistant"}
    <div class="msg assistant">
      <div class="bubble">{@html getSanitizedHTML(event.content ?? "")}</div>
    </div>
  {/if}
{:else if event.type === "tool_call"}
  <div class="msg system">
    <div
      class="bubble tool-call"
      role="button"
      tabindex="0"
      onclick={() => toggleExpanded(event)}
      onkeydown={(e) => handleKeydown(event, e)}
    >
      <span class="material-symbols-rounded" aria-hidden="true">build</span>
      <span class="tc-name">{event.toolName}</span>
      {#if event.toolArgs}
        {#if isExpanded(event)}
          <span class="tc-args">{JSON.stringify(event.toolArgs)}</span>
        {:else}
          <span class="tc-args"
            >{JSON.stringify(event.toolArgs).slice(0, 80)}{event.toolArgs &&
            JSON.stringify(event.toolArgs).length > 80
              ? "..."
              : ""}</span
          >
        {/if}
      {/if}
    </div>
  </div>
{:else if event.type === "tool_result"}
  <div class="msg system">
    <div
      class="bubble tool-result"
      class:error={event.error}
      role="button"
      tabindex="0"
      onclick={() => toggleExpanded(event)}
      onkeydown={(e) => handleKeydown(event, e)}
    >
      <span class="material-symbols-rounded" aria-hidden="true">
        {event.error ? "error" : "check_circle"}
      </span>
      <span class="tr-text">
        {#if isExpanded(event)}
          {event.content ?? ""}
        {:else}
          {(event.content ?? "").slice(0, 200)}{(event.content ?? "").length >
          200
            ? "..."
            : ""}
        {/if}
      </span>
    </div>
  </div>
{:else if event.type === "error"}
  <div class="msg system">
    <div class="bubble error-msg">{event.content}</div>
  </div>
{/if}

<style>
  .msg {
    display: flex;
    padding: 2px 0;
  }

  .msg.user {
    justify-content: flex-end;
  }

  .msg.assistant,
  .msg.system {
    justify-content: flex-start;
  }

  .bubble {
    max-width: 88%;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .msg.user .bubble {
    background: var(--accent-strong);
    color: var(--base);
    border-bottom-right-radius: 4px;
  }

  .msg.assistant .bubble,
  .msg.system .bubble {
    background: var(--surface-base);
    border: 1px solid var(--border-subtle);
    color: var(--text);
    border-bottom-left-radius: 4px;
  }

  .msg.system .bubble.tool-call,
  .msg.system .bubble.tool-result {
    cursor: pointer;
  }

  .tool-call {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-base);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    border-bottom-left-radius: 4px;
    font-size: 12px;
  }

  .tool-call span:first-child {
    font-size: 14px;
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .tc-name {
    font-weight: 600;
    color: var(--text);
  }

  .tc-args {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
    color: var(--text-secondary);
  }

  .tool-result {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    background: var(--surface-base);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    border-bottom-left-radius: 4px;
    font-size: 12px;
  }

  .tool-result span:first-child {
    font-size: 14px;
    flex-shrink: 0;
    color: var(--info-ink);
  }

  .tool-result.error {
    border-left: 2px solid var(--red);
  }

  .tool-result.error span:first-child {
    color: var(--red);
  }

  .tr-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .error-msg {
    background: color-mix(in srgb, var(--red) 12%, var(--surface0));
    border: 1px solid color-mix(in srgb, var(--red) 25%, transparent);
    color: var(--red);
    border-bottom-left-radius: 4px;
  }

  :global(.bubble :is(p, ul, ol, pre, blockquote, table)) {
    margin: 0 0 8px;
  }

  :global(.bubble :is(p, ul, ol, pre, blockquote, table):last-child) {
    margin-bottom: 0;
  }

  :global(.bubble ul),
  :global(.bubble ol) {
    padding-left: 20px;
  }

  :global(.bubble li) {
    margin: 2px 0;
  }

  :global(.bubble h1),
  :global(.bubble h2),
  :global(.bubble h3),
  :global(.bubble h4),
  :global(.bubble h5),
  :global(.bubble h6) {
    margin: 10px 0 6px;
    line-height: 1.3;
    color: var(--text);
  }

  :global(.bubble h1) {
    font-size: 16px;
  }

  :global(.bubble h2) {
    font-size: 15px;
  }

  :global(.bubble h3) {
    font-size: 14px;
  }

  :global(.bubble h4),
  :global(.bubble h5),
  :global(.bubble h6) {
    font-size: 13px;
  }

  :global(.bubble a) {
    color: var(--accent);
    text-decoration: none;
  }

  :global(.bubble a:hover) {
    text-decoration: underline;
  }

  :global(.bubble code) {
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12px;
    background: color-mix(in srgb, var(--base) 60%, transparent);
    border-radius: 4px;
    padding: 1px 5px;
    white-space: pre-wrap;
  }

  :global(.bubble pre) {
    background: var(--base);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 10px 12px;
    overflow-x: auto;
  }

  :global(.bubble pre code) {
    background: transparent;
    padding: 0;
    white-space: pre;
  }

  :global(.bubble blockquote) {
    border-left: 3px solid var(--accent);
    padding-left: 12px;
    color: var(--text-secondary);
  }

  :global(.bubble table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  :global(.bubble th),
  :global(.bubble td) {
    padding: 5px 10px;
    border: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    text-align: left;
  }

  :global(.bubble th) {
    background: var(--base);
    font-weight: 600;
    color: var(--text-secondary);
  }

  :global(.bubble hr) {
    border: none;
    border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    margin: 10px 0;
  }

  :global(.bubble strong) {
    color: var(--text);
  }
</style>
