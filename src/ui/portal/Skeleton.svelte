<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  let {
    width = "100%",
    height = "12px",
    radius = "var(--radius-control)",
    class: className = "",
  }: {
    width?: string;
    height?: string;
    radius?: string;
    class?: string;
  } = $props();
</script>

<span
  class="sk-bone {className}"
  style:width
  style:height
  style:border-radius={radius}
  aria-hidden="true"
></span>

<style>
  .sk-bone {
    display: block;
    flex-shrink: 0;
    background: color-mix(
      in srgb,
      var(--border-subtle) 65%,
      var(--surface-raised)
    );
    background-image: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--surface-raised) 55%, transparent) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    background-repeat: no-repeat;
    animation: sk-shimmer 1.35s ease-in-out infinite;
  }

  @keyframes sk-shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sk-bone {
      animation: none;
      background-image: none;
    }
  }
</style>
