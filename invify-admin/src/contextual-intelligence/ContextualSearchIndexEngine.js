// invify-admin/src/contextual-intelligence/ContextualSearchIndexEngine.js
import { ContextualIntelligenceRegistry } from './ContextualIntelligenceRegistry'

/**
 * High-performance Operational Glossary Dictionary
 * Emulates the expert reference desk on a military-grade SOC environment.
 */
export const OPERATIONAL_GLOSSARY = {
  ebpf: {
    term: 'eBPF (Extended Berkeley Packet Filter)',
    definition: 'A revolutionary kernel technology allowing safe, high-performance execution of sandboxed programs inside the operating system kernel. Used in Invify for real-time network-level quarantine isolation.',
    domain: 'Security & Networking'
  },
  tpm: {
    term: 'TPM (Trusted Platform Module)',
    definition: 'A dedicated microcontroller designed to secure hardware by integrating cryptographic keys. Invify leverages TPM attestation to verify bootloader signature rings.',
    domain: 'Hardware Attestation'
  },
  heartbeat: {
    term: 'Heartbeat Signal',
    definition: 'A cyclic telemetry packet emitted by a field device to verify active network presence and report hardware-level health metrics.',
    domain: 'Telemetry Ingestion'
  },
  canary: {
    term: 'Canary Deployment Cohort',
    definition: 'A progressive rollout strategy where new software builds are pushed exclusively to a tiny percentage of nodes (e.g. 1%) to measure stability before full-scale deployment.',
    domain: 'Orchestration & Deployments'
  },
  rca: {
    term: 'Root Cause Analysis (RCA)',
    definition: 'The process of identifying the originating factor of an anomaly or crash. Powered by AI Directed Acyclic Graphs (DAGs) in the Invify Operational Copilot.',
    domain: 'AI Operations'
  },
  drift: {
    term: 'Configuration Drift',
    definition: 'The gradual deviation of an active node environment from its authorized golden configuration baseline (expressed in system policies).',
    domain: 'Governance & Compliance'
  },
  totp: {
    term: 'TOTP (Time-Based One-Time Password)',
    definition: 'A cryptographic algorithm that generates a one-time passcode using the current time as a synchronized seed. Used for strict administrative boundary checks.',
    domain: 'Identity & Access'
  },
  ledgers: {
    term: 'Double-Entry Bookkeeping Ledger',
    definition: 'An accounting system where every transaction is logged as both a debit and a credit, guaranteeing immutable, audit-safe financial balance metrics.',
    domain: 'Billing & Monetization'
  }
}

export const ContextualSearchIndexEngine = {
  /**
   * Search through both the active operational registry and the glossary definitions.
   * Returns a sorted list of matches with calculated relevance weights.
   */
  search(query) {
    if (!query || typeof query !== 'string') return []
    const normalized = query.toLowerCase().trim()
    const results = []

    // 1. Search Registry Modules
    Object.values(ContextualIntelligenceRegistry).forEach((item) => {
      let score = 0
      
      if (item.title.toLowerCase().includes(normalized)) score += 50
      if (item.id.toLowerCase() === normalized) score += 40
      
      // Mode-specific keyword matching
      if (item.operator.toLowerCase().includes(normalized)) score += 10
      if (item.engineering.toLowerCase().includes(normalized)) score += 10
      if (item.ai.toLowerCase().includes(normalized)) score += 15
      if (item.governance.toLowerCase().includes(normalized)) score += 10
      
      // Tag & dependency matches
      if (item.dependencies.some(d => d.toLowerCase().includes(normalized))) score += 15
      if (item.related.some(r => r.toLowerCase().includes(normalized))) score += 10

      if (score > 0) {
        results.push({
          type: 'module',
          id: item.id,
          title: item.title,
          description: item.operator,
          score,
          payload: item
        })
      }
    })

    // 2. Search Glossary Terms
    Object.entries(OPERATIONAL_GLOSSARY).forEach(([key, value]) => {
      let score = 0
      
      if (value.term.toLowerCase().includes(normalized) || key === normalized) score += 60
      if (value.definition.toLowerCase().includes(normalized)) score += 20
      if (value.domain.toLowerCase().includes(normalized)) score += 10

      if (score > 0) {
        results.push({
          type: 'glossary',
          id: key,
          title: value.term,
          description: value.definition,
          score,
          payload: value
        })
      }
    })

    // Sort descending by relevance score
    return results.sort((a, b) => b.score - a.score)
  }
}
