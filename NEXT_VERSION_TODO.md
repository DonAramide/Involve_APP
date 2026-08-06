# Next version — backlog

## Payment method visibility (super-admin driven)

**Status:** Planned for next version  
**Priority:** Product / platform control

Super admin should be able to enable/disable visibility of selected payment methods on devices, scoped by:

- **Group** — set of tenants (agent / franchise / cohort)
- **Mode** — school, retail, service
- **Tenant** — individual merchant override

### Methods in scope (phase 1)

- Transfer (Personal Company account)
- Pay with Transfer (Virtual Account)
- Customer Wallet / Credit

### Resolution order (most specific wins)

`tenant > group > mode > platform default`

### Notes

- Enforce on device (hide in Invoice Preview) and reject if a disabled method is forced.
- Prefer extending existing runtime / Tenant Orchestration feature-flag path over a new subsystem.
- Suggested rollout: mode toggles → tenant override → groups.
- Cash / POS stay always available unless explicitly gated later.

### Out of scope for this item

- Changing payment settlement logic
- Renaming method values stored on invoices (`Transfer`, `VirtualAccount`, etc.)
