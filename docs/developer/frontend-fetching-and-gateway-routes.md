---
title: Frontend Fetching and Gateway Routes
layer: apps
audience: developer
topics:
  - frontend-fetching
  - gateway-routes
  - edge-proxy
status: mvp
last_verified: 2026-06-01
---

# Frontend Fetching and Gateway Routes

## Purpose

This doc prevents frontend code from hardcoding development-only URLs in operator-facing workflows.

## Applies To

Mission Control data fetching, native frontend apps, runtime application routes, and same-origin platform APIs.

## Core Concepts

Mission Control should call platform APIs through same-origin gateway paths when running in the full stack.

Official full-stack entrypoint:

```text
http://localhost:8080
```

Preferred pattern:

```ts
fetch("/telemetry/...")
fetch("/intelligence/...")
fetch("/runtime-applications/...")
```

The edge proxy provides the runtime route map used by the operator-facing system.

## Procedure

Use relative paths for operator-facing frontend calls unless a path is explicitly development-only.

## Do Not Assume

Do not hardcode these inside operator-facing frontend code unless the behavior is explicitly development-only:

```text
http://localhost:8000
http://localhost:3000
```

## Validation

Validate frontend routes through `http://localhost:8080` and confirm API calls use same-origin gateway paths.

## Failure Modes

Absolute localhost URLs can work in direct development while failing in Compose, preview deployments, or browser paths served through the edge proxy.

## Related Docs

- [Native Frontend App Guide](./native-frontend-app-guide.md)
- [Application Loader Manifest](./application-loader-manifest.md)
