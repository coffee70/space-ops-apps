"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { deployPreviewChange, pollDeploymentUntilTerminal, revertPreviewChange } from "@/applications/ai-engineer/lib/change-preview-client";
import {
  applyDeploySubmitted,
  applyDeployUpdate,
  applyRevertSubmitted,
  applyRevertUpdate,
  changeSummaryFromEvent,
  createInitialChangePreviewState,
  failPreview,
  startDeploying,
  startReverting,
} from "@/applications/ai-engineer/lib/change-preview-state";
import type {
  AiEngineerChangeSummary,
  ChangePreviewState,
  DeploymentRecord,
} from "@/applications/ai-engineer/lib/change-preview-types";
import type { ChatEvent } from "@/applications/ai-engineer/types";

interface UseChangePreviewFlowOptions {
  onTimelineEvent?: (event: ChatEvent) => void;
}

function buildSyntheticEvent(input: {
  type: string;
  agentRunId: string;
  conversationId: string | null;
  payload: Record<string, unknown>;
  toolCallId?: string | null;
  emittedBy?: string;
}): ChatEvent {
  return {
    id: `synthetic-${input.type}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    event_type: input.type,
    conversation_id: input.conversationId,
    agent_run_id: input.agentRunId,
    request_id: `synthetic-${input.agentRunId}`,
    tool_call_id: input.toolCallId ?? null,
    sequence: Math.floor(Date.now() / 1000),
    emitted_by: input.emittedBy ?? "mission-control-ui",
    payload: input.payload,
    created_at: new Date().toISOString(),
  };
}

export interface UseChangePreviewFlowResult {
  previews: ChangePreviewState[];
  ingestEvent: (event: ChatEvent) => void;
  deployChange: (change: AiEngineerChangeSummary) => Promise<void>;
  revertChange: (change: AiEngineerChangeSummary) => Promise<void>;
  isBusyForChange: (change: AiEngineerChangeSummary) => boolean;
  getStateForChange: (change: AiEngineerChangeSummary) => ChangePreviewState | null;
}

function previewKey(change: AiEngineerChangeSummary): string {
  return `${change.agentRunId}::${change.branch}`;
}

export function useChangePreviewFlow(options: UseChangePreviewFlowOptions = {}): UseChangePreviewFlowResult {
  const [previewMap, setPreviewMap] = useState<Map<string, ChangePreviewState>>(new Map());
  const previewMapRef = useRef(previewMap);
  useEffect(() => {
    previewMapRef.current = previewMap;
  }, [previewMap]);

  const emitTimeline = useCallback(
    (event: ChatEvent) => {
      options.onTimelineEvent?.(event);
    },
    [options],
  );

  const ingestEvent = useCallback((event: ChatEvent) => {
    const summary = changeSummaryFromEvent(event);
    if (!summary) return;
    setPreviewMap((previous) => {
      const key = previewKey(summary);
      const existing = previous.get(key);
      const next = new Map(previous);
      next.set(key, existing ? { ...existing, change: summary } : createInitialChangePreviewState(summary));
      return next;
    });
  }, []);

  const updateState = useCallback((change: AiEngineerChangeSummary, updater: (state: ChangePreviewState) => ChangePreviewState) => {
    setPreviewMap((previous) => {
      const key = previewKey(change);
      const existing = previous.get(key) ?? createInitialChangePreviewState(change);
      const next = new Map(previous);
      next.set(key, updater(existing));
      return next;
    });
  }, []);

  const handleDeployUpdate = useCallback(
    (change: AiEngineerChangeSummary) => (deployment: DeploymentRecord) => {
      updateState(change, (state) => applyDeployUpdate(state, deployment));
      if (deployment.status === "building" || deployment.status === "pending") {
        emitTimeline(
          buildSyntheticEvent({
            type: "tool.started",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: {
              tool_name: "preview_deployment_progress",
              category: "deployment",
              read_write_classification: "write",
              input_preview: { deployment_id: deployment.deployment_id, status: deployment.status },
            },
            toolCallId: deployment.deployment_id,
          }),
        );
      } else if (deployment.status === "healthy") {
        emitTimeline(
          buildSyntheticEvent({
            type: "tool.completed",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: {
              tool_name: "preview_deployment_progress",
              status: "completed",
              result_preview: { deployment_id: deployment.deployment_id, branch: deployment.branch },
              duration_ms: 0,
            },
            toolCallId: deployment.deployment_id,
          }),
        );
      } else if (deployment.status === "failed") {
        emitTimeline(
          buildSyntheticEvent({
            type: "tool.failed",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: {
              tool_name: "preview_deployment_progress",
              error_code: "deployment_failed",
              message: deployment.failure_reason ?? "Deployment failed.",
              duration_ms: 0,
            },
            toolCallId: deployment.deployment_id,
          }),
        );
      }
    },
    [emitTimeline, updateState],
  );

  const handleRevertUpdate = useCallback(
    (change: AiEngineerChangeSummary) => (deployment: DeploymentRecord) => {
      updateState(change, (state) => applyRevertUpdate(state, deployment));
      if (deployment.status === "building" || deployment.status === "pending") {
        emitTimeline(
          buildSyntheticEvent({
            type: "tool.started",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: {
              tool_name: "preview_revert_progress",
              category: "deployment",
              read_write_classification: "write",
              input_preview: { deployment_id: deployment.deployment_id, status: deployment.status },
            },
            toolCallId: deployment.deployment_id,
          }),
        );
      } else if (deployment.status === "healthy") {
        emitTimeline(
          buildSyntheticEvent({
            type: "tool.completed",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: {
              tool_name: "preview_revert_progress",
              status: "completed",
              result_preview: { deployment_id: deployment.deployment_id, branch: deployment.branch },
              duration_ms: 0,
            },
            toolCallId: deployment.deployment_id,
          }),
        );
      } else if (deployment.status === "failed") {
        emitTimeline(
          buildSyntheticEvent({
            type: "tool.failed",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: {
              tool_name: "preview_revert_progress",
              error_code: "revert_failed",
              message: deployment.failure_reason ?? "Revert failed.",
              duration_ms: 0,
            },
            toolCallId: deployment.deployment_id,
          }),
        );
      }
    },
    [emitTimeline, updateState],
  );

  const deployChange = useCallback(
    async (change: AiEngineerChangeSummary) => {
      if (!change.targetUnitId) {
        updateState(change, (state) => failPreview(state, "Change is missing a target unit; cannot deploy."));
        return;
      }
      updateState(change, startDeploying);
      try {
        const submitted = await deployPreviewChange({
          branch: change.branch,
          commitSha: change.commitSha ?? null,
          targetUnitId: change.targetUnitId,
          targetApplicationId: change.targetApplicationId ?? null,
          conversationId: change.conversationId ?? null,
          agentRunId: change.agentRunId,
        });
        updateState(change, (state) => applyDeploySubmitted(state, submitted));
        const onUpdate = handleDeployUpdate(change);
        onUpdate(submitted);
        if (submitted.status !== "healthy" && submitted.status !== "failed") {
          await pollDeploymentUntilTerminal(submitted.deployment_id, { onUpdate });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to deploy preview change.";
        updateState(change, (state) => failPreview(state, message));
      }
    },
    [handleDeployUpdate, updateState],
  );

  const revertChange = useCallback(
    async (change: AiEngineerChangeSummary) => {
      if (!change.targetUnitId) {
        updateState(change, (state) => failPreview(state, "Change is missing a target unit; cannot revert."));
        return;
      }
      const existingState = previewMapRef.current.get(previewKey(change));
      updateState(change, startReverting);
      try {
        const submitted = await revertPreviewChange({
          targetUnitId: change.targetUnitId,
          targetApplicationId: change.targetApplicationId ?? null,
          baselineBranch: change.baseBranch,
          baselineCommitSha: change.baseCommitSha ?? null,
          previewDeploymentId: existingState?.previewDeploymentId ?? null,
          conversationId: change.conversationId ?? null,
          agentRunId: change.agentRunId,
        });
        updateState(change, (state) => applyRevertSubmitted(state, submitted));
        const onUpdate = handleRevertUpdate(change);
        onUpdate(submitted);
        if (submitted.status !== "healthy" && submitted.status !== "failed") {
          await pollDeploymentUntilTerminal(submitted.deployment_id, { onUpdate });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to revert preview change.";
        updateState(change, (state) => failPreview(state, message));
      }
    },
    // previewMapRef is stable across renders so it does not need to be in deps
    [handleRevertUpdate, updateState],
  );

  const previews = useMemo(() => [...previewMap.values()], [previewMap]);

  const getStateForChange = useCallback(
    (change: AiEngineerChangeSummary) => previewMap.get(previewKey(change)) ?? null,
    [previewMap],
  );

  const isBusyForChange = useCallback(
    (change: AiEngineerChangeSummary) => {
      const state = previewMap.get(previewKey(change));
      if (!state) return false;
      return state.status === "deploying" || state.status === "reverting";
    },
    [previewMap],
  );

  return {
    previews,
    ingestEvent,
    deployChange,
    revertChange,
    isBusyForChange,
    getStateForChange,
  };
}
