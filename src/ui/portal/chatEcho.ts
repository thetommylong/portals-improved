// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** True when the composer text is a `/clear` slash command. */
export function isClearCommand(text: string): boolean {
  return /^\/clear(?:\s|$)/i.test(text.trim());
}

/**
 * Light-DOM echo for a user chat line. `/key <secret>` is redacted so the
 * API key never appears in the transcript DOM.
 */
export function echoUserMessage(text: string): string {
  const trimmed = text.trim();
  const match = /^(\/key)(\s+)\S[\s\S]*$/i.exec(trimmed);
  if (match) return `${match[1]}${match[2]}••••`;
  return trimmed;
}
