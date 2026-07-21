# Partner Integration Guide v2

Welcome to the Quasar Identity Platform (QIP) Integration Guide. This document provides the canonical reference for integrating with Quasar's unified identity architecture.

## 1. Identity Hierarchy
Quasar strictly isolates operations across three identity planes:
- **Service (`qps_*`)**: Represents your top-level platform integration (e.g., Invify, Owanbe).
- **Client (`qpc_*`)**: Represents a specific product or application within your platform (e.g., Invify Retail, Invify School).
- **Tenant (`sk_*`)**: Represents the end-user merchant transacting on the platform.

## 2. Authentication Headers
**Rule:** Only one authentication plane must be active per request.

### Service Operations
```http
X-Quasar-Service-Id: qps_...
X-Quasar-Service-Secret: qps_sec_...
```

### Client Operations
```http
Authorization: Bearer qpc_...
```

### Tenant Operations
```http
Authorization: Bearer sk_test_...
```

## 3. Credential Lifecycle & Rotation Procedures
- **Never embed credentials in client-side code.**
- Service secrets (`qps_sec_*`) are provided out-of-band by the Quasar administration team. Store them securely in a vault.
- Rotate Client credentials via the Quasar backend using your Service credentials.
- When rotating, utilize the optimistic concurrency ETags provided by the QIP configuration endpoints.

## 4. Common Integration Mistakes
- **Multi-plane Bleeding:** Passing a `qps_*` header alongside a `Bearer sk_*` token. QIP will reject these requests with `401 Unauthorized`.
- **Committing Secrets:** Leaving `qps_` or `qpc_` secrets in Git repositories. Always use Vault-injected environment variables.
- **Using Client Tokens for Transactions:** Attempting to process a payment using `qpc_*` rather than a merchant's `sk_*`.

## 5. Troubleshooting
- Ensure outbound requests from your backend strictly assert the correct credential plane.
- Check the `IdentityContext` returned in the response headers to verify how Quasar resolved your credentials.
- If you receive a `403 Forbidden`, ensure the endpoint you are calling matches the credential's plane (see the Identity Compatibility Matrix).
