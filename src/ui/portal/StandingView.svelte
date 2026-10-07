<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import type { DisciplineRuleStudent, RewardStudent } from "../../types/portal";
  import { notify } from "../../notifications";
  import { i18n, t } from "../../i18n.svelte";

  let { studentId }: { studentId: string } = $props();

  interface StandingItem {
    kind: "reward" | "discipline";
    date: string;
    title: string;
    subtitle: string;
    badge: string;
    academic: string;
    raw: RewardStudent | DisciplineRuleStudent;
  }

  let items = $state<StandingItem[]>([]);
  let loading = $state(false);
  let expandedId = $state<string | null>(null);
  let yearFilter = $state("all");
  let gridWidth = $state(0);

  const academicYears = $derived(
    Array.from(new Set(items.map((i) => i.academic))).sort().reverse(),
  );

  const filtered = $derived(
    yearFilter === "all"
      ? items
      : items.filter((i) => i.academic === yearFilter),
  );

  const colCount = $derived(
    Math.max(1, Math.floor((gridWidth - 40 + 12) / 312)),
  );

  const columns = $derived.by(() => {
    const cols: StandingItem[][] = Array.from({ length: colCount }, () => []);
    filtered.forEach((item, i) => cols[i % colCount]!.push(item));
    return cols;
  });

  function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(i18n.locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  }

  function toggle(id: string): void {
    expandedId = expandedId === id ? null : id;
  }

  async function load(): Promise<void> {
    loading = true;
    try {
      const ctx = await runtime.adapter.getStudentContext();
      const campusId = ctx.campusId;

      const [rewardStudents, disciplineStudents, levels, rules, campusRewards] =
        await Promise.all([
          runtime.adapter.getRewardsByStudent(studentId),
          runtime.adapter.getDisciplineRulesByStudent(studentId),
          runtime.adapter.getDisciplineLevels(campusId),
          runtime.adapter.getDisciplineRules(campusId),
          runtime.adapter.getRewardsByCampus(campusId),
        ]);

      const levelMap = new Map(levels.map((l) => [l.disciplineLevelId, l]));
      const ruleMap = new Map(rules.map((r) => [r.disciplineRuleId, r]));
      const rewardMap = new Map(campusRewards.map((r) => [r.rewardId, r]));

      const rewardItems: StandingItem[] = rewardStudents.map((rs) => {
        const catalog = rewardMap.get(rs.rewardId);
        return {
          kind: "reward",
          date: rs.createdDate,
          title: catalog?.title ?? rs.description ?? t("standing.reward"),
          subtitle: rs.description || "—",
          badge: t("standing.reward"),
          academic: rs.academic,
          raw: rs,
        };
      });

      const disciplineItems: StandingItem[] = disciplineStudents.map((ds) => {
        const rule = ruleMap.get(ds.disciplineRuleId);
        return {
          kind: "discipline",
          date: ds.createdDate,
          title: rule?.description ?? ds.description ?? t("standing.discipline"),
          subtitle: ds.description || "—",
          badge: t("standing.discipline"),
          academic: ds.academic,
          raw: ds,
        };
      });

      items = [...rewardItems, ...disciplineItems].sort(
        (a, b) => b.date.localeCompare(a.date),
      );
    } catch {
      notify(t("toast.standingFailed"), "error");
    } finally {
      loading = false;
    }
  }

  export function refresh(): void {
    void load();
  }

  void load();
</script>

<div class="marks">
  <div class="marks-toolbar">
    <label class="marks-label" for="year-filter">{t("standing.year")}</label>
    <select
      id="year-filter"
      class="marks-select"
      bind:value={yearFilter}
    >
      <option value="all">{t("standing.all")}</option>
      {#each academicYears as year (year)}
        <option value={year}>{year}</option>
      {/each}
    </select>
  </div>

  <div class="marks-body">
    {#if loading}
      <p class="marks-empty" role="status">{t("status.loading")}</p>
    {:else if items.length === 0}
      <p class="marks-empty">{t("standing.empty")}</p>
    {:else if filtered.length === 0}
      <p class="marks-empty">{t("standing.emptyYear")}</p>
    {:else}
      <div class="marks-grid" role="list" aria-label={t("standing.gridAria")} bind:clientWidth={gridWidth}>
        {#each columns as col, ci (ci)}
          <div class="marks-col">
            {#each col as item (item.kind + item.date + item.title)}
              {@render card(item)}
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#snippet card(item: StandingItem)}
  {@const id = item.kind + "-" + item.date + "-" + item.title}
  {@const isExpanded = expandedId === id}
  <li class="mark-card fb-card-clickable list-item-plain"
    class:fb-card-expanded={isExpanded}
  >
    <button
      type="button"
      class="mark-card-inner"
      aria-expanded={isExpanded}
      onclick={() => toggle(id)}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(id);
        }
      }}
    >
    <header class="mark-card-head">
      <h3 class="mark-card-title">{item.title}</h3>
      <div class="mark-card-avgs">
        <span
          class="avg-badge"
          class:avg-badge-done={item.kind === "reward"}
          class:avg-badge-overdue={item.kind === "discipline"}
        >
          {item.badge}
        </span>
      </div>
    </header>
    <section class="mark-section">
      <span class="mark-label">{t("standing.date")}</span>
      <span class="fb-text">{fmtDate(item.date)}</span>
    </section>
    <section class="mark-section">
      <span class="mark-label">{t("standing.yearShort")}</span>
      <span class="fb-text">{item.academic}</span>
    </section>
    {#if item.subtitle && item.subtitle !== item.title}
      <section class="mark-section">
        <span class="mark-label">{t("standing.detail")}</span>
        <span class="fb-text">{item.subtitle}</span>
      </section>
    {/if}
    {#if isExpanded}
      <div class="standing-detail">
        {#if item.kind === "reward"}
          {@const raw = item.raw as RewardStudent}
          {#if raw.decisionCode}
            <section class="mark-section">
              <span class="mark-label">{t("standing.decisionNo")}</span>
              <span class="fb-text">{raw.decisionCode}</span>
            </section>
          {/if}
          {#if raw.descriptionEnglish}
            <section class="mark-section">
              <span class="mark-label">{t("standing.eo")}</span>
              <span class="fb-text">{raw.descriptionEnglish}</span>
            </section>
          {/if}
          <section class="mark-section">
            <span class="mark-label">{t("standing.code")}</span>
            <span class="fb-text">{raw.rewardId}</span>
          </section>
          <section class="mark-section">
            <span class="mark-label">{t("label.created")}</span>
            <span class="fb-text">{fmtDate(raw.createdDate)}</span>
          </section>
        {:else}
          {@const raw = item.raw as DisciplineRuleStudent}
          <section class="mark-section">
            <span class="mark-label">{t("standing.ruleCode")}</span>
            <span class="fb-text">{raw.disciplineRuleId}</span>
          </section>
          <section class="mark-section">
            <span class="mark-label">{t("standing.level")}</span>
            <span class="fb-text">{raw.disciplineLevelId}</span>
          </section>
          <section class="mark-section">
            <span class="mark-label">{t("label.created")}</span>
            <span class="fb-text">{fmtDate(raw.createdDate)}</span>
          </section>
        {/if}
      </div>
    {/if}
    </button>
  </li>
{/snippet}

<style>
  .standing-detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }
</style>
