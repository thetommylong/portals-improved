// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { PageId } from "./navCatalog";
import {
  viewChunkPending,
  type ViewFeatureFlags,
  type ViewLoadedFlags,
} from "./shellViewRegistry";

type ScheduleView = typeof import("./ScheduleView.svelte").default;
type MarksView = typeof import("./MarksView.svelte").default;
type FeedbackView = typeof import("./FeedbackView.svelte").default;
type HomeworksView = typeof import("./HomeworksView.svelte").default;
type EventsView = typeof import("./EventsView.svelte").default;
type StandingView = typeof import("./StandingView.svelte").default;
type ClubsView = typeof import("./ClubsView.svelte").default;

/** Lazy nav view components + loaders for PortalShell. */
export class ShellViewRegistry {
  ScheduleViewComp = $state<ScheduleView | null>(null);
  MarksViewComp = $state<MarksView | null>(null);
  FeedbackViewComp = $state<FeedbackView | null>(null);
  HomeworksViewComp = $state<HomeworksView | null>(null);
  EventsViewComp = $state<EventsView | null>(null);
  StandingViewComp = $state<StandingView | null>(null);
  ClubsViewComp = $state<ClubsView | null>(null);

  loadedFlags(): ViewLoadedFlags {
    return {
      home: !!this.ScheduleViewComp,
      marks: !!this.MarksViewComp,
      feedback: !!this.FeedbackViewComp,
      homeworks: !!this.HomeworksViewComp,
      events: !!this.EventsViewComp,
      standing: !!this.StandingViewComp,
      clubs: !!this.ClubsViewComp,
    };
  }

  isPending(activeNav: PageId, features: ViewFeatureFlags): boolean {
    return viewChunkPending(activeNav, features, this.loadedFlags());
  }

  /**
   * Kick dynamic import for `nav` if that chunk is still null.
   * `stillActive` guards against stale assigns after a fast nav switch.
   */
  ensureLoaded(nav: PageId, stillActive: () => boolean): void {
    switch (nav) {
      case "home":
        if (!this.ScheduleViewComp) {
          void import("./ScheduleView.svelte").then((m) => {
            if (!stillActive()) return;
            this.ScheduleViewComp = m.default;
          });
        }
        break;
      case "marks":
        if (!this.MarksViewComp) {
          void import("./MarksView.svelte").then((m) => {
            if (!stillActive()) return;
            this.MarksViewComp = m.default;
          });
        }
        break;
      case "feedback":
        if (!this.FeedbackViewComp) {
          void import("./FeedbackView.svelte").then((m) => {
            if (!stillActive()) return;
            this.FeedbackViewComp = m.default;
          });
        }
        break;
      case "homeworks":
        if (!this.HomeworksViewComp) {
          void import("./HomeworksView.svelte").then((m) => {
            if (!stillActive()) return;
            this.HomeworksViewComp = m.default;
          });
        }
        break;
      case "events":
        if (!this.EventsViewComp) {
          void import("./EventsView.svelte").then((m) => {
            if (!stillActive()) return;
            this.EventsViewComp = m.default;
          });
        }
        break;
      case "standing":
        if (!this.StandingViewComp) {
          void import("./StandingView.svelte").then((m) => {
            if (!stillActive()) return;
            this.StandingViewComp = m.default;
          });
        }
        break;
      case "clubs":
        if (!this.ClubsViewComp) {
          void import("./ClubsView.svelte").then((m) => {
            if (!stillActive()) return;
            this.ClubsViewComp = m.default;
          });
        }
        break;
    }
  }
}
