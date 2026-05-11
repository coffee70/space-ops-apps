"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditorStatusNotice, type EditorStatusNoticeData } from "@/components/editor-status-notice";
import { Spinner } from "@/components/ui/spinner";
import { ConfigFileEditor } from "@/components/config-file-editor";
import { getErrorErrors, getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  useAiEngineerModelConfigQuery,
  useUpdateAiEngineerModelConfigMutation,
  useValidateAiEngineerModelConfigMutation,
  type AiEngineerModelConfigDocument,
  type AiEngineerModelConfigParsedSummary,
  type AiEngineerModelConfigValidationError,
} from "@/lib/query-hooks";

function formatValidationErrorDetail(error: AiEngineerModelConfigValidationError): string {
  const parts: string[] = [];
  if (error.loc.length > 0) parts.push(error.loc.join(" > "));
  parts.push(error.message);
  if (error.type) parts.push(`(${error.type})`);
  return parts.join(" ");
}

type EditorBodyProps = {
  document: AiEngineerModelConfigDocument;
};

function AiEngineerModelConfigEditorBody({ document }: EditorBodyProps) {
  const queryClient = useQueryClient();
  const validateMutation = useValidateAiEngineerModelConfigMutation();
  const updateMutation = useUpdateAiEngineerModelConfigMutation();

  const [content, setContent] = useState(document.content);
  const [parsedSummary, setParsedSummary] = useState<AiEngineerModelConfigParsedSummary | null>(document.parsed ?? null);
  const [notice, setNotice] = useState<EditorStatusNoticeData | null>(null);

  const loadedPath = document.path;
  const loadedContent = document.content;
  const isDirty = content !== loadedContent;

  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function showNotice(next: Omit<EditorStatusNoticeData, "id">) {
    setNotice({
      id: Date.now() + Math.floor(Math.random() * 1000),
      dismissible: true,
      ...next,
    });
  }

  async function handleValidate() {
    if (!content.trim()) return;
    setNotice(null);
    try {
      const result = await validateMutation.mutateAsync(content);
      setParsedSummary(result.parsed ?? null);
      if (!result.valid) {
        showNotice({
          variant: "error",
          title: "Validation failed",
          message: "Model registry content is not valid.",
          details: result.errors.map(formatValidationErrorDetail),
          autoHideMs: null,
        });
        return;
      }
      showNotice({
        variant: "success",
        title: "Validation passed",
        message: "Model registry YAML is structurally valid.",
        autoHideMs: 4000,
      });
    } catch (error) {
      const errors = getErrorErrors<AiEngineerModelConfigValidationError>(error);
      showNotice({
        variant: "error",
        title: "Validation failed",
        message: getErrorMessage(error, "Validation failed"),
        details: errors.map(formatValidationErrorDetail),
        autoHideMs: null,
      });
    }
  }

  async function handleSave() {
    if (!content.trim()) return;
    setNotice(null);
    try {
      const result = await updateMutation.mutateAsync(content);
      setParsedSummary(result.parsed);
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerModelConfig });
      showNotice({
        variant: "success",
        title: "Saved",
        message:
          `Wrote ${result.path}. The agent runtime may need a restart before the AI Engineer chat model list picks up changes.`,
        autoHideMs: 8000,
      });
    } catch (error) {
      const errors = getErrorErrors<AiEngineerModelConfigValidationError>(error);
      showNotice({
        variant: "error",
        title: "Save failed",
        message: getErrorMessage(error, "Save failed"),
        details: errors.map(formatValidationErrorDetail),
        autoHideMs: null,
      });
    }
  }

  return (
    <>
      <section className="border-border/70 bg-background/95 relative flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border shadow-xs backdrop-blur">
        <div className="border-border/70 border-b px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">Agent model registry</h2>
              <p className="text-muted-foreground mt-1 font-mono text-xs break-all" title={loadedPath}>
                {loadedPath}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleValidate}
                disabled={validateMutation.isPending || !content.trim()}
              >
                Validate
              </Button>
              <Button type="button" onClick={handleSave} disabled={updateMutation.isPending || !content.trim()}>
                Save
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={isDirty ? "outline" : "secondary"}>{isDirty ? "Unsaved changes" : "Saved"}</Badge>
            {parsedSummary ? (
              <>
                <Badge variant="secondary">{parsedSummary.provider_count} providers</Badge>
                <Badge variant="secondary">{parsedSummary.enabled_model_count} enabled models</Badge>
                <Badge variant="secondary">{parsedSummary.model_count} total models</Badge>
                {parsedSummary.default_model_id ? (
                  <Badge variant="secondary">Default chat: {parsedSummary.default_model_id}</Badge>
                ) : null}
                {parsedSummary.provider_types.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </>
            ) : null}
          </div>
          {parsedSummary?.missing_api_key_envs && parsedSummary.missing_api_key_envs.length > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Missing env vars (not set in this backend process): {parsedSummary.missing_api_key_envs.join(", ")}
            </p>
          ) : null}
          {parsedSummary?.warnings && parsedSummary.warnings.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-amber-600 dark:text-amber-400">
              {parsedSummary.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {document.validation_errors.length > 0 ? (
          <div className="border-border/70 text-destructive border-b px-4 py-2 text-xs">
            Loaded file has validation issues. Fix and validate before saving.
            <ul className="mt-1 list-inside list-disc">
              {document.validation_errors.slice(0, 8).map((e, i) => (
                <li key={i}>{formatValidationErrorDetail(e)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="min-h-[min(70vh,560px)] flex-1 p-4 pt-3">
          <ConfigFileEditor
            path={loadedPath || "models.local.yaml"}
            value={content}
            onChange={setContent}
            height="100%"
          />
        </div>

        {notice ? <EditorStatusNotice key={notice.id} notice={notice} onClear={() => setNotice(null)} /> : null}
      </section>
    </>
  );
}

export function AiEngineerModelConfigEditorPanel() {
  const docQuery = useAiEngineerModelConfigQuery();
  const isLoading = docQuery.isLoading;
  const loadError = docQuery.error as Error | undefined;
  const document = docQuery.data;

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" data-testid="ai-engineer-model-config-editor">
        <Spinner size="lg" className="h-10 w-10" />
      </div>
    );
  }

  if (loadError || !document) {
    return (
      <Card className="max-w-2xl" data-testid="ai-engineer-model-config-editor">
        <CardHeader>
          <CardTitle>Model registry unavailable</CardTitle>
          <CardDescription>
            {loadError?.message ||
              "The platform could not load the model registry file. Ensure MODEL_CONFIG_PATH is set and the file exists (see models.local.yaml.example in agent-runtime)."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex min-h-full min-w-0 flex-col gap-4" data-testid="ai-engineer-model-config-editor">
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>
            Keep API keys in environment variables (for example <code className="text-xs">OPENAI_API_KEY</code>), not in
            this YAML. Reference them via <code className="text-xs">apiKeyEnv</code> only.
          </CardDescription>
        </CardHeader>
      </Card>

      <AiEngineerModelConfigEditorBody key={docQuery.dataUpdatedAt} document={document} />
    </div>
  );
}
