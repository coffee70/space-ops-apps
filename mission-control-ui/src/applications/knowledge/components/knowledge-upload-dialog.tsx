"use client";

import { useMemo, useState } from "react";
import { FileUp, Upload } from "lucide-react";

import { documentTypeFromFile, titleFromFile } from "@/applications/knowledge/lib/knowledge-client";
import type { KnowledgeUploadInput } from "@/applications/knowledge/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type UploadDraft = Omit<KnowledgeUploadInput, "file"> & { file: File };

function draftFromFile(file: File): UploadDraft {
  return {
    file,
    title: titleFromFile(file),
    documentType: documentTypeFromFile(file),
    missionId: "",
    vehicleId: "",
    subsystemId: "",
    tags: "",
    description: "",
  };
}

export function KnowledgeUploadDialog({
  open,
  onOpenChange,
  initialFiles = [],
  onUpload,
  isUploading = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFiles?: File[];
  onUpload: (inputs: KnowledgeUploadInput[]) => Promise<void>;
  isUploading?: boolean;
  error?: string | null;
}) {
  const [drafts, setDrafts] = useState<UploadDraft[]>(() => initialFiles.map(draftFromFile));
  const [activeIndex, setActiveIndex] = useState(0);
  const activeDraft = drafts[activeIndex] ?? null;
  const canSubmit = drafts.length > 0 && drafts.every((draft) => draft.title?.trim() && draft.documentType?.trim()) && !isUploading;

  const fileSummary = useMemo(() => {
    if (drafts.length === 0) return "No file selected";
    if (drafts.length === 1) return drafts[0].file.name;
    return `${drafts.length} staged documents`;
  }, [drafts]);

  const patchActiveDraft = (patch: Partial<UploadDraft>) => {
    setDrafts((previous) => previous.map((draft, index) => (index === activeIndex ? { ...draft, ...patch } : draft)));
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    setDrafts(files.map(draftFromFile));
    setActiveIndex(0);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    await onUpload(drafts);
    setDrafts([]);
    setActiveIndex(0);
  };

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
              accept=".md,.markdown,.txt,.json,.yaml,.yml,.csv,.pdf"
              className="sr-only"
              onChange={(event) => handleFilesSelected(Array.from(event.target.files ?? []))}
            />
          </label>

          {drafts.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {drafts.map((draft, index) => (
                <button
                  key={`${draft.file.name}-${draft.file.lastModified}-${index}`}
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    index === activeIndex ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setActiveIndex(index)}
                >
                  {draft.title || draft.file.name}
                </button>
              ))}
            </div>
          ) : null}

          {activeDraft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="knowledge-title">Title</Label>
                <Input id="knowledge-title" value={activeDraft.title ?? ""} onChange={(event) => patchActiveDraft({ title: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledge-type">Document type</Label>
                <Input id="knowledge-type" value={activeDraft.documentType ?? ""} onChange={(event) => patchActiveDraft({ documentType: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledge-vehicle">Vehicle ID</Label>
                <Input id="knowledge-vehicle" value={activeDraft.vehicleId ?? ""} onChange={(event) => patchActiveDraft({ vehicleId: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledge-mission">Mission ID</Label>
                <Input id="knowledge-mission" value={activeDraft.missionId ?? ""} onChange={(event) => patchActiveDraft({ missionId: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledge-subsystem">Subsystem ID</Label>
                <Input id="knowledge-subsystem" value={activeDraft.subsystemId ?? ""} onChange={(event) => patchActiveDraft({ subsystemId: event.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="knowledge-tags">Tags</Label>
                <Input id="knowledge-tags" placeholder="telemetry, procedure, icd" value={activeDraft.tags ?? ""} onChange={(event) => patchActiveDraft({ tags: event.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="knowledge-description">Description</Label>
                <textarea
                  id="knowledge-description"
                  value={activeDraft.description ?? ""}
                  onChange={(event) => patchActiveDraft({ description: event.target.value })}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
              </div>
            </div>
          ) : null}

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Upload className="size-4" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
