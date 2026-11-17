<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { prefersReducedMotion } from "svelte/motion";
  import type { MessageKey } from "../../i18n.svelte";
  import { t } from "../../i18n.svelte";
  import type { AdapterFeatures } from "../../sdk/adapter";

  export type TourStepId = "home" | "marks" | "header" | "chat" | "outro";

  interface TourStep {
    id: TourStepId;
    titleKey: MessageKey;
    bodyKey: MessageKey;
  }

  let {
    open = false,
    features,
    onDone,
  }: {
    open?: boolean;
    features: AdapterFeatures;
    onDone: () => void;
  } = $props();

  const ALL_STEPS: TourStep[] = [
    {
      id: "home",
      titleKey: "onboarding.tourHomeTitle",
      bodyKey: "onboarding.tourHome",
    },
    {
      id: "marks",
      titleKey: "onboarding.tourMarksTitle",
      bodyKey: "onboarding.tourMarks",
    },
    {
      id: "header",
      titleKey: "onboarding.tourHeaderTitle",
      bodyKey: "onboarding.tourHeader",
    },
    {
      id: "chat",
      titleKey: "onboarding.tourChatTitle",
      bodyKey: "onboarding.tourChat",
    },
    {
      id: "outro",
      titleKey: "onboarding.tourOutroTitle",
      bodyKey: "onboarding.tourOutro",
    },
  ];

  const steps = $derived(
    ALL_STEPS.filter((s) => {
      if (s.id === "marks") return features.marks;
      if (s.id === "chat") return features.session;
      return true;
    }),
  );

  let index = $state(0);
  let hole = $state({ top: 0, left: 0, width: 0, height: 0 });

  const step = $derived(steps[index] ?? null);
  const isLast = $derived(index >= steps.length - 1);
  const centered = $derived(step?.id === "outro");

  function cardMotion() {
    if (prefersReducedMotion.current) return { duration: 0 };
    return { y: 10, duration: 160, easing: cubicOut };
  }

  function measure() {
    const id = step?.id;
    if (!id || id === "outro") {
      hole = { top: 0, left: 0, width: 0, height: 0 };
      return;
    }
    const nodes = document.querySelectorAll<HTMLElement>(
      `[data-onboarding="${id}"]`,
    );
    let el: HTMLElement | null = null;
    for (const node of nodes) {
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        el = node;
        break;
      }
    }
    if (!el) {
      hole = { top: 0, left: 0, width: 0, height: 0 };
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 6;
    hole = {
      top: Math.max(0, r.top - pad),
      left: Math.max(0, r.left - pad),
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
  }

  $effect(() => {
    if (!open) {
      index = 0;
      return;
    }
    if (steps.length === 0) {
      onDone();
      return;
    }
    void step;
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  function next() {
    if (isLast || steps.length === 0) {
      onDone();
      return;
    }
    index += 1;
  }

  const cardWidth = 280;
  const cardTop = $derived(
    centered
      ? Math.max(24, (window.innerHeight - 160) / 2)
      : Math.min(hole.top + hole.height + 12, window.innerHeight - 160),
  );
  const cardLeft = $derived(
    centered
      ? Math.max(12, (window.innerWidth - cardWidth) / 2)
      : Math.min(Math.max(12, hole.left), window.innerWidth - 292),
  );
</script>

{#if open && step}
  <div
    class="tour-layer"
    role="dialog"
    aria-modal="true"
    aria-label={t("onboarding.ariaTour")}
  >
    {#if hole.width > 0}
      <div
        class="tour-hole"
        style="top: {hole.top}px; left: {hole.left}px; width: {hole.width}px; height: {hole.height}px"
        aria-hidden="true"
      ></div>
    {:else}
      <div class="tour-dim" aria-hidden="true"></div>
    {/if}
    {#key index}
      <div
        class="tour-card"
        style="top: {cardTop}px; left: {cardLeft}px"
        in:fly={cardMotion()}
      >
        <div class="tour-meta">
          <p class="tour-title">{t(step.titleKey)}</p>
          <p class="tour-progress" aria-hidden="true">
            {t("onboarding.tourProgress", {
              current: String(index + 1),
              total: String(steps.length),
            })}
          </p>
        </div>
        <p class="tour-body">{t(step.bodyKey)}</p>
        <div class="tour-dots" aria-hidden="true">
          {#each steps as _, i (i)}
            <span class="tour-dot" class:active={i === index}></span>
          {/each}
        </div>
        <div class="tour-actions">
          {#if !isLast}
            <button type="button" class="tour-btn" onclick={onDone}>
              {t("onboarding.tourSkip")}
            </button>
          {/if}
          <button type="button" class="tour-btn primary" onclick={next}>
            {isLast ? t("onboarding.tourDone") : t("onboarding.tourNext")}
          </button>
        </div>
      </div>
    {/key}
  </div>
{/if}

<style>
  .tour-layer {
    position: fixed;
    inset: 0;
    z-index: 45;
    pointer-events: none;
  }

  .tour-dim {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--mantle) 55%, transparent);
    pointer-events: auto;
  }

  .tour-hole {
    position: fixed;
    border-radius: var(--radius-control);
    box-shadow:
      0 0 0 9999px color-mix(in srgb, var(--mantle) 58%, transparent),
      0 0 0 2px var(--accent),
      0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
    background: transparent;
    pointer-events: none;
    z-index: 1;
    animation: tour-pulse 1.6s ease-in-out infinite;
  }

  @keyframes tour-pulse {
    0%,
    100% {
      box-shadow:
        0 0 0 9999px color-mix(in srgb, var(--mantle) 58%, transparent),
        0 0 0 2px var(--accent),
        0 0 12px color-mix(in srgb, var(--accent) 30%, transparent);
    }
    50% {
      box-shadow:
        0 0 0 9999px color-mix(in srgb, var(--mantle) 58%, transparent),
        0 0 0 3px var(--accent-strong),
        0 0 22px color-mix(in srgb, var(--accent) 55%, transparent);
    }
  }

  .tour-card {
    position: fixed;
    z-index: 2;
    width: min(280px, calc(100vw - 24px));
    pointer-events: auto;
    background: var(--base);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-card);
    padding: 12px 14px 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  }

  .tour-meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 6px;
  }

  .tour-title {
    margin: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  .tour-progress {
    margin: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
  }

  .tour-body {
    margin: 0 0 10px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
  }

  .tour-dots {
    display: flex;
    gap: 5px;
    margin: 0 0 12px;
  }

  .tour-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border-strong);
  }

  .tour-dot.active {
    background: var(--accent);
    transform: scale(1.15);
  }

  .tour-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .tour-btn {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    min-height: var(--hit-control, 32px);
    padding: 6px 12px;
    border-radius: var(--radius-control);
    border: 1px solid var(--border-strong);
    background: var(--surface-base);
    color: var(--text);
    cursor: pointer;
  }

  .tour-btn.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--base);
  }

  .tour-btn:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    .tour-hole {
      animation: none;
    }

    .tour-dot.active {
      transform: none;
    }
  }
</style>
