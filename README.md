# Space Ops Apps

Layer 3 applications, operational extensions, concrete configs, app scripts, and app tests.

Extraction baseline: `c2-infra` commit `7b4f15ace9895c440ad89a9a460566c78135c57b` (`phase1-layer-split-baseline-2026-04-20`).

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

## Mission Control UI

```bash
cd mission-control-ui
npm install
npm run lint
npm run typecheck
npm run build
```

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

## SatNOGS Adapter

```bash
cd satnogs_adapter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=..:. VEHICLE_CONFIG_ROOT=../vehicle-configurations python -m satnogs_adapter.main --config config.example.yaml
```

## Playwright

Run against a kernel-started stack with the kernel validation runner:

```bash
./space-ops-kernel/scripts/validate-playwright.sh smoke
```

## Helper Scripts

```bash
python scripts/generate_synthetic_telemetry.py --base-url http://localhost:8000
./scripts/mock_vehicle_streamer.sh --scenario nominal --duration 120
```
