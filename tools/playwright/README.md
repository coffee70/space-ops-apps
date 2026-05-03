# Shared Playwright Tooling

This workspace is the repo-owned home for browser automation and smoke tests.

## Why This Exists

- Agents and developers should use one stable Playwright location instead of ad hoc installs under `.cursor`.
- Browser binaries live under `tmp/playwright/ms-playwright`.
- Reports, traces, screenshots, and videos live under `tmp/playwright`.

## Canonical Commands

From the workspace root:

```bash
./space-ops-kernel/scripts/validate-playwright.sh test
./space-ops-kernel/scripts/validate-playwright.sh smoke
./space-ops-kernel/scripts/validate-playwright.sh phase3-no-llm
```

Before running the containerized Playwright runner against the kernel stack, make sure `mission-control-ui` is built with internal service URLs that resolve on the Compose network:

```bash
NEXT_PUBLIC_API_URL=http://platform-api:8000 \
NEXT_PUBLIC_CONTROL_PLANE_URL=http://control-plane:8100 \
docker compose -f space-ops-kernel/docker-compose.yml up -d --build mission-control-ui
```

Open the local frontend in a real browser:

```bash
npm --prefix tools/playwright run open:local
```

Generate browser interactions against the local frontend:

```bash
npm --prefix tools/playwright run codegen:local
```

Run the shared smoke test directly in the workspace when needed:

```bash
npm --prefix tools/playwright run test:smoke
```

Run the same smoke test in headed mode:

```bash
npm --prefix tools/playwright run test:smoke:headed
```

## Runtime Defaults

- Base URL: `http://mission-control-ui:3000`
- API URL: `http://platform-api:8000`
- Primary smoke route: `/overview`
- Default Docker network: `space-ops-kernel_default`
- Override only `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_URL`, and `PLAYWRIGHT_DOCKER_NETWORK` when needed

## Artifacts

- Browser binaries: `tmp/playwright/ms-playwright`
- HTML report: `tmp/playwright/report`
- Test results, traces, screenshots, videos: `tmp/playwright/test-results`
