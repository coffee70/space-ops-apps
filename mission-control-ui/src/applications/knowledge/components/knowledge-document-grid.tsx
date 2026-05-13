"use client";

import type { KnowledgeDocument } from "@/applications/knowledge/types";
import { KnowledgeDocumentCard } from "@/applications/knowledge/components/knowledge-document-card";

export function KnowledgeDocumentGrid({ documents }: { documents: KnowledgeDocument[] }) {
  return (
    <div data-testid="knowledge-document-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((document) => (
        <KnowledgeDocumentCard key={document.id} document={document} />
      ))}
    </div>
  );
}
