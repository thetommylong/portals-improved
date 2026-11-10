// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

// Standalone-preview shim: the demo site is a plain web page (no userscript
// manager), so it installs stand-ins for the small GM surface the UI touches
// (persistence + the optional chat request path).
// Must be the FIRST import of the site entry so module-scope readers (i18n,
// theme, runtime) see it before they evaluate.
//
// Storage choice: non-secret prefs stay in localStorage. API keys
// (`fsp:sdk:api_key`) are memory-only — never written to page-readable
// localStorage/sessionStorage on the demo. Refresh loses the demo key; that
// is intentional. Real installs use Tampermonkey/Violentmonkey GM storage.

const memoryStore = new Map<string, string>();

/** Demo must not park API keys in page-readable web storage. */
function isMemoryOnlyKey(key: string): boolean {
  return key === "fsp:sdk:api_key";
}

// Drop any pre-fix leftovers so a page script cannot read an old key.
localStorage.removeItem("fsp:sdk:api_key");

window.GM_getValue = ((key, defaultValue) => {
  if (isMemoryOnlyKey(key)) {
    const raw = memoryStore.get(key);
    if (raw === undefined) return defaultValue;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw as unknown;
    }
  }
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw as unknown;
  }
}) as typeof GM_getValue;

window.GM_setValue = ((key, value) => {
  const encoded = JSON.stringify(value);
  if (isMemoryOnlyKey(key)) {
    memoryStore.set(key, encoded);
    return;
  }
  localStorage.setItem(key, encoded);
}) as typeof GM_setValue;

window.GM_deleteValue = ((key) => {
  if (isMemoryOnlyKey(key)) {
    memoryStore.delete(key);
    return;
  }
  localStorage.removeItem(key);
}) as typeof GM_deleteValue;

window.GM_xmlhttpRequest = ((details) => {
  const { onload, onerror, ontimeout, timeout } = details;
  const controller = new AbortController();
  const timer = timeout
    ? setTimeout(() => {
        controller.abort();
        (ontimeout as (() => void) | undefined)?.();
      }, timeout)
    : undefined;

  void (async () => {
    try {
      const res = await fetch(details.url, {
        method: details.method ?? "GET",
        headers: details.headers,
        body: details.data,
        signal: controller.signal,
      });
      const responseText = await res.text();
      let response: unknown = responseText;
      if (details.responseType === "json") {
        try {
          response = JSON.parse(responseText);
        } catch {
          response = responseText;
        }
      }
      const event = {
        status: res.status,
        statusText: res.statusText,
        response,
        responseText,
        responseXML: null,
        responseHeaders: "",
        readyState: 4,
        finalUrl: res.url,
        context: details.context,
      };
      (onload as ((event: unknown) => void) | undefined)?.call(null, event);
    } catch {
      (onerror as ((event: unknown) => void) | undefined)?.call(null, {
        error: "Network error",
        status: 0,
        responseText: "",
        responseHeaders: "",
        readyState: 4,
        response: null,
        responseXML: null,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  return { abort: () => controller.abort() };
}) as typeof GM_xmlhttpRequest;

export {};
