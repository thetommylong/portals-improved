// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { gmGetMigrate, gmSetMigrate } from "./gmPrefs";
import en from "./i18n/en.json";
import vi from "./i18n/vi.json";

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export type MessageKey = keyof typeof en;

const DICTS: Record<Locale, Record<MessageKey, string>> = { en, vi };

const LOCALE_KEY = "locale";

function storedLocale(): Locale {
  const raw = gmGetMigrate<string>(LOCALE_KEY, "fsp:locale", "");
  if (raw === "vi" || raw === "en") return raw;
  if (navigator.language.toLowerCase().startsWith("vi")) return "vi";
  return "en";
}

class LocaleStore {
  locale = $state<Locale>(storedLocale());

  setLocale(next: Locale): void {
    this.locale = next;
    gmSetMigrate(LOCALE_KEY, "fsp:locale", next);
    if (document.documentElement) {
      document.documentElement.lang = next;
    }
  }
}

export const i18n = new LocaleStore();

// mirror the persisted/auto-detected setting on <html lang> (used late in case
// the module loads before <html> exists)
if (document.documentElement) {
  document.documentElement.lang = i18n.locale;
}

export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let out: string = DICTS[i18n.locale][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${name}}`, String(value));
    }
  }
  return out;
}
