<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { fetchModels, getModel, setModel } from "../../sdk/openai";
  import type { ModelInfo } from "../../sdk/types";
  import { t } from "../../i18n.svelte";

  let {
    open = false,
    onclose,
  }: { open?: boolean; onclose: () => void } = $props();

  let models = $state<ModelInfo[]>([]);
  let loading = $state(false);
  let error = $state("");
  let currentModel = $state(getModel());

  $effect(() => {
    if (open && models.length === 0) {
      loadModels();
    }
  });

  async function loadModels() {
    loading = true;
    error = "";
    try {
      models = await fetchModels();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function select(modelId: string) {
    setModel(modelId);
    currentModel = modelId;
    onclose();
  }
</script>

{#if open}
  <div class="picker-overlay" role="dialog" aria-label={t("modelPicker.title")}>
    <div class="picker">
      <div class="picker-header">
        <span class="picker-title">{t("modelPicker.title")}</span>
        <button class="picker-close" aria-label={t("aria.close")} onclick={onclose}>
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="picker-body">
        {#if loading}
          <div class="picker-status">{t("modelPicker.loading")}</div>
        {:else if error}
          <div class="picker-status error">{error}</div>
          <button class="picker-retry" onclick={loadModels}>{t("modelPicker.retry")}</button>
        {:else if models.length === 0}
          <div class="picker-status">{t("modelPicker.empty")}</div>
        {:else}
          <div class="model-list">
            {#each models as model (model.id)}
              <button
                class="model-item"
                class:selected={model.id === currentModel}
                onclick={() => select(model.id)}
              >
                <span class="model-id">{model.id}</span>
                {#if model.owned_by}
                  <span class="model-owner">{model.owned_by}</span>
                {/if}
                {#if model.id === currentModel}
                  <span class="material-symbols-rounded model-check" aria-hidden="true"
                    >check</span
                  >
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .picker-overlay {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--mantle) 70%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147484;
  }

  .picker {
    background: var(--base);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    border-radius: 16px;
    width: 360px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    animation: picker-in 0.15s ease-out;
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .picker-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .picker-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--subtext0);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .picker-close:hover {
    background: var(--surface0);
    color: var(--text);
  }

  .picker-close span {
    font-size: 18px;
  }

  .picker-body {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
  }

  .model-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .model-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 36px;
    flex-shrink: 0;
    padding: 4px 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    transition: background 0.15s ease;
  }

  .model-item:hover {
    background: var(--surface0);
  }

  .model-item.selected {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .model-id {
    flex: 1;
    font-family: monospace;
    font-size: 12px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-owner {
    font-size: 11px;
    color: var(--subtext0);
    flex-shrink: 0;
  }

  .model-check {
    font-size: 16px;
    color: var(--accent);
    flex-shrink: 0;
  }

  .picker-status {
    padding: 28px 16px;
    text-align: center;
    font-size: 13px;
    color: var(--subtext0);
  }

  .picker-status.error {
    color: var(--red);
  }

  .picker-retry {
    display: block;
    margin: 0 auto 12px;
    padding: 6px 18px;
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    border-radius: 8px;
    background: var(--surface0);
    color: var(--text);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .picker-retry:hover {
    background: var(--surface1);
  }
</style>
