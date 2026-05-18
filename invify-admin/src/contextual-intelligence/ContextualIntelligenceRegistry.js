// invify-admin/src/contextual-intelligence/ContextualIntelligenceRegistry.js

/**
 * Authoritative Centralized Registry of Contextual Operational Intelligence
 * Emulating Bloomberg Terminal, CrowdStrike Falcon, and Datadog Enterprise.
 * Exposes multi-dimensional explanations, temporal degradation timelines,
 * live dependency relationship topologies, and action explainability profiles.
 */
export const ContextualIntelligenceRegistry = {
  'fleet-presence': {
    id: 'fleet-presence',
    title: 'Fleet Presence Stream',
    severity: 'NOMINAL',
    confidence: 94,
    dependencies: ['telemetry-ingest', 'kernel-integrity'],
    related: ['soc-quarantine', 'threat-intel'],
    
    // Core Explanations by Operator Presets/Modes
    operator: 'Displays real-time presence state transitions of all active field devices calculated from heartbeat aging windows.',
    engineering: 'Subscribes to `/api/v1/telemetry/devices/presence` WS. Emits presence heartbeat packets on a 500ms sliding window. Uses Redis cluster keys to store state matrices.',
    ai: 'Employs an Isolation Forest anomaly classifier calibrated on dynamic historical heartbeat frequencies. Alerts on aging variance above 2.4 sigma.',
    governance: 'Adheres to NIST SP 800-53 continuous presence tracking regulations. Generates cryptographic session handshakes verified at boundary gateways.',

    // Temporal Explainability Timeline
    timeline: [
      { timestamp: '2026-05-17T21:00:00Z', event: 'Baseline Established', details: 'Perfect latency calibration across all 14 global data centers. Standard heartbeat aging: 5s.' },
      { timestamp: '2026-05-17T21:40:00Z', event: 'Drift Detected', details: 'Heartbeat aging window shifted from 5s to 7.8s in European Canary region.' }
    ],

    // Action / Terminal Command Explainability
    actionExplainability: {
      command: 'Terminate Device Session',
      consequence: 'Instantly revokes session boundary authorization and halts WebSocket heartbeat transmission.',
      telemetryImpact: 'Presence status shifts immediately to DISCONNECTED; throughput EPS drops to 0.',
      rollback: 'Automatic reconnection triggered upon hardware boot retry and valid MFA attestation.',
      complianceEffect: 'Forces instant audit trail logging under SOC Compliance Act Section 4.2.',
      lineage: 'Source: `fleet.controller.ts` -> `/devices/revoke` -> Supabase JWT Session Blacklist'
    },

    offlineCache: 'Fleet Presence Stream: Monitors operational presence of field assets. Fully functional offline with pre-compiled regional hardware schemas.'
  },

  'compliance-drift': {
    id: 'compliance-drift',
    title: 'Compliance Drift Analysis',
    severity: 'WARNING',
    confidence: 88,
    dependencies: ['kernel-integrity', 'policy-governance'],
    related: ['soc-quarantine', 'canary-rollout'],

    operator: 'Measures compliance score variance over time, detecting deviations from security policies and OS patch requirements.',
    engineering: 'Calculates active divergence scores using a normalized Euclidean drift index. Hydrated by daily schema audit sweeps comparing local device profiles against master YAML policies.',
    ai: 'Calibrates compliance decay predictions across 7-day sliding intervals. Predicts an 88% probability that active drift will violate SOC2 boundary guidelines within 36 hours if unmitigated.',
    governance: 'Exposes violations of GDPR and ISO/IEC 27001 configurations. Drives automatic policy warnings to organization administrators.',

    timeline: [
      { timestamp: '2026-05-17T18:00:00Z', event: 'Policy Enforced', details: 'Master SOC-Grade policies pushed to all active tenants.' },
      { timestamp: '2026-05-17T20:15:00Z', event: 'Minor Drift Detected', details: '14 field devices identified running outdated kernel versions. Compliance Score dropped 4.2%.' }
    ],

    actionExplainability: {
      command: 'Trigger Compliance Remediate',
      consequence: 'Pushes signed OTA compliance patch envelopes to all active drifting hardware nodes.',
      telemetryImpact: 'Triggers CPU overhead increase during patching; compliance score recovers after node reports updated boot image.',
      rollback: 'Rollback supported to previous YAML schema boundary; requires double-signature security clearance.',
      complianceEffect: 'Restores compliance index score to NOMINAL (>98%).',
      lineage: 'Source: `PolicyGovernancePage.vue` -> `PolicyIntelligencePage.js` -> REST `/api/policies/enforce`'
    },

    offlineCache: 'Compliance Drift Analysis: Evaluates security compliance scores. Retains latest known compliance matrix cache in memory.'
  },

  'kernel-integrity': {
    id: 'kernel-integrity',
    title: 'Kernel Integrity Matrix',
    severity: 'CRITICAL',
    confidence: 99,
    dependencies: ['telemetry-ingest'],
    related: ['soc-quarantine', 'threat-intel'],

    operator: 'Verifies the cryptographic boot status and operating system structure of field devices to prevent physical firmware tampering.',
    engineering: 'Performs Trusted Platform Module (TPM) SHA256 hardware attestation signatures upon boot. Validates signature rings against corporate vaults.',
    ai: 'Monitors real-time process execution anomalies. Flags unauthorized privilege escalation attempts with 99.4% confidence using a bounded recurrent neural network.',
    governance: 'Mandatory security control under SOC2 Type II and FIPS 140-3 framework. Immediate quarantine triggered upon attestation failure.',

    timeline: [
      { timestamp: '2026-05-17T20:00:00Z', event: 'Signature Cleared', details: 'All active assets verified with certified SHA-256 kernel keys.' },
      { timestamp: '2026-05-17T21:48:00Z', event: 'INTEGRITY VIOLATION', details: 'Device asset `node-7712` reported corrupted bootloader block. Kernel signature rejected.' }
    ],

    actionExplainability: {
      command: 'Isolate Integrity Node',
      consequence: 'Halts process loop execution on the selected hardware asset and revokes local API keys.',
      telemetryImpact: 'Asset transitions immediately to ISOLATED; live logs are captured and directed to quarantine.',
      rollback: 'Requires physical USB key secure boot recovery or authoritative manual supervisor credential bypass.',
      complianceEffect: 'Fulfills SOC Incident Response Plan SLA; isolation must execute within 90 seconds of threat verification.',
      lineage: 'Source: `IntegrityCenterPage.vue` -> REST `/api/integrity/quarantine` -> Kafka Event Bus'
    },

    offlineCache: 'Kernel Integrity Matrix: Verifies boot parameters. Operates offline using static vault signature databases.'
  },

  'soc-quarantine': {
    id: 'soc-quarantine',
    title: 'SOC Quarantine Escalation',
    severity: 'WARNING',
    confidence: 91,
    dependencies: ['kernel-integrity', 'compliance-drift'],
    related: ['threat-intel', 'sla-metrics'],

    operator: 'Manages the sandbox isolation of compromised assets, preventing lateral movement of unauthorized processes across the mesh.',
    engineering: 'Applies hardware-level network filter policies via eBPF boundaries. Limits isolated assets exclusively to secure audit telemetry sockets.',
    ai: 'AI-guided routing engine recommends isolation rules. Predicts lateral contagion index drops by 97% once active quarantine rules are applied.',
    governance: 'Ensures conformance with CIS Critical Security Controls #12 (Network Infrastructure Defense). Prevents leakage of unencrypted customer data.',

    timeline: [
      { timestamp: '2026-05-17T15:00:00Z', event: 'Quarantine Pools Empty', details: 'All assets running within the standard operational grid.' },
      { timestamp: '2026-05-17T21:49:00Z', event: 'Asset Quarantined', details: 'Device `node-7712` redirected to Sandbox Quarantine pool due to Kernel Integrity mismatch.' }
    ],

    actionExplainability: {
      command: 'De-Escalate Asset',
      consequence: 'Removes network-level eBPF firewalls, restoring normal cluster communication channels.',
      telemetryImpact: 'Restores connection handshake rates and standard transactional throughput.',
      rollback: 'Instant re-quarantine triggers automatically if automated integrity scans fail within 60s of restoration.',
      complianceEffect: 'Restores asset to certified production pool; triggers incident report creation.',
      lineage: 'Source: `QuarantineCenterPage.vue` -> REST `/api/quarantine/restore`'
    },

    offlineCache: 'Quarantine Isolation: Sandboxes corrupted nodes to prevent lateral movement of threats.'
  },

  'canary-rollout': {
    id: 'canary-rollout',
    title: 'Canary OTA Cohort Rollout',
    severity: 'NOMINAL',
    confidence: 90,
    dependencies: ['telemetry-ingest'],
    related: ['compliance-drift', 'sla-metrics'],

    operator: 'Controls the progressive deployment of firmware updates across isolated hardware cohorts to minimize service degradation risk.',
    engineering: 'Manages semantic version deployment states. Routes updates progressively (1% -> 5% -> 25% -> 100%) checking latency metrics on each gate.',
    ai: 'Monitors cohort anomaly scores during early deployment. Predicts rollout stability index using a continuous regression simulator.',
    governance: 'Implements continuous validation required by ISO 9001 change management processes. Requires multi-signature rollback approval.',

    timeline: [
      { timestamp: '2026-05-17T10:00:00Z', event: 'Rollout Initiated', details: 'v2.1.0-alpha update targeted to European Canary Cohort 1.' },
      { timestamp: '2026-05-17T14:30:00Z', event: 'Progression Gate Cleared', details: 'Rollout progressed to 5% cohort density. Zero crashes reported.' }
    ],

    actionExplainability: {
      command: 'Emergency OTA Rollback',
      consequence: 'Instantly broadcasts rollback command instructions to restore prior stable firmware v2.0.8.',
      telemetryImpact: 'Temporary bandwidth spike as nodes download previous image; stable CPU metrics recovered within 4 minutes.',
      rollback: 'Authoritative override command; cannot be canceled once initiated.',
      complianceEffect: 'Minimizes customer SLA penalty points by preventing extended crash loops.',
      lineage: 'Source: `device_onboarding_page.dart` & `RolloutCenter` -> REST `/api/deployments/abort`'
    },

    offlineCache: 'Canary OTA Rollout: Coordinates progressive firmware deployments. Supports local cached recovery boot images.'
  },

  'anomaly-rca': {
    id: 'anomaly-rca',
    title: 'AI Root Cause Analysis (RCA)',
    severity: 'WARNING',
    confidence: 92,
    dependencies: ['telemetry-ingest', 'kernel-integrity', 'compliance-drift'],
    related: ['soc-quarantine', 'threat-intel'],

    operator: 'Uses advanced neural correlation mapping to analyze system anomalies and trace incident vectors back to their origin.',
    engineering: 'Constructs causal inference DAGs (Directed Acyclic Graphs) from real-time alert logs and metrics. Analyzes temporal lag offsets to isolate triggers.',
    ai: 'AI-assisted causal reasoning models trace anomalies back to cohort changes with 92% reliability. Points to OTA Canary deployment as the 78% likely trigger.',
    governance: 'Saves critical post-mortem event details to immutable audit stores for subsequent SOC2 regulatory compliance reviews.',

    timeline: [
      { timestamp: '2026-05-17T21:48:30Z', event: 'Causal Correlation Active', details: 'Integrity mismatch on `node-7712` correlated with OTA Canary Cohort 1 deployment.' },
      { timestamp: '2026-05-17T21:50:00Z', event: 'Causal Chain Confirmed', details: 'Canary rollout v2.1.0-alpha contains a boot signature mismatch affecting European asset profiles.' }
    ],

    actionExplainability: {
      command: 'Export Post-Mortem Envelopes',
      consequence: 'Serializes active anomaly logs, WS trace frames, and causal DAG maps to a secure PDF/JSON block.',
      telemetryImpact: 'Zero operational latency impact.',
      rollback: 'N/A (Read-only administrative action).',
      complianceEffect: 'Fulfills compliance archiving mandates; logs immutable receipt hashes to ledger.',
      lineage: 'Source: `AIOperationsCopilotPage.vue` -> `RcaEngine` -> REST `/api/ai/rca/export`'
    },

    offlineCache: 'AI Root Cause Analysis: Correlates metrics and alerts to identify system failure origins.'
  },

  'treasury-ledger': {
    id: 'treasury-ledger',
    title: 'Treasury Double-Entry Ledger',
    severity: 'NOMINAL',
    confidence: 97,
    dependencies: ['telemetry-ingest'],
    related: ['virtual-account', 'revenue-alloc'],

    operator: 'An immutable, double-entry financial ledger capturing every transactional state change and regional tax allocation on the platform.',
    engineering: 'Enforces strict cryptographic transaction sealing. Computes balanced credit/debit records. Utilizes localized FX lock intervals.',
    ai: 'Monitors ledger inputs for operational fraud signatures. Checks double-spend indices and flags unexpected FX drift vectors.',
    governance: 'Auditable under PCI-DSS Level 1 and SOX compliance rules. Ensures ledger immutability and complete accounting lineage.',

    timeline: [
      { timestamp: '2026-05-17T00:00:00Z', event: 'Ledger Clean Sweep', details: 'All daily transactional pipelines reconciled with zero discrepancies.' }
    ],

    actionExplainability: {
      command: 'Perform Ledger Lock',
      consequence: 'Freezes write inputs to the current financial epoch, pushing closed balances to long-term storage.',
      telemetryImpact: 'Writes queued to temporary high-performance Redis cache buffers for <3s.',
      rollback: 'Strictly prohibited by accounting governance laws. Erroneous records must be balanced by manual correction entries.',
      complianceEffect: 'Generates secure SOX-compliant ledger snapshot markers.',
      lineage: 'Source: `BillingGovernanceCenterPage.vue` -> `contracts/billing` -> REST `/api/billing/ledger/lock`'
    },

    offlineCache: 'Treasury Double-Entry Ledger: Financial ledger capturing transactional credits/debits. Caches offline reports.'
  },

  'virtual-account': {
    id: 'virtual-account',
    title: 'Virtual Account Routing Hub',
    severity: 'NOMINAL',
    confidence: 95,
    dependencies: ['treasury-ledger'],
    related: ['revenue-alloc', 'sla-metrics'],

    operator: 'Coordinates payment routing pathways, allocating inbound platform funds into isolated corporate, tenant, and tax envelopes.',
    engineering: 'Maintains mapping registries for partner banks and local virtual routes. Integrates webhook listeners for instant credit validation.',
    ai: 'Analyzes routing latency. Dynamically redirects transactional flows if specific banking gateways experience connection lag.',
    governance: 'Maintains compliant anti-money laundering (AML) tracking. Logs all transaction sender indices for regulatory reviews.',

    timeline: [
      { timestamp: '2026-05-17T06:00:00Z', event: 'Bank Gateway Clear', details: 'All three virtual routing banks reporting operational latency <120ms.' }
    ],

    actionExplainability: {
      command: 'Re-Route Virtual Account',
      consequence: 'Redirects incoming client payment flows to an alternative backup banking partner.',
      telemetryImpact: 'Zero transactional drop; processing latency recovers immediately if banking gateway is lagging.',
      rollback: 'Instantly reversible with a single supervisor command bypass.',
      complianceEffect: 'Guarantees continuous uptime of platform billing systems (>99.99%).',
      lineage: 'Source: `BillingGovernanceCenterPage.vue` -> REST `/api/billing/routing/update`'
    },

    offlineCache: 'Virtual Account Routing: Allocates inbound funds into corporate, tenant, and tax envelopes.'
  }
}
