---
title: Native Frontend App Guide
layer: apps
audience: developer
topics:
  - native-apps
  - application-registry
  - validation
status: mvp
last_verified: 2026-06-01
---

# Native Frontend App Guide

## Purpose

This doc explains how to create and register a native frontend application in Mission Control.

## Applies To

Native apps under `mission-control-ui/src/applications/{applicationId}` mounted at `/apps/{applicationId}`.

## Core Concepts

Native frontend applications are mounted inside Mission Control at:

```text
/apps/{applicationId}
```

A native app generally requires:

1. source code under the applications directory
2. an `entry.tsx`
3. app registry metadata
4. a loader key
5. generated application loader manifest update
6. route validation through Mission Control

Application source layout:

```text
mission-control-ui/src/applications/{applicationId}/entry.tsx
```

The application metadata loader key must match an entry in the generated loader manifest.

The public route should be:

```text
/apps/{applicationId}
```

## Procedure

Add the app source, add or update registry metadata, regenerate the application loader manifest, and validate the route through Mission Control.

## Do Not Assume

If the app is registered but the loader key is missing from the generated manifest, Mission Control may show the app as unavailable.

## Validation

After adding a native app:

```bash
npm run generate:application-loaders
npm run check:application-loaders
npm run typecheck
```

Then validate through the full stack:

```text
http://localhost:8080/apps/{applicationId}
```

## Failure Modes

Loader key mismatches, stale generated manifests, or validating only through `localhost:3000` can hide full-stack application routing issues.

## Related Docs

- [Application Loader Manifest](./application-loader-manifest.md)
- [Frontend Fetching and Gateway Routes](./frontend-fetching-and-gateway-routes.md)
- [Validation Gates](../../../space-ops-kernel/docs/platform/validation-gates.md)
