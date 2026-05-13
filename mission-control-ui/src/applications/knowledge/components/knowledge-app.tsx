"use client";

import { useState } from "react";
import { RefreshCw, Upload } from "lucide-react";

import { KnowledgeDocumentGrid } from "@/applications/knowledge/components/knowledge-document-grid";
import { KnowledgeEmptyState } from "@/applications/knowledge/components/knowledge-empty-state";
import { KnowledgeHeader } from "@/applications/knowledge/components/knowledge-header";
import { KnowledgeUploadDialog } from "@/applications/knowledge/components/knowledge-upload-dialog";
import type { KnowledgeUploadInput } from "@/applications/knowledge/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useKnowledgeDocumentsQuery, useUploadKnowledgeDocumentMutation } from "@/lib/query-hooks";

export function KnowledgeApp() {
  const documentsQuery = useKnowledgeDocumentsQuery();
  const uploadMutation = useUploadKnowledgeDocumentMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const openUpload = (files: File[] = []) => {
    setStagedFiles(files);
    setDialogOpen(true);
  };

  const handleUpload = async (inputs: KnowledgeUploadInput[]) => {
    for (const input of inputs) {
      await uploadMutation.mutateAsync(input);
    }
    setDialogOpen(false);
    setStagedFiles([]);
  };

  const preventFileNavigation = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="bg-background text-foreground relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-testid="knowledge-app"
      onDragEnter={(event) => {
        preventFileNavigation(event);
        if (event.dataTransfer.types.includes("Files")) setDragActive(true);
      }}
      onDragOver={(event) => {
        preventFileNavigation(event);
        if (event.dataTransfer.types.includes("Files")) setDragActive(true);
      }}
      onDragLeave={(event) => {
        preventFileNavigation(event);
        if (event.currentTarget === event.target) setDragActive(false);
      }}
      onDrop={(event) => {
        preventFileNavigation(event);
        setDragActive(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) openUpload(files);
      }}
    >
      <KnowledgeHeader onUpload={() => openUpload()} />
      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto w-full max-w-7xl">
          {documentsQuery.isPending ? (
            <div className="text-muted-foreground flex min-h-[22rem] items-center justify-center gap-2 text-sm">
              <Spinner className="size-4" />
              Loading knowledge documents
            </div>
          ) : documentsQuery.isError ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{documentsQuery.error instanceof Error ? documentsQuery.error.message : "Failed to load knowledge documents"}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => documentsQuery.refetch()}>
                  <RefreshCw className="size-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (documentsQuery.data ?? []).length === 0 ? (
            <KnowledgeEmptyState onUpload={() => openUpload()} />
          ) : (
            <KnowledgeDocumentGrid documents={documentsQuery.data ?? []} />
          )}
        </div>
      </main>

      {dragActive ? (
        <div className="bg-background/80 absolute inset-0 z-20 flex items-center justify-center p-6 backdrop-blur-sm" data-testid="knowledge-drop-overlay">
          <div className="border-primary/50 bg-card flex w-full max-w-xl flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center shadow-lg">
            <Upload className="text-primary size-8" />
            <p className="mt-3 text-lg font-semibold">Drop documents into Knowledge</p>
            <p className="text-muted-foreground mt-2 text-sm">Release to stage files and add metadata before upload.</p>
          </div>
        </div>
      ) : null}

      {dialogOpen ? (
        <KnowledgeUploadDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setStagedFiles([]);
          }}
          initialFiles={stagedFiles}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
          error={uploadMutation.error instanceof Error ? uploadMutation.error.message : null}
        />
      ) : null}
    </div>
  );
}
