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
  representativeEventId: string;
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
      kind: "event";
      event: ChatEvent;
      requestId?: string | null;
      agentRunId?: string | null;
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

function sameRun(a: Pick<ChatEvent, "agent_run_id" | "request_id">, b: Pick<ChatEvent, "agent_run_id" | "request_id">): boolean {
  return a.agent_run_id === b.agent_run_id && a.request_id === b.request_id;
}

function compareEventsWithinConversation(a: ChatEvent, b: ChatEvent): number {
  const inSameRun = sameRun(a, b);
  if (inSameRun && a.sequence !== b.sequence) return a.sequence - b.sequence;
  const leftTime = Date.parse(a.created_at);
  const rightTime = Date.parse(b.created_at);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (inSameRun && a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.id.localeCompare(b.id);
}

function compareEventsWithinRun(a: ChatEvent, b: ChatEvent): number {
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  return compareEventsWithinConversation(a, b);
}

function mostInformativeEvent(events: ChatEvent[]): ChatEvent {
  return [...events].sort((a, b) => terminalRank(b) - terminalRank(a) || compareEventsWithinRun(b, a))[0] ?? events[0];
}

function summarizeToolEvents(events: ChatEvent[]): ToolCallSummary[] {
  const groups = new Map<string, ChatEvent[]>();
  events.filter(isToolEvent).forEach((event, index) => {
    const key = event.tool_call_id ?? stringFromPayload(event.payload, ["tool_call_id", "toolCallId"]) ?? `${event.id}-${index}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });

  return [...groups.entries()]
    .map(([toolCallId, group]) => {
      const ordered = [...group].sort(compareEventsWithinRun);
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
        representativeEventId: terminal.id,
        requestId: terminal.request_id ?? null,
        agentRunId: terminal.agent_run_id ?? null,
        assistantMessageId: assistantMessageIdFromEvent(terminal),
        sequence: terminal.sequence ?? null,
        createdAt: terminal.created_at ?? null,
      };
    })
    .sort(compareSummariesAcrossConversation);
}

function compareSummariesAcrossConversation(a: ToolCallSummary, b: ToolCallSummary): number {
  const inSameRun = a.agentRunId && b.agentRunId && a.agentRunId === b.agentRunId && a.requestId && b.requestId && a.requestId === b.requestId;
  if (inSameRun && a.sequence !== null && a.sequence !== undefined && b.sequence !== null && b.sequence !== undefined && a.sequence !== b.sequence) {
    return a.sequence - b.sequence;
  }
  const leftTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
  const rightTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (inSameRun && a.sequence !== null && a.sequence !== undefined && b.sequence !== null && b.sequence !== undefined && a.sequence !== b.sequence) {
    return a.sequence - b.sequence;
  }
  return a.toolCallId.localeCompare(b.toolCallId);
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

  [...events].sort(compareEventsWithinConversation).forEach((event) => {
    if (event.event_type === "message.delta" && typeof event.payload.text_delta === "string") {
      assistantBuffer += event.payload.text_delta;
      return;
    }
    if (!isToolEvent(event)) return;
    const toolCallId = event.tool_call_id ?? stringFromPayload(event.payload, ["tool_call_id", "toolCallId"]);
    if (!toolCallId || emittedToolCallIds.has(toolCallId)) return;
    const summary = summaryByToolCallId.get(toolCallId);
    if (!summary || summary.representativeEventId !== event.id) return;
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

function eventMatchesMessage(event: ChatEvent, message: ChatMessage): boolean {
  const assistantMessageId = assistantMessageIdFromEvent(event);
  return Boolean(
    (assistantMessageId && assistantMessageId === message.id) ||
      (message.requestId && event.request_id === message.requestId) ||
      (message.agentRunId && event.agent_run_id === message.agentRunId),
  );
}

function eventsForMessage(message: ChatMessage, events: ChatEvent[]): ChatEvent[] {
  return events.filter((event) => eventMatchesMessage(event, message));
}

function summaryMatchesMessage(summary: ToolCallSummary, message: ChatMessage): boolean {
  return Boolean(
    (summary.assistantMessageId && summary.assistantMessageId === message.id) ||
      (message.requestId && summary.requestId === message.requestId) ||
      (message.agentRunId && summary.agentRunId === message.agentRunId),
  );
}

function summariesForMessage(message: ChatMessage, summaries: ToolCallSummary[]): ToolCallSummary[] {
  return summaries.filter((summary) => summaryMatchesMessage(summary, message)).sort(compareSummariesAcrossConversation);
}

function serializeAssistantWithScopedEvents(
  message: ChatMessage,
  scopedEvents: ChatEvent[],
  scopedSummaries: ToolCallSummary[],
): { sections: string[]; emittedToolCallIds: Set<string> } {
  const persistedContent = message.content.trim();
  const emittedToolCallIds = new Set<string>();
  if (!hasUsefulMessageDeltas(scopedEvents)) {
    return {
      sections: [
        persistedContent ? `## Assistant\n${persistedContent}` : null,
        ...scopedSummaries.map((summary) => {
          emittedToolCallIds.add(summary.toolCallId);
          return formatToolSummary(summary);
        }),
      ].filter((section): section is string => Boolean(section)),
      emittedToolCallIds,
    };
  }

  const sections: string[] = [];
  const summaryByToolCallId = new Map(scopedSummaries.map((summary) => [summary.toolCallId, summary]));
  let assistantBuffer = "";
  const flushAssistant = () => {
    const content = assistantBuffer.trim();
    if (content) sections.push(`## Assistant\n${content}`);
    assistantBuffer = "";
  };

  for (const event of [...scopedEvents].sort(compareEventsWithinRun)) {
    if (event.event_type === "message.delta" && typeof event.payload.text_delta === "string") {
      assistantBuffer += event.payload.text_delta;
      continue;
    }
    if (!isToolEvent(event)) continue;
    const toolCallId = event.tool_call_id ?? stringFromPayload(event.payload, ["tool_call_id", "toolCallId"]);
    if (!toolCallId || emittedToolCallIds.has(toolCallId)) continue;
    const summary = summaryByToolCallId.get(toolCallId);
    if (!summary || summary.representativeEventId !== event.id) continue;
    flushAssistant();
    sections.push(formatToolSummary(summary));
    emittedToolCallIds.add(toolCallId);
  }

  flushAssistant();
  for (const summary of scopedSummaries) {
    if (emittedToolCallIds.has(summary.toolCallId)) continue;
    sections.push(formatToolSummary(summary));
    emittedToolCallIds.add(summary.toolCallId);
  }
  if (sections.length === 0 && persistedContent) sections.push(`## Assistant\n${persistedContent}`);
  return { sections, emittedToolCallIds };
}

function serializeWithMessagesBackbone(messages: ChatMessage[], events: ChatEvent[]): string {
  const sections = ["# AI Engineer Chat"];
  const summaries = summarizeToolEvents(events);
  const emitted = new Set<string>();

  for (const message of messages) {
    if (message.role === "tool") continue;
    const content = message.content.trim();
    if (message.role === "user") {
      if (content) sections.push(`## User\n${content}`);
      continue;
    }
    if (message.role !== "assistant") continue;
    const scopedEvents = eventsForMessage(message, events);
    const scopedSummaries = summariesForMessage(message, summaries).filter((summary) => !emitted.has(summary.toolCallId));
    const serialized = serializeAssistantWithScopedEvents(message, scopedEvents, scopedSummaries);
    sections.push(...serialized.sections);
    for (const toolCallId of serialized.emittedToolCallIds) {
      emitted.add(toolCallId);
    }
  }

  const unmatched = summaries.filter((summary) => !emitted.has(summary.toolCallId)).sort(compareSummariesAcrossConversation);
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
  return messages.length > 0 ? serializeWithMessagesBackbone(messages, events) : (serializeFromStreamedEvents(events) ?? serializeWithMessagesBackbone(messages, events));
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
      requestId: event.request_id,
      agentRunId: event.agent_run_id,
      sequence: event.sequence,
      createdAt: event.created_at,
      originalIndex: messages.length + originalIndex,
    })),
  ].sort((a, b) => {
    if (a.kind === "event" && b.kind === "event") return compareEventsWithinConversation(a.event, b.event);
    const leftTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
    const rightTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
    if (a.kind === "message" && b.kind === "message") return a.originalIndex - b.originalIndex;
    if (a.kind === "event" && b.kind === "message" && a.requestId === b.requestId && a.agentRunId === b.agentRunId) {
      return 1;
    }
    if (a.kind === "message" && b.kind === "event" && a.requestId === b.requestId && a.agentRunId === b.agentRunId) {
      return -1;
    }
    return a.originalIndex - b.originalIndex;
  });

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
