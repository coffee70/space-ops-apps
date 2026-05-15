"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type UploadDraftStatus = "pending" | "uploading" | "accepted" | "failed";

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
  if (status === "accepted") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (status === "failed") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "uploading") return "border-sky-500/30 bg-sky-500/10 text-sky-600";
  return "border-border/60 bg-background text-muted-foreground";
}

function DraftStatusIcon({ status }: { status: UploadDraftStatus }) {
  if (status === "accepted") return <CheckCircle2 className="size-3" />;
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

function dragCarriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
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
  const [dropActive, setDropActive] = useState(false);
  const dragDepthRef = useRef(0);
  const activeDraft = drafts[activeIndex] ?? null;
  const uploadableDrafts = drafts.filter((draft) => draft.status === "pending" || draft.status === "failed");
  const allUploadableDraftsValid =
    uploadableDrafts.length > 0 && uploadableDrafts.every((draft) => draft.title?.trim() && draft.documentType?.trim());
  const canSubmit = allUploadableDraftsValid && !isUploading;
  const hasDraftError = drafts.some((draft) => Boolean(draft.error));
  const hasFailedDraft = drafts.some((draft) => draft.status === "failed");
  const activeDraftLocked = activeDraft?.status === "accepted" || activeDraft?.status === "uploading";

  const patchDraftById = (draftId: string, patch: Partial<UploadDraft>) => {
    setDrafts((previous) => previous.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)));
  };

  const patchActiveDraft = (patch: Partial<UploadDraft>) => {
    if (!activeDraft) return;
    patchDraftById(activeDraft.id, patch);
  };

  const resetDropState = useCallback(() => {
    dragDepthRef.current = 0;
    setDropActive(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetDropState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetDropState],
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const { supported, unsupported } = filterSupportedKnowledgeFiles(files);
    const warning = unsupportedKnowledgeFilesMessage(unsupported.length);

    if (warning) setSelectionWarning(warning);
    else setSelectionWarning(null);

    if (supported.length === 0) return;

    const nextDrafts = supported.map(draftFromFile);
    const firstNewIndex = drafts.length;
    setDrafts((previous) => [...previous, ...nextDrafts]);
    setActiveIndex(firstNewIndex);
  }, [drafts.length]);

  useEffect(() => {
    if (!open) return;

    const handleWindowDragEnter = (event: DragEvent) => {
      if (!dragCarriesFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setDropActive(true);
    };

    const handleWindowDragOver = (event: DragEvent) => {
      if (!dragCarriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDropActive(true);
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      if (!dragCarriesFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      const leftViewport =
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight;
      if (dragDepthRef.current === 0 || leftViewport) resetDropState();
    };

    const handleWindowDrop = (event: DragEvent) => {
      if (!dragCarriesFiles(event)) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      resetDropState();
      handleFilesSelected(files);
    };

    const handleDragEnd = () => resetDropState();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") resetDropState();
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleFilesSelected, open, resetDropState]);

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
        patchDraftById(draft.id, { status: "accepted", error: null });
      } catch (uploadError) {
        hadFailure = true;
        const message = uploadError instanceof Error ? uploadError.message : "Upload failed";
        patchDraftById(draft.id, { status: "failed", error: message });
      }
    }

    if (!hadFailure) {
      handleOpenChange(false);
    }
  };

  const submitLabel = isUploading ? "Uploading..." : hasFailedDraft ? "Retry failed uploads" : "Upload";

  const metadataEditor = activeDraft ? (
    <section className="border-border/70 bg-card/40 rounded-xl border p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">Document metadata</p>
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

  const dropSurface = (
    <label
      className={cn(
        "border-border/70 bg-muted/30 hover:bg-muted/50 flex min-h-[28rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
        dropActive && "border-primary/60 bg-primary/5 shadow-sm",
      )}
      data-testid="knowledge-upload-drop-surface"
    >
      <FileUp className={cn("size-8", dropActive ? "text-primary" : "text-muted-foreground")} />
      <span className="mt-4 text-base font-semibold">{dropActive ? "Drop documents to add them" : "Drop documents here"}</span>
      <span className="text-muted-foreground mt-2 max-w-md text-sm">
        {drafts.length > 0
          ? "Release to add more documents to this upload batch, or choose supported files."
          : "Release to stage documents and add metadata before upload, or choose supported files."}
      </span>
      <span className="border-border bg-background text-foreground mt-5 rounded-md border px-3 py-2 text-sm font-medium shadow-sm">Choose files</span>
      <Input
        type="file"
        multiple
        accept={KNOWLEDGE_FILE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          handleFilesSelected(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-4xl" data-testid="knowledge-upload-dialog">
        <DialogHeader className="border-border/70 shrink-0 border-b px-6 py-5 pr-14 text-left">
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Add durable mission, vehicle, or operational knowledge for AI retrieval.</DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {selectionWarning ? (
              <p
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
                data-testid="knowledge-upload-selection-warning"
              >
                {selectionWarning}
              </p>
            ) : null}

            {dropActive || drafts.length === 0 ? (
              dropSurface
            ) : drafts.length > 1 ? (
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
                          <span className="line-clamp-2 block text-sm leading-5 font-medium">{draft.title || draft.file.name}</span>
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
              <div className="space-y-5">{metadataEditor}</div>
            ) : null}

            {error && !hasDraftError ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter className="border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isUploading}>
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
