<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { fade, scale } from "svelte/transition";
  import { runtime } from "../../adapters/runtime.svelte";
  import type { Term, MarkCommon } from "../../types/portal";
  import {
    parseScore,
    extractMilestones,
    getGKValue,
    getCKValue,
    getTXNumbers,
    getTXEntries,
    semesterAverage,
    requiredFinal,
    yearlyAverage,
  } from "./marksHelpers";
  import { notify } from "../../notifications";
  import { t } from "../../i18n.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { backdropFade, modalScale } from "./popTransition";
  import PredictorList from "./PredictorList.svelte";
  import PredictorDetail from "./PredictorDetail.svelte";
  import "./PredictorDrawer.css";

  let {
    marks,
    terms,
    selectedTermId,
    onclose,
  }: {
    marks: MarkCommon[];
    terms: Term[];
    selectedTermId: string;
    onclose: () => void;
  } = $props();

  let drawerEl = $state<HTMLDivElement>();
  let focusHandle = $state<OverlayFocusHandle | null>(null);

  function handleEscape() {
    if (detailSubject) {
      closeDetail();
      return;
    }
    onclose();
  }

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

  const selectedTerm = $derived(terms.find((t) => t.termId === selectedTermId));

  const predRows = $derived(
    marks.map((m) => {
      const dto = m.markDTO ?? {};
      const milestones = extractMilestones(dto);
      const gk = getGKValue(milestones);
      const ck = getCKValue(milestones);
      const tx = getTXNumbers(dto);
      const { value: required, status } = requiredFinal(tx, gk, clampedTarget);
      const tbVal = semesterAverage(tx, gk, ck);
      const tb =
        tbVal !== null && Number.isFinite(tbVal) ? tbVal.toFixed(2) : "—";
      const sib = siblingMarks.find((s) => s.subjectName === m.subjectName);
      const cnVal = sib?.averageMark
        ? yearlyAverage(Number(sib.averageMark), tbVal ?? 0)
        : null;
      const cn =
        cnVal !== null && Number.isFinite(cnVal) ? cnVal.toFixed(2) : "—";
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
      notify(t("toast.otherSemester"), "info");
      siblingMarks = [];
    } finally {
      siblingLoading = false;
    }
  }

  function openDetail(m: MarkCommon) {
    detailSubject = m;
    const dto = m.markDTO ?? {};
    const milestones = extractMilestones(dto);
    detailGK = getGKValue(milestones);
    detailCK = getCKValue(milestones);
    const txEntries = getTXEntries(dto);
    // always show exactly 4 ĐGTX slots; fill from sorted entries, ignore 5th+
    detailTXSlots = [null, null, null, null];
    let i = 0;
    for (const [, val] of txEntries) {
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

  const hasLetterGrades = $derived(
    detailSubject &&
      detailSubject.averageMark !== "" &&
      parseScore(detailSubject.averageMark) === null,
  );
  const detailTB = $derived.by(() => {
    if (!detailSubject) return "—";
    const txVals = detailTXSlots.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    const gk = detailGK;
    const ck =
      detailCK !== null ? detailCK : (projections[detailSubject.courseId] ?? 0);
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

  // Seed + re-seed slider positions when marks/target change.
  // Must stay writable $state (sliders bind:value into projections[courseId]).
  $effect(() => {
    void marks;
    void clampedTarget;
    const newProjs: Record<string, number> = {};
    for (const m of marks) {
      if (!m.averageMark && !(m.markDTO && Object.keys(m.markDTO).length > 0)) {
        continue;
      }
      const dto = m.markDTO ?? {};
      const milestones = extractMilestones(dto);
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
    if (!drawerEl) return;
    focusHandle = attachOverlayFocus(drawerEl, handleEscape);
    return () => {
      focusHandle?.release();
      focusHandle = null;
    };
  });
</script>

<div
  class="drawer-backdrop"
  role="presentation"
  onclick={onclose}
  transition:fade|global={backdropFade()}
>
  <!-- click stop only: Escape + Tab owned by attachOverlayFocus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="drawer"
    role="dialog"
    aria-modal="true"
    aria-label={t("predictor.title")}
    tabindex="-1"
    bind:this={drawerEl}
    onclick={(e) => e.stopPropagation()}
    transition:scale|global={modalScale()}
  >
    <div class="drawer-header">
      <h2 class="drawer-title">{t("predictor.title")}</h2>
      <button
        type="button"
        class="drawer-close"
        aria-label={t("aria.close")}
        onclick={onclose}
      >
        <svg
          class="drawer-close-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    {#if detailSubject}
      <div class="drawer-body">
        <PredictorDetail
          subjectName={detailSubject.subjectName}
          bind:detailTXSlots
          bind:detailGK
          bind:detailCK
          bind:detailTarget
          {hasLetterGrades}
          {detailTB}
          {detailCN}
          {detailRequired}
          onBack={closeDetail}
        />
      </div>
    {:else}
      <PredictorList
        bind:target
        bind:projections
        {siblingLoading}
        {siblingTerm}
        {siblingMarks}
        {predRows}
        {marks}
        onOpenDetail={openDetail}
        {onclose}
      />
    {/if}
  </div>
</div>
