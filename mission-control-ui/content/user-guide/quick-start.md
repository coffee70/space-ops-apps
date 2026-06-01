# Quick Start

**Workflow:** first-time setup -> full stack running -> telemetry visible in Mission Control

## Prerequisites

Check out the three sibling repositories side by side:

```text
space-ops/
  space-ops-kernel/
  space-ops-platform/
  space-ops-apps/
```

## Start the local stack

From `space-ops-kernel`:

```bash
docker compose up -d --build
```

This starts the Layer 1 edge proxy, platform APIs, control plane, Mission Control frontend shell, managed simulator services, SatNOGS adapter service, and shared backing services.

## Open Mission Control

Open:

```text
http://localhost:8080
```

This is the official full-system entrypoint through the Layer 1 edge proxy.

## About localhost:3000

`http://localhost:3000` is useful for direct Mission Control frontend development, but it is not the official full-stack entrypoint. Some platform routes, runtime application routes, and same-origin API paths depend on the edge proxy.

Use:

```text
localhost:8080 = full system through edge proxy
localhost:3000 = frontend-only development/debug path
```

## Validate the stack

Use the canonical validation scripts from `space-ops-kernel`:

```bash
./scripts/validate-node.sh
./scripts/validate-playwright.sh smoke
```

## Generate sample telemetry

Use the app helper script when you need seeded telemetry for local workflow checks:

```bash
cd ../space-ops-apps
./scripts/generate_synthetic_telemetry.sh
```

For direct script usage, target the platform API deliberately:

```bash
python scripts/generate_synthetic_telemetry.py --base-url http://localhost:8000
```

## Open the Overview

In Mission Control at `http://localhost:8080`, open **Overview**. You should see current values, state badges, sparklines, and the anomalies queue once telemetry exists.

From here, you can [connect a telemetry source](/docs/connecting-streams) or [search for channels](/docs/investigating-channels).
