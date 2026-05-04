import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerGreeting } from "./ai-engineer-greeting";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
};

function collectButtons(node: React.ReactNode): Array<React.ReactElement<ButtonProps>> {
  if (!React.isValidElement<ButtonProps>(node)) return [];

  const buttons = node.type === "button" ? [node] : [];
  React.Children.forEach(node.props.children, (child) => {
    buttons.push(...collectButtons(child));
  });
  return buttons;
}

test("AiEngineerGreeting renders suggestion buttons", () => {
  const markup = renderToStaticMarkup(<AiEngineerGreeting />);
  const buttons = collectButtons(AiEngineerGreeting({}));

  assert.equal(buttons.length, 4);
  assert.ok(buttons.every((button) => button.props.type === "button"));
  assert.match(markup, /<button/);
  assert.doesNotMatch(markup, /<span[^>]*>Where is the application registry implemented\?/);
});

test("AiEngineerGreeting calls onSuggestionSelect with the suggestion text", () => {
  const selected: string[] = [];
  const buttons = collectButtons(AiEngineerGreeting({ onSuggestionSelect: (suggestion) => selected.push(suggestion) }));

  buttons[0].props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);

  assert.deepEqual(selected, ["Where is the application registry implemented?"]);
});
