// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  items?: { type: string };
  enum?: string[];
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: ToolDefinition[];
  tool_choice?:
    "auto" | "none" | { type: "function"; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: "assistant";
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: "stop" | "tool_calls" | "length";
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

export interface ModelsResponse {
  data: ModelInfo[];
}

export interface ParamMeta {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ToolMeta {
  name: string;
  description: string;
  category: string;
  read: boolean;
  params: ParamMeta[];
  returnType: string;
}

export interface AgentContext {
  studentId: string;
  userId: string;
  campusId: string;
  campusCode: string;
  termId: string;
  termName: string;
  termOrder: number;
  academicYear: string;
}

export interface ConfirmRequest {
  toolName: string;
  description: string;
  args: Record<string, unknown>;
  resolve: (approved: boolean) => void;
}

export type AgentEventType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "message"
  | "confirm"
  | "error"
  | "retry"
  | "done";

export interface AgentEvent {
  type: AgentEventType;
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  error?: boolean;
  /** Present on `type: "error"` when the failure was an HTTP response. */
  httpStatus?: number;
  /** Provider error code when known (e.g. rate_limit_exceeded). */
  apiCode?: string | null;
  /** 1-based retry count while waiting out a 429 (type: "retry"). */
  attempt?: number;
  /** Milliseconds until the next attempt (type: "retry"). */
  delayMs?: number;
  /** Max chat/completions attempts including the first (type: "retry"). */
  maxAttempts?: number;
  confirmRequest?: ConfirmRequest;
  role?: "user" | "assistant";
}
