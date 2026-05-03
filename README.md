# Space Ops Apps

Layer 3 applications, operational extensions, concrete configs, app scripts, and app tests.

Extraction baseline: `c2-infra` commit `7b4f15ace9895c440ad89a9a460566c78135c57b` (`phase1-layer-split-baseline-2026-04-20`).

## Documentation map (split checkout)

| Area | Humans | Agents / automation |
|------|--------|---------------------|
| **This repo — UI, adapters, simulator, Playwright workspace** | this file | [AGENTS.md](./AGENTS.md) |
| **Layer 1 — Compose + `validate-node` / `validate-playwright` wrappers** | [../space-ops-kernel/README.md](../space-ops-kernel/README.md) | [../space-ops-kernel/AGENTS.md](../space-ops-kernel/AGENTS.md) |
| **Layer 2 — platform backend pytest + agent-runtime sources** | [../space-ops-platform/README.md](../space-ops-platform/README.md) | [../space-ops-platform/AGENTS.md](../space-ops-platform/AGENTS.md) |
| Playwright paths, env knobs | [tools/playwright/README.md](./tools/playwright/README.md) | — |

**Rule of thumb:** anything that mounts the whole sibling tree and installs Node dependencies should route through `./space-ops-kernel/scripts/validate-node.sh` unless you deliberately debug on the host (`npm ci` on that host).

## Role

This repository owns Mission Control UI, the simulator runtime, the SatNOGS adapter runtime, concrete vehicle configuration assets, Playwright browser tests, app/sample telemetry scripts, and operator workflow documentation.

Apps consume Layer 2 through REST/WebSocket APIs and copied contract/package sources such as `telemetry_catalog/`. They should not import `backend.app.*` internals.

## Contents

```text
mission-control-ui/            Next.js Mission Control application
simulator/                     Telemetry simulator runtime
satnogs_adapter/               SatNOGS adapter runtime and tests
vehicle-configurations/        Concrete mission/sample/simulator configs
telemetry_catalog/             Copied Layer 2 schema package source for app runtimes
tools/playwright/              Browser smoke tests
scripts/                       App/sample telemetry helper scripts
docs/SITUATIONAL_AWARENESS_QA.md
docs/API_TELEMETRY_CONTRACTS.md
```

## Running tests from this repo

| Suite | Canonical command | Docs |
|-------|-------------------|------|
| **Mission Control + agent runtime (`npm`** ***, Linux-native deps)** | `../space-ops-kernel/scripts/validate-node.sh` | Kernel README Testing table |
| **Playwright (`http://mission-control-ui:3000`, Compose network)** | `../space-ops-kernel/scripts/validate-playwright.sh smoke` (or `test`, etc.) | [tools/playwright/README.md](./tools/playwright/README.md) |
| **Simulator Python** | from **`space-ops-apps` repo root**: `PYTHONPATH=. pytest simulator/tests -q` (after `pip install -r simulator/requirements.txt` in your venv) | [AGENTS.md](./AGENTS.md) |
| **SatNOGS adapter Python** | from **`space-ops-apps` repo root**: `PYTHONPATH=. pytest satnogs_adapter/tests -q` (after deps in `satnogs_adapter/requirements.txt`) | [AGENTS.md](./AGENTS.md) |
| **Platform backend** | `PYTHONPATH` + `pytest` under `space-ops-platform` | sibling README |

## Mission Control UI

```bash
cd mission-control-ui
npm ci
npm run validate           # loaders check + ESLint + tsc + test:runtime
```

For Compose/build-time URLs and browser validation, pair with `./space-ops-kernel/scripts/*` rather than reinventing wrappers.

See also [mission-control-ui/README.md](./mission-control-ui/README.md).

Use `NEXT_PUBLIC_API_URL` for browser calls and `API_SERVER_URL` for server-side calls when running outside the kernel Compose stack.

## Simulator

The simulator reads vehicle config files through `VEHICLE_CONFIG_ROOT` and publishes telemetry to the platform ingest APIs.

```bash
cd simulator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=..:. VEHICLE_CONFIG_ROOT=../vehicle-configurations BACKEND_URL=http://localhost:8000 uvicorn simulator.main:app --host 0.0.0.0 --port 8001
```

Tests (from repo **`space-ops-apps`**, not nested `cd simulator` only):

```bash
PYTHONPATH=. pytest simulator/tests -q
```

## SatNOGS Adapter

```bash
cd satnogs_adapter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=..:. VEHICLE_CONFIG_ROOT=../vehicle-configurations python -m satnogs_adapter.main --config config.example.yaml
```

Tests:

```bash
cd .. && PYTHONPATH=. pytest satnogs_adapter/tests -q
```

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
