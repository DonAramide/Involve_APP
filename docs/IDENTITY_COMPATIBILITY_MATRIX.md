# QIP Identity Compatibility Matrix

This matrix documents which credential type is valid for every Quasar operation. The Quasar Identity Platform (QIP) enforces strict separation of concerns across its three identity planes.

## Operations Matrix

| Operation | Service (`qps_*`) | Client (`qpc_*`) | Tenant (`sk_*`) |
| :--- | :---: | :---: | :---: |
| **Create Client** | ✅ | ❌ | ❌ |
| **Rotate Client Credentials** | ✅ | ❌ | ❌ |
| **List Clients** | ✅ | ❌ | ❌ |
| **Revoke Client** | ✅ | ❌ | ❌ |
| **Service Administration** | ✅ | ❌ | ❌ |
| **Provision Tenant** | ❌ | ✅ | ❌ |
| **Issue Merchant API Keys** | ❌ | ✅ | ❌ |
| **Tenant Configuration** | ❌ | ✅ | ❌ |
| **Merchant Payments** | ❌ | ❌ | ✅ |
| **Wallet Transactions** | ❌ | ❌ | ✅ |
| **Invoicing & Ledger** | ❌ | ❌ | ✅ |
| **Terminal Operations** | ❌ | ❌ | ✅ |

### Key Definitions:
* **Service Plane (`qps_*`)**: Used purely for managing your integration's products (Clients). Issued directly by the Quasar Platform architecture team.
* **Client Plane (`qpc_*`)**: Used by your backend to provision tenants and issue API keys on behalf of merchants onboarding into your product.
* **Tenant Plane (`sk_*`)**: Used for all financial transactions, ledger entries, and business-domain operations belonging to a specific merchant.
