<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { t } from "../../i18n.svelte";
  import "./PredictorDetail.css";

  let {
    subjectName,
    detailTXSlots = $bindable(),
    detailGK = $bindable(),
    detailCK = $bindable(),
    detailTarget = $bindable(),
    hasLetterGrades,
    detailTB,
    detailCN,
    detailRequired,
    onBack,
  }: {
    subjectName: string;
    detailTXSlots: (number | null)[];
    detailGK: number | null;
    detailCK: number | null;
    detailTarget: number;
    hasLetterGrades: boolean | null | undefined;
    detailTB: string;
    detailCN: string;
    detailRequired: {
      value: number;
      status: "impossible" | "secured" | "ok" | "unknown";
    } | null;
    onBack: () => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
  class="detail-view"
  role="group"
  aria-label={t("predictor.detailGroup")}
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.stopPropagation()}
>
  <div class="detail-header">
    <button
      type="button"
      class="detail-back"
      onclick={onBack}
      aria-label={t("predictor.back")}
    >
      ← {t("predictor.back")}
    </button>
    <h3 class="detail-title">{subjectName}</h3>
  </div>

  <div class="detail-table-wrap">
    <table class="detail-table">
      <thead>
        <tr>
          <th>{t("predictor.component")}</th>
          <th>{t("predictor.score")}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{t("predictor.txComponent", { n: 1 })}</td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              bind:value={detailTXSlots[0]}
              class="detail-input"
              aria-label={t("predictor.txComponent", { n: 1 })}
              disabled={!!hasLetterGrades}
            />
          </td>
        </tr>
        <tr>
          <td>{t("predictor.txComponent", { n: 2 })}</td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              bind:value={detailTXSlots[1]}
              class="detail-input"
              aria-label={t("predictor.txComponent", { n: 2 })}
              disabled={!!hasLetterGrades}
            />
          </td>
        </tr>
        <tr>
          <td>{t("predictor.txComponent", { n: 3 })}</td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              bind:value={detailTXSlots[2]}
              class="detail-input"
              aria-label={t("predictor.txComponent", { n: 3 })}
              disabled={!!hasLetterGrades}
            />
          </td>
        </tr>
        <tr>
          <td>{t("predictor.txComponent", { n: 4 })}</td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              bind:value={detailTXSlots[3]}
              class="detail-input"
              aria-label={t("predictor.txComponent", { n: 4 })}
              disabled={!!hasLetterGrades}
            />
          </td>
        </tr>
        <tr class="detail-separator">
          <td>{t("predictor.midtermComponent")}</td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              bind:value={detailGK}
              class="detail-input"
              aria-label={t("predictor.midtermAria")}
              placeholder={detailGK !== null ? String(detailGK) : "—"}
              disabled={!!hasLetterGrades}
            />
          </td>
        </tr>
        <tr class="detail-separator">
          <td>{t("predictor.finalComponent")}</td>
          <td>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              bind:value={detailCK}
              class="detail-input"
              aria-label={t("predictor.finalAria")}
              placeholder={detailCK !== null ? String(detailCK) : "—"}
              disabled={!!hasLetterGrades}
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <section
    class="detail-results"
    role="group"
    aria-label={t("predictor.results")}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="detail-result">
      <span class="detail-result-label">{t("predictor.tbAvg")}</span>
      <span class="detail-result-value">{detailTB}</span>
    </div>
    <div class="detail-result">
      <span class="detail-result-label">{t("predictor.targetLabel")}</span>
      <input
        type="number"
        min="0"
        max="10"
        step="0.1"
        bind:value={detailTarget}
        class="detail-input"
        aria-label={t("predictor.targetAria")}
        placeholder={t("predictor.placeholder")}
      />
    </div>
    <div class="detail-result">
      <span class="detail-result-label">{t("predictor.cnAvg")}</span>
      <span class="detail-result-value">{detailCN}</span>
    </div>
    {#if detailRequired}
      <div class="detail-result detail-target">
        <span class="detail-result-label"
          >{t("predictor.needOnFinal", { target: detailTarget })}</span
        >
        <span class="detail-result-value">
          {#if detailRequired.status === "impossible"}
            <span class="detail-impossible"
              >{t("predictor.statusImpossible")}</span
            >
          {:else if detailRequired.status === "secured"}
            <span class="detail-secured">{t("predictor.statusSecured")}</span>
          {:else if detailRequired.status === "unknown"}
            <span class="detail-unknown">{t("predictor.statusNeedGK")}</span>
          {:else}
            <span class="detail-need"
              >{Math.max(0, Math.min(10, detailRequired.value)).toFixed(
                2,
              )}</span
            >
          {/if}
        </span>
      </div>
    {/if}
  </section>
</section>
