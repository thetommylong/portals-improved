<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { fade, scale } from "svelte/transition";
  import { i18n, t } from "../../i18n.svelte";
  import {
    ACCENTS,
    DARK_FLAVORS,
    FLAVOR_OPTIONS,
    theme,
  } from "../../theme.svelte";
  import { CHROME_OPTIONS, shellChrome } from "../../shellChrome.svelte";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { backdropFade, modalScale, popScale } from "./popTransition";

  let {
    open = $bindable(false),
    narrow = false,
    trigger,
  }: {
    open?: boolean;
    narrow?: boolean;
    /** Settings gear — outside-click ignores this node. */
    trigger?: HTMLElement;
  } = $props();

  let settingsPop: HTMLDivElement | undefined = $state();

  /** Arrow/Home/End navigation for settings role=radiogroup clusters. */
  function onRadioGroupKeydown(
    e: KeyboardEvent,
    options: readonly string[],
    current: string,
    set: (value: string) => void,
  ) {
    const keys = [
      "ArrowRight",
      "ArrowDown",
      "ArrowLeft",
      "ArrowUp",
      "Home",
      "End",
    ];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = Math.max(0, options.indexOf(current));
    let next = i;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (i + 1) % options.length;
    else next = (i - 1 + options.length) % options.length;
    const value = options[next];
    if (value === undefined) return;
    set(value);
    const group = e.currentTarget as HTMLElement;
    const radios = group.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[next]?.focus();
  }

  function close() {
    if (!open) return;
    open = false;
  }

  $effect(() => {
    if (!open || !settingsPop) return;
    const handle: OverlayFocusHandle = attachOverlayFocus(settingsPop, close);
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      const pop = settingsPop;
      if (pop && pop.contains(e.target)) return;
      if (trigger && trigger.contains(e.target)) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerdown);
    return () => {
      document.removeEventListener("pointerdown", onPointerdown);
      handle.release();
    };
  });
</script>

{#if open}
  <div class="settings-layer" class:as-modal={narrow}>
    {#if narrow}
      <div
        class="settings-scrim"
        role="presentation"
        onclick={close}
        transition:fade={backdropFade()}
      ></div>
    {/if}
    <div
      class="settings-pop"
      bind:this={settingsPop}
      role="dialog"
      aria-modal="true"
      aria-label={t("aria.appearance")}
      tabindex="-1"
      transition:scale={narrow ? modalScale() : popScale()}
    >
      <p class="settings-title">{t("settings.theme")}</p>
      <div
        class="settings-flavors"
        role="radiogroup"
        tabindex="0"
        aria-label={t("settings.flavor")}
        onkeydown={(e) =>
          onRadioGroupKeydown(e, FLAVOR_OPTIONS, theme.flavor, (v) =>
            theme.setFlavor(v as (typeof FLAVOR_OPTIONS)[number]),
          )}
      >
        {#each FLAVOR_OPTIONS as option (option)}
          <button
            class="settings-flavor"
            class:selected={theme.flavor === option}
            role="radio"
            aria-checked={theme.flavor === option}
            tabindex={theme.flavor === option ? 0 : -1}
            onclick={() => theme.setFlavor(option)}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        {/each}
      </div>
      {#if theme.flavor === "system"}
        <p class="settings-title">{t("settings.darkGroup")}</p>
        <div
          class="settings-flavors trio"
          role="radiogroup"
          tabindex="0"
          aria-label={t("settings.darkFlavor")}
          onkeydown={(e) =>
            onRadioGroupKeydown(e, DARK_FLAVORS, theme.systemDark, (v) =>
              theme.setSystemDark(v as (typeof DARK_FLAVORS)[number]),
            )}
        >
          {#each DARK_FLAVORS as dark (dark)}
            <button
              class="settings-flavor"
              class:selected={theme.systemDark === dark}
              role="radio"
              aria-checked={theme.systemDark === dark}
              tabindex={theme.systemDark === dark ? 0 : -1}
              onclick={() => theme.setSystemDark(dark)}
            >
              {dark[0].toUpperCase() + dark.slice(1)}
            </button>
          {/each}
        </div>
      {/if}
      <p class="settings-title">{t("settings.accent")}</p>
      <div
        class="settings-accents"
        role="radiogroup"
        tabindex="0"
        aria-label={t("settings.accentColor")}
        onkeydown={(e) =>
          onRadioGroupKeydown(e, ACCENTS, theme.accent, (v) =>
            theme.setAccent(v as (typeof ACCENTS)[number]),
          )}
      >
        {#each ACCENTS as accent (accent)}
          <button
            class="accent-dot"
            class:selected={theme.accent === accent}
            style={`background: var(--${accent});`}
            role="radio"
            aria-checked={theme.accent === accent}
            tabindex={theme.accent === accent ? 0 : -1}
            aria-label={accent}
            title={accent}
            onclick={() => theme.setAccent(accent)}
          ></button>
        {/each}
      </div>
      <p class="settings-title">{t("settings.language")}</p>
      <select
        class="settings-select"
        aria-label={t("settings.languageGroup")}
        value={i18n.locale}
        onchange={(e) => {
          const next = (e.currentTarget as HTMLSelectElement).value;
          if (next === "vi" || next === "en") i18n.setLocale(next);
        }}
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
      <p class="settings-title">{t("settings.layout")}</p>
      <div
        class="settings-flavors"
        role="radiogroup"
        tabindex="0"
        aria-label={t("settings.layoutGroup")}
        onkeydown={(e) =>
          onRadioGroupKeydown(e, CHROME_OPTIONS, shellChrome.chrome, (v) =>
            shellChrome.setChrome(v as (typeof CHROME_OPTIONS)[number]),
          )}
      >
        {#each CHROME_OPTIONS as option (option)}
          <button
            class="settings-flavor"
            class:selected={shellChrome.chrome === option}
            role="radio"
            aria-checked={shellChrome.chrome === option}
            tabindex={shellChrome.chrome === option ? 0 : -1}
            onclick={() => shellChrome.setChrome(option)}
          >
            {option === "flush"
              ? t("settings.layoutFlush")
              : t("settings.layoutFloating")}
          </button>
        {/each}
      </div>
      <hr class="settings-sep" />
      <p class="settings-title">{t("settings.about")}</p>
      <div class="about">
        <span class="about-name">portals-improved</span>
        <span class="about-detail">
          v{__BUILD__.version} · {__BUILD__.commit}
        </span>
        <a
          class="about-link"
          href="https://github.com/thetommylong/portals-improved/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          AGPL-3.0-only
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-layer {
    display: contents;
  }

  .settings-scrim {
    display: none;
  }

  .settings-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    width: 240px;
    background: var(--base);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    transform-origin: top right;
  }

  .settings-title {
    margin: 0 0 8px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .settings-flavors {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 14px;
  }

  .settings-flavors.trio {
    grid-template-columns: repeat(3, 1fr);
  }

  .settings-flavor {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--text);
    background: var(--surface-base);
    border: 1px solid transparent;
    border-radius: 8px;
    min-height: var(--hit-step);
    padding: 6px 4px;
    cursor: pointer;
    transition:
      background 0.12s ease,
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }

  .settings-flavor:focus-visible,
  .accent-dot:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .settings-flavor:active {
    transform: scale(0.99);
  }

  .settings-flavor:hover {
    background: var(--surface1);
  }

  .settings-flavor.selected {
    border-color: var(--accent);
    color: var(--accent-strong);
    font-weight: 600;
    box-shadow: 0 0 0 2px var(--accent);
  }

  .settings-accents {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--hit-dot), 1fr));
    gap: 6px;
    margin-bottom: 14px;
  }

  .accent-dot {
    width: var(--hit-dot);
    height: var(--hit-dot);
    padding: var(--hit-dot-pad);
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    justify-self: center;
    background-clip: content-box;
  }

  .accent-dot.selected {
    border-color: var(--text);
  }

  .settings-select {
    display: block;
    width: 100%;
    margin-bottom: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--text);
    background: var(--surface-base);
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .settings-select:hover {
    background: var(--surface1);
  }

  .settings-select:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .settings-sep {
    border: none;
    border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    margin: 12px 0;
  }

  .about {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .about-name {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .about-detail {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .about-link {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    color: var(--info-ink);
    text-decoration: none;
  }

  .about-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .settings-layer.as-modal {
      display: grid;
      place-items: center;
      position: fixed;
      inset: 0;
      z-index: 25;
      padding: 16px;
    }

    .settings-layer.as-modal .settings-scrim {
      display: block;
      position: absolute;
      inset: 0;
      margin: 0;
      border: none;
      padding: 0;
      background: color-mix(in srgb, var(--mantle) 55%, transparent);
      cursor: pointer;
    }

    .settings-layer.as-modal .settings-pop {
      position: relative;
      top: auto;
      right: auto;
      z-index: 1;
      width: min(320px, 100%);
      max-height: 80vh;
      overflow-y: auto;
      transform-origin: center center;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    }
  }
</style>
