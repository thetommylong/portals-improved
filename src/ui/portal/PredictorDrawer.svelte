<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import type { Term, MarkCommon } from "../../types/portal";
  import {
    parseScore,
    getGKValue,
    getCKValue,
    getTXNumbers,
    getTXEntries,
    semesterAverage,
    requiredFinal,
    yearlyAverage,
  } from "./marksHelpers";
  import { notify } from "../../notifications";

  let { marks, terms, selectedTermId, onclose }: {
    marks: MarkCommon[];
    terms: Term[];
    selectedTermId: string;
    onclose: () => void;
  } = $props();

  let drawerEl = $state<HTMLDivElement>();

  let target = $state(8);
  let projections = $state<Record<string, number>>({});
  let siblingLoading = $state(false);
  let siblingTerm = $state<Term | null>(null);
  let siblingMarks = $state<MarkCommon[]>([]);
  let siblingFetchedFor = $state<string | null>(null);

  // detail view state
  let detailSubject = $state<MarkCommon | null>(null);
  let detailTXSlots = $state<(number | null)[]>([null, null, null, null]);
  let detailGK = $state<number | null>(null);
  let detailCK = $state<number | null>(null);
  let detailTarget = $state(8);

  // parse milestones from markDTO
  function parseMilestones(dto: Record<string, unknown>): [string, string][] {
    const milestones: [string, string][] = [];
    if (!dto) return milestones;
    for (const [key, raw] of Object.entries(dto)) {
      if (raw === undefined || raw === null || raw === "") continue;
      const value = String(raw);
      if (/giữa\s*k[ìiỳ]|cuối\s*k[ìiỳ]/i.test(key)) {
        milestones.push([key, value]);
      }
    }
    return milestones;
  }

  const selectedTerm = $derived(
    terms.find((t) => t.termId === selectedTermId),
  );

  const predRows = $derived(
    marks.map((m) => {
      const dto = m.markDTO ?? {};
      const milestones = parseMilestones(dto);
      const gk = getGKValue(milestones);
      const ck = getCKValue(milestones);
      const tx = getTXNumbers(dto);
      const { value: required, status } = requiredFinal(tx, gk, clampedTarget);
      const tbVal = semesterAverage(tx, gk, ck);
      const tb = tbVal !== null && Number.isFinite(tbVal) ? tbVal.toFixed(2) : "—";
      const sib = siblingMarks.find((s) => s.subjectName === m.subjectName);
      const cnVal = sib?.averageMark ? yearlyAverage(Number(sib.averageMark), tbVal ?? 0) : null;
      const cn = cnVal !== null && Number.isFinite(cnVal) ? cnVal.toFixed(2) : "—";
      return {
        courseId: m.courseId,
        subjectName: m.subjectName,
        gk,
        ck,
        tb,
        cn,
        status,
        required,
        proj: projections[m.courseId] ?? required,
      };
    }),
  );

  const clampedTarget = $derived(
    Math.min(10, Math.max(0, Number(target) || 0)),
  );

  $effect(() => {
    if (!selectedTerm) return;
    const order = selectedTerm.termOrder;
    const yearStart = selectedTerm.academicStartYear;
    const yearEnd = selectedTerm.academicEndYear;
    const opposite = order === 1 ? 2 : 1;
    const sib = terms.find(
      (t) =>
        t.termOrder === opposite &&
        t.academicStartYear === yearStart &&
        t.academicEndYear === yearEnd,
    );
    siblingTerm = sib ?? null;
    if (sib && siblingFetchedFor !== sib.termId) {
      siblingFetchedFor = sib.termId;
      void fetchSibling(sib);
    }
  });

  async function fetchSibling(sib: Term) {
    siblingLoading = true;
    try {
      const studentId = (await runtime.adapter.getStudentContext()).studentId;
      if (!studentId) return;
      const year = `${sib.academicStartYear}-${sib.academicEndYear}`;
      siblingMarks = await runtime.adapter.getMarkCommonByStudent(
        year,
        sib.termOrder,
        studentId,
      );
    } catch {
      notify("Couldn't load other semester — predicting without CN", "info");
      siblingMarks = [];
    } finally {
      siblingLoading = false;
    }
  }

  // open detail view for a subject
  function openDetail(m: MarkCommon) {
    detailSubject = m;
    const dto = m.markDTO ?? {};
    const milestones = parseMilestones(dto);
    detailGK = getGKValue(milestones);
    detailCK = getCKValue(milestones);
    const txEntries = getTXEntries(dto);
    // always show exactly 4 ĐGTX slots; fill from sorted entries, ignore 5th+
    detailTXSlots = [null, null, null, null];
    let i = 0;
    for (const [key, val] of txEntries) {
      if (i < 4) detailTXSlots[i] = val;
      i++;
    }
  }

  function closeDetail() {
    detailSubject = null;
    detailTXSlots = [null, null, null, null];
    detailGK = null;
    detailCK = null;
  }

  // detail view computed values
  const hasLetterGrades = $derived(
    detailSubject &&
      detailSubject.averageMark !== "" &&
      parseScore(detailSubject.averageMark) === null
  );
  const detailTB = $derived.by(() => {
    if (!detailSubject) return "—";
    const txVals = detailTXSlots.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    const gk = detailGK;
    const ck =
      detailCK !== null
        ? detailCK
        : (projections[detailSubject.courseId] ?? 0);
    const avg = semesterAverage(txVals, gk, ck);
    return avg !== null && Number.isFinite(avg) ? avg.toFixed(2) : "—";
  });

  const detailCN = $derived.by(() => {
    if (!detailSubject || siblingMarks.length === 0) return "—";
    const sib = siblingMarks.find(
      (s) => s.subjectName === detailSubject!.subjectName,
    );
    if (!sib || sib.averageMark == null) return "—";
    const tb = Number(detailTB);
    if (!Number.isFinite(tb)) return "—";
    return yearlyAverage(Number(sib.averageMark), tb)?.toFixed(2) ?? "—";
  });

  const detailRequired = $derived.by(() => {
    if (!detailSubject) return null;
    const txVals = detailTXSlots.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    const gk = detailGK;
    return requiredFinal(txVals, gk, detailTarget);
  });

  // re-seed slider positions when target changes
  $effect(() => {
    void clampedTarget;
    const newProjs: Record<string, number> = {};
    for (const m of marks) {
      if (
        !m.averageMark &&
        !(m.markDTO && Object.keys(m.markDTO).length > 0)
      ) {
        continue;
      }
      const dto = m.markDTO ?? {};
      const milestones = parseMilestones(dto);
      const gk = getGKValue(milestones);
      const ck = getCKValue(milestones);
      if (ck !== null) continue;
      const tx = getTXNumbers(dto);
      const { value: required } = requiredFinal(tx, gk, clampedTarget);
      if (required !== null && Number.isFinite(required)) {
        newProjs[m.courseId] = Math.max(0, Math.min(10, required));
      }
    }
    projections = newProjs;
  });

  $effect(() => {
    if (!detailSubject && drawerEl) drawerEl.focus();
  });
</script>

<div class="drawer-backdrop" role="presentation" onclick={onclose}>
  <div
    class="drawer"
    role="dialog"
    aria-modal="false"
    aria-label="Final Grade Predictor"
    tabindex="-1"
    bind:this={drawerEl}
  >
    <div class="drawer-header">
      <h2 class="drawer-title">Final Grade Predictor</h2>
      <button
        type="button"
        class="drawer-close"
        aria-label="Close"
        onclick={onclose}
      >
        X
      </button>
    </div>

    <div class="drawer-body">
      {#if detailSubject}
        <!-- Detail View -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <section class="detail-view" role="group" aria-label="Grade detail" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
          <div class="detail-header">
            <button
              type="button"
              class="detail-back"
              onclick={closeDetail}
              aria-label="Back to list"
            >
              ← Back
            </button>
            <h3 class="detail-title">{detailSubject.subjectName}</h3>
          </div>

          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ĐGTX 1</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      bind:value={detailTXSlots[0]}
                      class="detail-input"
                      aria-label="ĐGTX 1"
                      disabled={hasLetterGrades}
                    />
                  </td>
                </tr>
                <tr>
                  <td>ĐGTX 2</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      bind:value={detailTXSlots[1]}
                      class="detail-input"
                      aria-label="ĐGTX 2"
                      disabled={hasLetterGrades}
                    />
                  </td>
                </tr>
                <tr>
                  <td>ĐGTX 3</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      bind:value={detailTXSlots[2]}
                      class="detail-input"
                      aria-label="ĐGTX 3"
                      disabled={hasLetterGrades}
                    />
                  </td>
                </tr>
                <tr>
                  <td>ĐGTX 4</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      bind:value={detailTXSlots[3]}
                      class="detail-input"
                      aria-label="ĐGTX 4"
                      disabled={hasLetterGrades}
                    />
                  </td>
                </tr>
                <tr class="detail-separator">
                  <td>Giữa Kỳ (×2)</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      bind:value={detailGK}
                      class="detail-input"
                      aria-label="Giữa Kỳ"
                      placeholder={detailGK !== null ? String(detailGK) : "—"}
                      disabled={hasLetterGrades}
                    />
                  </td>
                </tr>
                <tr class="detail-separator">
                  <td>Cuối Kỳ (×3)</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      bind:value={detailCK}
                      class="detail-input"
                      aria-label="Cuối Kỳ"
                      placeholder={detailCK !== null ? String(detailCK) : "—"}
                      disabled={hasLetterGrades}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <section class="detail-results" role="group" aria-label="Results" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <div class="detail-result">
              <span class="detail-result-label">TB (Semester Avg)</span>
              <span class="detail-result-value">{detailTB}</span>
            </div>
            <div class="detail-result">
              <span class="detail-result-label">Target Avg</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                bind:value={detailTarget}
                class="detail-input"
                aria-label="Target average"
                placeholder="e.g. 8.0"
              />
            </div>
            <div class="detail-result">
              <span class="detail-result-label">CN (Year Avg)</span>
              <span class="detail-result-value">{detailCN}</span>
            </div>
            {#if detailRequired}
              <div class="detail-result detail-target">
                <span class="detail-result-label">Need on Final for {detailTarget}</span>
                <span class="detail-result-value">
                  {#if detailRequired.status === "impossible"}
                    <span class="detail-impossible">Impossible</span>
                  {:else if detailRequired.status === "secured"}
                    <span class="detail-secured">Secured</span>
                  {:else if detailRequired.status === "unknown"}
                    <span class="detail-unknown">Need GK</span>
                  {:else}
                    <span class="detail-need">{Math.max(0, Math.min(10, detailRequired.value)).toFixed(2)}</span>
                  {/if}
                </span>
              </div>
            {/if}
          </section>
        </section>
      {:else}
        <!-- List View -->
        <div class="drawer-section">
          <label class="drawer-instruction" for="pred-target">Target average:</label>
          <div class="drawer-presets">
            <button type="button" class="drawer-preset-btn" onclick={() => (target = 8)}>8.0</button>
            <button type="button" class="drawer-preset-btn" onclick={() => (target = 9)}>9.0</button>
            <button type="button" class="drawer-preset-btn" onclick={() => (target = 9.5)}>9.5</button>
          </div>
          <input
            id="pred-target"
            type="number"
            min="0"
            max="10"
            step="0.1"
            bind:value={target}
            class="drawer-input"
            placeholder="e.g. 8.0"
          />
        </div>

        {#if siblingLoading}
          <p class="drawer-loading">Loading other semester…</p>
        {:else if siblingMarks.length > 0}
          <p class="drawer-note">
            Year averages include {siblingTerm?.semesterName}.
          </p>
        {:else}
          <p class="drawer-note">Year averages need your other semester's grades.</p>
        {/if}

        <div class="drawer-subjects">
          {#each predRows as row (row.courseId)}
            <button
              type="button"
              class="drawer-row"
              onclick={(e) => {
                e.stopPropagation();
                openDetail(marks.find(m => m.courseId === row.courseId)!);
              }}
            >
              <div class="drawer-row-head">
                <span class="drawer-subject-name">{row.subjectName}</span>
                <span class="drawer-gk">GK: {row.gk !== null ? row.gk : "—"}</span>
              </div>

              <div class="drawer-projection">
                {#if row.ck === null}
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.05"
                      bind:value={projections[row.courseId]}
                      class="drawer-slider"
                      aria-label="Projected Cuối Kỳ for {row.subjectName}"
                    />
                   <span class="drawer-ck-value">CK {row.proj.toFixed(2)}</span>
                  <span class="drawer-tb-badge">TB {row.tb}</span>
                  {#if siblingMarks.length > 0}
                    <span class="drawer-cn-badge">CN {row.cn}</span>
                  {/if}
                  {#if row.status === "impossible"}
                    <span class="drawer-status impossible">Impossible</span>
                  {:else if row.status === "secured"}
                    <span class="drawer-status secured">Secured</span>
                  {:else if row.status === "unknown"}
                    <span class="drawer-status unknown">Need GK</span>
                  {:else}
                    <span class="drawer-status on-track">Need {Math.max(0, Math.min(10, row.required)).toFixed(2)} on final</span>
                  {/if}
                {:else}
                  <span class="drawer-finalized">
                    Final done · TB {row.tb}{#if row.cn !== "—"} · CN {row.cn}{/if}
                  </span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if !detailSubject}
      <div class="drawer-footer">
        <button type="button" class="drawer-apply" onclick={onclose}>Apply</button>
        <button type="button" class="drawer-cancel" onclick={onclose}>Cancel</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
    background: color-mix(in srgb, var(--mantle) 70%, transparent);
    animation: backdrop-in 0.18s ease-out both;
  }

  .drawer {
    display: flex;
    flex-direction: column;
    width: 480px;
    max-width: 100%;
    height: 100%;
    background: var(--base);
    border-left: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    animation: drawer-in 0.18s ease-out;
  }

  .drawer:focus-visible {
    outline: none;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 20px;
    flex-shrink: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .drawer-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .drawer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 2px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--subtext0);
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .drawer-close:hover {
    color: var(--text);
    background: var(--surface0);
  }

  .drawer-close:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .drawer-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .drawer-section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .drawer-instruction {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--subtext0);
  }

  .drawer-presets {
    display: flex;
    gap: 6px;
  }

  .drawer-preset-btn {
    height: 26px;
    padding: 0 10px;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .drawer-preset-btn:hover {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .drawer-preset-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .drawer-input {
    width: 72px;
    height: 28px;
    padding: 0 8px;
    margin-left: auto;
    border: none;
    border-radius: 8px;
    background: var(--surface0);
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
  }

  .drawer-input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .drawer-loading,
  .drawer-note {
    margin: 0;
    font-size: 12px;
    color: var(--subtext0);
  }

  .drawer-subjects {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .drawer-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    background: var(--surface0);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    border-radius: 12px;
    width: 100%;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    appearance: none;
    transition: background 0.12s ease, transform 0.12s ease;
  }

  .drawer-row:hover {
    transform: translateY(-1px);
  }

  .drawer-row:active {
    transform: translateY(0);
  }

  .drawer-row:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .drawer-row-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .drawer-subject-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .drawer-gk {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--subtext0);
  }

  .drawer-projection {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .drawer-slider {
    flex: 1 1 100%;
    height: 4px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .drawer-ck-value {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
  }

  .drawer-slider:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .drawer-tb-badge,
  .drawer-cn-badge {
    font-size: 12px;
    font-weight: 700;
    border-radius: 999px;
    padding: 3px 10px;
    white-space: nowrap;
  }

  .drawer-tb-badge {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .drawer-cn-badge {
    color: var(--green);
    background: color-mix(in srgb, var(--green) 12%, transparent);
  }

  .drawer-status {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 999px;
    padding: 3px 10px;
    white-space: nowrap;
  }

  .drawer-status.on-track {
    color: var(--yellow);
    background: color-mix(in srgb, var(--yellow) 12%, transparent);
  }

  .drawer-status.secured {
    color: var(--green);
    background: color-mix(in srgb, var(--green) 12%, transparent);
  }

  .drawer-status.unknown {
    color: var(--subtext0);
    background: color-mix(in srgb, var(--surface1) 80%, transparent);
  }

  .drawer-status.impossible {
    color: var(--red);
    background: color-mix(in srgb, var(--red) 12%, transparent);
  }

  .drawer-finalized {
    font-size: 12px;
    color: var(--subtext0);
  }

  .drawer-footer {
    display: flex;
    gap: 8px;
    padding: 14px 20px;
    flex-shrink: 0;
    border-top: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .drawer-apply,
  .drawer-cancel {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .drawer-apply {
    background: var(--accent);
    color: var(--base);
  }

  .drawer-apply:hover {
    opacity: 0.9;
  }

  .drawer-cancel {
    background: color-mix(in srgb, var(--surface0) 70%, transparent);
    color: var(--text);
  }

  .drawer-cancel:hover {
    background: color-mix(in srgb, var(--surface0) 85%, transparent);
  }

  .drawer-apply:focus-visible,
  .drawer-cancel:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .detail-view {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .detail-back {
    height: 26px;
    padding: 0 12px;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface0) 70%, transparent);
    color: var(--subtext0);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  .detail-back:hover {
    color: var(--text);
    background: var(--surface0);
  }

  .detail-back:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .detail-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .detail-table-wrap {
    background: var(--surface0);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    border-radius: 12px;
    overflow: hidden;
  }

  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-family: inherit;
  }

  .detail-table th {
    padding: 8px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--subtext0);
    background: var(--base);
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .detail-table td {
    padding: 6px 14px;
    font-size: 13px;
    color: var(--text);
    border-top: 1px solid color-mix(in srgb, var(--text) 6%, transparent);
  }

  .detail-table tr:first-child td {
    border-top: none;
  }

  .detail-table td:first-child {
    width: 55%;
    font-weight: 600;
  }

  .detail-separator td {
    border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
  }

  .detail-input {
    width: 100%;
    height: 26px;
    padding: 0 8px;
    border: none;
    border-radius: 8px;
    background: var(--base);
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
  }

  .detail-input:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .detail-input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .detail-results {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .detail-result {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--surface0);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    border-radius: 12px;
  }

  .detail-result-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--subtext0);
  }

  .detail-result-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }

  .detail-target {
    grid-column: 1 / -1;
  }

  .detail-impossible {
    color: var(--red);
  }

  .detail-secured {
    color: var(--green);
  }

  .detail-unknown {
    color: var(--subtext0);
  }

  .detail-need {
    color: var(--yellow);
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .drawer {
      width: 100%;
    }
  }
</style>