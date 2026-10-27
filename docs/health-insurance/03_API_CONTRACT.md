# Invify Health & Wellness — API Contract

**Document:** `docs/health-insurance/03_API_CONTRACT.md`  
**Phase:** 1 (Design & Architecture)  
**Mount Prefix:** `/api/v1/health-insurance`  
**Authentication:** Required for all routes (`authenticate` middleware via Supabase JWT) except provider webhooks which use HMAC-SHA256 signature verification.  

---

## 1. Global Conventions & Standards

- **Tenant Scoping:** Tenant is strictly resolved server-side from verified DB user profiles (`req.user.tenantId`). Any client-supplied tenant ID query or body parameter is discarded.
- **Authorization:** Handled by `requireHealthPermission(perm)` middleware. No automatic `super_admin` bypass.
- **Amounts:** All monetary values are integer minor units (kobo). `1000000` = ₦10,000.00.
- **Pagination:** Query params `page` (default 1) and `limit` (default 20, max 100). Responses format:
  ```json
  {
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 142,
      "totalPages": 8
    }
  }
  ```
- **Standard Error Response:**
  ```json
  {
    "error": {
      "code": "HEALTH_FORBIDDEN",
      "message": "User lacks required permission 'health.enrolments.manage'",
      "details": null
    }
  }
  ```

---

## 2. Endpoint Specifications

### 2.1 Overview & Dashboard

#### `GET /api/v1/health-insurance/overview`
Returns live metrics computed from authoritative persisted records.
- **Permission:** `health.reports.read`
- **Query Params:** `startDate`, `endDate`, `category` (optional)
- **Response `200 OK`:**
  ```json
  {
    "metrics": {
      "eligibleMembers": 850,
      "enrolledMembers": 620,
      "insurerConfirmedActive": 590,
      "awaitingVerification": 15,
      "awaitingActivation": 15,
      "incompleteEnrolments": 25,
      "premiumsBilledMinor": 620000000,
      "premiumsCollectedMinor": 590000000,
      "outstandingBalanceMinor": 30000000,
      "policiesExpiringIn30Days": 42,
      "delayedProviderSyncs": 0
    },
    "coverageRatePercent": 69.41,
    "freshness": {
      "generatedAt": "2026-10-14T23:00:00.000Z",
      "lastProviderSyncAt": "2026-10-14T22:30:00.000Z"
    }
  }
  ```

---

### 2.2 Member & Enrolment Management

#### `GET /api/v1/health-insurance/members`
- **Permission:** `health.members.read`
- **Query Params:** `category`, `search`, `page`, `limit`
- **Response `200 OK`:**
  ```json
  {
    "data": [
      {
        "id": "c1f7b9e0-8a2b-4e1d-8f90-1b2c3d4e5f60",
        "memberCategory": "student",
        "student": {
          "id": "e2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
          "firstName": "Chinedu",
          "lastName": "Okeke",
          "admissionNumber": "STU/2026/042",
          "currentClass": "JSS 2A"
        },
        "insurerMemberRef": "HMO-2026-99321",
        "status": "active"
      }
    ]
  }
  ```

#### `POST /api/v1/health-insurance/enrolments`
Initiate member enrolment for an insurance plan.
- **Permission:** `health.enrolments.manage`
- **Request Body:**
  ```json
  {
    "memberId": "c1f7b9e0-8a2b-4e1d-8f90-1b2c3d4e5f60",
    "planVersionId": "a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d",
    "periodStart": "2026-09-01",
    "periodEnd": "2027-08-31"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "enrolmentId": "f4b3a2c1-d0e9-4f8a-7b6c-5d4e3f2a1b0c",
    "status": "enrolment_pending",
    "periodStart": "2026-09-01",
    "periodEnd": "2027-08-31"
  }
  ```

#### `POST /api/v1/health-insurance/enrolments/:id/verify`
Verify eligible documents or identity to progress status.
- **Permission:** `health.enrolments.verify`
- **Request Body:**
  ```json
  {
    "decision": "approve", // or "reject"
    "reason": "Birth certificate sighted and matches school register"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "enrolmentId": "f4b3a2c1-d0e9-4f8a-7b6c-5d4e3f2a1b0c",
    "status": "awaiting_premium_payment"
  }
  ```

---

### 2.3 Guardian Portal & Relationships

#### `POST /api/v1/health-insurance/guardians/invite`
Issue a secure, tenant-scoped invitation to link a parent or guardian.
- **Permission:** `health.guardians.manage`
- **Request Body:**
  ```json
  {
    "studentId": "e2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
    "relationship": "mother",
    "channel": "email",
    "contactValue": "parent@example.com"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "invitationId": "11223344-5566-7788-99aa-bbccddeeff00",
    "expiresAt": "2026-10-16T23:00:00.000Z"
  }
  ```

#### `POST /api/v1/health-insurance/guardians/invitations/accept`
Accept invitation token using authenticated parent identity.
- **Authentication:** Authenticated Supabase User (Guardian)
- **Request Body:**
  ```json
  {
    "token": "raw-32-byte-hex-token"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "linkId": "99887766-5544-3322-1100-aabbccddeeff",
    "status": "pending_verification",
    "studentName": "Chinedu Okeke"
  }
  ```

#### `GET /api/v1/health-insurance/guardian/children`
List children linked to caller's verified guardian account.
- **Authentication:** Authenticated Guardian User
- **Response `200 OK`:**
  ```json
  {
    "children": [
      {
        "studentId": "e2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
        "studentName": "Chinedu Okeke",
        "schoolName": "Green Valley Academy",
        "permissions": {
          "canViewCoverage": true,
          "canViewPremiums": true,
          "canPayPremiums": true
        },
        "activePolicy": {
          "policyNumber": "POL-2026-9021",
          "providerName": "Leadway Health",
          "status": "active",
          "expiryDate": "2027-08-31"
        }
      }
    ]
  }
  ```

---

### 2.4 Premium Invoicing & Payments

#### `POST /api/v1/health-insurance/invoices/:id/pay`
Initiate payment for a health premium invoice.
- **Permission:** `health.billing.manage` OR verified guardian with `can_pay_premiums`
- **Request Body:**
  ```json
  {
    "paymentMethod": "quasar_card",
    "idempotencyKey": "pay-hw-inv-2026-00001-attempt-1"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "paymentReference": "HW-PAY-20261014-9902",
    "amountMinor": 2500000,
    "currency": "NGN",
    "status": "initiated",
    "checkoutUrl": "https://checkout.quasar.example/tx/xyz987"
  }
  ```

---

### 2.5 Provider Ingress Webhook

#### `POST /api/v1/health-insurance/provider-webhooks/:providerCode`
- **Authentication:** HMAC-SHA256 signature via header `x-provider-signature`
- **Request Headers:**
  - `x-provider-signature`: Hex-encoded HMAC of raw payload
  - `x-provider-event-id`: Unique event ID from partner
- **Response `200 OK`:**
  ```json
  {
    "received": true,
    "eventId": "evt_hmo_98234710",
    "status": "processed"
  }
  ```
- **Duplicate Event Response `200 OK`:**
  ```json
  {
    "received": true,
    "eventId": "evt_hmo_98234710",
    "status": "ignored_duplicate"
  }
  ```
