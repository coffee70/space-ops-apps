# Agent instructions

**Read alongside:** apps depend on Layer 2 APIs and Layer 1 Compose wiring.

| Repository | Humans | Agents / automation |
|------------|--------|---------------------|
| `space-ops-apps` | [README.md](./README.md) | this file |
| `space-ops-kernel` | [../space-ops-kernel/README.md](../space-ops-kernel/README.md) | [../space-ops-kernel/AGENTS.md](../space-ops-kernel/AGENTS.md) |
| `space-ops-platform` | [../space-ops-platform/README.md](../space-ops-platform/README.md) | [../space-ops-platform/AGENTS.md](../space-ops-platform/AGENTS.md) |

If you validate the UI in a browser, read the kernel Playwright section first so you attach to the Compose network correctly.

## Repo role (Layer 3)

Keep changes scoped to Mission Control UI, app scripts, browser tests, and operator workflow documentation. The simulator runtime, SatNOGS adapter, and concrete vehicle configuration resources are Layer 2 managed capabilities in `space-ops-platform`.

Apps should consume platform behavior through REST/WebSocket APIs and copied contract/package sources such as `telemetry_catalog/`. Do not import `backend.app.*` internals from `space-ops-platform`.

## How to run tests

### Mission Control UI (Node / TypeScript)

**Canonical CI-style run (Linux Node, consistent native deps):**

```bash
../space-ops-kernel/scripts/validate-node.sh
```

That runs `npm ci` plus `npm run validate` (`check:application-loaders`, ESLint, `tsc`, `test:runtime`) under `mission-control-ui/`.

**Local tight loop:** from `mission-control-ui/`, install on the host with `npm ci` (same OS/arch you run tests on — do not reuse a Linux-derived `node_modules` on macOS or vice versa):

```bash
npm run validate
```

### Agent runtime tests

Owned by Layer 2 but executed in the same Node container script:

```bash
../space-ops-kernel/scripts/validate-node.sh
```

### Playwright (browser)

**Canonical:** kernel Playwright Docker runner (correct browser image + Compose networking):

```bash
../space-ops-kernel/scripts/validate-playwright.sh smoke    # grep @smoke
../space-ops-kernel/scripts/validate-playwright.sh test     # default suite wiring
```

Details, env overrides, and UI rebuild hints: `tools/playwright/README.md` and `../space-ops-kernel/README.md`.

Ad-hoc `npm --prefix tools/playwright run …` on the host is for local debugging; set `PLAYWRIGHT_BASE_URL` explicitly if you hit `localhost` instead of the default `mission-control-ui:3000` service name.

### Python helper scripts

From repository root **`space-ops-apps`** — **canonical**:

```bash
./scripts/run-python-tests.sh
```

There is no Layer 3 Python test suite today; this script exits successfully with a pointer to the Layer 2 simulator tests. Simulator Python tests are owned by Layer 2 and run with `../space-ops-platform/scripts/run-backend-tests.sh backend/tests/simulator`.

### Platform backend pytest

Owned by Layer 2 — canonical: `../space-ops-platform/scripts/run-backend-tests.sh` (`space-ops-platform/README.md`).

### Control-plane pytest

Owned by Layer 1: `space-ops-kernel/README.md` (`control-plane/tests`).
