<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { fetchModels, getModel, setModel } from "../../sdk/openai";
  import type { ModelInfo } from "../../sdk/types";
  import { t } from "../../i18n.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";

  let { open = false, onclose }: { open?: boolean; onclose: () => void } =
    $props();

  let models = $state<ModelInfo[]>([]);
  let loading = $state(false);
  let error = $state("");
  let currentModel = $state(getModel());
  let panelEl = $state<HTMLDivElement>();
  let focusHandle = $state<OverlayFocusHandle | null>(null);

  $effect(() => {
    if (open && models.length === 0) {
      loadModels();
    }
  });

  $effect(() => {
    if (!open || !panelEl) return;
    focusHandle = attachOverlayFocus(panelEl, onclose);
    return () => {
      focusHandle?.release();
      focusHandle = null;
    };
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

<svelte:window
  onkeydown={(e) => {
    if (open && e.key === "Escape") onclose();
  }}
/>

{#if open}
  <div class="picker-overlay" role="presentation" onclick={onclose}>
    <!-- click stop only: Escape handled on window; focus trap owns Tab -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="picker"
      role="dialog"
      aria-modal="true"
      aria-label={t("modelPicker.title")}
      tabindex="-1"
      bind:this={panelEl}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="picker-header">
        <span class="picker-title">{t("modelPicker.title")}</span>
        <button
          class="picker-close"
          aria-label={t("aria.close")}
          onclick={onclose}
        >
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="picker-body" role="status">
        {#if loading}
          <div class="picker-status">{t("modelPicker.loading")}</div>
        {:else if error}
          <div class="picker-status error">{error}</div>
          <button class="picker-retry" onclick={loadModels}
            >{t("modelPicker.retry")}</button
          >
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
                  <span
                    class="material-symbols-rounded model-check"
                    aria-hidden="true">check</span
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
    z-index: 40;
  }

  .picker {
    width: min(420px, calc(100vw - 32px));
    max-height: min(560px, calc(100vh - 48px));
    display: flex;
    flex-direction: column;
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-surface);
    box-shadow: var(--shadow-2);
    overflow: hidden;
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .picker-title {
    font-size: 16px;
    font-weight: 600;
  }

  .picker-close {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .picker-close:hover {
    background: var(--surface-hover);
  }

  .picker-close:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }

  .picker-body {
    overflow-y: auto;
    padding: 12px;
  }

  .picker-status {
    padding: 24px 12px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .picker-status.error {
    color: var(--danger-ink);
  }

  .picker-retry {
    display: block;
    margin: 0 auto 12px;
    padding: 6px 12px;
    border: none;
    border-radius: var(--radius-control);
    background: var(--surface-hover);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .model-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .model-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: var(--radius-card);
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .model-item:hover {
    background: var(--surface-hover);
  }

  .model-item.selected {
    border-color: var(--border-strong);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .model-item:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }

  .model-id {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
  }

  .model-owner {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .model-check {
    color: var(--accent-strong);
    font-size: 20px;
  }
</style>
