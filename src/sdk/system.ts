// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { Temporal } from "@js-temporal/polyfill";
import type { AgentContext } from "./types";
import { buildCompactIndex } from "./registry";

const BASE_SYSTEM = `You are an AI assistant for a student portal. You can search and call functions to retrieve real portal data for the signed-in session.

## How to use tools
1. ALWAYS call searchFunctions(query) first to find relevant tools for the user's question.
2. After searchFunctions returns results, call the actual function with the correct parameters.
3. Most functions need studentId. Use the studentId from the Session context below — do NOT ask the user for it.
4. Functions that take termId need a UUID. If you don't have a termId, call getDefaultTerm(campusId) first to get it.
5. For marks/results, use academicYear and termOrder from Session context — no termId needed.

## Rules
- Never fabricate data. Only use data returned by function calls.
- When reporting marks, include both the raw value and any available scale context.
- Keep responses concise. Use tables for multiple items.
- If a function returns an error, explain what went wrong and suggest a fix.
- Never call mutation functions (marked [MUTATION]) without first showing the user what will happen and getting their approval.
- Max 8 tool calls per turn. If you haven't finished, summarize progress and ask if the user wants to continue.
- Use the Current time below for relative phrasing (today, this week, overdue, etc.).`;

/**
 * Machine-readable ISO-8601 / RFC 3339 instant in the runtime's current zone
 * (offset + IANA name from Temporal — not a locale-formatted string).
 */
export function formatNowForPrompt(
  now: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(),
): string {
  return now.toString({ smallestUnit: "second" });
}

export function buildSystemPrompt(
  context: AgentContext,
  customPrompt?: string,
  now: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(),
): string {
  const sections = [customPrompt ?? BASE_SYSTEM];

  sections.push(`## Current time
- ${formatNowForPrompt(now)}`);

  sections.push(`## Session context
- studentId: ${context.studentId}
- campusId: ${context.campusId}
- campusCode: ${context.campusCode}
- Current term: ${context.termName} (termOrder=${context.termOrder}, termId=${context.termId})
- Academic year: ${context.academicYear}`);

  sections.push(`## Available Functions
${buildCompactIndex()}`);

  return sections.join("\n\n");
}
