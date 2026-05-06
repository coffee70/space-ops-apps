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

Playwright defaults to the **Layer 1 edge proxy**: **`http://platform-edge-proxy:8080`** (same-origin HTTP + WebSocket as the browser). Start the full stack from `space-ops-kernel` so `platform-edge-proxy`, `mission-control-ui`, `platform-api`, and `control-plane` are up:

```bash
docker compose -f space-ops-kernel/docker-compose.yml up -d --build
```

Use empty `NEXT_PUBLIC_API_URL` for the official path (see kernel README). Raw `http://mission-control-ui:3000` is UI-only/debug without the proxy route map.

Bring up whatever optional deps your scenario needs before invoking Playwright.

## Host-only runs (local debugging only)

Installing here and invoking `npm` directly is supported for interactive work. You must align env with where the app actually runs:

```bash
npm --prefix tools/playwright run open:local           # localhost browser
npm --prefix tools/playwright run codegen:local
npm --prefix tools/playwright run test:smoke            # expects PLAYWRIGHT_BASE_URL …
npm --prefix tools/playwright run test:smoke:headed
```

Use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080` (example) when hitting the edge proxy on the host; defaults target the Compose service hostname for **`platform-edge-proxy`**.

Host runs may stash browser binaries under `tmp/playwright/ms-playwright`; the Docker runner uses bundled `/ms-playwright`.

## Runtime defaults (`playwright.config.ts`)

- Base URL: `http://platform-edge-proxy:8080`
- API URL (tests): `http://platform-edge-proxy:8080` (same-origin through Layer 1)
- Primary smoke route: `/overview` (via edge → Mission Control)
- Default Docker network: `space-ops-kernel_default` (wired by **`validate-playwright.sh`**, not local `npm` alone)

Override via `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_URL`, and `PLAYWRIGHT_DOCKER_NETWORK` when cloning into non-default Compose project names.

## Artifacts

- Browser binaries (host workflows): `tmp/playwright/ms-playwright`
- HTML report: `tmp/playwright/report`
- Test outputs (traces, screenshots, videos): `tmp/playwright/test-results`
