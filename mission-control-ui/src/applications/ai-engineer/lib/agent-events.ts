import type {
  AgentEvent,
  ChatMessage,
  ChatStreamChunk,
  ReasoningStreamRepresentation,
} from "@/applications/ai-engineer/types";

export function normalizeStreamLine(line: string): AgentEvent {
  const parsed = JSON.parse(line) as unknown;
  const candidate =
    parsed && typeof parsed === "object" && "kind" in parsed && (parsed as { kind?: unknown }).kind === "event"
      ? (parsed as { event?: unknown }).event
      : parsed;

  if (!candidate || typeof candidate !== "object") {
    throw new Error("NDJSON line did not contain an agent event");
  }

  const event = candidate as Partial<AgentEvent>;
  if (
    typeof event.id !== "string" ||
    typeof event.event_type !== "string" ||
    typeof event.agent_run_id !== "string" ||
    typeof event.request_id !== "string" ||
    typeof event.sequence !== "number" ||
    typeof event.emitted_by !== "string" ||
    typeof event.created_at !== "string" ||
    !event.payload ||
    typeof event.payload !== "object"
  ) {
    throw new Error("Agent event envelope is incomplete");
  }

  return {
    id: event.id,
    event_type: event.event_type,
    conversation_id: typeof event.conversation_id === "string" ? event.conversation_id : null,
    agent_run_id: event.agent_run_id,
    request_id: event.request_id,
    tool_call_id: typeof event.tool_call_id === "string" ? event.tool_call_id : null,
    sequence: event.sequence,
    emitted_by: event.emitted_by,
    created_at: event.created_at,
    payload: event.payload as Record<string, unknown>,
  };
}

export function chunkFromEvent(event: AgentEvent): ChatStreamChunk {
  return { kind: "event", event };
}

function parseReasoningRepresentation(value: unknown): ReasoningStreamRepresentation | undefined {
  return value === "reasoning" || value === "reasoning_summary" || value === "thinking" ? value : undefined;
}

export function applyAgentEventToAssistantMessage(messages: ChatMessage[], draftAssistantId: string, event: AgentEvent): ChatMessage[] {
  if (event.event_type === "message.reasoning.started") {
    const representation = parseReasoningRepresentation(event.payload.representation);
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
    const textDelta = typeof event.payload.text_delta === "string" ? event.payload.text_delta : "";
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
    const representation = parseReasoningRepresentation(event.payload.representation);
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
    const textDelta = typeof event.payload.text_delta === "string" ? event.payload.text_delta : "";
    return messages.map((message) => (message.id === draftAssistantId ? { ...message, content: `${message.content}${textDelta}` } : message));
  }

  if (event.event_type === "message.completed") {
    const completedMessageId = typeof event.payload.message_id === "string" ? event.payload.message_id : draftAssistantId;
    return messages.map((message) => (message.id === draftAssistantId ? { ...message, id: completedMessageId, status: "complete" } : message));
  }

  if (event.event_type === "run.failed") {
    const message = typeof event.payload.message === "string" ? event.payload.message : "Agent runtime failed.";
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
