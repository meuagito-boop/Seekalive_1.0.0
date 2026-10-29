---
name: Auth browser tests
description: Safety boundaries for browser tests of account flows.
---

Browser-based Auth tests must target only localhost/loopback and intercept the application's API requests. Unconfigured API calls should fail explicitly rather than reaching a live service.

**Why:** account flows can create users, sessions, send verification messages, or change credentials. Browser tests must not accidentally write to production or send real email.

**How to apply:** keep UI/API-stub journeys separate from real integration tests. Use a dedicated isolated database and controlled mail provider only when an explicit test environment exists; label mocked and integrated coverage separately. Artifact-managed API workflows cannot be overridden with `configureWorkflow` to run tests; do not repurpose them, and run DB integration tests only through a supported runner with the required environment.
