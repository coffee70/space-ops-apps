# Mission Control UI (Telemetry Operations Frontend)

Next.js operator surface for the Space Ops split stack: overview, watchlists, anomalies, live status, integrated search, channel detail, simulator controls, embedded applications, and related workflows.

## Read this with the split checkout

Mission Control is one piece of **three siblings** (`space-ops-kernel`, `space-ops-platform`, `space-ops-apps`). Prefer the **parent** docs for full-stack test instructions:

| Audience | Start here |
|----------|------------|
| Layer 3 apps + Browser tests | [`../README.md`](../README.md), [`../AGENTS.md`](../AGENTS.md) |
| Compose + `validate-node.sh` / `validate-playwright.sh` | [`../../space-ops-kernel/README.md`](../../space-ops-kernel/README.md) |
| Backend / platform pytest | [`../../space-ops-platform/README.md`](../../space-ops-platform/README.md) |

## Development (this package)

From **`space-ops-apps/mission-control-ui/`**:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. By default browser calls use `NEXT_PUBLIC_API_URL` (see `.env` / shell). Server-side fetches use **`API_SERVER_URL`** when running outside Compose.

**Quality gate (host):**

```bash
npm run validate       # loaders + eslint + tsc + runtime tests
```

**Quality gate (recommended for agents / CI parity):** same work runs inside the kernel’s Linux Node Docker image — reproducible native toolchain:

```bash
../../space-ops-kernel/scripts/validate-node.sh
```

## Docker / Compose

`NEXT_PUBLIC_*` values are fixed at **`next build`** time in the image. For the full stack or Playwright on the Compose network, follow kernel + Playwright README rebuild notes so the browser resolves `platform-api`, `control-plane`, etc.

## Browser / Playwright validation

Do **not** add a second Playwright install here. Use **`space-ops-apps/tools/playwright`** driven by the kernel script:

```bash
../../space-ops-kernel/scripts/validate-playwright.sh smoke
```

Application loader manifests are generated — `npm run check:application-loaders` (or `generate:application-loaders`) per `package.json`.
