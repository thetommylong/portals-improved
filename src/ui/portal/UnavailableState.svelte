<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  let {
    message = "This feature is unavailable for the current portal provider.",
  }: { message?: string } = $props();
</script>

<div class="unavailable" role="status">
  <span class="material-symbols-rounded" aria-hidden="true">block</span>
  <p>{message}</p>
</div>

<style>
  .unavailable {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100%;
    padding: 32px;
    color: var(--subtext0);
    text-align: center;
  }

  .unavailable span {
    font-size: 40px;
    color: var(--overlay0);
  }

  .unavailable p {
    margin: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
</style>