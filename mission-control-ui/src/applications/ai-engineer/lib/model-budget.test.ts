import { strict as assert } from "node:assert";
import test from "node:test";

import { latestModelBudgetSnapshotFromEvents, formatPercent, formatReset, formatTokenCount } from "./model-budget";
import type { ChatEvent } from "@/applications/ai-engineer/types";

function event(sequence: number, payload: Record<string, unknown>): ChatEvent {
  return {
    id: String(sequence),
    event_type: "model.budget.snapshot",
    conversation_id: null,
    agent_run_id: "run",
    request_id: "req",
    tool_call_id: null,
    sequence,
    emitted_by: "agent-runtime-service",
    created_at: new Date(sequence).toISOString(),
    payload,
  };
}

test("latestModelBudgetSnapshotFromEvents returns the latest valid budget snapshot", () => {
  const first = event(1, {
    provider_type: "openai",
    provider_model_id: "gpt-5.5",
    source: "estimated",
    measured_at: new Date().toISOString(),
    context: {
      limit_tokens: 100,
      used_tokens: 10,
      remaining_tokens: 90,
      percent_used: 0.1,
      status: "normal",
      measurement_source: "estimated",
    },
    throughput: {
      window_seconds: 60,
      limit_tokens: 100,
      used_tokens: 20,
      remaining_tokens: 80,
      percent_used: 0.2,
      reset_at: null,
      seconds_until_reset: null,
      status: "normal",
      measurement_source: "configured_rolling_window",
    },
  });
  const second = event(2, {
    ...first.payload,
    context: { ...(first.payload.context as Record<string, unknown>), used_tokens: 50, percent_used: 0.5 },
  });

  const latest = latestModelBudgetSnapshotFromEvents([first, { ...first, id: "bad", payload: {} }, second]);
  assert.equal(latest?.context.used_tokens, 50);
});

test("model budget formatters are compact and stable", () => {
  assert.equal(formatTokenCount(184000), "184k");
  assert.equal(formatTokenCount(null), "unknown");
  assert.equal(formatPercent(0.884), "88%");
  assert.equal(formatReset({ resetAt: null, secondsUntilReset: 8.4 }), "resets in ~8s");
});
