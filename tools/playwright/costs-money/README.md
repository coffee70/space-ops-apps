# Costs Money Playwright Diagnostics

Tests in this folder intentionally exercise real provider-backed AI flows. They can spend money whenever the local stack is configured with live LLM provider credentials.

These tests are excluded from default Playwright discovery. Run them only when you explicitly need live-provider validation.

Examples:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test -- costs-money
```

or through the kernel wrapper:

```sh
../space-ops-kernel/scripts/validate-playwright.sh costs-money
```

To verify discovery without sending a provider request:

```sh
PLAYWRIGHT_COSTS_MONEY_ABORT_BEFORE_SEND=1 ../space-ops-kernel/scripts/validate-playwright.sh costs-money
```
