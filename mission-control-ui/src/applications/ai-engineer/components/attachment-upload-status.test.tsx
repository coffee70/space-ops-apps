import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AttachmentUploadStatus } from "./attachment-upload-status";

test("AttachmentUploadStatus shows ingestion status values", () => {
  const markup = renderToStaticMarkup(
    <AttachmentUploadStatus
      attachments={[
        { fileName: "pending.txt", status: "uploading" },
        { fileName: "ready.txt", status: "ready", documentId: "doc-1" },
        { fileName: "failed.txt", status: "failed", message: "ingestion failed" },
      ]}
    />,
  );

  assert.match(markup, /pending.txt/);
  assert.match(markup, /Ingesting/);
  assert.match(markup, /ready.txt/);
  assert.match(markup, /Ready/);
  assert.match(markup, /failed.txt/);
  assert.match(markup, /Failed/);
  assert.match(markup, /ingestion failed/);
});

test("AttachmentUploadStatus does not surface missing document ids as primary UX", () => {
  const markup = renderToStaticMarkup(
    <AttachmentUploadStatus
      attachments={[
        { fileName: "missing-id.txt", status: "ready" },
      ]}
    />,
  );

  assert.match(markup, /missing-id.txt/);
  assert.doesNotMatch(markup, /metadata incomplete: missing document id/);
});
