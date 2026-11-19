<script lang="ts">
  // SPDX-License-Identifier: AGPL-3.0-only
  // Copyright (C) 2026 thetommylong

  import { flavors } from "@catppuccin/palette";
  import { untrack } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { i18n, t, type Locale } from "../../i18n.svelte";
  import {
    ACCENTS,
    DARK_FLAVORS,
    FLAVOR_OPTIONS,
    theme,
    type AccentChoice,
    type DarkFlavorChoice,
    type FlavorChoice,
  } from "../../theme.svelte";
  import {
    CHROME_OPTIONS,
    shellChrome,
    type ChromeChoice,
  } from "../../shellChrome.svelte";
  import { RELEASES_URL } from "../../onboarding";
  import { attachOverlayFocus, type OverlayFocusHandle } from "./overlayFocus";
  import { backdropFade, modalScale, popScale } from "./popTransition";

  let {
    open = $bindable(false),
    narrow = false,
    trigger,
    onReplayIntro,
  }: {
    open?: boolean;
    narrow?: boolean;
    /** Settings gear — outside-click ignores this node. */
    trigger?: HTMLElement;
    onReplayIntro?: () => void;
  } = $props();

  type SettingsTab = "look" | "lang" | "about";

  type Draft = {
    flavor: FlavorChoice;
    systemDark: DarkFlavorChoice;
    accent: AccentChoice;
    chrome: ChromeChoice;
    locale: Locale;
  };

  let settingsPop: HTMLDivElement | undefined = $state();
  let tab = $state<SettingsTab>("look");
  let langQuery = $state("");
  let denyFlash = $state(false);
  let baseline = $state<Draft>(capture());
  let draft = $state<Draft>(capture());

  const LOCALE_LABELS: Record<Locale, string> = {
    en: "English",
    vi: "Tiếng Việt",
  };

  const dirty = $derived(
    draft.flavor !== baseline.flavor ||
      draft.systemDark !== baseline.systemDark ||
      draft.accent !== baseline.accent ||
      draft.chrome !== baseline.chrome ||
      draft.locale !== baseline.locale,
  );

  const showSaveRow = $derived(dirty && tab !== "about");

  const filteredLocales = $derived(
    (["en", "vi"] as const).filter((id) => {
      const q = langQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        LOCALE_LABELS[id].toLowerCase().includes(q) ||
        id.toLowerCase().includes(q)
      );
    }),
  );

  function capture(): Draft {
    return {
      flavor: theme.flavor,
      systemDark: theme.systemDark,
      accent: theme.accent,
      chrome: shellChrome.chrome,
      locale: i18n.locale,
    };
  }

  function applyDraft(next: Draft) {
    theme.setFlavor(next.flavor);
    theme.setSystemDark(next.systemDark);
    theme.setAccent(next.accent);
    shellChrome.setChrome(next.chrome);
    i18n.setLocale(next.locale);
  }

  function patch(partial: Partial<Draft>) {
    draft = { ...draft, ...partial };
    applyDraft(draft);
  }

  function flavorSwatch(option: FlavorChoice): string {
    if (option === "system") {
      return `linear-gradient(135deg, ${flavors.latte.colors.base.hex} 50%, ${flavors.mocha.colors.base.hex} 50%)`;
    }
    return flavors[option].colors.base.hex;
  }

  function flavorLabel(option: FlavorChoice): string {
    if (option === "system") return t("settings.flavorSystem");
    return option[0].toUpperCase() + option.slice(1);
  }

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

  function deny() {
    denyFlash = false;
    queueMicrotask(() => {
      denyFlash = true;
    });
    window.setTimeout(() => {
      denyFlash = false;
    }, 450);
  }

  function tryClose() {
    if (!open) return;
    if (dirty) {
      deny();
      return;
    }
    open = false;
  }

  function selectTab(next: SettingsTab) {
    if (next === "about" && dirty) {
      deny();
      return;
    }
    tab = next;
  }

  function save() {
    baseline = { ...draft };
  }

  function discard() {
    draft = { ...baseline };
    applyDraft(baseline);
    denyFlash = false;
  }

  $effect(() => {
    if (!open) return;
    // Snapshot only when the dialog opens — do not re-track theme stores.
    untrack(() => {
      const snap = capture();
      baseline = snap;
      draft = { ...snap };
    });
    tab = "look";
    langQuery = "";
    denyFlash = false;
  });

  $effect(() => {
    if (!open || !settingsPop) return;
    const handle: OverlayFocusHandle = attachOverlayFocus(
      settingsPop,
      tryClose,
    );
    function onPointerdown(e: Event) {
      if (!(e.target instanceof Node)) return;
      const pop = settingsPop;
      if (pop && pop.contains(e.target)) return;
      if (trigger && trigger.contains(e.target)) return;
      tryClose();
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
        onclick={tryClose}
        transition:fade={backdropFade()}
      ></div>
    {/if}
    <div
      class="settings-pop"
      class:deny={denyFlash}
      bind:this={settingsPop}
      role="dialog"
      aria-modal="true"
      aria-label={t("aria.appearance")}
      tabindex="-1"
      transition:scale={narrow ? modalScale() : popScale()}
    >
      <div
        class="settings-segs"
        role="tablist"
        aria-label={t("aria.appearance")}
      >
        <button
          type="button"
          class="settings-seg"
          class:on={tab === "look"}
          role="tab"
          aria-selected={tab === "look"}
          onclick={() => selectTab("look")}
        >
          {t("settings.look")}
        </button>
        <button
          type="button"
          class="settings-seg"
          class:on={tab === "lang"}
          role="tab"
          aria-selected={tab === "lang"}
          onclick={() => selectTab("lang")}
        >
          {t("settings.language")}
        </button>
        <button
          type="button"
          class="settings-seg"
          class:on={tab === "about"}
          class:locked={dirty}
          role="tab"
          aria-selected={tab === "about"}
          aria-disabled={dirty}
          onclick={() => selectTab("about")}
        >
          {t("settings.about")}
        </button>
      </div>

      <div class="settings-body">
        {#if tab === "look"}
          <p class="settings-title">{t("settings.flavor")}</p>
          <div
            class="settings-flavors"
            role="radiogroup"
            tabindex="0"
            aria-label={t("settings.flavor")}
            onkeydown={(e) =>
              onRadioGroupKeydown(e, FLAVOR_OPTIONS, draft.flavor, (v) =>
                patch({ flavor: v as FlavorChoice }),
              )}
          >
            {#each FLAVOR_OPTIONS as option (option)}
              <button
                type="button"
                class="flavor-card"
                class:selected={draft.flavor === option}
                role="radio"
                aria-checked={draft.flavor === option}
                tabindex={draft.flavor === option ? 0 : -1}
                onclick={() => patch({ flavor: option })}
              >
                <span
                  class="flavor-swatch"
                  style:background={flavorSwatch(option)}
                ></span>
                <span class="flavor-label">{flavorLabel(option)}</span>
              </button>
            {/each}
          </div>
          {#if draft.flavor === "system"}
            <p class="settings-title">{t("settings.darkGroup")}</p>
            <div
              class="settings-flavors trio"
              role="radiogroup"
              tabindex="0"
              aria-label={t("settings.darkFlavor")}
              onkeydown={(e) =>
                onRadioGroupKeydown(e, DARK_FLAVORS, draft.systemDark, (v) =>
                  patch({ systemDark: v as DarkFlavorChoice }),
                )}
            >
              {#each DARK_FLAVORS as dark (dark)}
                <button
                  type="button"
                  class="settings-flavor"
                  class:selected={draft.systemDark === dark}
                  role="radio"
                  aria-checked={draft.systemDark === dark}
                  tabindex={draft.systemDark === dark ? 0 : -1}
                  onclick={() => patch({ systemDark: dark })}
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
              onRadioGroupKeydown(e, ACCENTS, draft.accent, (v) =>
                patch({ accent: v as AccentChoice }),
              )}
          >
            {#each ACCENTS as accent (accent)}
              <button
                type="button"
                class="accent-dot"
                class:selected={draft.accent === accent}
                style={`background: var(--${accent});`}
                role="radio"
                aria-checked={draft.accent === accent}
                tabindex={draft.accent === accent ? 0 : -1}
                aria-label={accent}
                title={accent}
                onclick={() => patch({ accent })}
              ></button>
            {/each}
          </div>
          <p class="settings-title">{t("settings.layout")}</p>
          <div
            class="layout-cards"
            role="radiogroup"
            tabindex="0"
            aria-label={t("settings.layoutGroup")}
            onkeydown={(e) =>
              onRadioGroupKeydown(e, CHROME_OPTIONS, draft.chrome, (v) =>
                patch({ chrome: v as ChromeChoice }),
              )}
          >
            {#each CHROME_OPTIONS as option (option)}
              <button
                type="button"
                class="layout-card"
                class:selected={draft.chrome === option}
                role="radio"
                aria-checked={draft.chrome === option}
                tabindex={draft.chrome === option ? 0 : -1}
                onclick={() => patch({ chrome: option })}
              >
                <span
                  class="layout-mini"
                  class:flush={option === "flush"}
                  class:float={option === "floating"}
                ></span>
                <strong>
                  {option === "flush"
                    ? t("settings.layoutFlush")
                    : t("settings.layoutFloating")}
                </strong>
                <small>
                  {option === "flush"
                    ? t("settings.layoutFlushHint")
                    : t("settings.layoutFloatingHint")}
                </small>
              </button>
            {/each}
          </div>
        {:else if tab === "lang"}
          <p class="settings-hint">{t("settings.languageHint")}</p>
          <div class="lang-page">
            <input
              class="lang-search"
              type="search"
              bind:value={langQuery}
              placeholder={t("settings.langSearch")}
              autocomplete="off"
              aria-label={t("settings.langSearch")}
            />
            <ul
              class="lang-list"
              role="listbox"
              aria-label={t("settings.languageGroup")}
            >
              {#each filteredLocales as id (id)}
                <li>
                  <button
                    type="button"
                    class="lang-option"
                    class:on={draft.locale === id}
                    role="option"
                    aria-selected={draft.locale === id}
                    onclick={() => patch({ locale: id })}
                  >
                    {LOCALE_LABELS[id]}
                  </button>
                </li>
              {:else}
                <li class="lang-empty">{t("settings.langEmpty")}</li>
              {/each}
            </ul>
          </div>
        {:else}
          <div class="about">
            <h2 class="about-name">{t("settings.productName")}</h2>
            <p class="about-detail">
              v{__BUILD__.version} · {__BUILD__.commit}
            </p>
            <p class="about-disclaimer">{t("settings.disclaimer")}</p>
            <div class="about-actions">
              <a
                class="about-link"
                href="https://github.com/thetommylong/portals-improved/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
              >
                AGPL-3.0-only
              </a>
              {#if onReplayIntro}
                <button type="button" class="about-btn" onclick={onReplayIntro}>
                  {t("settings.replayIntro")}
                </button>
              {/if}
              <a
                class="about-link"
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t("settings.whatsNew")}
              </a>
            </div>
          </div>
        {/if}
      </div>

      {#if showSaveRow}
        <div class="save-row">
          <button type="button" class="btn-discard" onclick={discard}>
            {t("settings.dontSave")}
          </button>
          <button type="button" class="btn-save" onclick={save}>
            {t("settings.save")}
          </button>
        </div>
      {/if}
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
    width: 288px;
    background: var(--base);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    padding: 14px 14px 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    transform-origin: top right;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .settings-pop.deny {
    border-color: color-mix(in srgb, var(--red) 80%, var(--border-strong));
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.35),
      0 0 0 2px color-mix(in srgb, var(--red) 45%, transparent);
    animation: settings-shake 0.42s ease;
  }

  @keyframes settings-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-6px);
    }
    40% {
      transform: translateX(6px);
    }
    60% {
      transform: translateX(-4px);
    }
    80% {
      transform: translateX(4px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-pop.deny {
      animation: none;
    }
  }

  .settings-segs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 4px;
    margin: 0 0 12px;
    border-radius: 10px;
    background: var(--mantle);
  }

  .settings-seg {
    border: 0;
    border-radius: 8px;
    min-height: var(--hit-step);
    background: transparent;
    color: var(--text-secondary);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .settings-seg.on {
    background: var(--surface-base);
    color: var(--text);
  }

  .settings-seg.locked {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .settings-seg:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .settings-body {
    height: 400px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
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

  .settings-hint {
    margin: 0 0 10px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-secondary);
    flex-shrink: 0;
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

  .flavor-card {
    display: grid;
    gap: 6px;
    justify-items: start;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: var(--surface-base);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.12s ease,
      box-shadow 0.12s ease;
  }

  .flavor-card:hover {
    background: var(--surface1);
  }

  .flavor-card.selected {
    border-color: var(--accent);
    color: var(--accent-strong);
    box-shadow: 0 0 0 2px var(--accent);
  }

  .flavor-card:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .flavor-swatch {
    display: block;
    width: 100%;
    height: 28px;
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 14%, transparent);
  }

  .flavor-label {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
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
  .accent-dot:focus-visible,
  .layout-card:focus-visible {
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
    grid-template-columns: repeat(7, var(--hit-dot));
    gap: 8px 10px;
    justify-content: start;
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

  .layout-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 0;
  }

  .layout-card {
    display: grid;
    gap: 4px;
    justify-items: start;
    border: 1px solid transparent;
    border-radius: 8px;
    background: var(--surface-base);
    padding: 8px;
    cursor: pointer;
    color: var(--text);
    font: inherit;
    text-align: left;
    transition:
      background 0.12s ease,
      box-shadow 0.12s ease;
  }

  .layout-card:hover {
    background: var(--surface1);
  }

  .layout-card.selected {
    border-color: var(--accent);
    color: var(--accent-strong);
    box-shadow: 0 0 0 2px var(--accent);
  }

  .layout-mini {
    display: block;
    width: 100%;
    height: 40px;
    border-radius: 6px;
    margin-bottom: 2px;
    background: var(--mantle);
    position: relative;
  }

  .layout-mini.flush::before {
    content: "";
    position: absolute;
    inset: 0;
    border: 1px dashed color-mix(in srgb, var(--accent) 50%, transparent);
  }

  .layout-mini.float::before {
    content: "";
    position: absolute;
    inset: 6px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .layout-card strong {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
  }

  .layout-card small {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .layout-card.selected small {
    color: color-mix(in srgb, var(--accent-strong) 70%, var(--text-secondary));
  }

  .lang-page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    background: var(--mantle);
    overflow: hidden;
  }

  .lang-search {
    width: 100%;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    background: transparent;
    color: var(--text);
    padding: 10px 12px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    outline: none;
    flex-shrink: 0;
  }

  .lang-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px;
    margin: 0;
    list-style: none;
  }

  .lang-option {
    width: 100%;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    padding: 10px 12px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .lang-option:hover {
    background: var(--surface-base);
  }

  .lang-option.on {
    color: var(--accent-strong);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .lang-option:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .lang-empty {
    padding: 12px;
    color: var(--text-secondary);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
  }

  .about {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 4px;
    padding: 4px 2px 0;
  }

  .about-name {
    margin: 0;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }

  .about-detail {
    margin: 0 0 8px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .about-disclaimer {
    margin: 0 0 12px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .about-actions {
    display: grid;
    gap: 6px;
    justify-items: center;
  }

  .about-link {
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--info-ink);
    text-decoration: none;
  }

  .about-link:hover {
    text-decoration: underline;
  }

  .about-btn {
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    color: var(--info-ink);
    cursor: pointer;
  }

  .about-btn:hover {
    text-decoration: underline;
  }

  .about-btn:focus-visible,
  .about-link:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
  }

  .save-row {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid color-mix(in srgb, var(--text) 10%, transparent);
  }

  .btn-discard {
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-save {
    height: 34px;
    padding: 0 16px;
    border: 0;
    border-radius: 8px;
    background: var(--accent-strong);
    color: var(--base);
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-discard:focus-visible,
  .btn-save:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 1px;
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
      width: min(340px, 100%);
      max-height: 80vh;
      overflow-y: auto;
      transform-origin: center center;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    }
  }
</style>
