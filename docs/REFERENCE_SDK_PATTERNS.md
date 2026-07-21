# Reference SDK Patterns

Future integrations mapping to the Quasar ecosystem should adopt the following canonical SDK structure. This pattern prevents multi-plane bleeding and cleanly separates the domain layers.

## Pattern Architecture

```text
QuasarApiClient (Base Transport & Plane Injection)
        │
        ├── QuasarServiceClient
        │   (Uses qps_* plane; Handles Service-level operations)
        │
        ├── QuasarPlatformClient
        │   (Uses qpc_* plane; Handles Tenant provisioning)
        │
        └── QuasarPaymentsClient
            (Uses sk_* plane; Handles Financial transactions)
```

## Implementation Rules
1. **Shared Transport:** `QuasarApiClient` acts as the single HTTP transport layer, responsible for interceptors, logging, and injecting the active authentication plane.
2. **Explicit Injection:** The active credential must be injected into the domain clients at runtime (e.g., `new QuasarPaymentsClient(merchantAuth)`).
3. **Assertion Guard:** `QuasarApiClient` must count the active planes in the payload. If `planes > 1`, it must throw a strict `MultiPlaneAuthenticationError`.
4. **Domain Isolation:** A Service client should never possess methods for processing payments, and a Payments client should never possess methods for creating clients.
