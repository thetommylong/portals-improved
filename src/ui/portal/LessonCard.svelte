<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import type { ScheduleEntry } from "../../types/portal";
  import { i18n, t } from "../../i18n.svelte";

  let {
    entry,
    height,
    onneed,
    onopen,
  }: {
    entry: ScheduleEntry;
    height: number;
    onneed?: (id: string, px: number) => void;
    onopen?: () => void;
  } = $props();

  const isLms = $derived(Boolean(entry.eduNextUrl));

  const statusClass = $derived.by(() => {
    switch (entry.status) {
      case "ABSENT":
        return "absent";
      case "LATE":
        return "late";
      case "STUDY_LEAVE":
        return "study-leave";
      default:
        return null;
    }
  });

  const lessonLabel = $derived.by(() => {
    const start = new Date(entry.startDateTime);
    const end = new Date(entry.endDateTime);
    const fmt = (d: Date) =>
      d.toLocaleTimeString(i18n.locale, { hour: "numeric", minute: "2-digit" });
    return t("schedule.lessonAria", {
      subject: entry.subjectName,
      start: fmt(start),
      end: fmt(end),
      teacher: entry.lecturerName,
      room: entry.roomNo,
    });
  });

  let metaEl = $state<HTMLDivElement>();
  let contentEl = $state<HTMLDivElement>();
  let mode = $state<"row" | "stack">("row");
  let compact = $state(false);

  $effect(() => {
    const el = metaEl;
    if (!el || el.clientWidth === 0) return;
    if (mode === "stack") return;
    const clipped = [
      ...el.querySelectorAll(".lesson-room, .lesson-lecturer"),
    ].some((s) => s.scrollWidth > s.clientWidth + 1);
    if (clipped) {
      mode = "stack";
    }
  });

  $effect(() => {
    const el = contentEl;
    if (!el || !onneed) return;
    void height;
    void mode;
    const raf = requestAnimationFrame(() => {
      const subj = el.querySelector(".lesson-subject");
      const natural =
        (subj?.scrollHeight ?? 0) + (metaEl?.offsetHeight ?? 0) + 20;
      if (natural > height) {
        onneed(entry.id, natural);
      }
      if (natural > height && !compact) {
        compact = true;
      }
    });
    return () => cancelAnimationFrame(raf);
  });

  function open() {
    onopen?.();
  }

  function onKeydown(e: KeyboardEvent) {
    if (isLms && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      open();
    }
  }
</script>

{#snippet LessonBody({ entry }: { entry: ScheduleEntry })}
  <span class="lesson-accent" aria-hidden="true"></span>
  <div class="lesson-content" class:compact bind:this={contentEl}>
    <p class="lesson-subject">{entry.subjectName}</p>
    <div
      class="lesson-meta"
      class:stack={mode !== "row"}
      bind:this={metaEl}
    >
      <span class="lesson-room">{entry.roomNo}</span>
      {#if mode === "row"}
        <span class="dot"></span>
      {/if}
      <span class="lesson-lecturer">{entry.lecturerName}</span>
    </div>
  </div>
{/snippet}

<button
  type="button"
  class="lesson clickable"
  class:lms={isLms}
  class:absent={statusClass === "absent"}
  class:late={statusClass === "late"}
  class:study-leave={statusClass === "study-leave"}
  aria-label={lessonLabel}
  onclick={open}
  onkeydown={onKeydown}
>
  {@render LessonBody({ entry })}
</button>

<style>
  .lesson {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 10px;
    width: 100%;
    height: 100%;
    min-height: inherit;
    border-radius: 8px;
    background: var(--base);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    overflow: hidden;
    --stripe: transparent;
    transition: background 0.15s ease;
  }

  .lesson-accent {
    flex: 0 0 6px;
    align-self: stretch;
    background: var(--stripe);
  }

  .lesson-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    word-break: normal;
  }

  .lesson-content > * {
    flex-shrink: 0;
    min-width: 0;
  }

  .lesson-content.compact .lesson-subject {
    white-space: nowrap;
  }

  .lesson.lms {
    --stripe: var(--green);
  }

  .lesson.absent {
    --stripe: var(--red);
  }

  .lesson.absent.lms .lesson-accent {
    background: linear-gradient(to bottom, var(--red), var(--green));
  }

  .lesson.late {
    --stripe: var(--blue);
  }

  .lesson.late.lms .lesson-accent {
    background: linear-gradient(to bottom, var(--blue), var(--green));
  }

  .lesson.study-leave {
    --stripe: var(--yellow);
  }

  .lesson.study-leave.lms .lesson-accent {
    background: linear-gradient(to bottom, var(--yellow), var(--green));
  }

  .lesson:hover {
    background: var(--base);
  }

  .lesson.clickable {
    cursor: pointer;
    appearance: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: inherit;
    transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }

  .lesson.clickable:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
  }

  .lesson.clickable:active {
    transform: translateY(0) scale(0.98);
  }

  .lesson.clickable:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .lesson-subject {
    font-size: 0.85rem;
    line-height: 1.25;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lesson-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 2px;
    font-size: 11px;
    font-weight: 600;
    color: var(--subtext0);
    white-space: nowrap;
    overflow: hidden;
  }

  .lesson-room,
  .lesson-lecturer {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lesson-meta.stack {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .lesson-meta.stack .lesson-room {
    order: 2;
  }

  .lesson-meta.stack .lesson-lecturer {
    order: 1;
  }

  .lesson-meta .dot {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: var(--overlay0);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .lesson-accent {
      flex-basis: 4px;
    }

    .lesson-content {
      padding: 5px 8px;
    }
  }
</style>
