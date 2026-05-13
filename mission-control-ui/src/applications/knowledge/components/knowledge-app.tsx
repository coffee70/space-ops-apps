"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Upload } from "lucide-react";

import { KnowledgeDocumentGrid } from "@/applications/knowledge/components/knowledge-document-grid";
import { KnowledgeEmptyState } from "@/applications/knowledge/components/knowledge-empty-state";
import { KnowledgeHeader } from "@/applications/knowledge/components/knowledge-header";
import { KnowledgeUploadDialog } from "@/applications/knowledge/components/knowledge-upload-dialog";
import {
  filterSupportedKnowledgeFiles,
  unsupportedKnowledgeFilesMessage,
} from "@/applications/knowledge/lib/knowledge-client";
import type { KnowledgeUploadInput } from "@/applications/knowledge/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteKnowledgeDocumentMutation, useKnowledgeDocumentsQuery, useUploadKnowledgeDocumentMutation } from "@/lib/query-hooks";

const DRAG_IDLE_DISMISS_MS = 1800;

export function KnowledgeApp() {
  const documentsQuery = useKnowledgeDocumentsQuery();
  const uploadMutation = useUploadKnowledgeDocumentMutation();
  const deleteMutation = useDeleteKnowledgeDocumentMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [pageWarning, setPageWarning] = useState<string | null>(null);
  const [dialogWarning, setDialogWarning] = useState<string | null>(null);
  const dragDepthRef = useRef(0);
  const dragIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDragIdleTimer = useCallback(() => {
    if (dragIdleTimerRef.current) {
      clearTimeout(dragIdleTimerRef.current);
      dragIdleTimerRef.current = null;
    }
  }, []);

  const dismissDropZone = useCallback(() => {
    dragDepthRef.current = 0;
    clearDragIdleTimer();
    setDragActive(false);
  }, [clearDragIdleTimer]);

  const scheduleDragIdleDismiss = useCallback(() => {
    clearDragIdleTimer();
    dragIdleTimerRef.current = setTimeout(() => {
      dragDepthRef.current = 0;
      setDragActive(false);
      dragIdleTimerRef.current = null;
    }, DRAG_IDLE_DISMISS_MS);
  }, [clearDragIdleTimer]);

  useEffect(() => {
    const handleWindowDrop = (event: DragEvent) => {
      if (dragDepthRef.current > 0) event.preventDefault();
      dismissDropZone();
    };

    const handleDragEnd = () => {
      dismissDropZone();
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      const leftViewport =
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight;
      if (leftViewport) dismissDropZone();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissDropZone();
    };

    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("keydown", handleKeyDown);
      clearDragIdleTimer();
    };
  }, [clearDragIdleTimer, dismissDropZone]);

  const openUpload = (files: File[] = [], warning: string | null = null) => {
    uploadMutation.reset();
    setPageWarning(null);
    setDialogWarning(warning);
    setStagedFiles(files);
    setDialogOpen(true);
  };

  const handleUpload = async (input: KnowledgeUploadInput) => {
    uploadMutation.reset();
    await uploadMutation.mutateAsync(input);
  };

  const handleDeleteDocument = (documentId: string) => {
    deleteMutation.mutate(documentId);
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
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepthRef.current += 1;
        setDragActive(true);
        scheduleDragIdleDismiss();
      }}
      onDragOver={(event) => {
        preventFileNavigation(event);
        if (!event.dataTransfer.types.includes("Files")) return;
        setDragActive(true);
        scheduleDragIdleDismiss();
      }}
      onDragLeave={(event) => {
        preventFileNavigation(event);
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          dismissDropZone();
          return;
        }
        scheduleDragIdleDismiss();
      }}
      onDrop={(event) => {
        preventFileNavigation(event);
        dismissDropZone();

        const files = Array.from(event.dataTransfer.files);
        const { supported, unsupported } = filterSupportedKnowledgeFiles(files);
        const warning = unsupportedKnowledgeFilesMessage(unsupported.length);

        if (supported.length > 0) {
          openUpload(supported, warning || null);
          return;
        }

        if (warning) setPageWarning(warning);
      }}
    >
      <KnowledgeHeader onUpload={() => openUpload()} />
      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto w-full max-w-7xl">
          {pageWarning ? (
            <div
              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 mb-5 flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              data-testid="knowledge-upload-warning"
            >
              <span>{pageWarning}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setPageWarning(null)}>
                Dismiss
              </Button>
            </div>
          ) : null}

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
            <>
              {deleteMutation.isError ? (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mb-5 rounded-lg border px-4 py-3 text-sm">
                  {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Failed to delete knowledge document"}
                </div>
              ) : null}
              <KnowledgeDocumentGrid
                documents={documentsQuery.data ?? []}
                onDeleteDocument={handleDeleteDocument}
                deletingDocumentId={deleteMutation.isPending ? (deleteMutation.variables ?? null) : null}
              />
            </>
          )}
        </div>
      </main>

      {dragActive ? (
        <div className="bg-background/80 absolute inset-0 z-20 flex items-center justify-center p-6 backdrop-blur-sm" data-testid="knowledge-drop-overlay">
          <div className="border-primary/50 bg-card flex w-full max-w-xl flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center shadow-lg">
            <Upload className="text-primary size-8" />
            <p className="mt-3 text-lg font-semibold">Drop documents into Knowledge</p>
            <p className="text-muted-foreground mt-2 text-sm">Release to stage files and add metadata before upload.</p>
            <Button type="button" variant="outline" size="sm" className="mt-5" onClick={dismissDropZone}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {dialogOpen ? (
        <KnowledgeUploadDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setStagedFiles([]);
              setDialogWarning(null);
              uploadMutation.reset();
            }
          }}
          initialFiles={stagedFiles}
          initialWarning={dialogWarning}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
          error={uploadMutation.error instanceof Error ? uploadMutation.error.message : null}
        />
      ) : null}
    </div>
  );
}
