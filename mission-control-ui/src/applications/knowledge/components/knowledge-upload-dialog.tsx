"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileUp, RefreshCw, Upload } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" data-testid="knowledge-upload-dialog">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Add durable mission, vehicle, or operational knowledge for AI retrieval.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="border-border/70 bg-muted/30 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors">
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
            <div className="flex flex-wrap gap-2">
              {drafts.map((draft, index) => (
                <button
                  key={draft.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors",
                    index === activeIndex ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>{draft.title || draft.file.name}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 capitalize", draftStatusTone(draft.status))}>
                    <DraftStatusIcon status={draft.status} />
                    {draft.status}
                  </span>
                </button>
              ))}
            </div>
          ) : drafts.length === 1 ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span className="truncate">{drafts[0].title || drafts[0].file.name}</span>
              <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs capitalize", draftStatusTone(drafts[0].status))}>
                <DraftStatusIcon status={drafts[0].status} />
                {drafts[0].status}
              </span>
            </div>
          ) : null}

          {activeDraft ? (
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
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          ) : null}

          {activeDraft?.status === "failed" && activeDraft.error ? <p className="text-destructive text-sm">{activeDraft.error}</p> : null}
          {error && !hasDraftError ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter>
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
