// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { MessageKey } from "../../i18n.svelte";
import type { IconName } from "../icons";

export type PageId =
  "home" | "feedback" | "homeworks" | "marks" | "clubs" | "events" | "standing";

export interface NavItem {
  id: PageId;
  label: MessageKey;
  icon: IconName;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "nav.home", icon: "home" },
  { id: "feedback", label: "nav.feedback", icon: "chat" },
  { id: "homeworks", label: "nav.homeworks", icon: "assignment" },
  { id: "marks", label: "nav.marks", icon: "done_all" },
  { id: "clubs", label: "nav.clubs", icon: "group" },
  { id: "events", label: "nav.events", icon: "event" },
  { id: "standing", label: "nav.standing", icon: "shield_person" },
];
