"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileText, FileUp, RefreshCw, Upload } from "lucide-react";

import {
  documentTypeFromFile,
  filterSupportedKnowledgeFiles,
  KNOWLEDGE_FILE_ACCEPT,
  titleFromFile,
  unsupportedKnowledgeFilesMessage,
} from "@/applications/knowledge/lib/knowledge-client";
import type { KnowledgeUploadInput } from "@/applications/knowledge/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type UploadDraftStatus = "pending" | "uploading" | "uploaded" | "failed";

type UploadDraft = Omit<KnowledgeUploadInput, "file"> & {
  id: string;
  file: File;
  status: UploadDraftStatus;
  error?: string | null;
};

function createDraftId(file: File): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function draftFromFile(file: File): UploadDraft {
  return {
    id: createDraftId(file),
    file,
    title: titleFromFile(file),
    documentType: documentTypeFromFile(file),
    missionId: "",
    vehicleId: "",
    subsystemId: "",
    tags: "",
    description: "",
    status: "pending",
    error: null,
  };
}

function draftStatusTone(status: UploadDraftStatus): string {
  if (status === "uploaded") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (status === "failed") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "uploading") return "border-sky-500/30 bg-sky-500/10 text-sky-600";
  return "border-border/60 bg-background text-muted-foreground";
}

function DraftStatusIcon({ status }: { status: UploadDraftStatus }) {
  if (status === "uploaded") return <CheckCircle2 className="size-3" />;
  if (status === "failed") return <AlertTriangle className="size-3" />;
  if (status === "uploading") return <RefreshCw className="size-3 animate-spin" />;
  return <Clock3 className="size-3" />;
}

function DraftStatusBadge({ status }: { status: UploadDraftStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs capitalize", draftStatusTone(status))}>
      <DraftStatusIcon status={status} />
      {status}
    </span>
  );
}

export function KnowledgeUploadDialog({
  open,
  onOpenChange,
  initialFiles = [],
  initialWarning = null,
  onUpload,
  isUploading = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFiles?: File[];
  initialWarning?: string | null;
  onUpload: (input: KnowledgeUploadInput) => Promise<void>;
  isUploading?: boolean;
  error?: string | null;
}) {
  const [drafts, setDrafts] = useState<UploadDraft[]>(() => initialFiles.map(draftFromFile));
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(initialWarning);
  const activeDraft = drafts[activeIndex] ?? null;
  const uploadableDrafts = drafts.filter((draft) => draft.status === "pending" || draft.status === "failed");
  const allUploadableDraftsValid =
    uploadableDrafts.length > 0 && uploadableDrafts.every((draft) => draft.title?.trim() && draft.documentType?.trim());
  const canSubmit = allUploadableDraftsValid && !isUploading;
  const hasDraftError = drafts.some((draft) => Boolean(draft.error));
  const hasFailedDraft = drafts.some((draft) => draft.status === "failed");
  const activeDraftLocked = activeDraft?.status === "uploaded" || activeDraft?.status === "uploading";

  const fileSummary = useMemo(() => {
    if (drafts.length === 0) return "No file selected";
    if (drafts.length === 1) return drafts[0].file.name;
    return `${drafts.length} staged documents`;
  }, [drafts]);

  const patchDraftById = (draftId: string, patch: Partial<UploadDraft>) => {
    setDrafts((previous) => previous.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)));
  };

  const patchActiveDraft = (patch: Partial<UploadDraft>) => {
    if (!activeDraft) return;
    patchDraftById(activeDraft.id, patch);
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;

    const { supported, unsupported } = filterSupportedKnowledgeFiles(files);
    const warning = unsupportedKnowledgeFilesMessage(unsupported.length);

    if (warning) setSelectionWarning(warning);
    else setSelectionWarning(null);

    if (supported.length === 0) return;

    setDrafts(supported.map(draftFromFile));
    setActiveIndex(0);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    let hadFailure = false;
    for (const draft of uploadableDrafts) {
      patchDraftById(draft.id, { status: "uploading", error: null });
      try {
        await onUpload({
          file: draft.file,
          title: draft.title,
          documentType: draft.documentType,
          missionId: draft.missionId,
          vehicleId: draft.vehicleId,
          subsystemId: draft.subsystemId,
          tags: draft.tags,
          description: draft.description,
        });
        patchDraftById(draft.id, { status: "uploaded", error: null });
      } catch (uploadError) {
        hadFailure = true;
        const message = uploadError instanceof Error ? uploadError.message : "Upload failed";
        patchDraftById(draft.id, { status: "failed", error: message });
      }
    }

    if (!hadFailure) {
      onOpenChange(false);
    }
  };

  const submitLabel = isUploading ? "Uploading..." : hasFailedDraft ? "Retry failed uploads" : "Upload";

  const metadataEditor = activeDraft ? (
    <section className="border-border/70 bg-card/40 rounded-xl border p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.14em]">Document metadata</p>
          <h3 className="mt-1 truncate text-base font-semibold">{activeDraft.title || activeDraft.file.name}</h3>
          <p className="text-muted-foreground mt-1 truncate text-sm">{activeDraft.file.name}</p>
        </div>
        <DraftStatusBadge status={activeDraft.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="knowledge-title">Title</Label>
          <Input
            id="knowledge-title"
            value={activeDraft.title ?? ""}
            onChange={(event) => patchActiveDraft({ title: event.target.value })}
            disabled={activeDraftLocked || isUploading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knowledge-type">Document type</Label>
          <Input
            id="knowledge-type"
            value={activeDraft.documentType ?? ""}
            onChange={(event) => patchActiveDraft({ documentType: event.target.value })}
            disabled={activeDraftLocked || isUploading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knowledge-vehicle">Vehicle ID</Label>
          <Input
            id="knowledge-vehicle"
            value={activeDraft.vehicleId ?? ""}
            onChange={(event) => patchActiveDraft({ vehicleId: event.target.value })}
            disabled={activeDraftLocked || isUploading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knowledge-mission">Mission ID</Label>
          <Input
            id="knowledge-mission"
            value={activeDraft.missionId ?? ""}
            onChange={(event) => patchActiveDraft({ missionId: event.target.value })}
            disabled={activeDraftLocked || isUploading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knowledge-subsystem">Subsystem ID</Label>
          <Input
            id="knowledge-subsystem"
            value={activeDraft.subsystemId ?? ""}
            onChange={(event) => patchActiveDraft({ subsystemId: event.target.value })}
            disabled={activeDraftLocked || isUploading}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="knowledge-tags">Tags</Label>
          <Input
            id="knowledge-tags"
            placeholder="telemetry, procedure, icd"
            value={activeDraft.tags ?? ""}
            onChange={(event) => patchActiveDraft({ tags: event.target.value })}
            disabled={activeDraftLocked || isUploading}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="knowledge-description">Description</Label>
          <textarea
            id="knowledge-description"
            value={activeDraft.description ?? ""}
            onChange={(event) => patchActiveDraft({ description: event.target.value })}
            disabled={activeDraftLocked || isUploading}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-28 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {activeDraft.status === "failed" && activeDraft.error ? <p className="text-destructive mt-4 text-sm">{activeDraft.error}</p> : null}
    </section>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-4xl" data-testid="knowledge-upload-dialog">
        <DialogHeader className="border-border/70 shrink-0 border-b px-6 py-5 pr-14 text-left">
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Add durable mission, vehicle, or operational knowledge for AI retrieval.</DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <label className="border-border/70 bg-muted/30 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors">
              <FileUp className="text-muted-foreground size-7" />
              <span className="mt-3 text-sm font-medium">{fileSummary}</span>
              <span className="text-muted-foreground mt-1 text-xs">Select or drop supported documents into Knowledge</span>
              <Input
                type="file"
                multiple
                accept={KNOWLEDGE_FILE_ACCEPT}
                className="sr-only"
                onChange={(event) => handleFilesSelected(Array.from(event.target.files ?? []))}
              />
            </label>

            {selectionWarning ? (
              <p
                className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg border px-3 py-2 text-sm"
                data-testid="knowledge-upload-selection-warning"
              >
                {selectionWarning}
              </p>
            ) : null}

            {drafts.length > 1 ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
                <aside className="border-border/70 bg-card/40 rounded-xl border p-3">
                  <div className="border-border/70 mb-3 border-b px-1 pb-3">
                    <p className="text-sm font-semibold">Staged documents</p>
                    <p className="text-muted-foreground mt-1 text-xs">Select a document to review its metadata before uploading.</p>
                  </div>
                  <div className="space-y-2">
                    {drafts.map((draft, index) => (
                      <button
                        key={draft.id}
                        type="button"
                        className={cn(
                          "border-border/70 hover:border-border hover:bg-muted/40 flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                          index === activeIndex && "border-primary/60 bg-primary/5 shadow-sm",
                        )}
                        onClick={() => setActiveIndex(index)}
                      >
                        <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                          <FileText className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-sm font-medium leading-5">{draft.title || draft.file.name}</span>
                          <span className="text-muted-foreground mt-1 block truncate text-xs">{draft.file.name}</span>
                          <span className="mt-2 block">
                            <DraftStatusBadge status={draft.status} />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </aside>
                {metadataEditor}
              </div>
            ) : drafts.length === 1 ? (
              <div className="space-y-5">
                {metadataEditor}
              </div>
            ) : null}

            {error && !hasDraftError ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter className="border-border/70 bg-background/95 shrink-0 border-t px-6 py-4 supports-[backdrop-filter]:bg-background/80">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Upload className="size-4" />
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
