import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ControlPanelShell } from "./control-panel-shell";

test("ControlPanelShell renders Code Repository tab route", () => {
  const markup = renderToStaticMarkup(
    <ControlPanelShell activeTab="code-repository">
      <div>Body</div>
    </ControlPanelShell>,
  );

  assert.match(markup, /data-testid="control-panel-tab-code-repository"/);
  assert.match(markup, /Code Repository/);
  assert.match(markup, /\/apps\/control-panel\/code-repository/);
});
