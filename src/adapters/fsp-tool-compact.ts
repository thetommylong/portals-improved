// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { ScheduleEntry, TimeSlot } from "../types/portal";

/** Fields the model needs for schedule Q&A — drops URLs, UUIDs, long plan text. */
export interface CompactScheduleEntry {
  date: string;
  start: string;
  end: string;
  subject: string;
  room: string;
  lecturer: string;
  className: string;
  slot: number;
  status: ScheduleEntry["status"];
  hasAbsenceRequest: boolean;
  absenceRequestReason: string | null;
}

export interface CompactTimeSlot {
  slot: number;
  label: string;
  start: string;
  end: string;
}

function isScheduleEntry(value: unknown): value is ScheduleEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ScheduleEntry).startDateTime === "string" &&
    typeof (value as ScheduleEntry).subjectName === "string"
  );
}

function isTimeSlot(value: unknown): value is TimeSlot {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as TimeSlot).slot === "number" &&
    typeof (value as TimeSlot).slotLabel === "string"
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function compactScheduleEntry(
  entry: ScheduleEntry,
): CompactScheduleEntry {
  return {
    date: entry.date,
    start: entry.startDateTime,
    end: entry.endDateTime,
    subject: entry.subjectName,
    room: entry.roomNo,
    lecturer: entry.lecturerName,
    className: entry.className,
    slot: entry.slotNo,
    status: entry.status,
    hasAbsenceRequest: entry.hasAbsenceRequest,
    absenceRequestReason: entry.absenceRequestReason,
  };
}

export function compactTimeSlot(slot: TimeSlot): CompactTimeSlot {
  return {
    slot: slot.slot,
    label: slot.slotLabel,
    start: `${pad2(slot.startHour)}:${pad2(slot.startMinute)}`,
    end: `${pad2(slot.endHour)}:${pad2(slot.endMinute)}`,
  };
}

/**
 * FSP-shaped tool compaction for live + mock adapters (shared DTOs).
 * Unknown tools / shapes pass through unchanged.
 */
export function compactFspToolResult(
  toolName: string,
  result: unknown,
): unknown {
  if (toolName === "getCalendarByStudentAndDateRange") {
    if (!Array.isArray(result)) return result;
    const entries = result.filter(isScheduleEntry).map(compactScheduleEntry);
    return {
      count: entries.length,
      entries,
    };
  }

  if (toolName === "getTimeSlotsByTerm") {
    if (!Array.isArray(result)) return result;
    return result.filter(isTimeSlot).map(compactTimeSlot);
  }

  return result;
}
