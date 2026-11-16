// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Current FSP desktop keeps the bearer in angular-auth-oidc-client session blobs. */
export function getOidcAccessToken(
  storage: Storage = sessionStorage,
): string | null {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith("fsp.oidc.v1.")) continue;
    try {
      const data = JSON.parse(storage.getItem(key) ?? "") as {
        authnResult?: { access_token?: unknown };
        authzData?: unknown;
      };
      const fromResult = data.authnResult?.access_token;
      if (typeof fromResult === "string" && fromResult) return fromResult;
      if (
        typeof data.authzData === "string" &&
        data.authzData.startsWith("eyJ")
      ) {
        return data.authzData;
      }
    } catch {
      // ignore malformed oidc blobs
    }
  }
  return null;
}
