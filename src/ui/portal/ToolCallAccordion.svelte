<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import type { AgentEvent } from "../../sdk/types";
  import Icon from "../Icon.svelte";
  import { t } from "../../i18n.svelte";

  let {
    call,
    result,
  }: {
    call: AgentEvent;
    result?: AgentEvent;
  } = $props();

  let open = $state(false);

  const name = $derived(call.toolName ?? result?.toolName ?? "");
  const pending = $derived(!result);
  const errored = $derived(!!result?.error);
  const argsText = $derived(
    call.toolArgs ? JSON.stringify(call.toolArgs, null, 2) : "",
  );
  const resultText = $derived(result?.content ?? "");
</script>

<div class="tool" class:error={errored} class:pending>
  <button
    type="button"
    class="tool-summary"
    aria-expanded={open}
    aria-label={t("chat.toolCall", { name })}
    onclick={() => (open = !open)}
  >
    <Icon name={errored ? "error" : pending ? "refresh" : "build"} size={16} />
    <span class="tool-label">{t("chat.toolRan", { name })}</span>
    <span class="tool-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
  </button>
  {#if open}
    <div class="tool-body">
      {#if argsText}
        <div class="tool-section">
          <span class="tool-section-label">{t("chat.toolInput")}</span>
          <pre class="tool-pre">{argsText}</pre>
        </div>
      {/if}
      {#if result}
        <div class="tool-section">
          <span class="tool-section-label">{t("chat.toolOutput")}</span>
          <pre class="tool-pre" class:error={errored}>{resultText}</pre>
        </div>
      {:else}
        <p class="tool-pending">{t("chat.toolPending")}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tool {
    display: flex;
    flex-direction: column;
    max-width: 88%;
    margin: 2px 0;
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    background: var(--surface-base);
    overflow: hidden;
  }

  .tool.error {
    border-color: color-mix(in srgb, var(--red) 35%, var(--border-subtle));
  }

  button.tool-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 7px 10px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 12px;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    appearance: none;
  }

  button.tool-summary:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: -2px;
  }

  button.tool-summary > :global(.fsp-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .tool.error button.tool-summary > :global(.fsp-icon) {
    color: var(--danger-ink);
  }

  .tool-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--text);
  }

  .tool-chevron {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .tool-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 10px 10px;
    border-top: 1px solid var(--border-subtle);
    padding-top: 8px;
  }

  .tool-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tool-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .tool-pre {
    margin: 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--base);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 11px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 220px;
    overflow: auto;
  }

  .tool-pre.error {
    color: var(--danger-ink);
    border-color: color-mix(in srgb, var(--red) 30%, transparent);
  }

  .tool-pending {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
