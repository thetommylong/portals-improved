// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Active page fetch state — header refresh icon spins while true. */
class PageLoading {
  active = $state(false);
}

export const pageLoading = new PageLoading();
