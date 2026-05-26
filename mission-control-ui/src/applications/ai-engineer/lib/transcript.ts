import type { ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";

export type TranscriptMode = "messages-only" | "include-tools";

function roleLabel(role: ChatMessage["role"]) {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  return "Tool";
}

function toolSummary(event: ChatEvent): string | null {
  if (!event.event_type.startsWith("tool.")) return null;
  const toolName = typeof event.payload.tool_name === "string" ? event.payload.tool_name : "tool";
  const status = event.event_type.replace("tool.", "").replaceAll("_", " ");
  const summary = typeof event.payload.summary === "string" ? event.payload.summary : undefined;
  return [`### Tool: ${toolName}`, `Status: ${status}`, summary ? `Summary: ${summary}` : null].filter(Boolean).join("\n");
}

export function serializeAiEngineerTranscript(messages: ChatMessage[], events: ChatEvent[], mode: TranscriptMode): string {
  const sections = ["# AI Engineer Chat"];
  for (const message of messages) {
    if (message.role === "tool" || message.part || message.parts?.length) continue;
    const content = message.content.trim();
    if (!content) continue;
    sections.push(`## ${roleLabel(message.role)}\n${content}`);
  }
  if (mode === "include-tools") {
    const tools = events.map(toolSummary).filter((item): item is string => Boolean(item));
    if (tools.length > 0) sections.push(["## Tool Actions", ...tools].join("\n\n"));
  }
  return `${sections.join("\n\n")}\n`;
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
