// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { MarkCommon } from "../../types/portal";
import { getGKValue, getCKValue } from "./marksHelpers";
import { t } from "../../i18n.svelte";

function rfc4180Escape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function hasNumericScore(m: MarkCommon): boolean {
  const txtRe = /-?\d+\.?\d*/;
  if (txtRe.test(m.averageMark ?? "")) return true;
  if (txtRe.test(m.averageMarkCN ?? "")) return true;
  if (m.markDTO) {
    for (const raw of Object.values(m.markDTO)) {
      if (typeof raw === "string" && txtRe.test(raw)) return true;
    }
  }
  return false;
}

function extractMilestones(
  markDTO: Record<string, unknown>,
): [string, string][] {
  const milestones: [string, string][] = [];
  if (!markDTO) return milestones;
  for (const [key, raw] of Object.entries(markDTO)) {
    if (raw === undefined || raw === null || raw === "") continue;
    const value = String(raw);
    if (
      /giữa Kỳ|giữa kì|giữa kỳ|Cuối Kỳ|cuối kì|cuối kỳ|TB cuối kỳ/i.test(key)
    ) {
      milestones.push([key, value]);
    }
  }
  return milestones;
}

export function exportGradesToCSV(
  gradesData: MarkCommon[],
  termName?: string,
): void {
  const rows: string[] = [];

  const header = [
    t("csv.subject"),
    t("csv.type"),
    t("csv.tx"),
    t("csv.midterm"),
    t("csv.final"),
    t("csv.semesterAvg"),
    t("csv.yearlyAvg"),
  ]
    .map(rfc4180Escape)
    .join(",");
  rows.push(header);

  for (const m of gradesData) {
    const type = hasNumericScore(m) ? t("csv.numeric") : t("csv.passFail");

    const milestones = extractMilestones(m.markDTO ?? {});
    const gk = getGKValue(milestones);
    const ck = getCKValue(milestones);

    const txValues: string[] = [];
    if (m.markDTO) {
      for (const [, raw] of Object.entries(m.markDTO)) {
        if (raw === undefined || raw === null || raw === "") continue;
        if (/^Đánh giá thường xuyên/i.test(String(raw))) {
          txValues.push(String(raw).trim());
        }
      }
    }
    const txStr = txValues.length > 0 ? txValues.join("; ") : "";

    const tb =
      m.averageMark !== undefined && m.averageMark !== null
        ? String(m.averageMark)
        : "";
    const cn =
      m.averageMarkCN !== undefined && m.averageMarkCN !== null
        ? String(m.averageMarkCN)
        : "";

    const row = [
      rfc4180Escape(m.subjectName),
      type,
      rfc4180Escape(txStr),
      rfc4180Escape(gk !== null ? String(gk) : ""),
      rfc4180Escape(ck !== null ? String(ck) : ""),
      rfc4180Escape(tb),
      rfc4180Escape(cn),
    ].join(",");

    rows.push(row);
  }

  const blob = new Blob([`\uFEFF${rows.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const safeTerm =
    termName?.replace(/[^a-z0-9]/gi, "-").replace(/^[-]+|[-]+$/gi, "") ||
    "grades";
  anchor.download = `diem-${safeTerm}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
