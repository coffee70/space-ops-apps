import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { KnowledgeDocumentCard } from "./knowledge-document-card";
import { KnowledgeEmptyState } from "./knowledge-empty-state";
import { KnowledgeHeader } from "./knowledge-header";

test("Knowledge empty state and header render upload affordances", () => {
  const markup = renderToStaticMarkup(
    <>
      <KnowledgeHeader onUpload={() => {}} />
      <KnowledgeEmptyState onUpload={() => {}} />
    </>,
  );

  assert.match(markup, /Knowledge/);
  assert.match(markup, /Upload document/);
  assert.match(markup, /No knowledge documents yet/);
  assert.match(markup, /durable mission and vehicle knowledge/);
});

test("Knowledge document card renders title, type, status, metadata, tags, and errors", () => {
  const markup = renderToStaticMarkup(
    <KnowledgeDocumentCard
      document={{
        id: "doc-1",
        title: "Telemetry Dictionary",
        document_type: "csv",
        mission_id: "demo-mission",
        vehicle_id: "demo-vehicle",
        subsystem_id: "eps",
        tags: ["telemetry", "dictionary"],
        description: "Channel definitions and operational bounds.",
        ingestion_status: "failed",
        ingestion_error: "embedding provider unavailable",
        created_at: "2026-05-13T12:00:00Z",
        updated_at: "2026-05-13T12:00:00Z",
      }}
    />,
  );

  assert.match(markup, /Telemetry Dictionary/);
  assert.match(markup, /csv/);
  assert.match(markup, /failed/);
  assert.match(markup, /Vehicle demo-vehicle/);
  assert.match(markup, /Mission demo-mission/);
  assert.match(markup, /Subsystem eps/);
  assert.match(markup, /telemetry/);
  assert.match(markup, /embedding provider unavailable/);
});
