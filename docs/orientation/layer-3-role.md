---
title: Layer 3 Role
layer: apps
audience: ai-engineer
topics:
  - frontend-apps
  - repo-boundaries
  - operator-workflows
status: mvp
last_verified: 2026-06-01
---

# Layer 3 Role

## Purpose

This doc helps the AI Engineer decide when frontend and operator workflow work belongs in `space-ops-apps`.

## Applies To

Mission Control UI, native frontend applications, embedded applications, loader manifests, browser tests, user-facing docs, and frontend data fetching.

## Core Concepts

Layer 3 owns user-facing applications and operator workflows.

It owns:
- Mission Control UI
- native frontend applications
- embedded frontend application integration
- app loader manifests
- browser tests
- user-facing docs
- frontend data fetching behavior
- operator workflow UI

It does not own:
- backend API implementation
- telemetry business logic
- Docker Compose orchestration
- managed deployment lifecycle
- control-plane runtime registry

## Procedure

Change Layer 3 when the task affects what operators see, how frontend apps load, or how browser workflows consume platform APIs.

## Do Not Assume

Do not implement backend route behavior or deployment lifecycle changes in Layer 3.

## Validation

Validate user-facing changes through Mission Control at `http://localhost:8080` for full-stack behavior.

## Failure Modes

Frontend-only validation through `localhost:3000` can miss gateway route, runtime application, and same-origin API issues.

## Related Docs

- [Native Frontend App Guide](../developer/native-frontend-app-guide.md)
- [Frontend Fetching and Gateway Routes](../developer/frontend-fetching-and-gateway-routes.md)
