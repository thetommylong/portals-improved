<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { Temporal } from "@js-temporal/polyfill";
  import type { ScheduleEntry } from "../../types/portal";
  import { runtime } from "../../adapters/runtime.svelte";

  let {
    entry,
    checking,
    onclose,
  }: {
    entry: ScheduleEntry;
    checking: boolean;
    onclose: () => void;
  } = $props();

  const dateLabel = $derived.by(() => {
    const d = Temporal.PlainDateTime.from(entry.startDateTime);
    const e = Temporal.PlainDateTime.from(entry.endDateTime);
    const day = d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${day} · ${pad(d.hour)}:${pad(d.minute)}–${pad(e.hour)}:${pad(e.minute)}`;
  });

  const attendanceBadge = $derived.by(() => {
    const end = Temporal.PlainDateTime.from(entry.endDateTime);
    const now = Temporal.Now.plainDateTimeISO();
    if (Temporal.PlainDateTime.compare(end, now) > 0) return null;
    switch (entry.status) {
      case "PRESENT":
        return { label: "Present", cls: "present" };
      case "LATE":
        return { label: "Late", cls: "late" };
      case "ABSENT":
        return { label: "Absent", cls: "absent" };
      case "STUDY_LEAVE":
        return { label: "Excused", cls: "study-leave" };
    }
  });

  let dialogEl = $state<HTMLDivElement>();

  $effect(() => {
    dialogEl?.focus();
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onclose();
    }
  }

  async function onSsoClick(e: MouseEvent) {
    if (!entry.eduNextUrl) return;
    e.preventDefault();
    try {
      const url = await runtime.adapter.buildSsoUrl(entry.eduNextUrl);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(entry.eduNextUrl, "_blank", "noopener,noreferrer");
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="popup-backdrop"
  role="presentation"
  onclick={onclose}
  onkeydown={(e) => { if (e.key === "Escape") onclose(); }}
>
  <div
    class="popup"
    role="dialog"
    aria-modal="false"
    aria-label={entry.subjectName}
    tabindex="-1"
    bind:this={dialogEl}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="popup-header">
      <div class="popup-title">
        <p class="popup-subject">{entry.subjectName}</p>
        <p class="popup-meta">{entry.roomNo} · {entry.lecturerName}</p>
      </div>
      <div class="popup-when">
        <button
          type="button"
          class="popup-close"
          aria-label="Close"
          onclick={onclose}
        >
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
        <p class="popup-date">{dateLabel}</p>
      </div>
    </div>

    <div class="popup-body">
      {#if entry.schedulePlanContent}
        <section>
          <h3>Plan</h3>
          <p>{entry.schedulePlanContent}</p>
        </section>
      {/if}

      <section>
        <h3>
          Teacher's comment
          {#if checking}<span class="popup-checking">checking…</span>{/if}
        </h3>
        <p class:empty={!entry.comment}>
          {entry.comment ?? "—"}
        </p>
      </section>

      {#if entry.proctorComment}
        <section>
          <h3>Proctor</h3>
          <p>{entry.proctorComment}</p>
        </section>
      {/if}

      <section>
        <h3>
          Absence request
          {#if checking}<span class="popup-checking">checking…</span>{/if}
        </h3>
        <p class:empty={!entry.hasAbsenceRequest}>
          {entry.hasAbsenceRequest
            ? (entry.absenceRequestReason ?? "Requested")
            : "None"}
        </p>
      </section>

      <div class="popup-footer">
        <span class="popup-class">
          {entry.className}
          {#if attendanceBadge}
            <span class="dot"></span>
            <span class="att-badge att-{attendanceBadge.cls}">{attendanceBadge.label}</span>
          {/if}
        </span>
        {#if entry.eduNextUrl}
          <a
            class="popup-link"
            href={entry.eduNextUrl}
            target="_blank"
            rel="noopener noreferrer"
            onclick={onSsoClick}
          >
            Open in LMS
          </a>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .popup-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: color-mix(in srgb, var(--mantle) 70%, transparent);
    animation: backdrop-in 0.2s ease-out both;
  }

  .popup {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 640px;
    max-width: 100%;
    max-height: 100%;
    overflow: auto;
    padding: 36px;
    border-radius: 16px;
    background: var(--base);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    animation: popup-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .popup-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.5fr);
    gap: 8px;
  }

  .popup-title {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .popup-subject {
    font-size: 16px;
    color: var(--text);
    word-break: normal;
    overflow-wrap: break-word;
  }

  .popup-meta {
    font-size: 12px;
    color: var(--subtext0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .popup-when {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 0;
  }

  .popup-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 2px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s ease, background 0.15s ease;
  }

  .popup-close:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--text) 16%, transparent);
  }

  .popup-date {
    font-size: 12px;
    color: var(--subtext0);
    white-space: nowrap;
  }

  .popup-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 240px;
  }

  .popup-body section h3 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 3px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--overlay0);
  }

  .popup-body section p {
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
    word-break: normal;
    overflow-wrap: break-word;
  }

  .popup-body section p.empty {
    color: var(--overlay0);
  }

  .popup-checking {
    font-size: 10px;
    font-weight: 400;
    letter-spacing: normal;
    text-transform: none;
    color: var(--overlay0);
  }

  .popup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
    padding-top: 6px;
  }

  .popup-class .dot {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: var(--overlay0);
    flex-shrink: 0;
  }

  .popup-class {
    font-size: 12px;
    color: var(--subtext0);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .att-badge {
    font-size: 11px;
    font-weight: 700;
    border-radius: 999px;
    padding: 2px 8px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .att-badge.present {
    color: var(--green);
    background: color-mix(in srgb, var(--green) 12%, transparent);
  }

  .att-badge.late {
    color: var(--yellow);
    background: color-mix(in srgb, var(--yellow) 12%, transparent);
  }

  .att-badge.absent {
    color: var(--red);
    background: color-mix(in srgb, var(--red) 12%, transparent);
  }

  .att-badge.study-leave {
    color: var(--green);
    background: color-mix(in srgb, var(--green) 12%, transparent);
  }

  .popup-link {
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    text-decoration: none;
  }

  .popup-link:hover {
    text-decoration: underline;
  }

  @media (prefers-reduced-motion: reduce) {
    .popup {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .popup-backdrop {
      padding: 12px;
    }

    .popup {
      padding: 20px;
      border-radius: 12px;
    }
  }
</style>
