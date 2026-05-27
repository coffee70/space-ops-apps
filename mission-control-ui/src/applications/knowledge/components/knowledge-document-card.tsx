"use client";

import { AlertTriangle, CheckCircle2, Clock3, FileText, Trash2 } from "lucide-react";

import type { KnowledgeDocument } from "@/applications/knowledge/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusTone(status: string) {
  if (status === "ready") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (status === "failed") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-sky-500/30 bg-sky-500/10 text-sky-600";
}

function statusLabel(status: string) {
  if (status === "pending") return "Processing";
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return status;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  md: "Markdown",
  markdown: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  pdf: "PDF",
  txt: "Text",
};

export function formatDocumentType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "Document";
  return DOCUMENT_TYPE_LABELS[normalized] ?? normalized.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ready") return <CheckCircle2 className="size-3" />;
  if (status === "failed") return <AlertTriangle className="size-3" />;
  return <Clock3 className="size-3" />;
}

export function KnowledgeDocumentCard({
  document,
  onDelete,
  isDeleting = false,
}: {
  document: KnowledgeDocument;
  onDelete?: (documentId: string) => void;
  isDeleting?: boolean;
}) {
  const metadata = [
    document.vehicle_id ? `Vehicle ${document.vehicle_id}` : null,
    document.mission_id ? `Mission ${document.mission_id}` : null,
    document.subsystem_id ? `Subsystem ${document.subsystem_id}` : null,
  ].filter(Boolean);

  return (
    <Card data-testid="knowledge-document-card" className="rounded-lg py-0">
      <CardHeader className="gap-3 px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <FileText className="size-4" />
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={cn("capitalize", statusTone(document.ingestion_status))}>
              <StatusIcon status={document.ingestion_status} />
              {statusLabel(document.ingestion_status)}
            </Badge>
            {onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Delete document"
                    className="text-muted-foreground hover:text-destructive size-8"
                    disabled={isDeleting}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete document</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the document, ingestion jobs, and stored chunks from Knowledge.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete(document.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
        <div className="min-w-0">
          <CardTitle className="line-clamp-2 text-base leading-6">{document.title}</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {formatDocumentType(document.document_type)}
            </Badge>
            {metadata.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 px-4 pb-4">
        <p className="text-muted-foreground line-clamp-3 min-h-[3.75rem] text-sm leading-5">
          {document.description || "No description provided."}
        </p>
        {document.tags && document.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {document.tags.map((tag) => (
              <span key={tag} className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {document.ingestion_status === "failed" && document.ingestion_error ? (
          <p className="text-destructive text-xs leading-5">{document.ingestion_error}</p>
        ) : null}
        {document.ingestion_status === "pending" ? (
          <p className="text-muted-foreground text-xs leading-5">Preparing document for AI retrieval.</p>
        ) : null}
        <p className="text-muted-foreground mt-auto text-xs">Uploaded {formatDate(document.created_at)}</p>
      </CardContent>
    </Card>
  );
}
