<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { Temporal } from "@js-temporal/polyfill";
  import { untrack } from "svelte";
  import { scale } from "svelte/transition";
  import { i18n, t } from "../../i18n.svelte";
  import {
    centuryDecades,
    centuryStart,
    decadeStart,
    decadeYears,
    getWeek,
    monthGrid,
    sameDay,
    sameWeek,
  } from "./dateHelper";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { popScale } from "./popTransition";

  type ViewLevel = "day" | "month" | "year" | "century";

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
  let viewLevel = $state<ViewLevel>("day");
  let hoverDay = $state<Temporal.PlainDate | null>(null);

  const selected = $derived.by(() => {
    try {
      return Temporal.PlainDate.from(valueIso);
    } catch {
      return Temporal.Now.plainDateISO();
    }
  });

  const today = Temporal.Now.plainDateISO();

  const dayCells = $derived(monthGrid(viewMonth));

  const weekdayLabels = $derived.by(() => {
    const mon = Temporal.PlainDate.from("2026-03-16"); // known Monday
    return Array.from({ length: 7 }, (_, i) =>
      mon.add({ days: i }).toLocaleString(i18n.locale, { weekday: "narrow" }),
    );
  });

  const monthLabels = $derived.by(() => {
    const jan = Temporal.PlainDate.from(`${viewMonth.year}-01-01`);
    return Array.from({ length: 12 }, (_, i) =>
      jan.add({ months: i }).toLocaleString(i18n.locale, { month: "short" }),
    );
  });

  const yearCells = $derived(decadeYears(viewMonth.year));
  const decadeCells = $derived(centuryDecades(viewMonth.year));

  const headTitle = $derived.by(() => {
    if (viewLevel === "day") {
      return viewMonth.toLocaleString(i18n.locale, {
        month: "long",
        year: "numeric",
      });
    }
    if (viewLevel === "month") {
      return String(viewMonth.year);
    }
    if (viewLevel === "year") {
      const start = decadeStart(viewMonth.year);
      return `${start} – ${start + 9}`;
    }
    const start = centuryStart(viewMonth.year);
    return `${start} – ${start + 90}`;
  });

  const prevAria = $derived(
    viewLevel === "day"
      ? t("header.datePicker.prevMonth")
      : viewLevel === "month"
        ? t("header.datePicker.prevYear")
        : viewLevel === "year"
          ? t("header.datePicker.prevDecade")
          : t("header.datePicker.prevCentury"),
  );

  const nextAria = $derived(
    viewLevel === "day"
      ? t("header.datePicker.nextMonth")
      : viewLevel === "month"
        ? t("header.datePicker.nextYear")
        : viewLevel === "year"
          ? t("header.datePicker.nextDecade")
          : t("header.datePicker.nextCentury"),
  );

  // Reset drill only when the popover opens — not on every viewMonth write
  // (that was snapping century → day).
  $effect(() => {
    if (!open) return;
    viewLevel = "day";
    hoverDay = null;
    untrack(() => {
      viewMonth = selected.with({ day: 1 });
    });
  });

  $effect(() => {
    if (!open || !panelEl) return;
    const panel = panelEl;
    const handle: OverlayFocusHandle = attachOverlayFocus(panel, onclose);
    const narrow = window.matchMedia("(max-width: 768px)");
    function placeNarrow() {
      if (!narrow.matches) {
        panel.style.top = "";
        return;
      }
      const gap = 8;
      const bottom = trigger?.getBoundingClientRect().bottom ?? 48;
      panel.style.top = `${bottom + gap}px`;
    }
    placeNarrow();
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      if (panel.contains(e.target)) return;
      if (trigger?.contains(e.target)) return;
      onclose();
    }
    document.addEventListener("pointerdown", onPointerdown);
    narrow.addEventListener("change", placeNarrow);
    window.addEventListener("resize", placeNarrow);
    return () => {
      document.removeEventListener("pointerdown", onPointerdown);
      narrow.removeEventListener("change", placeNarrow);
      window.removeEventListener("resize", placeNarrow);
      panel.style.top = "";
      handle.release();
    };
  });

  function shift(delta: number) {
    if (viewLevel === "day") {
      viewMonth = viewMonth.add({ months: delta });
      return;
    }
    if (viewLevel === "month") {
      viewMonth = viewMonth.add({ years: delta });
      return;
    }
    if (viewLevel === "year") {
      viewMonth = viewMonth.add({ years: delta * 10 });
      return;
    }
    viewMonth = viewMonth.add({ years: delta * 100 });
  }

  function zoomOut() {
    if (viewLevel === "day") viewLevel = "month";
    else if (viewLevel === "month") viewLevel = "year";
    else if (viewLevel === "year") viewLevel = "century";
    else viewLevel = "day"; // century title → back to days
  }

  function pickDay(day: Temporal.PlainDate) {
    const chosen = weekMode ? getWeek(day)[0]! : day;
    onpick(chosen.toString());
    onclose();
  }

  function pickMonth(month: number) {
    viewMonth = viewMonth.with({ month, day: 1 });
    viewLevel = "day";
  }

  function pickYear(year: number) {
    viewMonth = viewMonth.with({ year, day: 1 });
    viewLevel = "month";
  }

  function pickDecade(decade: number) {
    viewMonth = viewMonth.with({ year: decade, day: 1 });
    viewLevel = "year";
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
        aria-label={prevAria}
        onclick={() => shift(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        class="date-picker-title zoom"
        aria-label={viewLevel === "century"
          ? t("header.datePicker.zoomToDays")
          : t("header.datePicker.zoomOut")}
        onclick={zoomOut}
      >
        {headTitle}
      </button>
      <button
        type="button"
        class="date-picker-nav"
        aria-label={nextAria}
        onclick={() => shift(1)}
      >
        ›
      </button>
    </div>

    {#if viewLevel === "day"}
      <div class="date-picker-weekdays" aria-hidden="true">
        {#each weekdayLabels as label, i (i)}
          <span>{label}</span>
        {/each}
      </div>

      <div
        class="date-picker-grid days"
        role="grid"
        tabindex="0"
        aria-label={headTitle}
        onmouseleave={() => (hoverDay = null)}
      >
        {#each dayCells as day (day.toString())}
          {@const cls = dayClasses(day)}
          <button
            type="button"
            class="date-picker-day"
            class:outside={cls.outside}
            class:today={cls.today}
            class:selected={cls.selected}
            class:hover={cls.hover}
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
            onclick={() => pickDay(day)}
          >
            {day.day}
          </button>
        {/each}
      </div>

      {#if weekMode}
        <p class="date-picker-hint">{t("header.datePicker.weekHint")}</p>
      {/if}
    {:else if viewLevel === "month"}
      <div
        class="date-picker-grid coarse"
        role="grid"
        tabindex="0"
        aria-label={headTitle}
      >
        {#each monthLabels as label, monthIndex (monthIndex)}
          {@const month = monthIndex + 1}
          <button
            type="button"
            class="date-picker-cell"
            class:selected={selected.year === viewMonth.year &&
              selected.month === month}
            class:today={today.year === viewMonth.year && today.month === month}
            aria-pressed={selected.year === viewMonth.year &&
              selected.month === month}
            onclick={() => pickMonth(month)}
          >
            {label}
          </button>
        {/each}
      </div>
    {:else if viewLevel === "year"}
      <div
        class="date-picker-grid coarse decade"
        role="grid"
        tabindex="0"
        aria-label={headTitle}
      >
        {#each yearCells as year (year)}
          <button
            type="button"
            class="date-picker-cell"
            class:selected={selected.year === year}
            class:today={today.year === year}
            aria-pressed={selected.year === year}
            onclick={() => pickYear(year)}
          >
            {year}
          </button>
        {/each}
      </div>
    {:else}
      <div
        class="date-picker-grid coarse decade"
        role="grid"
        tabindex="0"
        aria-label={headTitle}
      >
        {#each decadeCells as decade (decade)}
          <button
            type="button"
            class="date-picker-cell"
            class:selected={decadeStart(selected.year) === decade}
            class:today={decadeStart(today.year) === decade}
            aria-pressed={decadeStart(selected.year) === decade}
            onclick={() => pickDecade(decade)}
          >
            {decade}–{decade + 9}
          </button>
        {/each}
      </div>
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

  /* Narrow chrome: viewport-center so the 7-day grid never clips. */
  @media (max-width: 768px) {
    .date-picker {
      position: fixed;
      left: 50%;
      translate: -50% 0;
      transform-origin: top center;
    }
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
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    text-align: center;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    line-height: var(--hit-step);
  }

  button.date-picker-title.zoom {
    cursor: pointer;
  }

  button.date-picker-title.zoom:hover {
    background: var(--surface-hover);
  }

  button.date-picker-title.zoom:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
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
  }

  .date-picker-grid.days {
    grid-template-columns: repeat(7, 1fr);
    gap: 2px 0;
  }

  .date-picker-grid.coarse {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .date-picker-grid.coarse.decade {
    grid-template-columns: repeat(2, 1fr);
  }

  .date-picker-day,
  .date-picker-cell {
    position: relative;
    z-index: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .date-picker-day {
    height: 34px;
    font-size: 12px;
  }

  .date-picker-cell {
    min-height: 44px;
    font-size: 13px;
  }

  .date-picker-day.outside {
    color: var(--text-muted, var(--text-secondary));
    opacity: 0.55;
  }

  /* Dot marker — survives week-strip border-radius: 0 on hover/select. */
  .date-picker-day.today::after,
  .date-picker-cell.today:not(.selected)::after {
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

  .date-picker-day.hover,
  .date-picker-cell:hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .date-picker-day.selected,
  .date-picker-cell.selected {
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

  .date-picker-day:focus-visible,
  .date-picker-cell:focus-visible {
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
