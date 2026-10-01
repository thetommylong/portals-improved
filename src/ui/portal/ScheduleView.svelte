<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { Temporal } from "@js-temporal/polyfill";
  import { runtime } from "../../adapters/runtime.svelte";
  import type { ScheduleEntry } from "../../types/portal";
  import { readWeek, writeWeek } from "../../scheduleCache";
  import { notify } from "../../notifications";
  import { getWeek } from "./dateHelper";
  import LessonCard from "./LessonCard.svelte";
  import LessonPopup from "./LessonPopup.svelte";

  let {
    studentId,
    dateLabel = $bindable(""),
  }: {
    studentId: string;
    dateLabel?: string;
  } = $props();

  const HOUR_PX = 96;
  const DEFAULT_START_HOUR = 7;
  const DEFAULT_END_HOUR = 19;
  const DAY_HEADER_H = 36;

  let selectedDate = $state(Temporal.Now.plainDateISO());
  let entries = $state<ScheduleEntry[]>([]);
  let loading = $state(false);
  let nowMinutes = $state(minutesNow());
  let scroller: HTMLDivElement | undefined = $state();
  let lastAutoScrollKey = "";

  const cache = new Map<string, ScheduleEntry[]>();

  const mq = window.matchMedia("(min-width: 1024px)");
  let isDesktop = $state(mq.matches);

  function minutesNow(): number {
    const now = Temporal.Now.plainTimeISO();
    return now.hour * 60 + now.minute;
  }

  async function load(date: Temporal.PlainDate, force = false): Promise<void> {
    const [monday] = getWeek(date);
    const key = monday.toString();

    if (!force) {
      const cached = cache.get(key);
      if (cached) {
        entries = cached;
        return;
      }
      const stored = readWeek(studentId, key);
      if (stored) {
        cache.set(key, stored.entries);
        entries = stored.entries;
        // fall through: revalidate in background
      }
    }

    if (!cache.has(key)) {
      loading = true;
    }
    try {
      const sunday = monday.add({ days: 6 });
      const data = await runtime.adapter.getCalendarByStudentAndDateRange(
        studentId,
        monday.toString(),
        sunday.toString(),
      );
      cache.set(key, data);
      writeWeek(studentId, key, data);
      if (getWeek(selectedDate)[0].toString() === key) {
        entries = data;
      }
    } catch {
      if (!cache.has(key)) {
        notify("Failed to load timetable", "error");
      } else {
        notify("Offline — showing saved timetable", "info");
      }
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load(selectedDate);
  });

  $effect(() => {
    const onChange = () => {
      isDesktop = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  });

  $effect(() => {
    const timer = setInterval(() => {
      nowMinutes = minutesNow();
    }, 30_000);
    return () => clearInterval(timer);
  });

  let selectedEntry = $state<ScheduleEntry | null>(null);
  let checkingId = $state<string | null>(null);
  let lastTrigger = $state<HTMLElement>();

  async function checkEntry(id: string): Promise<void> {
    const [monday] = getWeek(selectedDate);
    checkingId = id;
    try {
      const sunday = monday.add({ days: 6 });
      const data = await runtime.adapter.getCalendarByStudentAndDateRange(
        studentId,
        monday.toString(),
        sunday.toString(),
      );
      cache.set(monday.toString(), data);
      writeWeek(studentId, monday.toString(), data);
      entries = data;
      selectedEntry = data.find((e) => e.id === id) ?? selectedEntry;
    } catch {
      // aggressive cache: keep what we have
    } finally {
      checkingId = null;
    }
  }

  function openEntry(entry: ScheduleEntry) {
    lastTrigger = document.activeElement as HTMLElement;
    selectedEntry = entry;
    void checkEntry(entry.id);
  }

  function closeEntry() {
    selectedEntry = null;
    requestAnimationFrame(() => lastTrigger?.focus());
  }

  const range = $derived.by(() => {
    let startMin = DEFAULT_START_HOUR * 60;
    let endMin = DEFAULT_END_HOUR * 60;
    for (const e of entries) {
      const s = Temporal.PlainDateTime.from(e.startDateTime);
      const en = Temporal.PlainDateTime.from(e.endDateTime);
      startMin = Math.min(startMin, s.hour * 60);
      endMin = Math.max(endMin, en.hour * 60 + en.minute);
    }
    return {
      startMin,
      endMin: Math.max(endMin, startMin + 60),
    };
  });

  const gridHeight = $derived(
    ((range.endMin - range.startMin) / 60) * HOUR_PX,
  );

  const hours = $derived.by(() => {
    const list: number[] = [];
    for (let m = range.startMin; m < range.endMin; m += 60) {
      list.push(m / 60);
    }
    return list;
  });

  const weekDays = $derived.by(() => {
    const [monday] = getWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => monday.add({ days: i }));
  });

  const dayEntries = $derived(
    entries.filter((e) => e.date.slice(0, 10) === selectedDate.toString()),
  );

  const dayList = $derived(sortedEntries(dayEntries));

  function entriesFor(date: Temporal.PlainDate): ScheduleEntry[] {
    return entries.filter((e) => e.date.slice(0, 10) === date.toString());
  }

  const todayIso = Temporal.Now.plainDateISO().toString();

  const isToday = $derived(selectedDate.toString() === todayIso);

  const computedLabel = $derived(
    isDesktop
      ? (() => {
          const mon = weekDays[0];
          const sun = weekDays[6];
          const fmt = (d: Temporal.PlainDate) =>
            d.toLocaleString("en-US", { month: "short", day: "numeric" });
          return `${fmt(mon)} – ${fmt(sun)}`;
        })()
      : selectedDate.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
  );

  $effect(() => {
    dateLabel = computedLabel;
  });

  export function goTo(delta: number) {
    selectedDate = selectedDate.add({
      days: isDesktop ? delta * 7 : delta,
    });
  }

  export function goToday() {
    selectedDate = Temporal.Now.plainDateISO();
  }

  export function refresh() {
    void load(selectedDate, true);
  }

  function eventTop(entry: ScheduleEntry): number {
    const s = Temporal.PlainDateTime.from(entry.startDateTime);
    return ((s.hour * 60 + s.minute - range.startMin) / 60) * HOUR_PX;
  }

  function eventHeight(entry: ScheduleEntry): number {
    const s = Temporal.PlainDateTime.from(entry.startDateTime);
    const e = Temporal.PlainDateTime.from(entry.endDateTime);
    const duration =
      e.hour * 60 + e.minute - (s.hour * 60 + s.minute);
    return Math.max((duration / 60) * HOUR_PX, 56);
  }

  let heightOverrides = $state(new Map<string, number>());

  const EVENT_GAP = 4;

  function sortedEntries(list: ScheduleEntry[]): ScheduleEntry[] {
    return [...list].sort((a, b) => eventTop(a) - eventTop(b));
  }

  function maxGrowth(list: ScheduleEntry[], i: number): number {
    const top = eventTop(list[i]);
    const nextTop =
      i + 1 < list.length ? eventTop(list[i + 1]) : gridHeight;
    return Math.max(nextTop - EVENT_GAP, top) - top;
  }

  function effectiveHeight(
    list: ScheduleEntry[],
    i: number,
  ): number {
    const base = eventHeight(list[i]);
    const need = heightOverrides.get(list[i].id);
    if (!need || need <= base) return base;
    return Math.min(need, maxGrowth(list, i));
  }

  function handleNeed(id: string, px: number) {
    if ((heightOverrides.get(id) ?? 0) >= px) return;
    const next = new Map(heightOverrides);
    next.set(id, px);
    heightOverrides = next;
  }

  function formatHour(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  function dayHeaderLabel(date: Temporal.PlainDate): string {
    return date.toLocaleString("en-US", { weekday: "short" });
  }

  $effect(() => {
    if (!scroller) return;
    const key = `${selectedDate.toString()}:${range.startMin}:${range.endMin}`;
    if (key === lastAutoScrollKey) return;
    lastAutoScrollKey = key;
    const anchor =
      selectedDate.toString() === todayIso ? nowMinutes : range.startMin + 60;
    const target =
      ((anchor - range.startMin) / 60) * HOUR_PX - HOUR_PX * 1.5;
    scroller.scrollTop = Math.max(0, target);
  });
</script>

<div class="schedule" class:schedule-loading={loading && entries.length === 0}>
  <div class="schedule-body" bind:this={scroller}>
    {#if isDesktop}
      <div class="schedule-inner" style="height: {gridHeight + DAY_HEADER_H}px">
        <div class="time-gutter" style="padding-top: {DAY_HEADER_H}px">
          {#each hours as hour (hour)}
            <span
              class="time-label"
              aria-hidden="true"
              style="top: {DAY_HEADER_H + ((hour * 60 - range.startMin) / 60) * HOUR_PX}px"
            >
              {formatHour(hour)}
            </span>
          {/each}
        </div>

        <div class="week-main">
          <div class="day-headers">
            {#each weekDays as day (day.toString())}
              <div
                class="day-header"
                aria-hidden="true"
                class:today={day.toString() === todayIso}
              >
                <span class="day-header-name">{dayHeaderLabel(day)}</span>
                <span class="day-header-num">{day.day}</span>
              </div>
            {/each}
          </div>

          <div
            class="day-grid week-grid"
            style="height: {gridHeight}px; grid-template-columns: repeat(7, 1fr)"
          >
            {#each weekDays as day (day.toString())}
              {@const list = sortedEntries(entriesFor(day))}
              <div class="day-column">
                <div class="events">
                  {#each list as entry, i (entry.id)}
                    <div
                      class="event"
                      style="top: {eventTop(entry)}px; height: {effectiveHeight(list, i)}px"
                    >
                      <LessonCard
                        {entry}
                        height={effectiveHeight(list, i)}
                        onneed={handleNeed}
                        onopen={() => openEntry(entry)}
                      />
                    </div>
                  {/each}
                </div>

                {#if day.toString() === todayIso && nowMinutes >= range.startMin && nowMinutes <= range.endMin}
                  <div
                    class="now-line"
                    aria-hidden="true"
                    style="top: {((nowMinutes - range.startMin) / 60) * HOUR_PX}px"
                  >
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="schedule-inner" style="height: {gridHeight}px">
        <div class="time-gutter">
          {#each hours as hour (hour)}
            <span
              class="time-label"
              aria-hidden="true"
              style="top: {((hour * 60 - range.startMin) / 60) * HOUR_PX}px"
            >
              {formatHour(hour)}
            </span>
          {/each}
        </div>

        <div class="day-grid">
          <div class="events">
            {#each dayList as entry, i (entry.id)}
              <div
                class="event"
                style="top: {eventTop(entry)}px; height: {effectiveHeight(dayList, i)}px"
              >
                <LessonCard
                  {entry}
                  height={effectiveHeight(dayList, i)}
                  onneed={handleNeed}
                  onopen={() => openEntry(entry)}
                />
              </div>
            {/each}
          </div>
          {#if isToday && nowMinutes >= range.startMin && nowMinutes <= range.endMin}
            <div
              class="now-line"
              aria-hidden="true"
              style="top: {((nowMinutes - range.startMin) / 60) * HOUR_PX}px"
            >
            </div>
          {/if}

          {#if !loading && dayEntries.length === 0}
            <div class="schedule-empty">No classes this day</div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

{#if selectedEntry}
  <LessonPopup
    entry={selectedEntry}
    checking={checkingId === selectedEntry.id}
    onclose={closeEntry}
  />
{/if}

<style>
  .schedule {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .schedule-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-top: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    position: relative;
  }

  .schedule-inner {
    position: relative;
    display: flex;
    min-height: 100%;
  }

  .time-gutter {
    position: relative;
    width: 64px;
    flex-shrink: 0;
  }

  .time-label {
    position: absolute;
    right: 10px;
    transform: translateY(-50%);
    font-size: 10px;
    color: var(--subtext0);
    user-select: none;
  }

  .day-grid {
    position: relative;
    flex: 1;
    border-left: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    background-image:
      linear-gradient(color-mix(in srgb, var(--text) 16%, transparent) 1px, transparent 1px),
      linear-gradient(color-mix(in srgb, var(--text) 8%, transparent) 1px, transparent 1px);
    background-size:
      100% 96px,
      100% 48px;
  }

  .week-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .day-headers {
    position: sticky;
    top: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    height: 36px;
    background: var(--mantle);
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .day-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 11px;
    color: var(--subtext0);
    user-select: none;
  }

  .day-header.today {
    color: var(--accent);
    font-weight: 600;
  }

  .week-grid {
    display: grid;
  }

  .day-column {
    position: relative;
    min-width: 0;
    border-left: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .events {
    position: absolute;
    inset: 0;
    padding: 2px 0;
  }

  .event {
    position: absolute;
    left: 8px;
    right: 16px;
    min-height: 56px;
    box-sizing: border-box;
    padding-bottom: 4px;
  }

  .now-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--red);
    z-index: 5;
    pointer-events: none;
  }

  .now-line::before {
    content: "";
    position: absolute;
    left: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
  }

  .schedule-empty {
    position: absolute;
    inset: 96px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--overlay0);
    font-size: 13px;
    user-select: none;
  }

  .schedule-loading {
    opacity: 0.5;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .time-gutter {
      width: 44px;
    }

    .time-label {
      right: 6px;
      font-size: 9px;
    }

    .event {
      left: 6px;
      right: 6px;
    }
  }
</style>
