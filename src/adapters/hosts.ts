// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Host fragments claimed by live adapters. Keep in sync with each adapter's
 *  `hosts` field — used by the idle gate without importing heavy adapter modules. */
export const LIVE_HOST_FRAGMENTS = ["fsp"] as const;
