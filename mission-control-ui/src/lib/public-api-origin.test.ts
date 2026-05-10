import assert from "node:assert/strict";
import test from "node:test";

import { getPublicFetchBases, resolvePublicApiUrl } from "./public-api-origin";

test("resolvePublicApiUrl is same-origin when unset, empty, or whitespace", () => {
  const prevApi = process.env.NEXT_PUBLIC_API_URL;
  const prevFb = process.env.NEXT_PUBLIC_API_FALLBACK_URL;
  try {
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.equal(resolvePublicApiUrl(), "");

    process.env.NEXT_PUBLIC_API_URL = "";
    assert.equal(resolvePublicApiUrl(), "");

    process.env.NEXT_PUBLIC_API_URL = "   ";
    assert.equal(resolvePublicApiUrl(), "");

    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
    assert.equal(resolvePublicApiUrl(), "http://localhost:8000");
  } finally {
    if (prevApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prevApi;
    if (prevFb === undefined) delete process.env.NEXT_PUBLIC_API_FALLBACK_URL;
    else process.env.NEXT_PUBLIC_API_FALLBACK_URL = prevFb;
  }
});

test("getPublicFetchBases honors NEXT_PUBLIC_API_FALLBACK_URL when trimmed non-empty", () => {
  const prevApi = process.env.NEXT_PUBLIC_API_URL;
  const prevFb = process.env.NEXT_PUBLIC_API_FALLBACK_URL;
  try {
    process.env.NEXT_PUBLIC_API_URL = "";
    delete process.env.NEXT_PUBLIC_API_FALLBACK_URL;
    assert.deepEqual(getPublicFetchBases(true), [""]);

    process.env.NEXT_PUBLIC_API_FALLBACK_URL = "http://localhost:9999";
    assert.deepEqual(getPublicFetchBases(true), ["", "http://localhost:9999"]);
    assert.deepEqual(getPublicFetchBases(false), [""]);
  } finally {
    if (prevApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prevApi;
    if (prevFb === undefined) delete process.env.NEXT_PUBLIC_API_FALLBACK_URL;
    else process.env.NEXT_PUBLIC_API_FALLBACK_URL = prevFb;
  }
});
