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

test("AiEngineerHeader exposes both copy options through the dropdown menu implementation", () => {
  const source = readFileSync(new URL("./ai-engineer-header.tsx", import.meta.url), "utf8");

  assert.match(source, /DropdownMenuTrigger/);
  assert.match(source, /DropdownMenuItem/);
  assert.match(source, /title="Chat actions"/);
  assert.match(source, /Copy chat/);
  assert.match(source, /Copy chat with tool summaries/);
});
