# Dashboard Physical Test Log

## 1. Authentication Phase (Test JWT Injection)
- Authentication successful (Injected Token). Time: 220.40ms
- Tenant ID resolved: e2b3c4d5-6789-0123-4567-89abcdef0123

## 2. Analytics Aggregation (get_school_financial_summary)
- HTTP Status: 200
- Execution Time: 1809.24ms
- Raw Payload: {
  "totalRevenue": 0,
  "outstandingFees": 0,
  "paidStudentsCount": 0,
  "owingStudentsCount": 0,
  "totalStudents": 0,
  "lastUpdated": "2026-07-15T13:35:17.293Z"
}

## 3. Settlement Phases (Ledger Database Probe)
- HTTP Status: 200
- Execution Time: 391.23ms
- Raw Payload: [
  {
    "title": "POS Checkout Batching",
    "desc": "Aggregating mobile client-signed checkout events.",
    "active": true
  },
  {
    "title": "Reconciliation Match",
    "desc": "Executing deterministic double-entry ledger alignment scans.",
    "active": true
  },
  {
    "title": "Quasar Signature Replay",
    "desc": "Signing settlement blocks with platform-wide private keys.",
    "active": true
  },
  {
    "title": "Corporate Bank Payout",
    "desc": "Transferring funds to primary Access Bank settlement current account.",
    "active": null
  }
]

## 4. Wallet Balance Retrieval
- HTTP Status: 200
- Execution Time: 351.48ms
- Raw Payload: {
  "balance": 0
}

[PASS] All dashboard physical integrations succeeded.
