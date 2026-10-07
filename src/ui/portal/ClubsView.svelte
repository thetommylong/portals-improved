<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import type { Club, Term } from "../../types/portal";
  import { notify } from "../../notifications";
  import { readTerms, writeTerms } from "../../marksCache";
  import { i18n, t } from "../../i18n.svelte";

  let { studentId }: { studentId: string } = $props();

  let terms = $state<Term[]>([]);
  let selectedTermId = $state("");
  let clubs = $state<Club[]>([]);
  let loading = $state(false);
  let gridWidth = $state(0);

  let termPicked = false;

  const sortedTerms = $derived(
    [...new Map(terms.map((t) => [t.termId, t])).values()].sort(
      (a, b) => b.startDate.localeCompare(a.startDate),
    ),
  );

  interface TermGroup {
    label: string | null;
    items: Term[];
  }

  const termGroups = $derived.by(() => {
    const main: Term[] = [];
    const extras = new Map<string, Term[]>();
    for (const t of sortedTerms) {
      const match = t.semesterName.match(/^(.*?)\s*\(([^)]*)\)$/);
      if (match && match[1].trim() && match[2]) {
        const list = extras.get(match[2]) ?? [];
        list.push({ ...t, semesterName: match[1].trim() });
        extras.set(match[2], list);
      } else {
        main.push(t);
      }
    }
    return [
      { label: null, items: main },
      ...[...extras].map(([label, items]) => ({ label, items })),
    ];
  });

  const selectedTerm = $derived(
    terms.find((t) => t.termId === selectedTermId),
  );

  const colCount = $derived(
    Math.max(1, Math.floor((gridWidth - 40 + 12) / 312)),
  );

  const columns = $derived.by(() => {
    const cols: Club[][] = Array.from({ length: colCount }, () => []);
    clubs.forEach((c, i) => cols[i % colCount]!.push(c));
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

  async function init() {
    const ctx = await runtime.adapter.getStudentContext();
    const campusId = ctx.campusId;
    const cached = readTerms(campusId);
    if (cached) {
      terms = cached.terms;
      selectedTermId = cached.defaultTermId;
    }
    try {
      const [list, def] = await Promise.all([
        runtime.adapter.getTermsByCampus(campusId),
        runtime.adapter.getDefaultTerm(campusId),
      ]);
      terms = list;
      writeTerms(campusId, list, def.termId);
      if (
        !termPicked &&
        (!selectedTermId || !list.some((t) => t.termId === selectedTermId))
      ) {
        selectedTermId = def.termId;
      }
    } catch {
      if (!cached) notify(t("toast.semestersFailed"), "error");
    }
  }

  void init();

  async function load(termId: string): Promise<void> {
    const term = terms.find((t) => t.termId === termId);
    if (!term) {
      clubs = [];
      return;
    }

    loading = true;
    try {
      clubs = await runtime.adapter.getClubsByTerm(termId, studentId);
    } catch {
      notify(t("toast.clubsFailed"), "error");
    } finally {
      loading = false;
    }
  }

  export function refresh(): void {
    void load(selectedTermId);
  }

  $effect(() => {
    void load(selectedTermId);
  });
</script>

<div class="marks">
  <div class="marks-toolbar">
    <label class="marks-label" for="clubs-term">{t("label.term")}</label>
    <select
      id="clubs-term"
      class="marks-select"
      bind:value={selectedTermId}
      onchange={() => (termPicked = true)}
    >
      {#each termGroups as group, gi (group.label ?? `main-${gi}`)}
        {#if group.label}
          <optgroup label={group.label}>
            {#each group.items as term (term.termId)}
              <option value={term.termId}>{term.semesterName}</option>
            {/each}
          </optgroup>
        {:else}
          {#each group.items as term (term.termId)}
            <option value={term.termId}>{term.semesterName}</option>
          {/each}
        {/if}
      {/each}
    </select>
  </div>

  <div class="marks-body">
    {#if loading}
      <p class="marks-empty" role="status">{t("status.loading")}</p>
    {:else if clubs.length === 0}
      <p class="marks-empty">{t("clubs.empty")}</p>
    {:else}
      <div
        class="marks-grid"
        role="group"
        aria-label={t("clubs.gridAria")}
        bind:clientWidth={gridWidth}
      >
        {#each columns as col, ci (ci)}
          <div class="marks-col">
            {#each col as club (club.clubId)}
              <article class="mark-card">
                <header class="mark-card-head">
                  <h3 class="mark-card-title">{club.clubName}</h3>
                </header>
                <section class="mark-section">
                  <span class="mark-label">{t("label.created")}</span>
                  <span class="fb-text">{fmtDate(club.createdDate)}</span>
                </section>
              </article>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
