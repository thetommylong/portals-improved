<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { t } from "../../i18n.svelte";
  import Skeleton from "./Skeleton.svelte";
</script>

<div class="sk-chunk" role="status" aria-busy="true">
  <span class="sk-sr">{t("status.loading")}</span>
  <div class="sk-chunk-grid" aria-hidden="true">
    {#each { length: 4 } as _, i (i)}
      <div class="sk-chunk-card">
        <Skeleton height="16px" width="62%" radius="var(--radius-control)" />
        <Skeleton height="12px" width="40%" radius="var(--radius-control)" />
        <Skeleton height="12px" width="84%" radius="var(--radius-control)" />
        <Skeleton height="12px" width="70%" radius="var(--radius-control)" />
      </div>
    {/each}
  </div>
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

  .sk-chunk {
    position: relative;
    height: 100%;
    min-height: 240px;
    padding: 16px 20px;
    box-sizing: border-box;
  }

  .sk-chunk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }

  .sk-chunk-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    padding: 14px 16px;
  }
</style>
