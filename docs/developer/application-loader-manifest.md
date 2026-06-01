---
title: Application Loader Manifest
layer: apps
audience: developer
topics:
  - application-loaders
  - native-apps
  - generated-files
status: mvp
last_verified: 2026-06-01
---

# Application Loader Manifest

## Purpose

This doc explains how Mission Control maps native application loader keys to dynamic imports.

## Applies To

`mission-control-ui/src/platform/registry/application-loader-manifest.generated.ts` and native apps with `entry.tsx`.

## Core Concepts

Mission Control uses a generated loader manifest to map native application loader keys to dynamic imports.

The generator scans application directories for:

```text
entry.tsx
```

and writes:

```text
mission-control-ui/src/platform/registry/application-loader-manifest.generated.ts
```

## Procedure

Regenerate when:
- adding a native app
- renaming an app directory
- changing loader keys
- deleting a native app

Commands:

```bash
npm run generate:application-loaders
npm run check:application-loaders
```

## Do Not Assume

Do not hand-edit generated loader output as the source of truth.

## Validation

Run `npm run check:application-loaders` and validate the app route through Mission Control.

## Failure Modes

If registry metadata points to a loader key that is not in the generated manifest, the application route may exist but the native app will not render.

## Related Docs

- [Native Frontend App Guide](./native-frontend-app-guide.md)
- [Frontend Fetching and Gateway Routes](./frontend-fetching-and-gateway-routes.md)
