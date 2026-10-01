// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

export function parseScore(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function getMilestoneValue(
  milestones: [string, string][],
  keyRegex: RegExp,
): number | null {
  for (const [key, value] of milestones) {
    if (keyRegex.test(key)) {
      const n = parseScore(value);
      if (n !== null) return n;
    }
  }
  return null;
}

const GK_REGEX = /giữa\s*k[ìiỳ]/i;
const CK_REGEX = /cuối\s*k[ìiỳ]/i;
const TX_REGEX = /^Đánh giá thường xuyên/i;

export function getGKValue(milestones: [string, string][]): number | null {
  return getMilestoneValue(milestones, GK_REGEX);
}

export function getCKValue(milestones: [string, string][]): number | null {
  return getMilestoneValue(milestones, CK_REGEX);
}

export function getTXNumbers(
  dto: Record<string, unknown> | undefined,
): number[] {
  const out: number[] = [];
  if (!dto) return out;
  const entries = Object.entries(dto).filter(([key]) => TX_REGEX.test(key));
  entries.sort(
    (a, b) =>
      (Number(a[0].match(/\d+/)?.[0]) || 0) -
      (Number(b[0].match(/\d+/)?.[0]) || 0),
  );
  for (const [, raw] of entries) {
    const n = parseScore(raw);
    if (n !== null) out.push(n);
  }
  return out;
}

export function getTXEntries(
  dto: Record<string, unknown> | undefined,
): [string, number][] {
  const out: [string, number][] = [];
  if (!dto) return out;
  const entries = Object.entries(dto).filter(([key]) => TX_REGEX.test(key));
  entries.sort(
    (a, b) =>
      (Number(a[0].match(/\d+/)?.[0]) || 0) -
      (Number(b[0].match(/\d+/)?.[0]) || 0),
  );
  for (const [key, raw] of entries) {
    const n = parseScore(raw);
    if (n !== null) out.push([key, n]);
  }
  return out;
}

export function semesterAverage(
  txValues: number[],
  gk: number | null,
  ck: number | null,
): number | null {
  if (txValues.length === 0 && gk === null && ck === null) return null;
  const sumTx = txValues.reduce((a, b) => a + b, 0);
  const n = txValues.length;
  if (gk !== null && ck !== null) {
    return (sumTx + gk * 2 + ck * 3) / (n + 5);
  }
  if (gk !== null && ck === null) {
    return (sumTx + gk * 2) / (n + 5);
  }
  if (gk === null && ck !== null) {
    return (sumTx + ck * 3) / (n + 5);
  }
  return sumTx / (n + 5);
}

export function requiredFinal(
  txNumbers: number[],
  gk: number | null,
  target: number,
): { value: number; status: "impossible" | "secured" | "ok" | "unknown" } {
  const n = txNumbers.length;
  const sumTx = txNumbers.reduce((a, b) => a + b, 0);
  const denominator = n + 5;
  let numerator = target * denominator - sumTx;
  if (gk !== null) numerator -= gk * 2;
  const value = numerator / 3;
  if (gk === null) return { value, status: "unknown" };
  if (value > 10) return { value, status: "impossible" };
  if (value <= 0) return { value, status: "secured" };
  return { value, status: "ok" };
}

export function yearlyAverage(
  tbSibling: number | null,
  tbProjected: number,
): number | null {
  if (tbSibling === null) return null;
  return (tbSibling + tbProjected * 2) / 3;
}
