---
title: Sources and Simulators
layer: apps
audience: operator
topics:
  - telemetry-sources
  - simulators
  - source-scoped-telemetry
status: mvp
last_verified: 2026-06-01
---

# Sources and Simulators

## Purpose

This doc explains source types, source-scoped telemetry, simulator behavior, and operator troubleshooting.

## Applies To

Mission Control Sources, Overview live data, Planning position data, simulator-backed sources, external mock streamers, and SatNOGS adapter sources.

## Core Concepts

Mission Control can display telemetry from:

1. In-app simulator-backed sources
2. External mock streamers
3. SatNOGS adapter sources
4. Registered vehicle configuration sources

Live Overview and watchlist subscriptions stay source-scoped by default. If a source rolls from one stream to the next, the live UI follows the source's current stream automatically.

## Procedure

### In-app simulator

The simulator can be started from Mission Control for supported configured vehicles.

| Source | Vehicle configuration | Position frame |
|---|---|---|
| DrogonSat | `simulators/drogonsat.yaml` | GPS latitude, longitude, altitude |
| RhaegalSat | `simulators/rhaegalsat.json` | ECEF X, Y, Z |

Open **Sources**, choose a simulator-backed source, select **Manage**, choose a scenario, and start the run.

#### DrogonSat scenarios

| Scenario ID | Operator Label | Purpose |
|---|---|---|
| `nominal` | Nominal | Normal tactical patrol with mild noise |
| `power_sag` | Power sag | Bus voltage sag after aggressive transmit burst |
| `seeker_overheat` | Seeker overheat | IR seeker and bus panel heat rise during long target hold |
| `safe_mode` | Safe mode | Tactical bus enters safe mode after transient fault |
| `orbit_nominal` | Orbit nominal | Smooth physically plausible orbit without random position spikes |
| `orbit_decay` | Orbit decay | Low-perigee orbit for decay testing |
| `orbit_highly_elliptical` | Highly elliptical orbit | High-eccentricity orbit for anomaly testing |
| `orbit_suborbital` | Suborbital | Insufficient orbital velocity |
| `orbit_escape` | Escape trajectory | Escape trajectory test case |

#### RhaegalSat scenarios

| Scenario ID | Operator Label | Purpose |
|---|---|---|
| `nominal` | Nominal | Stable survey mission with redundant avionics active |
| `dual_tank_imbalance` | Dual tank imbalance | One propulsion tank drifts low while the other stays nominal |
| `avionics_hotbox` | Avionics hotbox | Payload and avionics bays warm up during sustained observation |
| `orbit_nominal` | Orbit nominal | Smooth physically plausible orbit without random position spikes |
| `orbit_decay` | Orbit decay | Low-perigee orbit for decay testing |
| `orbit_highly_elliptical` | Highly elliptical orbit | High-eccentricity orbit for anomaly testing |
| `orbit_suborbital` | Suborbital | Insufficient orbital velocity |
| `orbit_escape` | Escape trajectory | Escape trajectory test case |

### External mock streamer

From `space-ops-apps`:

```bash
./scripts/mock_vehicle_streamer.sh --scenario nominal --duration 120
./scripts/mock_vehicle_streamer.sh --scenario power_sag --speed 10
```

The streamer posts to `POST /telemetry/realtime/ingest` with a registered source ID.

### SatNOGS adapter

Use the SatNOGS adapter for external packet-radio feeds. The adapter resolves the canonical backend vehicle source, publishes upcoming observation windows for Planning, starts live polling, and drains any historical backlog in platform-sized chunks.

### Source-scoped telemetry

Telemetry samples, current values, watchlists, anomalies, feed status, and WebSocket subscriptions are scoped by `source_id`. Use explicit stream selection only for pinned historical or per-run views.

## Do Not Assume

Do not invent simulator scenarios or channel semantics. Use the current Layer 2 vehicle configuration as the source of truth.

## Validation

Confirm the selected source ID, active stream, simulator runtime state, and the Overview **Live** badge. For position workflows, confirm the source vehicle configuration has a position mapping.

## Failure Modes

- Simulator source unreachable: check managed runtime status and base URL registration.
- Wrong source displayed: check `source_id` and stream selection state.
- Planning marker missing: check position mapping in the vehicle configuration.
- Decoder field missing: check discovered source-scoped channels before adding aliases.

## Related Docs

- [Quick Start](./quick-start.md)
- [Telemetry API Contracts](../../../space-ops-platform/docs/developer/telemetry-api-contracts.md)
