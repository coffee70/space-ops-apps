# Sources and Simulators

**Workflow:** no live data -> source selected -> stream active -> Live badge on Overview

Mission Control displays telemetry from registered sources. Live Overview and watchlist subscriptions stay **source-scoped** by default: if a source rolls from one stream to the next, the live UI follows the source's current stream automatically. Use an explicit stream selection only for a pinned historical or per-run view.

## Source types

Mission Control can display telemetry from:

1. In-app simulator-backed sources
2. External mock streamers
3. SatNOGS adapter sources
4. Registered vehicle configuration sources

## In-app simulator

The simulator can be started from Mission Control for supported configured vehicles. Built-in simulator-backed sources are registered from Layer 2 vehicle configuration resources:

| Source | Vehicle configuration | Position frame |
|---|---|---|
| DrogonSat | `simulators/drogonsat.yaml` | GPS latitude, longitude, altitude |
| RhaegalSat | `simulators/rhaegalsat.json` | ECEF X, Y, Z |

Open **Sources**, choose a simulator-backed source, and select **Manage** to open the simulator control panel. The panel shows connection state, runtime state, elapsed time, scenario selection, duration, speed, dropout, and jitter controls.

Simulator scenarios are defined by the current vehicle configuration. Use the exact scenario ID when calling simulator APIs or troubleshooting.

### DrogonSat scenarios

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

### RhaegalSat scenarios

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

The simulator posts to the ingest API. The Overview shows live updates and the **Live** badge when connected. Position mapping is seeded from the vehicle configuration file, so simulator sources with mappings are ready for the Planning globe without a separate mapping step.

## External mock streamer

Run the mock vehicle streamer from `space-ops-apps` when you need a process-driven telemetry source:

```bash
./scripts/mock_vehicle_streamer.sh --scenario nominal --duration 120
./scripts/mock_vehicle_streamer.sh --scenario power_sag --speed 10
```

The streamer posts to `POST /telemetry/realtime/ingest` with a registered source ID. Its telemetry catalog comes from a committed vehicle configuration file, so the backend and streamer agree on expected channels.

## SatNOGS adapter

Use the SatNOGS adapter for external packet-radio feeds instead of simulator traffic.

1. Start the backend so it can auto-register vehicle configuration files.
2. Keep the Layer 2 adapter config pointed at platform source resolve, observation upsert, backfill progress, and live state endpoints.
3. Use the relevant vehicle configuration, NORAD ID, decoder strategy, decoder ID, transmitter UUID, and SatNOGS status for the target vehicle.
4. Enable the managed `satnogs-adapter-service` through Layer 1 with `SATNOGS_LIVE_ENABLED=true` when live polling is needed.

The adapter resolves the canonical backend vehicle source, publishes upcoming observation windows for Planning, starts live polling, and drains any historical backlog in platform-sized chunks. Live and backfill requests share one SatNOGS coordinator for rate limits and retry-after handling.

The detailed workflow lives in [SatNOGS Adapter](/docs/satnogs-adapter).

## How source-scoped telemetry works

Telemetry samples, current values, watchlists, anomalies, feed status, and WebSocket subscriptions are scoped by `source_id`. If an external decoder or payload stream emits a field that is not in the seeded catalog, the backend creates a source-scoped discovered channel instead of dropping the sample.

Some external decoders only know when a packet was heard, not when it was generated onboard. Those streams may send `reception_time` without `generation_time`; the backend synthesizes `generation_time = reception_time` so the packet still flows through realtime ingest. For those packets, ordering and freshness are reception-based.

For catalog-backed telemetry, the vehicle configuration file can carry channel aliases. This lets external producers keep sending names such as `BAT_V`, `BATTERY_VOLT`, or `VBAT` while the platform resolves them to one canonical channel like `PWR_MAIN_BUS_VOLT`. Alias matching is source-scoped, and stored watchlists, position mappings, alerts, and history use the canonical channel name after resolution.

## Data flow

```text
Streamer, simulator, or adapter
    -> POST /telemetry/realtime/ingest
    -> Realtime bus
    -> WebSocket hub
    -> Mission Control
```

## Troubleshooting

- If a simulator source is unreachable, check its managed runtime status and base URL registration.
- If live data is present but the wrong source appears selected, check `source_id` and stream selection state.
- If Planning has no position marker, confirm the source vehicle configuration has a position mapping.
- If a decoder field appears missing, check discovered source-scoped channels before adding aliases.
