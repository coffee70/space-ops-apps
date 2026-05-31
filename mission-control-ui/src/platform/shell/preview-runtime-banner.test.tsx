import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";
import { buildPreviewRuntimeRevertInput, PreviewRuntimeBannerView } from "./preview-runtime-banner";

function previewRuntime(
  overrides: Partial<FrontendRuntimeStatus> = {},
): FrontendRuntimeStatus {
  return {
    frontend_unit_id: "mission-control-frontend-shell",
    target_application_id: null,
    baseline_branch: "main",
    baseline_commit_sha: "base123",
    active: {
      deployment_id: "dep_preview",
      runtime_service_name: "mission-control-frontend-shell-dep-preview",
      branch: "preview/shell-banner",
      commit_sha: "abcdef123456",
      deployment_status: "healthy",
      health_status: "passing",
      deployment_intent: "deploy_preview",
      mode: "preview",
      is_preview: true,
      failure_reason: null,
      validation_status: "not_run",
      validation_summary: {},
      success_claim_allowed: false,
      last_validation_message: null,
    },
    pending: null,
    last_terminal: null,
    effective_state: "preview_active",
    ...overrides,
  };
}

test("PreviewRuntimeBannerView returns nothing when runtime is baseline", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime({
        active: {
          deployment_id: "dep_baseline",
          runtime_service_name: "mission-control-frontend-shell-dep-baseline",
          branch: "main",
          commit_sha: "base123",
          deployment_status: "healthy",
          health_status: "passing",
          deployment_intent: "revert_to_baseline",
          mode: "baseline",
          is_preview: false,
          failure_reason: null,
          validation_status: "not_run",
          validation_summary: {},
          success_claim_allowed: false,
          last_validation_message: null,
        },
        effective_state: "baseline_active",
      })}
      revertState="idle"
      onRevert={() => {}}
    />,
  );

  assert.equal(markup, "");
});

test("PreviewRuntimeBannerView renders preview branch, short commit, and revert button", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView preview={previewRuntime()} revertState="idle" onRevert={() => {}} />,
  );

  assert.match(markup, /data-testid="preview-runtime-banner"/);
  assert.match(markup, /Preview healthy - validation not run/);
  assert.match(markup, /capability validation has not completed/);
  assert.match(markup, /preview\/shell-banner/);
  assert.match(markup, /abcdef1/);
  assert.match(markup, /Revert to baseline/);
});

test("PreviewRuntimeBannerView shows failed validation status", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime({
        active: {
          ...previewRuntime().active!,
          validation_status: "failed",
          last_validation_message: "GET /internal/runtime-services/example/advisory returned 404",
        },
      })}
      revertState="idle"
      onRevert={() => {}}
    />,
  );

  assert.match(markup, /Preview validation failed/);
  assert.match(markup, /returned 404/);
});

test("PreviewRuntimeBannerView shows not-ready validation status", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime({
        active: {
          ...previewRuntime().active!,
          validation_status: "not_ready",
          deployment_status: "building",
          health_status: "pending",
        },
      })}
      revertState="idle"
      onRevert={() => {}}
    />,
  );

  assert.match(markup, /Preview not ready for validation/);
  assert.match(markup, /not reached healthy\/passing state yet/);
});

test("PreviewRuntimeBannerView shows running validation status", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime({
        active: {
          ...previewRuntime().active!,
          validation_status: "running",
        },
      })}
      revertState="idle"
      onRevert={() => {}}
    />,
  );

  assert.match(markup, /Preview validation running/);
  assert.match(markup, /platform integration checks are in progress/);
  assert.doesNotMatch(markup, /validation not run/);
});

test("PreviewRuntimeBannerView shows passed validation status", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime({
        active: {
          ...previewRuntime().active!,
          validation_status: "passed",
          success_claim_allowed: true,
        },
      })}
      revertState="idle"
      onRevert={() => {}}
    />,
  );

  assert.match(markup, /Preview validated/);
  assert.match(markup, /platform integration checks passed/);
});

test("PreviewRuntimeBannerView renders optional intended target", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime({ target_application_id: "telemetry" })}
      revertState="idle"
      onRevert={() => {}}
    />,
  );

  assert.match(markup, /Intended inspection target/);
  assert.match(markup, /telemetry/);
});

test("PreviewRuntimeBannerView disables the button while reverting", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView preview={previewRuntime()} revertState="reverting" onRevert={() => {}} />,
  );

  assert.match(markup, /Reverting/);
  assert.match(markup, /disabled/);
});

test("PreviewRuntimeBannerView shows inline failure state", () => {
  const markup = renderToStaticMarkup(
    <PreviewRuntimeBannerView
      preview={previewRuntime()}
      revertState="failed"
      errorMessage="baseline deploy failed"
      onRevert={() => {}}
    />,
  );

  assert.match(markup, /baseline deploy failed/);
  assert.match(markup, /Revert to baseline/);
});

test("buildPreviewRuntimeRevertInput maps shell preview context to existing revert request", () => {
  assert.deepEqual(buildPreviewRuntimeRevertInput(previewRuntime()), {
    targetUnitId: "mission-control-frontend-shell",
    targetApplicationId: null,
    baselineBranch: "main",
    baselineCommitSha: "base123",
    previewDeploymentId: "dep_preview",
    conversationId: null,
    agentRunId: null,
  });
});

test("buildPreviewRuntimeRevertInput falls back to active deployment id", () => {
  assert.deepEqual(
    buildPreviewRuntimeRevertInput(previewRuntime({ target_application_id: "telemetry" })),
    {
      targetUnitId: "mission-control-frontend-shell",
      targetApplicationId: "telemetry",
      baselineBranch: "main",
      baselineCommitSha: "base123",
      previewDeploymentId: "dep_preview",
      conversationId: null,
      agentRunId: null,
    },
  );
});
