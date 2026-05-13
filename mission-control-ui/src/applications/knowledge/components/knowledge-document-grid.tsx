"use client";

import type { KnowledgeDocument } from "@/applications/knowledge/types";
import { KnowledgeDocumentCard } from "@/applications/knowledge/components/knowledge-document-card";

export function KnowledgeDocumentGrid({
  documents,
  onDeleteDocument,
  deletingDocumentId = null,
}: {
  documents: KnowledgeDocument[];
  onDeleteDocument?: (documentId: string) => void;
  deletingDocumentId?: string | null;
}) {
  return (
    <div data-testid="knowledge-document-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((document) => (
        <KnowledgeDocumentCard
          key={document.id}
          document={document}
          onDelete={onDeleteDocument}
          isDeleting={deletingDocumentId === document.id}
        />
      ))}
    </div>
  );
}
