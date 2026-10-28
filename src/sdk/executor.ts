// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { ConfirmRequest } from "./types";
import {
  callApiFunction,
  getFullSchema,
  getToolMeta,
  isReadOnly,
  isToolSupported,
} from "./registry";

export const MAX_TOOL_TURNS = 8;
const MAX_RESULT_CHARS = 4096;

export interface ExecutionResult {
  content: string;
  error: boolean;
}

export function validateArgs(
  name: string,
  args: Record<string, unknown>,
): string | null {
  const schema = getFullSchema(name);
  if (!schema) return `Unknown tool: ${name}`;
  const meta = getToolMeta(name);

  if (schema.required) {
    for (const key of schema.required) {
      if (args[key] === undefined || args[key] === null) {
        const param = meta?.params.find((p) => p.name === key);
        return `Missing required parameter: ${key}${param ? ` (${param.description})` : ""}`;
      }
    }
  }

  const props = schema.properties ?? {};
  for (const [key, value] of Object.entries(args)) {
    const prop = props[key] as { type?: string; enum?: unknown[] } | undefined;
    if (!prop || value === undefined || value === null) continue;
    if (prop.enum && !prop.enum.includes(value)) {
      return `Invalid value for ${key}: expected one of ${prop.enum.join(", ")}`;
    }
    const expected = prop.type;
    if (!expected) continue;
    if (expected === "array" && !Array.isArray(value)) {
      return `Invalid type for ${key}: expected array`;
    }
    if (expected === "string" && typeof value !== "string") {
      return `Invalid type for ${key}: expected string`;
    }
    if (expected === "number" && typeof value !== "number") {
      return `Invalid type for ${key}: expected number`;
    }
    if (expected === "boolean" && typeof value !== "boolean") {
      return `Invalid type for ${key}: expected boolean`;
    }
    if (expected === "integer") {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return `Invalid type for ${key}: expected integer`;
      }
    }
  }

  return null;
}

export async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  requestConfirmation?: (req: ConfirmRequest) => Promise<boolean>,
): Promise<ExecutionResult> {
  const validationError = validateArgs(name, args);
  if (validationError) {
    return { content: validationError, error: true };
  }

  if (!isToolSupported(name)) {
    return {
      content: `Tool ${name} is not available for the current portal provider.`,
      error: true,
    };
  }

  if (!isReadOnly(name) && requestConfirmation) {
    const meta = getToolMeta(name);
    const approved = await requestConfirmation({
      toolName: name,
      description: meta?.description ?? name,
      args,
      resolve: () => {},
    });
    if (!approved) {
      return {
        content: `User rejected this action. Explain what was denied and offer alternatives.`,
        error: false,
      };
    }
  }

  try {
    const result = await callApiFunction(name, args);
    const text =
      result === undefined || result === null
        ? "Done (no return value)"
        : typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2);

    if (text.length > MAX_RESULT_CHARS) {
      return {
        content:
          text.slice(0, MAX_RESULT_CHARS) +
          `\n... [truncated, ${text.length} chars total]`,
        error: false,
      };
    }

    return { content: text, error: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: `Error executing ${name}: ${message}`, error: true };
  }
}
