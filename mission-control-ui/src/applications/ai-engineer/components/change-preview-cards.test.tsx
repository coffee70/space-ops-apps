import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  BaselineRestoredCard,
  ChangeSummaryCard,
  PreviewDeploymentProgressCard,
  PreviewLiveCard,
  RevertProgressCard,
} from "./change-preview-cards";
import { createInitialChangePreviewState } from "../lib/change-preview-state";
import type { AiEngineerChangeSummary, ChangePreviewState } from "../lib/change-preview-types";

function buildChange(overrides: Partial<AiEngineerChangeSummary> = {}): AiEngineerChangeSummary {
  return {
    conversationId: overrides.conversationId ?? "conversation-1",
    agentRunId: overrides.agentRunId ?? "run-1",
    branch: overrides.branch ?? "preview/example",
    baseBranch: overrides.baseBranch ?? "main",
    baseCommitSha: overrides.baseCommitSha ?? null,
    commitSha: overrides.commitSha ?? null,
    changedFiles: overrides.changedFiles ?? ["src/foo.ts", "src/bar.ts"],
    targetUnitId: overrides.targetUnitId ?? "telemetry-app",
    targetApplicationId: overrides.targetApplicationId ?? "telemetry",
    affectedCapability: overrides.affectedCapability ?? "telemetry-detail",
    riskLevel: overrides.riskLevel ?? "low",
    validationStatus: overrides.validationStatus ?? "not_run",
  };
}

function withState(overrides: Partial<ChangePreviewState> = {}): ChangePreviewState {
  const change = overrides.change ?? buildChange();
  return {
    ...createInitialChangePreviewState(change),
    ...overrides,
    change,
  };
}

test("ChangeSummaryCard renders title, branch, file count, deploy button when ready", () => {
  const markup = renderToStaticMarkup(
    <ChangeSummaryCard state={withState()} isBusy={false} onDeploy={() => {}} />,
  );
  assert.match(markup, /data-testid="change-summary-card"/);
  assert.match(markup, /Ready to preview changes/);
  assert.match(markup, /preview\/example/);
  assert.match(markup, /2 files/);
  assert.match(markup, /Deploy changes/);
  assert.match(markup, /telemetry-detail/);
  assert.match(markup, /Low risk/);
});

test("ChangeSummaryCard shows a Deploying spinner during deployment", () => {
  const markup = renderToStaticMarkup(
    <ChangeSummaryCard state={withState({ status: "deploying" })} isBusy={true} onDeploy={() => {}} />,
  );
  assert.match(markup, /Deploying/);
  assert.match(markup, /disabled/);
});

test("ChangeSummaryCard surfaces failed deploy with retry button", () => {
  const markup = renderToStaticMarkup(
    <ChangeSummaryCard
      state={withState({ status: "failed", failureReason: "build broken" })}
      isBusy={false}
      onDeploy={() => {}}
    />,
  );
  assert.match(markup, /Retry deploy/);
  assert.match(markup, /build broken/);
});

test("PreviewLiveCard renders Open app and Revert buttons when preview is live", () => {
  const markup = renderToStaticMarkup(
    <PreviewLiveCard
      state={withState({ status: "deployed_preview" })}
      onOpenApp={() => {}}
      onRevert={() => {}}
      isBusy={false}
    />,
  );
  assert.match(markup, /data-testid="preview-live-card"/);
  assert.match(markup, /Preview is live/);
  assert.match(markup, /Open app/);
  assert.match(markup, /Revert changes/);
});

test("PreviewLiveCard returns nothing when status is not deployed_preview", () => {
  const markup = renderToStaticMarkup(
    <PreviewLiveCard
      state={withState()}
      onOpenApp={() => {}}
      onRevert={() => {}}
      isBusy={false}
    />,
  );
  assert.equal(markup, "");
});

test("PreviewDeploymentProgressCard renders only while deploying", () => {
  const renderingForState = (state: ChangePreviewState) =>
    renderToStaticMarkup(<PreviewDeploymentProgressCard state={state} />);
  assert.match(renderingForState(withState({ status: "deploying" })), /Deploying preview changes/);
  assert.equal(renderingForState(withState()), "");
});

test("RevertProgressCard renders only while reverting", () => {
  const renderingForState = (state: ChangePreviewState) =>
    renderToStaticMarkup(<RevertProgressCard state={state} />);
  assert.match(renderingForState(withState({ status: "reverting" })), /Reverting back to the baseline/);
  assert.equal(renderingForState(withState()), "");
});

test("BaselineRestoredCard renders only after baseline_restored", () => {
  const renderingForState = (state: ChangePreviewState) =>
    renderToStaticMarkup(<BaselineRestoredCard state={state} />);
  assert.match(renderingForState(withState({ status: "baseline_restored" })), /Baseline restored/);
  assert.equal(renderingForState(withState()), "");
});
