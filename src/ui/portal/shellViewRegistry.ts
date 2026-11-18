// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { PageId } from "./navCatalog";

/** Feature flags the shell uses to decide whether a nav chunk should load. */
export type ViewFeatureFlags = {
  schedule: boolean;
  marks: boolean;
  feedback: boolean;
  homeworks: boolean;
  events: boolean;
  standing: boolean;
  clubs: boolean;
};

/** Which view component is already loaded for each nav id. */
export type ViewLoadedFlags = Partial<Record<PageId, boolean>>;

/**
 * True when the active nav's feature is on but its lazy chunk is not yet
 * mounted — PortalShell shows ViewChunkSkeleton while this is true.
 */
export function viewChunkPending(
  activeNav: PageId,
  features: ViewFeatureFlags,
  loaded: ViewLoadedFlags,
): boolean {
  switch (activeNav) {
    case "home":
      return features.schedule && !loaded.home;
    case "marks":
      return features.marks && !loaded.marks;
    case "feedback":
      return features.feedback && !loaded.feedback;
    case "homeworks":
      return features.homeworks && !loaded.homeworks;
    case "events":
      return features.events && !loaded.events;
    case "standing":
      return features.standing && !loaded.standing;
    case "clubs":
      return features.clubs && !loaded.clubs;
  }
}
