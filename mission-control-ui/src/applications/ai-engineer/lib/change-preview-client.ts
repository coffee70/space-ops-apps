import type { DeploymentRecord } from "@/applications/ai-engineer/lib/change-preview-types";
import {
  DeploymentLogResponseSchema,
  DeploymentRecordSchema,
  DeployPreviewChangeRequestSchema,
  RevertPreviewChangeRequestSchema,
} from "@/applications/ai-engineer/lib/change-preview-schemas";
import { z } from "zod";

const ROUTES = {
  deployPreview: "/change-previews/deploy",
  revertPreview: "/change-previews/revert",
  deployment: (deploymentId: string) => `/deployments/${deploymentId}`,
  deploymentLogs: (deploymentId: string) => `/deployments/${deploymentId}/logs`,
} as const;

export interface DeployPreviewChangeInput {
  branch: string;
  commitSha?: string | null;
  targetUnitId: string;
  targetApplicationId?: string | null;
  conversationId?: string | null;
  agentRunId?: string | null;
}

export interface RevertPreviewChangeInput {
  targetUnitId: string;
  targetApplicationId?: string | null;
  baselineBranch?: string;
  baselineCommitSha?: string | null;
  previewDeploymentId?: string | null;
  conversationId?: string | null;
  agentRunId?: string | null;
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return schema.parse(await response.json());
}

export async function deployPreviewChange(input: DeployPreviewChangeInput): Promise<DeploymentRecord> {
  const body = DeployPreviewChangeRequestSchema.parse({
    branch: input.branch,
    commit_sha: input.commitSha ?? null,
    target_unit_id: input.targetUnitId,
    target_application_id: input.targetApplicationId ?? null,
    conversation_id: input.conversationId ?? null,
    agent_run_id: input.agentRunId ?? null,
  });
  return postJson(ROUTES.deployPreview, body, DeploymentRecordSchema);
}

export async function revertPreviewChange(input: RevertPreviewChangeInput): Promise<DeploymentRecord> {
  const body = RevertPreviewChangeRequestSchema.parse({
    target_unit_id: input.targetUnitId,
    target_application_id: input.targetApplicationId ?? null,
    baseline_branch: input.baselineBranch ?? "main",
    baseline_commit_sha: input.baselineCommitSha ?? null,
    preview_deployment_id: input.previewDeploymentId ?? null,
    conversation_id: input.conversationId ?? null,
    agent_run_id: input.agentRunId ?? null,
  });
  return postJson(ROUTES.revertPreview, body, DeploymentRecordSchema);
}

export async function getDeployment(deploymentId: string): Promise<DeploymentRecord> {
  const response = await fetch(ROUTES.deployment(deploymentId));
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Failed to load deployment ${deploymentId}`);
  }
  return DeploymentRecordSchema.parse(await response.json());
}

export async function getDeploymentLogs(deploymentId: string): Promise<{ deployment_id: string; logs: string }> {
  const response = await fetch(ROUTES.deploymentLogs(deploymentId));
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Failed to load logs for deployment ${deploymentId}`);
  }
  return DeploymentLogResponseSchema.parse(await response.json());
}

export interface PollDeploymentOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onUpdate?: (deployment: DeploymentRecord) => void;
  signal?: AbortSignal;
  fetcher?: typeof getDeployment;
}

export function isTerminalDeploymentStatus(status: string): boolean {
  return status === "healthy" || status === "failed" || status === "replaced";
}

export async function pollDeploymentUntilTerminal(
  deploymentId: string,
  options: PollDeploymentOptions = {},
): Promise<DeploymentRecord> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const fetcher = options.fetcher ?? getDeployment;
  const start = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new DOMException("Deployment polling aborted", "AbortError");
    }
    const deployment = await fetcher(deploymentId);
    options.onUpdate?.(deployment);
    if (isTerminalDeploymentStatus(deployment.status)) {
      return deployment;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Deployment ${deploymentId} did not reach a terminal state in time`);
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      options.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }
}
