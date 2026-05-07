# Space Ops Apps

Layer 3 applications, app scripts, browser tests, and operator workflow docs.

Extraction baseline: `c2-infra` commit `7b4f15ace9895c440ad89a9a460566c78135c57b` (`phase1-layer-split-baseline-2026-04-20`).

## Documentation map (split checkout)

| Area | Humans | Agents / automation |
|------|--------|---------------------|
| **This repo — UI and Playwright workspace** | this file | [AGENTS.md](./AGENTS.md) |
| **Layer 1 — Compose + `validate-node` / `validate-playwright` wrappers** | [../space-ops-kernel/README.md](../space-ops-kernel/README.md) | [../space-ops-kernel/AGENTS.md](../space-ops-kernel/AGENTS.md) |
| **Layer 2 — platform backend pytest + agent-runtime sources** | [../space-ops-platform/README.md](../space-ops-platform/README.md) | [../space-ops-platform/AGENTS.md](../space-ops-platform/AGENTS.md) |
| Playwright paths, env knobs | [tools/playwright/README.md](./tools/playwright/README.md) | — |

**Rule of thumb:** anything that mounts the whole sibling tree and installs Node dependencies should route through `./space-ops-kernel/scripts/validate-node.sh` unless you deliberately debug on the host (`npm ci` on that host).

## Role

This repository owns Mission Control UI, Playwright browser tests, app/sample telemetry scripts, and operator workflow documentation. The simulator runtime, SatNOGS adapter, and concrete vehicle configuration resources are Layer 2 managed capabilities in `space-ops-platform`.

Apps consume Layer 2 through REST/WebSocket APIs and copied contract/package sources such as `telemetry_catalog/`. They should not import `backend.app.*` internals.

## Contents

```text
mission-control-ui/            Next.js Mission Control application
telemetry_catalog/             Copied Layer 2 schema package source for app helper scripts
tools/playwright/              Browser smoke tests
scripts/                       App/sample telemetry helper scripts
docs/SITUATIONAL_AWARENESS_QA.md
docs/API_TELEMETRY_CONTRACTS.md
```

## Running tests from this repo

| Suite | Canonical command | Docs |
|-------|-------------------|------|
| **Mission Control + agent runtime (`npm`** ***, Linux-native deps)** | `../space-ops-kernel/scripts/validate-node.sh` | Kernel README Testing table |
| **Playwright (`http://platform-edge-proxy:8080`, Compose network)** | `../space-ops-kernel/scripts/validate-playwright.sh smoke` (or `test`, etc.) | [tools/playwright/README.md](./tools/playwright/README.md) |
| **Platform backend** | `../space-ops-platform/scripts/run-backend-tests.sh` | sibling README |

## Mission Control UI

```bash
cd mission-control-ui
npm ci
npm run validate           # loaders check + ESLint + tsc + test:runtime
```

For Compose/build-time URLs and browser validation, pair with `./space-ops-kernel/scripts/*` rather than reinventing wrappers.

See also [mission-control-ui/README.md](./mission-control-ui/README.md).

For the **official** local stack, use the Layer 1 edge proxy URL as the browser origin and keep **`NEXT_PUBLIC_API_URL` empty** so the UI uses same-origin relative paths. Raw `http://localhost:3000` is Mission Control **without** proxy forwarding of `/telemetry/*`, `/registry/*`, etc.; use **`http://localhost:8080`** for full current-system behavior. `API_SERVER_URL` remains for Next server-side fetches to platform/control plane inside Compose.

## Simulator

The telemetry simulator is a Layer 2 managed service in `../space-ops-platform/backend/app/simulator`, deployed by Layer 1 manifests. Mission Control controls it through platform `/simulator/*` APIs.

## Playwright (`tools/playwright`)

**Canonical:**

```bash
../space-ops-kernel/scripts/validate-playwright.sh smoke
```

Read [tools/playwright/README.md](./tools/playwright/README.md) for Compose URL prerequisites and env overrides.

## Helper Scripts

```bash
python scripts/generate_synthetic_telemetry.py --base-url http://localhost:8000
./scripts/mock_vehicle_streamer.sh --scenario nominal --duration 120
```
