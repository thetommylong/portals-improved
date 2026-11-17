// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

const OIDC_KEY_PREFIX = "fsp.oidc.v1.";

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isJwtExpired(
  payload: Record<string, unknown>,
  nowSec: number = Date.now() / 1000,
): boolean {
  const exp = payload.exp;
  return typeof exp !== "number" || nowSec >= exp;
}

function accessTokenFromOidcBlob(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as {
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
  return null;
}

/** Current FSP desktop keeps the bearer in angular-auth-oidc-client session blobs. */
export function getOidcAccessToken(
  storage: Storage = sessionStorage,
): string | null {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(OIDC_KEY_PREFIX)) continue;
    const token = accessTokenFromOidcBlob(storage.getItem(key) ?? "");
    if (token) return token;
  }
  return null;
}

/** Bearer only if present and JWT exp is still in the future. */
export function getValidOidcAccessToken(
  storage: Storage = sessionStorage,
  nowSec: number = Date.now() / 1000,
): string | null {
  const token = getOidcAccessToken(storage);
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload || isJwtExpired(payload, nowSec)) return null;
  return token;
}

/**
 * Copy `fsp.oidc.v1.*` blobs that carry a non-expired access token from one
 * Storage into another (popup → opener after SSO).
 */
export function copyFreshOidcBlobs(
  from: Storage,
  to: Storage,
  nowSec: number = Date.now() / 1000,
): boolean {
  let copied = false;
  for (let i = 0; i < from.length; i++) {
    const key = from.key(i);
    if (!key?.startsWith(OIDC_KEY_PREFIX)) continue;
    const raw = from.getItem(key);
    if (raw == null) continue;
    const token = accessTokenFromOidcBlob(raw);
    if (!token) continue;
    const payload = parseJwtPayload(token);
    if (!payload || isJwtExpired(payload, nowSec)) continue;
    to.setItem(key, raw);
    copied = true;
  }
  return copied;
}
