import assert from "node:assert/strict";
import test from "node:test";
import type { ReactElement } from "react";
import {
  ApplicationOpenSplitButton,
  openApplicationRouteInNewTab,
} from "./application-open-split-button";

type WindowOpenCall = [url?: string | URL, target?: string, features?: string];

function withMockWindow(origin: string, run: (calls: WindowOpenCall[]) => void) {
  const originalWindow = (globalThis as { window?: Window }).window;
  const calls: WindowOpenCall[] = [];
  const open = ((url?: string | URL, target?: string, features?: string) => {
    calls.push([url, target, features]);
    return null;
  }) as Window["open"];

  (globalThis as { window?: Window }).window = {
    location: { origin } as Location,
    open,
  } as Window;

  try {
    run(calls);
  } finally {
    if (originalWindow) {
      (globalThis as { window?: Window }).window = originalWindow;
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

function renderSplitButton(props: {
  applicationId: string;
  applicationTitle?: string;
  routePath?: string;
  onOpenInShell: () => void;
  onOpenInNewTabSuccess?: () => void;
  label?: string;
  disabled?: boolean;
  testId?: string;
}) {
  return ApplicationOpenSplitButton(props) as ReactElement;
}

function getSplitButtonSegments(root: ReactElement) {
  const children = (root as ReactElement<{ children: unknown }>).props.children as ReactElement[];
  const textButton = children[0] as ReactElement<{ onClick: () => void }>;
  const iconButton = children[1] as ReactElement<{
    onClick: () => void;
    disabled?: boolean;
    "aria-label"?: string;
  }>;
  return { textButton, iconButton };
}

test("ApplicationOpenSplitButton icon button includes accessible label", () => {
  const root = renderSplitButton({
    applicationId: "telemetry",
    applicationTitle: "Telemetry",
    routePath: "/apps/telemetry",
    onOpenInShell: () => {},
  });
  const { iconButton } = getSplitButtonSegments(root);

  assert.equal(iconButton.props["aria-label"], "Open Telemetry in new tab");
});

test("ApplicationOpenSplitButton left segment calls in-shell callback", () => {
  let openedInShell = 0;
  const root = renderSplitButton({
    applicationId: "telemetry",
    routePath: "/apps/telemetry",
    onOpenInShell: () => {
      openedInShell += 1;
    },
  });
  const { textButton } = getSplitButtonSegments(root);

  textButton.props.onClick();

  assert.equal(openedInShell, 1);
});

test("ApplicationOpenSplitButton right segment opens in new tab without in-shell callback", () => {
  let openedInShell = 0;
  withMockWindow("https://mission.local", (calls) => {
    const root = renderSplitButton({
      applicationId: "telemetry",
      routePath: "/apps/telemetry?view=all",
      onOpenInShell: () => {
        openedInShell += 1;
      },
    });
    const { iconButton } = getSplitButtonSegments(root);

    iconButton.props.onClick();

    assert.equal(openedInShell, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.[0], "https://mission.local/apps/telemetry?view=all");
    assert.equal(calls[0]?.[1], "_blank");
    assert.equal(calls[0]?.[2], "noopener,noreferrer");
  });
});

test("ApplicationOpenSplitButton right segment calls success callback after opening new tab", () => {
  let closed = 0;

  withMockWindow("https://mission.local", (calls) => {
    const root = renderSplitButton({
      applicationId: "telemetry",
      routePath: "/apps/telemetry",
      onOpenInShell: () => {},
      onOpenInNewTabSuccess: () => {
        closed += 1;
      },
    });

    const { iconButton } = getSplitButtonSegments(root);

    iconButton.props.onClick();

    assert.equal(calls.length, 1);
    assert.equal(closed, 1);
  });
});

test("ApplicationOpenSplitButton does not call success callback when new-tab open is rejected", () => {
  let closed = 0;

  withMockWindow("https://mission.local", () => {
    const root = renderSplitButton({
      applicationId: "docs",
      routePath: "/docs",
      onOpenInShell: () => {},
      onOpenInNewTabSuccess: () => {
        closed += 1;
      },
    });

    const { iconButton } = getSplitButtonSegments(root);
    iconButton.props.onClick();

    assert.equal(closed, 0);
  });
});

test("ApplicationOpenSplitButton disables icon segment when routePath is missing", () => {
  const root = renderSplitButton({
    applicationId: "telemetry",
    routePath: undefined,
    onOpenInShell: () => {},
  });
  const { iconButton } = getSplitButtonSegments(root);

  assert.equal(iconButton.props.disabled, true);
});

test("openApplicationRouteInNewTab only opens same-origin /apps routes", () => {
  withMockWindow("https://mission.local", (calls) => {
    assert.equal(openApplicationRouteInNewTab("/apps/telemetry"), true);
    assert.equal(openApplicationRouteInNewTab("https://mission.local/apps/ops"), true);
    assert.equal(openApplicationRouteInNewTab("/docs"), false);
    assert.equal(openApplicationRouteInNewTab("https://example.com/apps/telemetry"), false);
    assert.equal(openApplicationRouteInNewTab(""), false);

    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.[0], "https://mission.local/apps/telemetry");
    assert.equal(calls[1]?.[0], "https://mission.local/apps/ops");
  });
});
