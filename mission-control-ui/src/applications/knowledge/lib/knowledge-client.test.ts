import assert from "node:assert/strict";
import test from "node:test";

import {
  documentTypeFromFile,
  filterSupportedKnowledgeFiles,
  isSupportedKnowledgeFile,
  KNOWLEDGE_FILE_ACCEPT,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  titleFromFile,
  unsupportedKnowledgeFilesMessage,
  uploadKnowledgeDocument,
} from "./knowledge-client";

function pathnameOfFetchUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function requireFormData(value: FormData | null): FormData {
  assert.ok(value);
  return value;
}

test("Knowledge client lists documents from the durable document route", async () => {
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    urls.push(url);
    return new Response(JSON.stringify([{ id: "doc-1", title: "Ops", document_type: "md", ingestion_status: "ready" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const docs = await listKnowledgeDocuments();
    assert.equal(docs.length, 1);
    assert.equal(docs[0].title, "Ops");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(pathnameOfFetchUrl(urls[0]), "/intelligence/documents");
});

test("Knowledge upload sends backend metadata field names", async () => {
  const FileCtor =
    globalThis.File ??
    class extends Blob {
      readonly name: string;

      constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
        super(parts, options);
        this.name = name;
      }
    };
  let capturedFormData: FormData | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    capturedFormData = init?.body instanceof FormData ? init.body : null;
    return new Response(JSON.stringify({ document_id: "doc-1", title: "Ops", ingestion_status: "pending" }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await uploadKnowledgeDocument({
      file: new FileCtor(["hello"], "telemetry-dictionary.csv", { type: "text/csv" }),
      title: "Telemetry Dictionary",
      documentType: "csv",
      missionId: "mission-1",
      vehicleId: "vehicle-1",
      subsystemId: "eps",
      tags: "telemetry, dictionary",
      description: "Dictionary rows",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const formData = requireFormData(capturedFormData);
  assert.equal(formData.get("title"), "Telemetry Dictionary");
  assert.equal(formData.get("document_type"), "csv");
  assert.equal(formData.get("mission_id"), "mission-1");
  assert.equal(formData.get("vehicle_id"), "vehicle-1");
  assert.equal(formData.get("subsystem_id"), "eps");
  assert.equal(formData.get("tags"), "telemetry, dictionary");
  assert.equal(formData.get("description"), "Dictionary rows");
});

test("Knowledge delete calls the document delete route", async () => {
  const requests: Array<{ url: string; method?: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    requests.push({ url, method: init?.method });
    return new Response(JSON.stringify({ deleted: true, document_id: "doc-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const response = await deleteKnowledgeDocument("doc-1");
    assert.equal(response.deleted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(pathnameOfFetchUrl(requests[0].url), "/intelligence/documents/doc-1");
  assert.equal(requests[0].method, "DELETE");
});

test("Knowledge upload defaults derive clean title and document type from file", () => {
  const FileCtor =
    globalThis.File ??
    class extends Blob {
      readonly name: string;

      constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
        super(parts, options);
        this.name = name;
      }
    };
  const file = new FileCtor(["hello"], "mission-procedure.md", { type: "text/markdown" });
  assert.equal(titleFromFile(file), "mission procedure");
  assert.equal(documentTypeFromFile(file), "md");
});

test("Knowledge supported file boundary matches text-like backend ingestion formats", () => {
  assert.equal(KNOWLEDGE_FILE_ACCEPT, ".md,.markdown,.txt,.json,.yaml,.yml,.csv");
  assert.equal(isSupportedKnowledgeFile({ name: "ops.md" }), true);
  assert.equal(isSupportedKnowledgeFile({ name: "ops.MARKDOWN" }), true);
  assert.equal(isSupportedKnowledgeFile({ name: "telemetry.csv" }), true);
  assert.equal(isSupportedKnowledgeFile({ name: "procedure.pdf" }), false);
  assert.equal(isSupportedKnowledgeFile({ name: "procedure.docx" }), false);
  assert.equal(isSupportedKnowledgeFile({ name: "image.png" }), false);
});

test("Knowledge filters mixed supported and unsupported file selections", () => {
  const partition = filterSupportedKnowledgeFiles([
    { name: "dictionary.csv" },
    { name: "procedure.pdf" },
    { name: "vehicle.yaml" },
    { name: "diagram.png" },
  ]);

  assert.deepEqual(
    partition.supported.map((file) => file.name),
    ["dictionary.csv", "vehicle.yaml"],
  );
  assert.deepEqual(
    partition.unsupported.map((file) => file.name),
    ["procedure.pdf", "diagram.png"],
  );
  assert.equal(
    unsupportedKnowledgeFilesMessage(partition.unsupported.length),
    "Some files were skipped. Knowledge currently accepts Markdown, text, JSON, YAML, and CSV documents.",
  );
});
