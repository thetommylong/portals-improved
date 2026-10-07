<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import type { StudentHomeWork } from "../../types/portal";
  import { notify } from "../../notifications";
  import { i18n, t } from "../../i18n.svelte";

  let { studentId }: { studentId: string } = $props();

  let items = $state<StudentHomeWork[]>([]);
  let loading = $state(false);

  const byDue = (a: StudentHomeWork, b: StudentHomeWork) =>
    a.expiredDateTime.localeCompare(b.expiredDateTime) ||
    a.subjectName.localeCompare(b.subjectName);

  const pending = $derived(items.filter((i) => !i.isDone).sort(byDue));
  const done = $derived(
    items
      .filter((i) => i.isDone)
      .sort(
        (a, b) =>
          b.completedAt.localeCompare(a.completedAt) ||
          a.subjectName.localeCompare(b.subjectName),
      ),
  );

  function isOverdue(hw: StudentHomeWork): boolean {
    return !hw.isDone && hw.expiredDateTime !== "" && new Date(hw.expiredDateTime).getTime() < Date.now();
  }

  function fmtDate(iso: string): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(i18n.locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  async function load(): Promise<void> {
    loading = true;
    try {
      const ctx = await runtime.adapter.getStudentContext();
      const term = await runtime.adapter.getDefaultTerm(ctx.campusId);
      items = await runtime.adapter.getStudentHomeWorks(studentId, term.termId);
    } catch {
      notify(t("toast.homeworksFailed"), "error");
    } finally {
      loading = false;
    }
  }

  export function refresh(): void {
    void load();
  }
</script>

<div class="homeworks">
  <div class="feedback-body">
    {#if loading}
      <p class="feedback-empty" role="status">{t("status.loading")}</p>
    {:else if items.length === 0}
      <p class="feedback-empty">{t("homeworks.empty")}</p>
    {:else}
      {#if pending.length > 0}
        <h2 class="feedback-group-title" id="hw-pending">{t("homeworks.groupPending", { n: pending.length })}</h2>
        <ul class="feedback-list" aria-labelledby="hw-pending">
          {#each pending as hw (hw.homeWorkStudentId)}
            {@render card(hw)}
          {/each}
        </ul>
      {/if}
      {#if done.length > 0}
        <h2 class="feedback-group-title" id="hw-done">{t("homeworks.groupDone", { n: done.length })}</h2>
        <ul class="feedback-list" aria-labelledby="hw-done">
          {#each done as hw (hw.homeWorkStudentId)}
            {@render card(hw)}
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</div>

{#snippet card(hw: StudentHomeWork)}
  <li class="fb-card" class:fb-card-muted={hw.isDone}>
    <header class="fb-card-head">
      <div class="fb-card-titlewrap">
        <h3 class="fb-card-title">{hw.homeworkTitle}</h3>
        <p class="fb-card-sub">{hw.subjectName} · {hw.className}</p>
      </div>
      {#if hw.isDone}
        <span class="fb-badge fb-badge-done">{t("homeworks.badgeDone")}</span>
      {:else if isOverdue(hw)}
        <span class="fb-badge fb-badge-overdue">{t("homeworks.badgeOverdue")}</span>
      {:else}
        <span class="fb-badge fb-badge-pending">{t("homeworks.badgePending")}</span>
      {/if}
    </header>
    <section class="mark-section">
      <span class="mark-label">{t("label.deadline")}</span>
      <span class="fb-text">{fmtDate(hw.expiredDateTime)}</span>
    </section>
    <section class="mark-section">
      <span class="mark-label">{t("label.teacher")}</span>
      <span class="fb-text">{hw.teacherName || "—"}</span>
    </section>
    {#if hw.homeworkFiles.length > 0 || hw.studentFiles.length > 0}
      <section class="mark-section">
        <span class="mark-label">{t("label.files")}</span>
        <span class="fb-text"
          >{#if hw.homeworkFiles.length > 0}{t("homeworks.assignments", { n: hw.homeworkFiles.length })}{/if
          }{#if hw.homeworkFiles.length > 0 && hw.studentFiles.length > 0} · {/if
          }{#if hw.studentFiles.length > 0}{t("homeworks.submissions", { n: hw.studentFiles.length })}{/if}</span
        >
      </section>
    {/if}
    {#if hw.mark !== null}
      <section class="mark-section">
        <span class="mark-label">{t("label.mark")}</span>
        <span class="fb-text">{hw.mark}</span>
      </section>
    {/if}
  </li>
{/snippet}