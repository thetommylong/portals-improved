<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { t } from "../../i18n.svelte";
  import Skeleton from "./Skeleton.svelte";

  let { count = 5 }: { count?: number } = $props();
</script>

<div class="sk-card-list" role="status" aria-busy="true">
  <span class="sk-sr">{t("status.loading")}</span>
  {#each { length: count } as _, i (i)}
    <div class="sk-fb-card" aria-hidden="true">
      <div class="sk-fb-head">
        <div class="sk-fb-titlewrap">
          <Skeleton height="16px" width="68%" radius="var(--radius-control)" />
          <Skeleton height="12px" width="42%" radius="var(--radius-control)" />
        </div>
        <Skeleton height="22px" width="56px" radius="999px" />
      </div>
      <Skeleton height="12px" width="88%" radius="var(--radius-control)" />
      <Skeleton height="12px" width="55%" radius="var(--radius-control)" />
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

  .sk-card-list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0 20px 10px;
  }

  .sk-fb-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    padding: 14px 16px;
  }

  .sk-fb-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .sk-fb-titlewrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
</style>
