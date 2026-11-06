<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { t } from "../../i18n.svelte";
  import Icon from "../Icon.svelte";

  let { message = t("unavailable.msg") }: { message?: string } = $props();
</script>

<div class="unavailable" role="status">
  <Icon class="unavailable-icon" name="block" size={40} />
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
    color: var(--text-secondary);
    text-align: center;
  }

  .unavailable :global(.unavailable-icon) {
    color: var(--text-secondary);
  }

  .unavailable p {
    margin: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
</style>
