import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerHeader } from "./ai-engineer-header";

test("AiEngineerHeader renders a single chat actions trigger instead of two copy buttons", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerHeader
      title="AI Engineer"
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

test("AiEngineerHeader keeps only the operation status pill and chat actions in the right-side toolbar", () => {
  const source = readFileSync(new URL("./ai-engineer-header.tsx", import.meta.url), "utf8");

  const toolbarStart = source.indexOf('<div className="flex items-center gap-2">');
  const operationIndex = source.indexOf("<AiEngineerOperationStatusPill", toolbarStart);
  const dropdownIndex = source.indexOf("<DropdownMenu>", toolbarStart);

  assert.notEqual(toolbarStart, -1);
  assert.notEqual(operationIndex, -1);
  assert.notEqual(dropdownIndex, -1);
  assert.ok(operationIndex < dropdownIndex);
});
