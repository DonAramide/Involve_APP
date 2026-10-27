# Invify Health & Wellness — Lifecycle State Machines

**Document:** `docs/health-insurance/05_STATE_MACHINES.md`  
**Phase:** 1 (Design & Architecture)  

---

## 1. Enrolment State Machine (`hw_enrolments.status`)

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> enrolment_pending : Submit Member Info (Guardian/Staff/Admin)
    draft --> cancelled : Cancel Enrolment
    
    enrolment_pending --> awaiting_verification : Validation Complete
    enrolment_pending --> cancelled : Cancel Enrolment

    awaiting_verification --> awaiting_premium_payment : Verification Approved (health.enrolments.verify)
    awaiting_verification --> awaiting_insurer_activation : Plan Waives Upfront Payment
    awaiting_verification --> rejected : Rejected (With Reason Code)
    awaiting_verification --> cancelled : Cancel Enrolment

    awaiting_premium_payment --> awaiting_insurer_activation : Payment Verified & Allocated
    awaiting_premium_payment --> cancelled : Cancel Enrolment

    awaiting_insurer_activation --> active : Insurer Confirmation Event (policy.activated)
    awaiting_insurer_activation --> rejected : Insurer Rejection Event
    awaiting_insurer_activation --> cancelled : Cancelled before issuance

    active --> suspended : Insurer Suspension Event
    suspended --> active : Insurer Reinstatement Event
    
    active --> expired : Period End + Policy Terminated
    suspended --> expired : Period End
    
    active --> cancelled : Authorised Cancellation
    suspended --> cancelled : Authorised Cancellation

    rejected --> [*]
    cancelled --> [*]
    expired --> [*]
```

### Transition Authority Table

| Transition | Permitted Initiator / Event | Validation Required |
|---|---|---|
| `draft` -> `enrolment_pending` | Guardian (`can_manage_enrolment`), Staff Self, or `health.enrolments.manage` | Mandatory identity and contact fields populated |
| `enrolment_pending` -> `awaiting_verification` | System Validation Runner | All plan eligibility prerequisites met |
| `awaiting_verification` -> `awaiting_premium_payment` | User with `health.enrolments.verify` | Document review passed; verifier recorded |
| `awaiting_premium_payment` -> `awaiting_insurer_activation` | System Payment Event Handler | Invoice status is `paid` via confirmed Quasar payment |
| `awaiting_insurer_activation` -> `active` | Verified Provider Webhook (`policy.activated`) | Matching `hw_policies` record exists with status `active` |
| `active` -> `suspended` | Verified Provider Webhook (`policy.suspended`) | Reason logged; insurer event id linked |
| `suspended` -> `active` | Verified Provider Webhook (`policy.reinstated`) | Reinstatement recorded |
| `active` -> `expired` | Scheduled Job + Insurer Expiry Status | `period_end` has passed |

---

## 2. Policy State Machine (`hw_policies.status`)

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> active : Insurer Event policy.activated (with activation_event_id)
    pending --> rejected_by_provider : Insurer Rejection Event
    
    active --> suspended : Insurer Event policy.suspended
    suspended --> active : Insurer Event policy.reinstated
    
    active --> expired : Insurer Event or Policy Expiry Date passed
    active --> cancelled : Policy Termination Event
    suspended --> cancelled : Policy Termination Event
    
    rejected_by_provider --> [*]
    expired --> [*]
    cancelled --> [*]
```

**Cardinal Rule:** Coverage is NEVER inferred from payment receipt. A policy enters `active` ONLY when a verified cryptographic event or confirmed lookup from the insurance partner arrives.

---

## 3. Premium Invoice State Machine (`hw_premium_invoices.status`)

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> issued : Authorised Admin / Billing Job
    draft --> void : Discarded before issuance
    
    issued --> partially_paid : Payment Allocation < amount_due_minor
    issued --> paid : Payment Allocation == amount_due_minor
    issued --> void : Cancelled (0 payments received)
    
    partially_paid --> paid : Final Allocation == amount_due_minor
    partially_paid --> refunded : Reversal / Refund processed
    paid --> refunded : Full or Partial Refund processed
    
    void --> [*]
    refunded --> [*]
```

---

## 4. Payment State Machine (`hw_payments.status`)

```mermaid
stateDiagram-v2
    [*] --> initiated : Generated payment reference & idempotency key
    initiated --> pending : Quasar transaction dispatched
    initiated --> failed : Dispatch failed / Rejected by gateway
    
    pending --> successful : Quasar webhook verified (HMAC) + Server-side Status Confirmed
    pending --> failed : Quasar webhook confirms failure
    
    successful --> reversed : Chargeback or bank reversal event
    successful --> refunded : Merchant / Admin approved refund
    
    failed --> [*]
    reversed --> [*]
    refunded --> [*]
```

**Reconciliation Note:** Reconciliation against the platform internal ledger does not change the payment's functional status. Instead, a dedicated `reconciled_at` timestamp and `ledger_journal_id` are populated. If ledger posting experiences a delay, the payment remains `successful` and coverage activation is not interrupted.
