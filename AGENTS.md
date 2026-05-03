# Agent instructions

**Read alongside:** apps depend on Layer 2 APIs and Layer 1 Compose wiring.

| Repository | Humans | Agents / automation |
|------------|--------|---------------------|
| `space-ops-apps` | [README.md](./README.md) | this file |
| `space-ops-kernel` | [../space-ops-kernel/README.md](../space-ops-kernel/README.md) | [../space-ops-kernel/AGENTS.md](../space-ops-kernel/AGENTS.md) |
| `space-ops-platform` | [../space-ops-platform/README.md](../space-ops-platform/README.md) | [../space-ops-platform/AGENTS.md](../space-ops-platform/AGENTS.md) |

If you validate the UI in a browser, read the kernel Playwright section first so you attach to the Compose network correctly.

## Repo role (Layer 3)

Keep changes scoped to Mission Control UI, simulator runtime, SatNOGS adapter runtime, concrete vehicle configurations, app scripts, browser tests, and operator workflow documentation.

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

### Python (simulator)

From repository root **`space-ops-apps`**:

```bash
cd simulator && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd .. && PYTHONPATH=. pytest simulator/tests -q
```

### Python (SatNOGS adapter)

From **`space-ops-apps`** root so imports resolve (`satnogs_adapter` is a package directory):

```bash
cd satnogs_adapter && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd .. && PYTHONPATH=. pytest satnogs_adapter/tests -q
```

### Platform backend pytest

Owned by Layer 2: `space-ops-platform/README.md`.

### Control-plane pytest

Owned by Layer 1: `space-ops-kernel/README.md` (`control-plane/tests`).
