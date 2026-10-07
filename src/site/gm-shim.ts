// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

// Standalone-preview shim: the demo site is a plain web page (no userscript
// manager), so it installs localStorage-backed stand-ins for the small GM
// surface the UI touches (persistence + the optional chat request path).
// Must be the FIRST import of the site entry so module-scope readers (i18n,
// theme, runtime) see it before they evaluate.

window.GM_getValue = ((key, defaultValue) => {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw as unknown;
  }
}) as typeof GM_getValue;

window.GM_setValue = ((key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
}) as typeof GM_setValue;

window.GM_deleteValue = ((key) => {
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
