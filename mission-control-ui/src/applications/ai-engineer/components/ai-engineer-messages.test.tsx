import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerMessages } from "./ai-engineer-messages";
import type { ChatMessage } from "../types";

function permissionMessage(id: string, permissionRequestId: string): ChatMessage {
  return {
    id,
    role: "assistant",
    content: "",
    status: "complete",
    part: {
      kind: "tool-permission",
      permissionRequestId,
      toolCallId: `${permissionRequestId}-tool`,
      toolName: "deploy_preview_change",
      prompt: {
        title: "Deploy preview changes?",
        details: {
          branch: "preview/cyan",
          target_unit_id: "mission-control-frontend-shell",
          target_application_id: "telemetry",
          changed_files: ["project/space-ops-apps/mission-control-ui/src/components/telemetry-detail-header.tsx"],
        },
      },
    },
  };
}

test("AiEngineerMessages compacts older permission cards for the same operation", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessages
      messages={[permissionMessage("old", "permission-old"), permissionMessage("new", "permission-new")]}
      events={[]}
    />,
  );

  assert.match(markup, /data-permission-request-id="permission-old"/);
  assert.match(markup, /data-permission-request-id="permission-new"/);
  // The latest card becomes actionable only after the client fetches authoritative
  // backend permission status. Static rendering should keep both cards compact so
  // hydrated/stale permission prompts are not briefly clickable before status is known.
  assert.equal((markup.match(/data-compact="true"/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /data-compact="false"/);
  assert.doesNotMatch(markup, /Deploy changes/);
});

