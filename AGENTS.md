# Agent Instructions

This repository is Layer 3. Keep changes scoped to Mission Control UI, simulator runtime, SatNOGS adapter runtime, concrete vehicle configurations, app scripts, browser tests, and operator workflow documentation.

Apps should consume platform behavior through REST/WebSocket APIs and copied contract/package sources such as `telemetry_catalog/`. Do not import `backend.app.*` internals from `space-ops-platform`.
