import assert from "node:assert/strict";
import test from "node:test";
import { getControlPlaneServerUrl } from "./application-registry-client";

function withEnv(
  entries: Record<string, string | undefined>,
  callback: () => void,
) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(entries)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    callback();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("getControlPlaneServerUrl prefers CONTROL_PLANE_SERVER_URL", () => {
  withEnv(
    {
      CONTROL_PLANE_SERVER_URL: "http://internal-control-plane:9000",
      NEXT_PUBLIC_CONTROL_PLANE_URL: "http://public-control-plane:8100",
    },
    () => {
      assert.equal(getControlPlaneServerUrl(), "http://internal-control-plane:9000");
    },
  );
});

test("getControlPlaneServerUrl falls back to the internal default", () => {
  withEnv(
    {
      CONTROL_PLANE_SERVER_URL: undefined,
      NEXT_PUBLIC_CONTROL_PLANE_URL: undefined,
    },
    () => {
      assert.equal(getControlPlaneServerUrl(), "http://control-plane:8100");
    },
  );
});

test("getControlPlaneServerUrl ignores NEXT_PUBLIC_CONTROL_PLANE_URL when server env is absent", () => {
  withEnv(
    {
      CONTROL_PLANE_SERVER_URL: undefined,
      NEXT_PUBLIC_CONTROL_PLANE_URL: "http://public-control-plane:8100",
    },
    () => {
      assert.equal(getControlPlaneServerUrl(), "http://control-plane:8100");
    },
  );
});
