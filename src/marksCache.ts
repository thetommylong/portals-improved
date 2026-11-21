// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { MarkCommon, Term } from "./types/portal";
import { getJson, pageCacheKey, removeJson, setJson } from "./pageCache";

const MAX_TERMS_CACHED = 8;

export interface TermMarksCache {
  savedAt: number;
  marks: MarkCommon[];
}

/** Client-side TTL for marks/terms (24 hours). */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function marksKey(studentId: string, termId: string): string {
  return pageCacheKey("marks", studentId, termId);
}

function marksIndexKey(studentId: string): string {
  return pageCacheKey("marks", studentId, "index");
}

function termsKey(campusId: string): string {
  return pageCacheKey("terms", campusId);
}

export function readTermMarks(
  studentId: string,
  termId: string,
): TermMarksCache | null {
  const key = marksKey(studentId, termId);
  const raw = getJson<TermMarksCache>(key, null);
  if (!raw) return null;
  if (Date.now() - raw.savedAt > CACHE_TTL_MS) {
    removeJson(key);
    return null;
  }
  return raw;
}

export function writeTermMarks(
  studentId: string,
  termId: string,
  marks: MarkCommon[],
): void {
  setJson(marksKey(studentId, termId), {
    savedAt: Date.now(),
    marks,
  } satisfies TermMarksCache);

  const idx = marksIndexKey(studentId);
  const index: string[] = getJson<string[]>(idx, []) ?? [];
  if (!index.includes(termId)) {
    index.push(termId);
  }
  while (index.length > MAX_TERMS_CACHED) {
    const oldest = index.shift();
    if (oldest) removeJson(marksKey(studentId, oldest));
  }
  setJson(idx, index);
}

export interface TermsCache {
  savedAt: number;
  terms: Term[];
  defaultTermId: string;
}

export function readTerms(campusId: string): TermsCache | null {
  const key = termsKey(campusId);
  const raw = getJson<TermsCache>(key, null);
  if (!raw) return null;
  if (Date.now() - raw.savedAt > CACHE_TTL_MS) {
    removeJson(key);
    return null;
  }
  return raw;
}

export function writeTerms(
  campusId: string,
  terms: Term[],
  defaultTermId: string,
): void {
  setJson(termsKey(campusId), {
    savedAt: Date.now(),
    terms,
    defaultTermId,
  } satisfies TermsCache);
}
