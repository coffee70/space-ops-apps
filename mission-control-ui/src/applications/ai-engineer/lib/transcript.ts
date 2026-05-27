import type { ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";

export type TranscriptMode = "messages-only" | "include-tools" | "debug-trace";

type ToolCallSummary = {
  toolCallId: string;
  toolName: string;
  status: string;
  permission?: string;
  summary?: string;
  input?: unknown;
  result?: unknown;
  error?: unknown;
  events: ChatEvent[];
  requestId?: string | null;
  agentRunId?: string | null;
  assistantMessageId?: string | null;
  sequence?: number | null;
  createdAt?: string | null;
};

type TimelineItem =
  | {
      kind: "message";
      role: "user" | "assistant";
      content: string;
      id?: string;
      requestId?: string | null;
      agentRunId?: string | null;
      sequence?: number | null;
      createdAt?: string | null;
      originalIndex: number;
    }
  | {
      kind: "tool-summary";
      summary: ToolCallSummary;
      requestId?: string | null;
      agentRunId?: string | null;
      sequence?: number | null;
      createdAt?: string | null;
      originalIndex: number;
    }
  | {
      kind: "event";
      event: ChatEvent;
      sequence?: number | null;
      createdAt?: string | null;
      originalIndex: number;
    };

const SECRET_KEY_PATTERN = /token|secret|password|api_key|apikey|authorization|cookie|credential/i;
const DEFAULT_JSON_MAX_CHARS = 3000;
const DEBUG_JSON_MAX_CHARS = 5000;

function roleLabel(role: ChatMessage["role"]) {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  return "Tool";
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!value || typeof value !== "object") return value;
  const redacted: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    redacted[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactValue(item);
  }
  return redacted;
}

function stableCopy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stableCopy(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableCopy(item)]),
  );
}

function stableJson(value: unknown, maxChars = DEFAULT_JSON_MAX_CHARS): string | null {
  if (value === undefined || value === null) return null;
  const text = JSON.stringify(stableCopy(redactValue(value)), null, 2);
  if (!text || text === "{}" || text === "[]") return null;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... [truncated]`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFromPayload(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function valueFromPayload(payload: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) return payload[key];
  }
  return undefined;
}

function assistantMessageIdFromEvent(event: ChatEvent): string | null {
  const payload = event.payload;
  return (
    stringFromPayload(payload, ["assistant_message_id", "assistantMessageId", "message_id"]) ??
    null
  );
}

function isToolEvent(event: ChatEvent): boolean {
  return event.event_type.startsWith("tool.");
}

function toolNameFromEvent(event: ChatEvent): string {
  return stringFromPayload(event.payload, ["tool_name", "toolName", "name"]) ?? "tool";
}

function statusFromToolEvent(event: ChatEvent): string {
  return event.event_type.replace(/^tool\./, "").replaceAll("_", " ");
}

function terminalRank(event: ChatEvent): number {
  if (event.event_type === "tool.completed") return 6;
  if (event.event_type === "tool.failed") return 5;
  if (event.event_type === "tool.permission_denied") return 4;
  if (event.event_type === "tool.permission_required") return 3;
  if (event.event_type === "tool.started") return 2;
  return 1;
}

function compareEvents(a: ChatEvent, b: ChatEvent): number {
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  const leftTime = Date.parse(a.created_at);
  const rightTime = Date.parse(b.created_at);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return a.id.localeCompare(b.id);
}

function mostInformativeEvent(events: ChatEvent[]): ChatEvent {
  return [...events].sort((a, b) => terminalRank(b) - terminalRank(a) || compareEvents(b, a))[0] ?? events[0];
}

function summarizeToolEvents(events: ChatEvent[]): ToolCallSummary[] {
  const groups = new Map<string, ChatEvent[]>();
  events.filter(isToolEvent).forEach((event, index) => {
    const key = event.tool_call_id ?? stringFromPayload(event.payload, ["tool_call_id", "toolCallId"]) ?? `${event.id}-${index}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });

  return [...groups.entries()]
    .map(([toolCallId, group]) => {
      const ordered = [...group].sort(compareEvents);
      const terminal = mostInformativeEvent(ordered);
      const mergedPayloads = ordered.map((event) => event.payload).filter(isRecord);
      const payload = Object.assign({}, ...mergedPayloads, terminal.payload);
      const permission = ordered.some((event) => event.event_type === "tool.permission_denied")
        ? "denied"
        : ordered.some((event) => event.event_type === "tool.permission_approved")
          ? "approved"
          : ordered.some((event) => event.event_type === "tool.permission_required")
            ? "pending approval"
            : undefined;
      return {
        toolCallId,
        toolName: toolNameFromEvent(terminal),
        status: statusFromToolEvent(terminal),
        permission,
        summary: stringFromPayload(payload, ["summary", "message", "description"]),
        input: valueFromPayload(payload, ["input", "arguments", "args", "parameters", "request"]),
        result: valueFromPayload(payload, ["result", "output", "response", "data"]),
        error: valueFromPayload(payload, ["error", "error_message", "exception"]),
        events: ordered,
        requestId: terminal.request_id ?? null,
        agentRunId: terminal.agent_run_id ?? null,
        assistantMessageId: assistantMessageIdFromEvent(terminal),
        sequence: terminal.sequence ?? null,
        createdAt: terminal.created_at ?? null,
      };
    })
    .sort((a, b) => compareTimelineItems(toolSummaryItem(a, 0), toolSummaryItem(b, 0)));
}

function compareTimelineItems(a: TimelineItem, b: TimelineItem): number {
  if (a.sequence !== null && a.sequence !== undefined && b.sequence !== null && b.sequence !== undefined && a.sequence !== b.sequence) {
    return a.sequence - b.sequence;
  }
  const leftTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
  const rightTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return a.originalIndex - b.originalIndex;
}

function messageItems(messages: ChatMessage[]): TimelineItem[] {
  return messages
    .map((message, originalIndex): TimelineItem | null => {
      if (message.role === "tool" || (message.role !== "user" && message.role !== "assistant")) return null;
      const content = message.content.trim();
      if (!content) return null;
      return {
        kind: "message",
        role: message.role,
        content,
        id: message.id,
        requestId: message.requestId ?? null,
        agentRunId: message.agentRunId ?? null,
        sequence: message.sequence ?? null,
        createdAt: message.createdAt ?? null,
        originalIndex,
      };
    })
    .filter((item): item is TimelineItem => Boolean(item));
}

function toolSummaryItem(summary: ToolCallSummary, originalIndex: number): TimelineItem {
  return {
    kind: "tool-summary",
    summary,
    requestId: summary.requestId ?? null,
    agentRunId: summary.agentRunId ?? null,
    sequence: summary.sequence ?? null,
    createdAt: summary.createdAt ?? null,
    originalIndex,
  };
}

function formatJsonBlock(label: string, value: unknown, maxChars = DEFAULT_JSON_MAX_CHARS): string | null {
  const json = stableJson(value, maxChars);
  return json ? `${label}:\n\`\`\`json\n${json}\n\`\`\`` : null;
}

function formatToolSummary(summary: ToolCallSummary): string {
  const lines = [
    `### Tool: ${summary.toolName}`,
    `Status: ${summary.status}`,
    summary.permission ? `Permission: ${summary.permission}` : null,
    `Tool call id: ${summary.toolCallId}`,
    formatJsonBlock("Input", summary.input),
    summary.summary ? `Summary: ${summary.summary}` : null,
    formatJsonBlock("Result", summary.result),
    formatJsonBlock("Error", summary.error),
  ];
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

function serializeMessagesOnly(messages: ChatMessage[]): string {
  const sections = ["# AI Engineer Chat"];
  for (const item of messageItems(messages)) {
    if (item.kind !== "message") continue;
    sections.push(`## ${roleLabel(item.role)}\n${item.content}`);
  }
  return `${sections.join("\n\n")}\n`;
}

function hasUsefulMessageDeltas(events: ChatEvent[]): boolean {
  return events.some((event) => event.event_type === "message.delta" && typeof event.payload.text_delta === "string" && event.payload.text_delta.trim());
}

function serializeFromStreamedEvents(events: ChatEvent[]): string | null {
  if (!hasUsefulMessageDeltas(events)) return null;
  const sections = ["# AI Engineer Chat"];
  const summaries = summarizeToolEvents(events);
  const summaryByToolCallId = new Map(summaries.map((summary) => [summary.toolCallId, summary]));
  const emittedToolCallIds = new Set<string>();
  let assistantBuffer = "";

  const flushAssistant = () => {
    const content = assistantBuffer.trim();
    if (content) sections.push(`## Assistant\n${content}`);
    assistantBuffer = "";
  };

  [...events].sort(compareEvents).forEach((event) => {
    if (event.event_type === "message.delta" && typeof event.payload.text_delta === "string") {
      assistantBuffer += event.payload.text_delta;
      return;
    }
    if (!isToolEvent(event)) return;
    const toolCallId = event.tool_call_id ?? stringFromPayload(event.payload, ["tool_call_id", "toolCallId"]);
    if (!toolCallId || emittedToolCallIds.has(toolCallId)) return;
    const summary = summaryByToolCallId.get(toolCallId);
    if (!summary || summary.sequence !== event.sequence) return;
    flushAssistant();
    sections.push(formatToolSummary(summary));
    emittedToolCallIds.add(toolCallId);
  });

  flushAssistant();
  for (const summary of summaries) {
    if (emittedToolCallIds.has(summary.toolCallId)) continue;
    sections.push(formatToolSummary(summary));
  }
  return `${sections.join("\n\n")}\n`;
}

function matchesMessage(summary: ToolCallSummary, message: Extract<TimelineItem, { kind: "message" }>): boolean {
  return Boolean(
    (summary.assistantMessageId && summary.assistantMessageId === message.id) ||
      (summary.requestId && summary.requestId === message.requestId) ||
      (summary.agentRunId && summary.agentRunId === message.agentRunId),
  );
}

function serializeWithPersistedMessages(messages: ChatMessage[], events: ChatEvent[]): string {
  const sections = ["# AI Engineer Chat"];
  const summaries = summarizeToolEvents(events);
  const emitted = new Set<string>();
  const items = messageItems(messages).sort(compareTimelineItems);

  for (const item of items) {
    if (item.kind !== "message") continue;
    sections.push(`## ${roleLabel(item.role)}\n${item.content}`);
    if (item.role !== "assistant") continue;
    for (const summary of summaries) {
      if (emitted.has(summary.toolCallId) || !matchesMessage(summary, item)) continue;
      sections.push(formatToolSummary(summary));
      emitted.add(summary.toolCallId);
    }
  }

  const unmatched = summaries.filter((summary) => !emitted.has(summary.toolCallId));
  if (unmatched.length > 0) {
    sections.push(
      [
        "## Unmatched Tool Actions",
        "These tool events did not include enough message metadata for exact placement.",
        ...unmatched.map(formatToolSummary),
      ].join("\n\n"),
    );
  }

  return `${sections.join("\n\n")}\n`;
}

function serializeWithToolSummaries(messages: ChatMessage[], events: ChatEvent[]): string {
  return serializeFromStreamedEvents(events) ?? serializeWithPersistedMessages(messages, events);
}

function eventMetadataLines(event: ChatEvent): string[] {
  return [
    `Timestamp: ${event.created_at}`,
    `Sequence: ${event.sequence}`,
    event.conversation_id ? `Conversation id: ${event.conversation_id}` : null,
    `Request id: ${event.request_id}`,
    `Agent run id: ${event.agent_run_id}`,
    event.tool_call_id ? `Tool call id: ${event.tool_call_id}` : null,
    assistantMessageIdFromEvent(event) ? `Assistant message id: ${assistantMessageIdFromEvent(event)}` : null,
    `Emitted by: ${event.emitted_by}`,
  ].filter((line): line is string => Boolean(line));
}

function serializeDebugTrace(messages: ChatMessage[], events: ChatEvent[]): string {
  const sections = ["# AI Engineer Debug Trace"];
  const items: TimelineItem[] = [
    ...messageItems(messages),
    ...events.map((event, originalIndex): TimelineItem => ({
      kind: "event",
      event,
      sequence: event.sequence,
      createdAt: event.created_at,
      originalIndex: messages.length + originalIndex,
    })),
  ].sort(compareTimelineItems);

  for (const item of items) {
    if (item.kind === "message") {
      sections.push(
        [
          `## Message: ${roleLabel(item.role)}`,
          item.createdAt ? `Timestamp: ${item.createdAt}` : null,
          item.id ? `Message id: ${item.id}` : null,
          item.requestId ? `Request id: ${item.requestId}` : null,
          item.agentRunId ? `Agent run id: ${item.agentRunId}` : null,
          item.sequence !== null && item.sequence !== undefined ? `Sequence: ${item.sequence}` : null,
          "",
          item.content,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      );
      continue;
    }
    if (item.kind === "event") {
      const payload = formatJsonBlock("Payload", item.event.payload, DEBUG_JSON_MAX_CHARS);
      sections.push([`## Event: ${item.event.event_type}`, ...eventMetadataLines(item.event), payload].filter(Boolean).join("\n"));
    }
  }

  return `${sections.join("\n\n")}\n`;
}

export function serializeAiEngineerTranscript(messages: ChatMessage[], events: ChatEvent[], mode: TranscriptMode): string {
  if (mode === "debug-trace") return serializeDebugTrace(messages, events);
  if (mode === "include-tools") return serializeWithToolSummaries(messages, events);
  return serializeMessagesOnly(messages);
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
