<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import type { ConfirmRequest } from "../../sdk";

  let { request }: { request: ConfirmRequest } = $props();

  function approve() {
    request.resolve(true);
  }

  function reject() {
    request.resolve(false);
  }
</script>

<div class="confirm-card" role="alert">
  <div class="confirm-header">
    <span class="material-symbols-rounded" aria-hidden="true">warning</span>
    <span>Confirm Action</span>
  </div>
  <p class="confirm-desc">{request.description}</p>
  <div class="confirm-args">
    {#each Object.entries(request.args) as [key, value]}
      <div class="arg-row">
        <span class="arg-key">{key}:</span>
        <span class="arg-val">{typeof value === "string" ? value : JSON.stringify(value)}</span>
      </div>
    {/each}
  </div>
  <div class="confirm-actions">
    <button class="btn-approve" onclick={approve}>Approve</button>
    <button class="btn-reject" onclick={reject}>Reject</button>
  </div>
</div>

<style>
  .confirm-card {
    background: color-mix(in srgb, var(--yellow) 8%, var(--surface0));
    border: 1px solid color-mix(in srgb, var(--yellow) 25%, transparent);
    border-radius: 12px;
    padding: 12px;
    margin: 4px 0;
    max-width: 88%;
  }

  .confirm-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 13px;
    color: var(--text);
    margin-bottom: 6px;
  }

  .confirm-header span:first-child {
    font-size: 16px;
    color: var(--yellow);
  }

  .confirm-desc {
    font-size: 12px;
    color: var(--subtext0);
    margin: 0 0 8px;
  }

  .confirm-args {
    background: var(--base);
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 10px;
    font-size: 11px;
    font-family: monospace;
  }

  .arg-row {
    display: flex;
    gap: 6px;
    margin-bottom: 2px;
  }

  .arg-key {
    color: var(--accent);
    flex-shrink: 0;
  }

  .arg-val {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .confirm-actions {
    display: flex;
    gap: 8px;
  }

  .confirm-actions button {
    flex: 1;
    padding: 7px 14px;
    border: none;
    border-radius: 8px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
  }

  .btn-approve {
    background: var(--green);
    color: var(--base);
  }

  .btn-approve:hover {
    opacity: 0.85;
  }

  .btn-reject {
    background: var(--surface0);
    color: var(--text);
    border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .btn-reject:hover {
    background: var(--surface1);
  }
</style>
