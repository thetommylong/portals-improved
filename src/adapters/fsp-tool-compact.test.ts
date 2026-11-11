// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import type { ScheduleEntry, TimeSlot } from "../types/portal";
import { compactFspToolResult, compactScheduleEntry } from "./fsp-tool-compact";

function entry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: "uuid-should-drop",
    date: "2026-11-10",
    startDateTime: "2026-11-10T07:00:00",
    endDateTime: "2026-11-10T08:30:00",
    roomNo: "A201",
    lecturerName: "Dr. Test",
    subjectName: "Mathematics 1",
    expectedStyle: "offline",
    schedulePlanContent: "Long lesson plan that wastes tokens ".repeat(20),
    flmSessionNo: 3,
    className: "SE2026A",
    slotNo: 1,
    timeSlotId: "slot-uuid",
    status: "PRESENT",
    hasAbsenceRequest: false,
    absenceRequestReason: null,
    comment: "ignore",
    proctorComment: null,
    eduNextUrl: "https://fu.edunext.vn/course/1",
    googleMeetLink: "https://meet.google.com/abc",
    ...overrides,
  };
}

describe("compactFspToolResult", () => {
  it("compacts calendar entries and drops noisy fields", () => {
    const raw = [
      entry(),
      entry({ date: "2026-11-11", subjectName: "English" }),
    ];
    const compacted = compactFspToolResult(
      "getCalendarByStudentAndDateRange",
      raw,
    );

    expect(compacted).toEqual({
      count: 2,
      entries: [compactScheduleEntry(raw[0]), compactScheduleEntry(raw[1])],
    });

    const text = JSON.stringify(compacted);
    expect(text).not.toContain("uuid-should-drop");
    expect(text).not.toContain("edunext");
    expect(text).not.toContain("Long lesson plan");
    expect(text.length).toBeLessThan(JSON.stringify(raw, null, 2).length / 2);
  });

  it("compacts time slots to label + clock range", () => {
    const slots: TimeSlot[] = [
      {
        timeSlotId: "ts-1",
        slot: 1,
        startHour: 7,
        startMinute: 0,
        endHour: 8,
        endMinute: 30,
        slotLabel: "Slot 1",
        termId: "term",
        campusId: "campus",
        isAttendance: true,
        createdDate: "x",
        updatedDate: "x",
        logs: null,
      },
    ];

    expect(compactFspToolResult("getTimeSlotsByTerm", slots)).toEqual([
      { slot: 1, label: "Slot 1", start: "07:00", end: "08:30" },
    ]);
  });

  it("passes through unknown tools unchanged", () => {
    const payload = { foo: 1 };
    expect(compactFspToolResult("getCampus", payload)).toBe(payload);
  });
});
