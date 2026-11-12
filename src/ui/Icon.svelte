<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import {
    ICON_PATHS,
    ICON_PATHS_FILL,
    ICON_VIEWBOX,
    type IconName,
  } from "./icons";

  let {
    name,
    class: className = "",
    size = 24,
    /** Prefer FILL 1 (solid). Shell chrome ignores this and uses hover/active. */
    filled = false,
  }: {
    name: IconName;
    class?: string;
    size?: number;
    filled?: boolean;
  } = $props();
</script>

<svg
  class="fsp-icon {className}"
  class:filled
  width={size}
  height={size}
  viewBox={ICON_VIEWBOX}
  aria-hidden="true"
  focusable="false"
>
  <path class="fsp-icon-outline" d={ICON_PATHS[name]} />
  <path class="fsp-icon-fill" d={ICON_PATHS_FILL[name]} />
</svg>

<style>
  .fsp-icon {
    display: block;
    flex-shrink: 0;
    overflow: visible;
    fill: currentColor;
  }

  .fsp-icon-outline,
  .fsp-icon-fill {
    transition: opacity 0.12s ease;
  }

  /* Default: Material Symbols FILL 0 (outline). */
  .fsp-icon-outline {
    opacity: 1;
  }
  .fsp-icon-fill {
    opacity: 0;
  }

  .fsp-icon.filled .fsp-icon-outline {
    opacity: 0;
  }
  .fsp-icon.filled .fsp-icon-fill {
    opacity: 1;
  }

  /* Shell chrome: outline at rest → solid on hover/active (FILL 0 → 1). */
  :global(.icon-btn) > .fsp-icon .fsp-icon-outline,
  :global(.nav-item) .fsp-icon .fsp-icon-outline {
    opacity: 1;
  }
  :global(.icon-btn) > .fsp-icon .fsp-icon-fill,
  :global(.nav-item) .fsp-icon .fsp-icon-fill {
    opacity: 0;
  }

  :global(.icon-btn:hover) > .fsp-icon .fsp-icon-outline,
  :global(.icon-btn.active) > .fsp-icon .fsp-icon-outline,
  :global(.nav-item.active) .fsp-icon .fsp-icon-outline {
    opacity: 0;
  }
  :global(.icon-btn:hover) > .fsp-icon .fsp-icon-fill,
  :global(.icon-btn.active) > .fsp-icon .fsp-icon-fill,
  :global(.nav-item.active) .fsp-icon .fsp-icon-fill {
    opacity: 1;
  }
</style>
