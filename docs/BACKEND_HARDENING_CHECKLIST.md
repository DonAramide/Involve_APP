# Backend Hardening Checklist

This checklist enforces the six enterprise readiness recommendations for the Quasar Identity Platform backend implementation.

- [ ] **1. Backend Authorization**
  - [ ] Every endpoint independently verifies administrative permissions.
  - [ ] Never rely on frontend role claims for vault access or configuration updates.

- [ ] **2. Immutable Audit Logging**
  - [ ] Rotations generate immutable records containing: Actor, Secret Type, Timestamp, Trace ID, Status.
  - [ ] The raw secret value is *never* logged in the audit trail.

- [ ] **3. Prefix Validation**
  - [ ] Reject any Service credential not matching `/^qps_.*/`
  - [ ] Reject any Client credential not matching `/^qpc_.*/`
  - [ ] Reject any Tenant credential not matching `/^sk_.*/`

- [ ] **4. Optimistic Concurrency**
  - [ ] Enforce version numbers or `ETags` during secret updates.
  - [ ] Prevent simultaneous administrative overrides by throwing a `409 Conflict`.

- [ ] **5. Rate Limiting**
  - [ ] Protect rotation and generation endpoints from rapid execution loops.
  - [ ] Implement cooldowns between sequential rotations for the same identity.

- [ ] **6. Zero-Retrieval APIs**
  - [ ] Configuration endpoints return metadata only (configured boolean, last rotated timestamp, rotated by).
  - [ ] No API exists that returns a plaintext secret after its initial generation response.
