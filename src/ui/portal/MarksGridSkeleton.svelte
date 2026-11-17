<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { t } from "../../i18n.svelte";
  import Skeleton from "./Skeleton.svelte";

  let { count = 6 }: { count?: number } = $props();
</script>

<div
  class="sk-marks-grid"
  role="status"
  aria-busy="true"
  aria-label={t("status.loading")}
>
  <span class="sk-sr">{t("status.loading")}</span>
  {#each { length: count } as _, i (i)}
    <div class="sk-mark-card" aria-hidden="true">
      <div class="sk-mark-head">
        <Skeleton height="16px" width="70%" radius="var(--radius-control)" />
        <Skeleton height="20px" width="40px" radius="999px" />
      </div>
      <Skeleton height="12px" width="50%" radius="var(--radius-control)" />
      <div class="sk-mark-rows">
        <Skeleton height="10px" width="100%" radius="var(--radius-control)" />
        <Skeleton height="10px" width="92%" radius="var(--radius-control)" />
        <Skeleton height="10px" width="78%" radius="var(--radius-control)" />
      </div>
    </div>
  {/each}
</div>

<style>
  .sk-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .sk-marks-grid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin: 0;
    padding: 16px 20px;
  }

  .sk-mark-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    padding: 14px 16px;
  }

  .sk-mark-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .sk-mark-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }
</style>
