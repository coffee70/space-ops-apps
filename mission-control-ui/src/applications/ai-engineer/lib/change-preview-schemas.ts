import { z } from "zod";

export const DeploymentRecordSchema = z
  .object({
    deployment_id: z.string(),
    unit_id: z.string(),
    branch: z.string(),
    commit_sha: z.string(),
    deployment_intent: z.string().optional(),
    status: z.string(),
    health_status: z.string(),
    logs_url: z.string().optional(),
    registered: z.boolean().optional(),
    failure_reason: z.string().nullable().optional(),
  })
  .passthrough();

export const DeploymentLogResponseSchema = z.object({
  deployment_id: z.string(),
  logs: z.string(),
});

export const DeployPreviewChangeRequestSchema = z
  .object({
    branch: z.string().min(1),
    commit_sha: z.string().nullable(),
    target_unit_id: z.string().min(1),
    target_application_id: z.string().nullable(),
    conversation_id: z.string().nullable(),
    agent_run_id: z.string().nullable(),
  })
  .strict();

export const RevertPreviewChangeRequestSchema = z
  .object({
    target_unit_id: z.string().min(1),
    target_application_id: z.string().nullable(),
    baseline_branch: z.string().min(1),
    baseline_commit_sha: z.string().nullable(),
    preview_deployment_id: z.string().nullable(),
    conversation_id: z.string().nullable(),
    agent_run_id: z.string().nullable(),
  })
  .strict();
