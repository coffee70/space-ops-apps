import type { FullConfig } from "@playwright/test";

const SEED_PATH = "/internal/runtime-services/tool-registry-service/definitions/seed";

/**
 * Seed the tool registry once before any test runs.
 *
 * Tool definitions are not auto-seeded on tool-registry-service startup, so any
 * AI Engineer flow that depends on `create_working_branch`, `write_source_file`,
 * `create_commit`, etc. needs the registry to be primed. Doing this here keeps
 * each test focused on the operator behavior under test.
 */
async function globalSetup(_config: FullConfig): Promise<void> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";
  const url = `${baseUrl}${SEED_PATH}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to seed tool registry at ${url} (${response.status}): ${body}`);
  }
}

export default globalSetup;
