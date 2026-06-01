---
title: Quick Start
layer: apps
audience: operator
topics:
  - local-stack
  - mission-control
  - edge-proxy
status: mvp
last_verified: 2026-06-01
---

# Quick Start

## Purpose

This doc gets a local operator or AI Engineer from a fresh sibling checkout to Mission Control running through the full stack.

## Applies To

The split checkout with `space-ops-kernel`, `space-ops-platform`, and `space-ops-apps`.

## Core Concepts

Expected layout:

```text
space-ops/
  space-ops-kernel/
  space-ops-platform/
  space-ops-apps/
```

Official full-system entrypoint:

```text
http://localhost:8080
```

`http://localhost:3000` is useful for direct Mission Control frontend development, but it is not the official full-stack entrypoint.

## Procedure

From `space-ops-kernel`:

```bash
docker compose up -d --build
```

Open Mission Control:

```text
http://localhost:8080
```

This goes through the Layer 1 edge proxy. Some platform routes, runtime application routes, and same-origin API paths depend on this proxy.

Use:

```text
localhost:8080 = full system through edge proxy
localhost:3000 = frontend-only development/debug path
```

Generate sample telemetry when needed:

```bash
cd ../space-ops-apps
./scripts/generate_synthetic_telemetry.sh
```

## Do Not Assume

Do not use `localhost:3000` as proof that full-system behavior works.

## Validation

From `space-ops-kernel`:

```bash
./scripts/validate-node.sh
./scripts/validate-playwright.sh smoke
```

Then validate Mission Control through `http://localhost:8080`.

## Failure Modes

If direct frontend development works but full-stack behavior fails, check edge proxy routing, runtime application routes, and same-origin API paths.

## Related Docs

- [Sources and Simulators](./sources-and-simulators.md)
- [Layer 3 Role](../orientation/layer-3-role.md)
