# Shared Playwright tooling

Repo-owned home for browser automation and smoke tests. Part of the **`space-ops-apps`** layer; executed against the stack described in **`space-ops-kernel`**.

## Read together with sibling repos

| Doc | Purpose |
|-----|---------|
| [`../../README.md`](../../README.md) | Apps-level testing overview |
| [`../../AGENTS.md`](../../AGENTS.md) | Agent-oriented commands |
| [`../../../space-ops-kernel/README.md`](../../../space-ops-kernel/README.md) | Compose, `validate-playwright.sh`, when to rebuild UI |
| [`../../../space-ops-kernel/AGENTS.md`](../../../space-ops-kernel/AGENTS.md) | Canonical runner expectations |

## Why this layout exists

- One stable Playwright project path instead of ad hoc installs under editor caches.
- **Canonical execution** uses the upstream **Playwright Docker image**: browsers + system deps match CI, no host OS drift.

## Canonical commands

**Prefer the Layer 1 wrapper** (runs `npm ci` in-container, attaches to Compose network defaults):

From the checkout root (`space-ops/` parent of `space-ops-kernel/`):

```bash
./space-ops-kernel/scripts/validate-playwright.sh test
./space-ops-kernel/scripts/validate-playwright.sh smoke
./space-ops-kernel/scripts/validate-playwright.sh phase3-no-llm
./space-ops-kernel/scripts/validate-playwright.sh help
```

Targets and env overrides are printed by `validate-playwright.sh help` (image, base URL, API URL, Docker network).

### Prerequisites (Compose-facing URLs)

Containers talk to **`http://mission-control-ui:3000`**, not `localhost`. Rebuild/start UI so build-time env matches in-cluster service names:

```bash
NEXT_PUBLIC_API_URL=http://platform-api:8000 \
NEXT_PUBLIC_CONTROL_PLANE_URL=http://control-plane:8100 \
docker compose -f space-ops-kernel/docker-compose.yml up -d --build mission-control-ui
```

Bring up whatever API/control-plane deps your scenario needs before invoking Playwright.

## Host-only runs (local debugging only)

Installing here and invoking `npm` directly is supported for interactive work. You must align env with where the app actually runs:

```bash
npm --prefix tools/playwright run open:local           # localhost browser
npm --prefix tools/playwright run codegen:local
npm --prefix tools/playwright run test:smoke            # expects PLAYWRIGHT_BASE_URL …
npm --prefix tools/playwright run test:smoke:headed
```

Use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` (example) when the UI listens on localhost; defaults target the Compose service hostname.

Host runs may stash browser binaries under `tmp/playwright/ms-playwright`; the Docker runner uses bundled `/ms-playwright`.

## Runtime defaults (`playwright.config.ts`)

- Base URL: `http://mission-control-ui:3000`
- API URL (tests): `http://platform-api:8000`
- Primary smoke route: `/overview`
- Default Docker network: `space-ops-kernel_default` (wired by **`validate-playwright.sh`**, not local `npm` alone)

Override via `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_URL`, and `PLAYWRIGHT_DOCKER_NETWORK` when cloning into non-default Compose project names.

## Artifacts

- Browser binaries (host workflows): `tmp/playwright/ms-playwright`
- HTML report: `tmp/playwright/report`
- Test outputs (traces, screenshots, videos): `tmp/playwright/test-results`
