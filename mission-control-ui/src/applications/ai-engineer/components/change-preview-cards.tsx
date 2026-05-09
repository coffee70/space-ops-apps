"use client";

import { ArrowUpRight, CheckCircle2, GitBranch, Loader2, RotateCcw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AiEngineerChangeSummary,
  ChangePreviewState,
} from "@/applications/ai-engineer/lib/change-preview-types";

function RiskBadge({ risk }: { risk: AiEngineerChangeSummary["riskLevel"] }) {
  if (risk === "high") {
    return <Badge variant="destructive">High risk</Badge>;
  }
  if (risk === "medium") {
    return <Badge variant="outline">Medium risk</Badge>;
  }
  return <Badge variant="secondary">Low risk</Badge>;
}

function ValidationBadge({ status }: { status: AiEngineerChangeSummary["validationStatus"] }) {
  if (status === "passed") return <Badge variant="success">Validation passed</Badge>;
  if (status === "failed") return <Badge variant="destructive">Validation failed</Badge>;
  if (status === "running") return <Badge variant="outline">Validation running</Badge>;
  return <Badge variant="outline">Validation not run</Badge>;
}

function MetadataRow({ change }: { change: AiEngineerChangeSummary }) {
  const fileCountLabel = `${change.changedFiles.length} ${change.changedFiles.length === 1 ? "file" : "files"}`;
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className="text-foreground/80 font-medium">{change.affectedCapability}</span>
      <span aria-hidden>·</span>
      <span>{fileCountLabel}</span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <GitBranch className="size-3" />
        <span className="font-mono">{change.branch}</span>
      </span>
    </div>
  );
}

function ChangedFilesDisclosure({ change }: { change: AiEngineerChangeSummary }) {
  if (change.changedFiles.length === 0) return null;
  return (
    <details className="text-muted-foreground mt-2 text-[11px]">
      <summary className="hover:text-foreground cursor-pointer" data-testid="change-summary-files-toggle">
        View changed files
      </summary>
      <ul className="mt-2 space-y-1">
        {change.changedFiles.map((file) => (
          <li key={file} className="bg-muted/40 rounded-md px-2 py-1 font-mono text-[10px]">
            {file}
          </li>
        ))}
      </ul>
    </details>
  );
}

function DeveloperDetailsDisclosure({ state }: { state: ChangePreviewState }) {
  return (
    <details className="text-muted-foreground mt-2 text-[10px]" data-testid="developer-details">
      <summary className="hover:text-foreground cursor-pointer">Show developer details</summary>
      <pre className="bg-muted text-muted-foreground mt-1 max-h-40 overflow-auto rounded-lg p-2 text-[10px]">
        {JSON.stringify(
          {
            change: state.change,
            previewDeploymentId: state.previewDeploymentId,
            previewDeployment: state.previewDeployment,
            revertDeploymentId: state.revertDeploymentId,
            revertDeployment: state.revertDeployment,
            failureReason: state.failureReason,
          },
          null,
          2,
        )}
      </pre>
    </details>
  );
}

function CardShell({
  className,
  testId,
  children,
}: {
  className?: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border/50 bg-card/80 mt-3 w-[min(100%,560px)] rounded-2xl border p-4 shadow-[var(--shadow-card)]",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export interface ChangeSummaryCardProps {
  state: ChangePreviewState;
  isBusy: boolean;
  onDeploy: (change: AiEngineerChangeSummary) => void;
}

export function ChangeSummaryCard({ state, isBusy, onDeploy }: ChangeSummaryCardProps) {
  const { change } = state;
  const disabled = isBusy || state.status === "deploying" || state.status === "deployed_preview" || state.status === "reverting" || state.status === "baseline_restored";
  const showFailedDeploy = state.status === "failed" && !state.revertDeploymentId;
  return (
    <CardShell testId="change-summary-card">
      <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Change preview</div>
      <h3 className="text-foreground mt-1 text-sm font-semibold">Ready to preview changes</h3>
      <p className="text-muted-foreground mt-1 text-[12px] leading-5">
        I made a scoped change on a preview branch. Deploy it to inspect the updated capability without touching the
        baseline version.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RiskBadge risk={change.riskLevel} />
        <ValidationBadge status={change.validationStatus} />
      </div>
      <div className="mt-3">
        <MetadataRow change={change} />
      </div>
      <ChangedFilesDisclosure change={change} />
      {showFailedDeploy ? (
        <div className="bg-destructive/10 text-destructive mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]">
          <ShieldAlert className="mt-0.5 size-3.5" />
          <span>
            {state.failureReason ?? "The preview deployment failed. The baseline version is still active."}
          </span>
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onDeploy(change)}
          disabled={disabled}
          data-testid="change-summary-deploy"
        >
          {state.status === "deploying" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Deploying...
            </>
          ) : showFailedDeploy ? (
            "Retry deploy"
          ) : (
            "Deploy changes"
          )}
        </Button>
      </div>
      <DeveloperDetailsDisclosure state={state} />
    </CardShell>
  );
}

export interface PreviewDeploymentProgressCardProps {
  state: ChangePreviewState;
}

export function PreviewDeploymentProgressCard({ state }: PreviewDeploymentProgressCardProps) {
  if (state.status !== "deploying") return null;
  const branch = state.change.branch;
  return (
    <CardShell testId="preview-deployment-progress-card">
      <div className="flex items-center gap-2 text-[12px] font-medium">
        <Loader2 className="size-3.5 animate-spin" />
        Deploying preview changes...
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">
        Building <span className="font-mono">{branch}</span> on <span className="font-mono">{state.change.targetUnitId ?? "managed unit"}</span>.
      </p>
    </CardShell>
  );
}

export interface PreviewLiveCardProps {
  state: ChangePreviewState;
  onOpenApp: (change: AiEngineerChangeSummary) => void;
  onRevert: (change: AiEngineerChangeSummary) => void;
  isBusy: boolean;
}

export function PreviewLiveCard({ state, onOpenApp, onRevert, isBusy }: PreviewLiveCardProps) {
  if (state.status !== "deployed_preview") return null;
  const hasApp = Boolean(state.change.targetApplicationId);
  return (
    <CardShell testId="preview-live-card">
      <div className="text-success flex items-center gap-2 text-[12px] font-medium">
        <CheckCircle2 className="size-3.5" />
        Preview is live
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">
        {hasApp
          ? "The updated capability is ready to inspect. The baseline version is paused while the preview is active."
          : "The service preview is active. Inspect through dependent apps; the baseline version is paused while the preview is active."}
      </p>
      <div className="mt-3">
        <MetadataRow change={state.change} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        {hasApp ? (
          <Button
            size="sm"
            variant="default"
            onClick={() => onOpenApp(state.change)}
            data-testid="preview-live-open-app"
          >
            <ArrowUpRight className="size-3.5" />
            Open app
          </Button>
        ) : (
          <span
            className="text-muted-foreground bg-muted/40 rounded-md px-2 py-1 text-[11px]"
            data-testid="preview-live-service-active"
          >
            Service preview active
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRevert(state.change)}
          disabled={isBusy}
          data-testid="preview-live-revert"
        >
          <RotateCcw className="size-3.5" />
          Revert changes
        </Button>
      </div>
      <DeveloperDetailsDisclosure state={state} />
    </CardShell>
  );
}

export interface RevertProgressCardProps {
  state: ChangePreviewState;
}

export function RevertProgressCard({ state }: RevertProgressCardProps) {
  if (state.status !== "reverting") return null;
  return (
    <CardShell testId="revert-progress-card">
      <div className="flex items-center gap-2 text-[12px] font-medium">
        <Loader2 className="size-3.5 animate-spin" />
        Reverting back to the baseline version...
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">
        Restoring <span className="font-mono">{state.change.baseBranch}</span> on{" "}
        <span className="font-mono">{state.change.targetUnitId ?? "managed unit"}</span>.
      </p>
    </CardShell>
  );
}

export interface BaselineRestoredCardProps {
  state: ChangePreviewState;
}

export function BaselineRestoredCard({ state }: BaselineRestoredCardProps) {
  if (state.status !== "baseline_restored") return null;
  return (
    <CardShell testId="baseline-restored-card">
      <div className="text-success flex items-center gap-2 text-[12px] font-medium">
        <CheckCircle2 className="size-3.5" />
        Baseline restored
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">The platform is back on the baseline version.</p>
      <DeveloperDetailsDisclosure state={state} />
    </CardShell>
  );
}

export interface RevertFailureCardProps {
  state: ChangePreviewState;
  onRetry: (change: AiEngineerChangeSummary) => void;
  isBusy: boolean;
}

export function RevertFailureCard({ state, onRetry, isBusy }: RevertFailureCardProps) {
  if (state.status !== "failed" || !state.revertDeploymentId) return null;
  return (
    <CardShell testId="revert-failure-card">
      <div className="text-destructive flex items-center gap-2 text-[12px] font-medium">
        <ShieldAlert className="size-3.5" />
        Revert did not complete
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">
        {state.failureReason ?? "The revert did not complete. The preview may still be active."}
      </p>
      <div className="mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRetry(state.change)}
          disabled={isBusy}
          data-testid="revert-failure-retry"
        >
          Retry revert
        </Button>
      </div>
      <DeveloperDetailsDisclosure state={state} />
    </CardShell>
  );
}

export function ChangePreviewCardStack({
  state,
  isBusy,
  onDeploy,
  onRevert,
  onOpenApp,
}: {
  state: ChangePreviewState;
  isBusy: boolean;
  onDeploy: (change: AiEngineerChangeSummary) => void;
  onRevert: (change: AiEngineerChangeSummary) => void;
  onOpenApp: (change: AiEngineerChangeSummary) => void;
}) {
  return (
    <div className="flex flex-col" data-testid="change-preview-card-stack">
      <ChangeSummaryCard state={state} isBusy={isBusy} onDeploy={onDeploy} />
      <PreviewDeploymentProgressCard state={state} />
      <PreviewLiveCard state={state} onOpenApp={onOpenApp} onRevert={onRevert} isBusy={isBusy} />
      <RevertProgressCard state={state} />
      <BaselineRestoredCard state={state} />
      <RevertFailureCard state={state} onRetry={onRevert} isBusy={isBusy} />
    </div>
  );
}
