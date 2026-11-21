// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { gmGetMigrate, gmSetMigrate } from "./gmPrefs";

function oldKey(key: string): string {
  return `fsp:${key}`;
}

export function setSecret(key: string, value: string): void {
  gmSetMigrate(key, oldKey(key), value);
}

export function getSecret(key: string): string | null {
  return gmGetMigrate<string | null>(key, oldKey(key), null);
}

export function deleteSecret(key: string): void {
  GM_deleteValue(key);
  GM_deleteValue(oldKey(key));
}
