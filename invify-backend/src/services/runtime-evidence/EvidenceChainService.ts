import * as crypto from 'crypto';
import { RuntimeEvidence } from './RuntimeEvidence';

export class EvidenceChainService {
  private static lastHash: string = crypto.createHash('sha256').update('GENESIS-BLOCK').digest('hex');

  static clearChain() {
    this.lastHash = crypto.createHash('sha256').update('GENESIS-BLOCK').digest('hex');
  }

  static linkAndHash(evidence: RuntimeEvidence): RuntimeEvidence {
    evidence.previousHash = this.lastHash;
    
    const hashPayload = JSON.stringify({
      evidenceId: evidence.evidenceId,
      gate: evidence.gate,
      collector: evidence.collector,
      source: evidence.source,
      collectedAt: evidence.collectedAt,
      confidence: evidence.confidence,
      status: evidence.status,
      rawData: evidence.rawData,
      correlationId: evidence.correlationId,
      previousHash: evidence.previousHash
    });

    const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');
    evidence.hash = hash;
    this.lastHash = hash;

    return evidence;
  }

  static getLastHash(): string {
    return this.lastHash;
  }

  static verifyChain(evidences: RuntimeEvidence[]): boolean {
    let currentPrevHash = crypto.createHash('sha256').update('GENESIS-BLOCK').digest('hex');

    for (const ev of evidences) {
      if (ev.previousHash !== currentPrevHash) {
        return false;
      }
      
      const payload = JSON.stringify({
        evidenceId: ev.evidenceId,
        gate: ev.gate,
        collector: ev.collector,
        source: ev.source,
        collectedAt: ev.collectedAt,
        confidence: ev.confidence,
        status: ev.status,
        rawData: ev.rawData,
        correlationId: ev.correlationId,
        previousHash: ev.previousHash
      });

      const recalculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
      if (ev.hash !== recalculatedHash) {
        return false;
      }

      currentPrevHash = ev.hash;
    }

    return true;
  }
}
