// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { MarkCommon, Term } from "./types/portal";

const MARKS_PREFIX = "fsp:marks:";
const TERMS_PREFIX = "fsp:terms:";
const MAX_TERMS_CACHED = 8;

export interface TermMarksCache {
  savedAt: number;
  marks: MarkCommon[];
}

/** Client-side TTL for marks/terms (24 hours). */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function readTermMarks(
  studentId: string,
  termId: string,
): TermMarksCache | null {
  const raw = GM_getValue<TermMarksCache | null>(
    `${MARKS_PREFIX}${studentId}:${termId}`,
    null,
  );
  if (!raw) return null;
  if (Date.now() - raw.savedAt > CACHE_TTL_MS) {
    GM_deleteValue(`${MARKS_PREFIX}${studentId}:${termId}`);
    return null;
  }
  return raw;
}

export function clearMarksCaches(studentId?: string): void {
  if (!studentId) return;
  const indexKey = `${MARKS_PREFIX}${studentId}:index`;
  const index: string[] = GM_getValue<string[]>(indexKey, []);
  for (const termId of index) {
    GM_deleteValue(`${MARKS_PREFIX}${studentId}:${termId}`);
  }
  GM_deleteValue(indexKey);
}

export function writeTermMarks(
  studentId: string,
  termId: string,
  marks: MarkCommon[],
): void {
  GM_setValue(`${MARKS_PREFIX}${studentId}:${termId}`, {
    savedAt: Date.now(),
    marks,
  } satisfies TermMarksCache);

  const indexKey = `${MARKS_PREFIX}${studentId}:index`;
  const index: string[] = GM_getValue<string[]>(indexKey, []);
  if (!index.includes(termId)) {
    index.push(termId);
  }
  while (index.length > MAX_TERMS_CACHED) {
    const oldest = index.shift();
    if (oldest) {
      GM_deleteValue(`${MARKS_PREFIX}${studentId}:${oldest}`);
    }
  }
  GM_setValue(indexKey, index);
}

export interface TermsCache {
  savedAt: number;
  terms: Term[];
  defaultTermId: string;
}

export function readTerms(campusId: string): TermsCache | null {
  const raw = GM_getValue<TermsCache | null>(
    `${TERMS_PREFIX}${campusId}`,
    null,
  );
  if (!raw) return null;
  if (Date.now() - raw.savedAt > CACHE_TTL_MS) {
    GM_deleteValue(`${TERMS_PREFIX}${campusId}`);
    return null;
  }
  return raw;
}

export function writeTerms(
  campusId: string,
  terms: Term[],
  defaultTermId: string,
): void {
  GM_setValue(`${TERMS_PREFIX}${campusId}`, {
    savedAt: Date.now(),
    terms,
    defaultTermId,
  } satisfies TermsCache);
}
