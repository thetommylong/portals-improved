<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { Temporal } from "@js-temporal/polyfill";
  import { scale } from "svelte/transition";
  import { i18n, t } from "../../i18n.svelte";
  import { getWeek, monthGrid, sameDay, sameWeek } from "./dateHelper";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { popScale } from "./popTransition";

  let {
    open = false,
    valueIso,
    weekMode = false,
    trigger,
    onclose,
    onpick,
  }: {
    open?: boolean;
    valueIso: string;
    weekMode?: boolean;
    trigger?: HTMLElement;
    onclose: () => void;
    onpick: (iso: string) => void;
  } = $props();

  let panelEl = $state<HTMLDivElement>();
  let viewMonth = $state(Temporal.Now.plainDateISO().with({ day: 1 }));
  let hoverDay = $state<Temporal.PlainDate | null>(null);

  const selected = $derived.by(() => {
    try {
      return Temporal.PlainDate.from(valueIso);
    } catch {
      return Temporal.Now.plainDateISO();
    }
  });

  const today = Temporal.Now.plainDateISO();

  const cells = $derived(monthGrid(viewMonth));

  const weekdayLabels = $derived.by(() => {
    const mon = Temporal.PlainDate.from("2026-03-16"); // known Monday
    return Array.from({ length: 7 }, (_, i) =>
      mon.add({ days: i }).toLocaleString(i18n.locale, { weekday: "narrow" }),
    );
  });

  const monthTitle = $derived(
    viewMonth.toLocaleString(i18n.locale, {
      month: "long",
      year: "numeric",
    }),
  );

  $effect(() => {
    if (!open) return;
    viewMonth = selected.with({ day: 1 });
    hoverDay = null;
  });

  $effect(() => {
    if (!open || !panelEl) return;
    const handle: OverlayFocusHandle = attachOverlayFocus(panelEl, onclose);
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      if (panelEl?.contains(e.target)) return;
      if (trigger?.contains(e.target)) return;
      onclose();
    }
    document.addEventListener("pointerdown", onPointerdown);
    return () => {
      document.removeEventListener("pointerdown", onPointerdown);
      handle.release();
    };
  });

  function shiftMonth(delta: number) {
    viewMonth = viewMonth.add({ months: delta });
  }

  function pick(day: Temporal.PlainDate) {
    const chosen = weekMode ? getWeek(day)[0]! : day;
    onpick(chosen.toString());
    onclose();
  }

  function dayClasses(day: Temporal.PlainDate) {
    const inMonth = day.month === viewMonth.month;
    const isToday = sameDay(day, today);
    if (weekMode) {
      const inSelectedWeek = sameWeek(day, selected);
      const inHoverWeek = hoverDay ? sameWeek(day, hoverDay) : false;
      return {
        outside: !inMonth,
        today: isToday,
        selected: inSelectedWeek,
        hover: inHoverWeek && !inSelectedWeek,
        "week-start": day.dayOfWeek === 1,
        "week-end": day.dayOfWeek === 7,
      };
    }
    return {
      outside: !inMonth,
      today: isToday,
      selected: sameDay(day, selected),
      hover: hoverDay
        ? sameDay(day, hoverDay) && !sameDay(day, selected)
        : false,
    };
  }
</script>

{#if open}
  <div
    class="date-picker"
    class:week-mode={weekMode}
    bind:this={panelEl}
    role="dialog"
    aria-modal="true"
    aria-label={t("header.aria.pickDate")}
    tabindex="-1"
    transition:scale={popScale()}
  >
    <div class="date-picker-head">
      <button
        type="button"
        class="date-picker-nav"
        aria-label={t("header.datePicker.prevMonth")}
        onclick={() => shiftMonth(-1)}
      >
        ‹
      </button>
      <span class="date-picker-title">{monthTitle}</span>
      <button
        type="button"
        class="date-picker-nav"
        aria-label={t("header.datePicker.nextMonth")}
        onclick={() => shiftMonth(1)}
      >
        ›
      </button>
    </div>

    <div class="date-picker-weekdays" aria-hidden="true">
      {#each weekdayLabels as label, i (i)}
        <span>{label}</span>
      {/each}
    </div>

    <div
      class="date-picker-grid"
      role="grid"
      tabindex="0"
      aria-label={monthTitle}
      onmouseleave={() => (hoverDay = null)}
    >
      {#each cells as day (day.toString())}
        <button
          type="button"
          class="date-picker-day"
          class:outside={dayClasses(day).outside}
          class:today={dayClasses(day).today}
          class:selected={dayClasses(day).selected}
          class:hover={dayClasses(day).hover}
          class:week-start={weekMode && day.dayOfWeek === 1}
          class:week-end={weekMode && day.dayOfWeek === 7}
          aria-label={day.toLocaleString(i18n.locale, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          aria-current={sameDay(day, today) ? "date" : undefined}
          aria-pressed={weekMode
            ? sameWeek(day, selected)
            : sameDay(day, selected)}
          onmouseenter={() => (hoverDay = day)}
          onclick={() => pick(day)}
        >
          {day.day}
        </button>
      {/each}
    </div>

    {#if weekMode}
      <p class="date-picker-hint">{t("header.datePicker.weekHint")}</p>
    {/if}
  </div>
{/if}

<style>
  .date-picker {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 30;
    width: min(292px, calc(100vw - 24px));
    padding: 12px;
    border-radius: 12px;
    background: var(--base);
    border: 1px solid var(--border-strong);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    transform-origin: top left;
    color: var(--text);
    font-family: "Google Sans Flex", system-ui, sans-serif;
  }

  .date-picker:focus-visible {
    outline: none;
  }

  .date-picker-head {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 10px;
  }

  .date-picker-title {
    flex: 1;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
  }

  .date-picker-nav {
    display: inline-grid;
    place-items: center;
    width: var(--hit-step);
    height: var(--hit-step);
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
  }

  .date-picker-nav:hover {
    background: var(--surface-hover);
  }

  .date-picker-nav:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .date-picker-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 4px;
  }

  .date-picker-weekdays span {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    line-height: 24px;
  }

  .date-picker-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px 0;
  }

  .date-picker-day {
    position: relative;
    z-index: 0;
    height: 34px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .date-picker-day.outside {
    color: var(--text-muted, var(--text-secondary));
    opacity: 0.55;
  }

  /* Dot marker — survives week-strip border-radius: 0 on hover/select. */
  .date-picker-day.today::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 4px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent-strong);
    translate: -50% 0;
  }

  .date-picker-day.today.selected::after {
    background: var(--base);
  }

  .date-picker-day.hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .date-picker-day.selected {
    background: var(--accent-strong);
    color: var(--base);
  }

  .date-picker.week-mode .date-picker-day.selected,
  .date-picker.week-mode .date-picker-day.hover {
    border-radius: 0;
  }

  .date-picker.week-mode .date-picker-day.selected.week-start,
  .date-picker.week-mode .date-picker-day.hover.week-start {
    border-radius: 8px 0 0 8px;
  }

  .date-picker.week-mode .date-picker-day.selected.week-end,
  .date-picker.week-mode .date-picker-day.hover.week-end {
    border-radius: 0 8px 8px 0;
  }

  .date-picker-day:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
    z-index: 1;
  }

  .date-picker-hint {
    margin: 10px 0 0;
    font-size: 11px;
    line-height: 1.35;
    color: var(--text-secondary);
  }
</style>
