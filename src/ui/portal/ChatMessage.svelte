<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import type { AgentEvent } from "../../sdk";
  import { apiErrorTitleKey } from "../../sdk/openai";
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import Icon from "../Icon.svelte";
  import { t, type MessageKey } from "../../i18n.svelte";

  let { event }: { event: AgentEvent } = $props();

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

  const errorTitle = $derived(
    event.type === "error" && event.httpStatus != null
      ? t(apiErrorTitleKey(event.httpStatus) as MessageKey)
      : null,
  );
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
{:else if event.type === "error"}
  <div class="msg system">
    <div class="bubble error-msg" role="alert">
      <div class="error-head">
        <Icon name="error" size={16} />
        {#if event.httpStatus != null}
          <span class="error-status">{event.httpStatus}</span>
        {/if}
        <span class="error-title"
          >{errorTitle ?? t("chat.apiErrorTitle.other")}</span
        >
      </div>
      {#if event.content}
        <p class="error-detail">{event.content}</p>
      {/if}
      {#if event.apiCode}
        <p class="error-code">
          {t("chat.apiErrorCode", { code: event.apiCode })}
        </p>
      {/if}
      {#if event.httpStatus === 429}
        <p class="error-hint">{t("chat.apiErrorHint.rateLimit")}</p>
      {:else if event.httpStatus === 401}
        <p class="error-hint">{t("chat.apiErrorHint.auth")}</p>
      {:else if event.httpStatus === 403}
        <p class="error-hint">{t("chat.apiErrorHint.forbidden")}</p>
      {:else if event.httpStatus === 418}
        <p class="error-hint">{t("chat.apiErrorHint.teapot")}</p>
      {/if}
    </div>
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

  /* Beat `.msg.system .bubble` so errors actually paint danger colors. */
  .msg.system .bubble.error-msg {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: color-mix(in srgb, var(--red) 16%, var(--surface-base));
    border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
    color: var(--danger-ink);
    white-space: normal;
  }

  .error-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .error-head > :global(.fsp-icon) {
    flex-shrink: 0;
    color: var(--danger-ink);
  }

  .error-status {
    flex-shrink: 0;
    padding: 1px 7px;
    border-radius: var(--radius-control);
    background: color-mix(in srgb, var(--red) 22%, transparent);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .error-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--danger-ink);
    min-width: 0;
  }

  .error-detail,
  .error-code,
  .error-hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--danger-ink);
  }

  .error-code {
    opacity: 0.85;
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 11px;
  }

  .error-hint {
    opacity: 0.9;
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
