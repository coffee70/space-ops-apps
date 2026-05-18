import type {
  AgentEvent,
  ChatMessage,
  ChatStreamChunk,
  ReasoningStreamRepresentation,
} from "@/applications/ai-engineer/types";
import {
  MessageCompletedPayloadSchema,
  MessageDeltaPayloadSchema,
  NormalizedAgentEventSchema,
  ReasoningPayloadSchema,
  RunFailedPayloadSchema,
  StreamLineSchema,
} from "@/applications/ai-engineer/schemas";

export function normalizeStreamLine(line: string): AgentEvent {
  const parsed = StreamLineSchema.safeParse(JSON.parse(line));
  if (!parsed.success) {
    throw new Error("NDJSON line did not contain a valid agent event");
  }
  const event = "kind" in parsed.data ? parsed.data.event : parsed.data;
  return NormalizedAgentEventSchema.parse(event);
}

export function chunkFromEvent(event: AgentEvent): ChatStreamChunk {
  return { kind: "event", event };
}

function parseReasoningRepresentation(value: unknown): ReasoningStreamRepresentation | undefined {
  return value === "reasoning" || value === "reasoning_summary" || value === "thinking" ? value : undefined;
}

export function applyAgentEventToAssistantMessage(messages: ChatMessage[], draftAssistantId: string, event: AgentEvent): ChatMessage[] {
  if (event.event_type === "message.reasoning.started") {
    const payload = ReasoningPayloadSchema.safeParse(event.payload);
    const representation = parseReasoningRepresentation(payload.success ? payload.data.representation : undefined);
    return messages.map((message) =>
      message.id === draftAssistantId
        ? {
            ...message,
            reasoning: {
              content: message.reasoning?.content ?? "",
              status: "streaming",
              representation,
              source: "provider_exposed",
            },
          }
        : message,
    );
  }

  if (event.event_type === "message.reasoning.delta") {
    const payload = MessageDeltaPayloadSchema.safeParse(event.payload);
    const textDelta = payload.success ? payload.data.text_delta : "";
    return messages.map((message) =>
      message.id === draftAssistantId
        ? {
            ...message,
            reasoning: {
              content: `${message.reasoning?.content ?? ""}${textDelta}`,
              status: "streaming",
              representation: message.reasoning?.representation,
              source: message.reasoning?.source ?? "provider_exposed",
            },
          }
        : message,
    );
  }

  if (event.event_type === "message.reasoning.completed") {
    const payload = ReasoningPayloadSchema.safeParse(event.payload);
    const representation = parseReasoningRepresentation(payload.success ? payload.data.representation : undefined);
    return messages.map((message) =>
      message.id === draftAssistantId
        ? {
            ...message,
            reasoning: message.reasoning
              ? {
                  ...message.reasoning,
                  status: "complete",
                  representation: representation ?? message.reasoning.representation,
                }
              : {
                  content: "",
                  status: "complete",
                  representation,
                  source: "provider_exposed",
                },
          }
        : message,
    );
  }

  if (event.event_type === "message.delta") {
    const payload = MessageDeltaPayloadSchema.safeParse(event.payload);
    const textDelta = payload.success ? payload.data.text_delta : "";
    return messages.map((message) => (message.id === draftAssistantId ? { ...message, content: `${message.content}${textDelta}` } : message));
  }

  if (event.event_type === "message.completed") {
    const payload = MessageCompletedPayloadSchema.safeParse(event.payload);
    const completedMessageId = payload.success ? payload.data.message_id : draftAssistantId;
    return messages.map((message) => (message.id === draftAssistantId ? { ...message, id: completedMessageId, status: "complete" } : message));
  }

  if (event.event_type === "run.failed") {
    const payload = RunFailedPayloadSchema.safeParse(event.payload);
    const message = payload.success && payload.data.message ? payload.data.message : "Agent runtime failed.";
    return messages.map((item) =>
      item.id === draftAssistantId
        ? {
            ...item,
            content: item.content || message,
            status: "complete",
            reasoning: item.reasoning ? { ...item.reasoning, status: "complete" } : item.reasoning,
          }
        : item,
    );
  }

  if (event.event_type === "run.cancelled") {
    return messages.map((item) =>
      item.id === draftAssistantId
        ? {
            ...item,
            status: "complete",
            reasoning: item.reasoning ? { ...item.reasoning, status: "complete" } : item.reasoning,
          }
        : item,
    );
  }

  return messages;
}

export interface TimelineRunGroup {
  agentRunId: string;
  events: AgentEvent[];
  tools: Array<{
    toolCallId: string;
    events: AgentEvent[];
    latestStatus: "started" | "completed" | "failed";
  }>;
}

export function groupTimelineEvents(events: AgentEvent[]): TimelineRunGroup[] {
  const groups = new Map<string, AgentEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.agent_run_id) ?? [];
    existing.push(event);
    groups.set(event.agent_run_id, existing);
  }

  return [...groups.entries()].map(([agentRunId, runEvents]) => {
    const orderedEvents = [...runEvents].sort((a, b) => a.sequence - b.sequence);
    const toolEvents = new Map<string, AgentEvent[]>();
    for (const event of orderedEvents) {
      if (event.event_type.startsWith("tool.") && event.tool_call_id) {
        const existing = toolEvents.get(event.tool_call_id) ?? [];
        existing.push(event);
        toolEvents.set(event.tool_call_id, existing);
      }
    }

    return {
      agentRunId,
      events: orderedEvents,
      tools: [...toolEvents.entries()].map(([toolCallId, correlatedEvents]) => ({
        toolCallId,
        events: correlatedEvents,
        latestStatus: correlatedEvents.some((event) => event.event_type === "tool.failed")
          ? "failed"
          : correlatedEvents.some((event) => event.event_type === "tool.completed")
            ? "completed"
            : "started",
      })),
    };
  });
}
