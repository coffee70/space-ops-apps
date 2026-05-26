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
  /**
   * Called the first time a change.summary is observed for a given preview
   * key. Lets the parent inject a synthetic assistant chat message so the
   * lifecycle cards show up inside the chat transcript instead of in a
   * detached lane below it.
   */
  onPreviewSummaryReceived?: (input: { previewKey: string; change: AiEngineerChangeSummary }) => void;
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
  reset: () => void;
  deployChange: (change: AiEngineerChangeSummary) => Promise<void>;
  revertChange: (change: AiEngineerChangeSummary) => Promise<void>;
  isBusyForChange: (change: AiEngineerChangeSummary) => boolean;
  getStateForChange: (change: AiEngineerChangeSummary) => ChangePreviewState | null;
  getStateByKey: (previewKey: string) => ChangePreviewState | null;
}

export function previewKeyForChange(change: AiEngineerChangeSummary): string {
  return `${change.agentRunId}::${change.branch}`;
}

export function deploymentLifecycleEventType(deployment: DeploymentRecord, phase: "deploy" | "revert"): string {
  if (deployment.status === "healthy") {
    return phase === "deploy" ? "preview.active" : "baseline.active";
  }
  if (deployment.status === "failed" || deployment.status === "replaced") {
    return phase === "deploy" ? "deployment.failed" : "revert.failed";
  }
  if (deployment.status === "building" || deployment.status === "health_checking") {
    return phase === "deploy" ? "deployment.build_started" : "baseline.build_started";
  }
  if (deployment.status === "queued" || deployment.status === "pending" || deployment.status === "materializing") {
    return phase === "deploy" ? "deployment.submitted" : "baseline.deployment_submitted";
  }
  return phase === "deploy" ? "deployment.update" : "revert.update";
}

export function useChangePreviewFlow(options: UseChangePreviewFlowOptions = {}): UseChangePreviewFlowResult {
  const [previewMap, setPreviewMap] = useState<Map<string, ChangePreviewState>>(new Map());
  const previewMapRef = useRef(previewMap);
  const announcedKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    previewMapRef.current = previewMap;
  }, [previewMap]);

  const onTimelineEventRef = useRef(options.onTimelineEvent);
  useEffect(() => {
    onTimelineEventRef.current = options.onTimelineEvent;
  }, [options.onTimelineEvent]);

  const onPreviewSummaryReceivedRef = useRef(options.onPreviewSummaryReceived);
  useEffect(() => {
    onPreviewSummaryReceivedRef.current = options.onPreviewSummaryReceived;
  }, [options.onPreviewSummaryReceived]);

  const emitTimeline = useCallback((event: ChatEvent) => {
    onTimelineEventRef.current?.(event);
  }, []);

  const ingestEvent = useCallback((event: ChatEvent) => {
    const summary = changeSummaryFromEvent(event);
    if (!summary) return;
    const key = previewKeyForChange(summary);
    setPreviewMap((previous) => {
      const existing = previous.get(key);
      const next = new Map(previous);
      next.set(key, existing ? { ...existing, change: summary } : createInitialChangePreviewState(summary));
      return next;
    });
    if (!announcedKeysRef.current.has(key)) {
      announcedKeysRef.current.add(key);
      onPreviewSummaryReceivedRef.current?.({ previewKey: key, change: summary });
    }
  }, []);

  const reset = useCallback(() => {
    announcedKeysRef.current.clear();
    setPreviewMap(new Map());
  }, []);

  const updateState = useCallback((change: AiEngineerChangeSummary, updater: (state: ChangePreviewState) => ChangePreviewState) => {
    setPreviewMap((previous) => {
      const key = previewKeyForChange(change);
      const existing = previous.get(key) ?? createInitialChangePreviewState(change);
      const next = new Map(previous);
      next.set(key, updater(existing));
      return next;
    });
  }, []);

  const handleDeployUpdate = useCallback(
    (change: AiEngineerChangeSummary) => (deployment: DeploymentRecord) => {
      updateState(change, (state) => applyDeployUpdate(state, deployment));
      emitTimeline(
        buildSyntheticEvent({
          type: deploymentLifecycleEventType(deployment, "deploy"),
          agentRunId: change.agentRunId,
          conversationId: change.conversationId,
          payload: {
            deployment_id: deployment.deployment_id,
            unit_id: deployment.unit_id,
            branch: deployment.branch,
            commit_sha: deployment.commit_sha,
            status: deployment.status,
            health_status: deployment.health_status,
            failure_reason: deployment.failure_reason ?? undefined,
          },
          toolCallId: deployment.deployment_id,
        }),
      );
    },
    [emitTimeline, updateState],
  );

  const handleRevertUpdate = useCallback(
    (change: AiEngineerChangeSummary) => (deployment: DeploymentRecord) => {
      updateState(change, (state) => applyRevertUpdate(state, deployment));
      emitTimeline(
        buildSyntheticEvent({
          type: deploymentLifecycleEventType(deployment, "revert"),
          agentRunId: change.agentRunId,
          conversationId: change.conversationId,
          payload: {
            deployment_id: deployment.deployment_id,
            unit_id: deployment.unit_id,
            branch: deployment.branch,
            commit_sha: deployment.commit_sha,
            status: deployment.status,
            health_status: deployment.health_status,
            failure_reason: deployment.failure_reason ?? undefined,
          },
          toolCallId: deployment.deployment_id,
        }),
      );
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
      emitTimeline(
        buildSyntheticEvent({
          type: "deployment.requested",
          agentRunId: change.agentRunId,
          conversationId: change.conversationId,
          payload: {
            unit_id: change.targetUnitId,
            branch: change.branch,
            commit_sha: change.commitSha ?? null,
          },
        }),
      );
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
        if (submitted.status !== "healthy" && submitted.status !== "failed" && submitted.status !== "replaced") {
          await pollDeploymentUntilTerminal(submitted.deployment_id, { onUpdate });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to deploy preview change.";
        updateState(change, (state) => failPreview(state, message));
        emitTimeline(
          buildSyntheticEvent({
            type: "deployment.failed",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: { unit_id: change.targetUnitId, branch: change.branch, message },
          }),
        );
      }
    },
    [emitTimeline, handleDeployUpdate, updateState],
  );

  const revertChange = useCallback(
    async (change: AiEngineerChangeSummary) => {
      if (!change.targetUnitId) {
        updateState(change, (state) => failPreview(state, "Change is missing a target unit; cannot revert."));
        return;
      }
      const existingState = previewMapRef.current.get(previewKeyForChange(change));
      updateState(change, startReverting);
      emitTimeline(
        buildSyntheticEvent({
          type: "revert.requested",
          agentRunId: change.agentRunId,
          conversationId: change.conversationId,
          payload: {
            unit_id: change.targetUnitId,
            baseline_branch: change.baseBranch,
            baseline_commit_sha: change.baseCommitSha ?? null,
            preview_deployment_id: existingState?.previewDeploymentId ?? null,
          },
        }),
      );
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
        if (submitted.status !== "healthy" && submitted.status !== "failed" && submitted.status !== "replaced") {
          await pollDeploymentUntilTerminal(submitted.deployment_id, { onUpdate });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to revert preview change.";
        updateState(change, (state) => failPreview(state, message));
        emitTimeline(
          buildSyntheticEvent({
            type: "revert.failed",
            agentRunId: change.agentRunId,
            conversationId: change.conversationId,
            payload: { unit_id: change.targetUnitId, baseline_branch: change.baseBranch, message },
          }),
        );
      }
    },
    [emitTimeline, handleRevertUpdate, updateState],
  );

  const previews = useMemo(() => [...previewMap.values()], [previewMap]);

  const getStateForChange = useCallback(
    (change: AiEngineerChangeSummary) => previewMap.get(previewKeyForChange(change)) ?? null,
    [previewMap],
  );

  const getStateByKey = useCallback((previewKey: string) => previewMap.get(previewKey) ?? null, [previewMap]);

  const isBusyForChange = useCallback(
    (change: AiEngineerChangeSummary) => {
      const state = previewMap.get(previewKeyForChange(change));
      if (!state) return false;
      return state.status === "deploying" || state.status === "reverting";
    },
    [previewMap],
  );

  return {
    previews,
    ingestEvent,
    reset,
    deployChange,
    revertChange,
    isBusyForChange,
    getStateForChange,
    getStateByKey,
  };
}
