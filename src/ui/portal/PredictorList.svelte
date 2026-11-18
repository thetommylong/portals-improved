<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import type { MarkCommon, Term } from "../../types/portal";
  import { t } from "../../i18n.svelte";
  import "./PredictorList.css";

  type PredRow = {
    courseId: string;
    subjectName: string;
    gk: number | null;
    ck: number | null;
    tb: string;
    cn: string;
    status: "impossible" | "secured" | "ok" | "unknown";
    required: number;
    proj: number;
  };

  let {
    target = $bindable(),
    projections = $bindable(),
    siblingLoading,
    siblingTerm,
    siblingMarks,
    predRows,
    marks,
    onOpenDetail,
    onclose,
  }: {
    target: number;
    projections: Record<string, number>;
    siblingLoading: boolean;
    siblingTerm: Term | null;
    siblingMarks: MarkCommon[];
    predRows: PredRow[];
    marks: MarkCommon[];
    onOpenDetail: (m: MarkCommon) => void;
    onclose: () => void;
  } = $props();
</script>

<div class="drawer-body">
  <div class="drawer-section">
    <label class="drawer-instruction" for="pred-target"
      >{t("predictor.targetLabel")}</label
    >
    <div class="drawer-presets">
      <button
        type="button"
        class="drawer-preset-btn"
        onclick={() => (target = 8)}>8.0</button
      >
      <button
        type="button"
        class="drawer-preset-btn"
        onclick={() => (target = 9)}>9.0</button
      >
      <button
        type="button"
        class="drawer-preset-btn"
        onclick={() => (target = 9.5)}>9.5</button
      >
    </div>
    <input
      id="pred-target"
      type="number"
      min="0"
      max="10"
      step="0.1"
      bind:value={target}
      class="drawer-input"
      placeholder={t("predictor.placeholder")}
    />
  </div>

  {#if siblingLoading}
    <p class="drawer-loading">{t("predictor.loadingSibling")}</p>
  {:else if siblingMarks.length > 0}
    <p class="drawer-note">
      {t("predictor.yearAvgInclude", {
        semester: siblingTerm?.semesterName ?? "",
      })}
    </p>
  {:else}
    <p class="drawer-note">{t("predictor.yearAvgNeed")}</p>
  {/if}

  <div class="drawer-subjects">
    {#each predRows as row (row.courseId)}
      <div class="drawer-row" role="group" aria-label={row.subjectName}>
        <button
          type="button"
          class="drawer-row-open"
          onclick={() => {
            onOpenDetail(marks.find((m) => m.courseId === row.courseId)!);
          }}
        >
          <span class="drawer-subject-name">{row.subjectName}</span>
          <span class="drawer-gk"
            >{t("predictor.gk", {
              value: row.gk !== null ? row.gk : "—",
            })}</span
          >
        </button>

        <div class="drawer-projection">
          {#if row.ck === null}
            <input
              type="range"
              min="0"
              max="10"
              step="0.05"
              bind:value={projections[row.courseId]}
              class="drawer-slider"
              aria-label={t("predictor.projectedAria", {
                subject: row.subjectName,
              })}
            />
            <span class="drawer-ck-value"
              >{t("predictor.ck", { value: row.proj.toFixed(2) })}</span
            >
            <span class="drawer-tb-badge"
              >{t("predictor.tb", { value: row.tb })}</span
            >
            {#if siblingMarks.length > 0}
              <span class="drawer-cn-badge"
                >{t("predictor.cn", { value: row.cn })}</span
              >
            {/if}
            {#if row.status === "impossible"}
              <span class="drawer-status impossible"
                >{t("predictor.statusImpossible")}</span
              >
            {:else if row.status === "secured"}
              <span class="drawer-status secured"
                >{t("predictor.statusSecured")}</span
              >
            {:else if row.status === "unknown"}
              <span class="drawer-status unknown"
                >{t("predictor.statusNeedGK")}</span
              >
            {:else}
              <span class="drawer-status on-track"
                >{t("predictor.statusNeedFinal", {
                  value: Math.max(0, Math.min(10, row.required)).toFixed(2),
                })}</span
              >
            {/if}
          {:else}
            <span class="drawer-finalized">
              {t("predictor.finalized")} · {t("predictor.tb", {
                value: row.tb,
              })}{#if row.cn !== "—"}
                · {t("predictor.cn", { value: row.cn })}{/if}
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<div class="drawer-footer">
  <button type="button" class="drawer-apply" onclick={onclose}
    >{t("predictor.apply")}</button
  >
  <button type="button" class="drawer-cancel" onclick={onclose}
    >{t("predictor.cancel")}</button
  >
</div>
