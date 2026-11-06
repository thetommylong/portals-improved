<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { ICON_PATHS, type IconName } from "./icons";

  let {
    name,
    class: className = "",
    size = 24,
  }: {
    name: IconName;
    class?: string;
    size?: number;
  } = $props();
</script>

<svg
  class="fsp-icon {className}"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  aria-hidden="true"
  focusable="false"
>
  <path d={ICON_PATHS[name]} />
</svg>

<style>
  /*
   * Optical stand-in for Material Symbols FILL 0 → FILL 1 on shell
   * controls (header icon-btn + sidebar nav). Standalone icons stay full ink.
   */
  .fsp-icon {
    display: block;
    flex-shrink: 0;
    fill: currentColor;
    transition: fill-opacity 0.12s ease;
  }

  :global(.icon-btn) > .fsp-icon,
  :global(.nav-item) .fsp-icon {
    fill-opacity: 0.72;
  }

  :global(.icon-btn:hover) > .fsp-icon,
  :global(.icon-btn.active) > .fsp-icon,
  :global(.nav-item.active) .fsp-icon {
    fill-opacity: 1;
  }
</style>
