<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { fade, scale } from "svelte/transition";
  import type { MessageKey } from "../../i18n.svelte";
  import { t } from "../../i18n.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { backdropFade, modalScale } from "./popTransition";

  const FEATURES: { name: MessageKey; hint: MessageKey }[] = [
    { name: "onboarding.featWeek", hint: "onboarding.featWeekHint" },
    { name: "onboarding.featWork", hint: "onboarding.featWorkHint" },
    { name: "onboarding.featMarks", hint: "onboarding.featMarksHint" },
    { name: "onboarding.featCampus", hint: "onboarding.featCampusHint" },
    { name: "onboarding.featLook", hint: "onboarding.featLookHint" },
    { name: "onboarding.featChat", hint: "onboarding.featChatHint" },
  ];

  let {
    open = false,
    onDismiss,
    onStartTour,
  }: {
    open?: boolean;
    onDismiss: () => void;
    onStartTour: () => void;
  } = $props();

  let panel: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!open || !panel) return;
    const handle: OverlayFocusHandle = attachOverlayFocus(panel, onDismiss);
    return () => handle.release();
  });
</script>

{#if open}
  <div class="ob-layer" role="presentation">
    <button
      type="button"
      class="ob-scrim"
      aria-label={t("aria.close")}
      onclick={onDismiss}
      transition:fade={backdropFade()}
    ></button>
    <div
      class="ob-panel"
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ob-title"
      tabindex="-1"
      transition:scale={modalScale()}
    >
      <h2 id="ob-title" class="ob-title">{t("onboarding.ariaDialog")}</h2>
      <p class="ob-pitch">{t("onboarding.pitch")}</p>
      <ul class="ob-features">
        {#each FEATURES as feat (feat.name)}
          <li>
            <span class="ob-feat-name">{t(feat.name)}:</span>
            {t(feat.hint)}
          </li>
        {/each}
      </ul>
      <div class="ob-actions">
        <button type="button" class="ob-btn primary" onclick={onDismiss}>
          {t("onboarding.gotIt")}
        </button>
        <button type="button" class="ob-btn" onclick={onStartTour}>
          {t("onboarding.showAround")}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ob-layer {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: 16px;
  }

  .ob-scrim {
    position: absolute;
    inset: 0;
    margin: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, var(--mantle) 55%, transparent);
    cursor: pointer;
  }

  .ob-panel {
    position: relative;
    z-index: 1;
    width: min(400px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    background: var(--base);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-card);
    padding: 20px 18px 16px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  }

  .ob-title {
    margin: 0 0 8px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.25;
    color: var(--text);
  }

  .ob-pitch {
    margin: 0 0 12px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .ob-features {
    margin: 0 0 18px;
    padding: 0 0 0 1.2em;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .ob-features li + li {
    margin-top: 6px;
  }

  .ob-feat-name {
    font-weight: 650;
    color: var(--text);
  }

  .ob-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ob-btn {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    min-height: var(--hit-control, 32px);
    padding: 8px 14px;
    border-radius: var(--radius-control);
    border: 1px solid var(--border-strong);
    background: var(--surface-base);
    color: var(--text);
    cursor: pointer;
  }

  .ob-btn:hover {
    background: var(--surface1);
  }

  .ob-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .ob-btn.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--base);
  }

  .ob-btn.primary:hover {
    filter: brightness(1.05);
  }
</style>
