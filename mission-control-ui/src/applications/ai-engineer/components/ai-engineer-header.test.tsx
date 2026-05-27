import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerHeader } from "./ai-engineer-header";

test("AiEngineerHeader renders a single chat actions trigger instead of two copy buttons", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerHeader
      title="AI Engineer"
      executionMode="read_only"
      messages={[]}
      events={[]}
    />,
  );

  assert.match(markup, /aria-label="Chat actions"/);
  assert.doesNotMatch(markup, /aria-label="Copy chat"/);
  assert.doesNotMatch(markup, /aria-label="Copy chat with tool summaries"/);
});

test("AiEngineerHeader exposes all three copy options through the dropdown menu implementation", () => {
  const source = readFileSync(new URL("./ai-engineer-header.tsx", import.meta.url), "utf8");

  assert.match(source, /DropdownMenuTrigger/);
  assert.match(source, /DropdownMenuItem/);
  assert.match(source, /title="Chat actions"/);
  assert.match(source, /Copy chat/);
  assert.match(source, /Copy chat with tool summaries/);
  assert.match(source, /Copy debug trace/);
  assert.match(source, /Copied debug trace/);
  assert.match(source, /useState<"messages" \| "tools" \| "debug" \| null>/);
});

test("AiEngineerHeader places chat actions last in the right-side toolbar order", () => {
  const source = readFileSync(new URL("./ai-engineer-header.tsx", import.meta.url), "utf8");

  const toolbarStart = source.indexOf('<div className="flex items-center gap-2">');
  const operationIndex = source.indexOf("<AiEngineerOperationStatusPill", toolbarStart);
  const shieldIndex = source.indexOf("<ShieldCheck", toolbarStart);
  const statusIndex = source.indexOf("<AiEngineerStatusPill", toolbarStart);
  const dropdownIndex = source.indexOf("<DropdownMenu>", toolbarStart);

  assert.notEqual(toolbarStart, -1);
  assert.notEqual(operationIndex, -1);
  assert.notEqual(shieldIndex, -1);
  assert.notEqual(statusIndex, -1);
  assert.notEqual(dropdownIndex, -1);
  assert.ok(operationIndex < shieldIndex);
  assert.ok(shieldIndex < statusIndex);
  assert.ok(statusIndex < dropdownIndex);
});
