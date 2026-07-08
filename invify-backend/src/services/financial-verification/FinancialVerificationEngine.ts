// src/services/financial-verification/FinancialVerificationEngine.ts

import * as crypto from "crypto";
import { VerificationContext } from "./shared/VerificationContext";
import { 
  VerificationDomainType, 
  VerificationPolicyType, 
  VerificationVerdict, 
  VerificationTrace, 
  VerificationTraceEntry,
  VerificationResult
} from "./shared/interfaces";
import { VerificationDomainRegistry } from "./registry/VerificationDomainRegistry";
import { VerificationModuleRegistry } from "./registry/VerificationModuleRegistry";
import { VerificationPolicyRegistry } from "./registry/VerificationPolicyRegistry";
import { VerificationMetricsCollector } from "./metrics/VerificationMetricsCollector";

// Import modules from the standardized modules path
import { TreasuryVerificationService } from "./modules/treasury/TreasuryVerificationService";
import { WalletVerificationService } from "./modules/wallet/WalletVerificationService";
import { LiquidityVerificationService } from "./modules/liquidity/LiquidityVerificationService";
import { SettlementVerificationService } from "./modules/settlement/SettlementVerificationService";
import { ReconciliationVerificationService } from "./modules/reconciliation/ReconciliationVerificationService";
import { FinancialEventVerificationService } from "./modules/events/FinancialEventVerificationService";
import { RiskVerificationService } from "./modules/risk/RiskVerificationService";
import { VerificationRegistryService } from "./modules/registry/VerificationRegistryService";
import { ProviderResponseVerificationService } from "./modules/provider/ProviderResponseVerificationService";

export class FinancialVerificationEngine {
  private registry: VerificationDomainRegistry;
  private hooks: {
    BeforeVerification: Array<(context: VerificationContext) => Promise<void> | void>;
    BeforeModule: Array<(moduleId: string, context: VerificationContext) => Promise<void> | void>;
    AfterModule: Array<(moduleId: string, result: VerificationResult, context: VerificationContext) => Promise<void> | void>;
    OnModuleFailure: Array<(moduleId: string, error: string, context: VerificationContext) => Promise<void> | void>;
    AfterVerification: Array<(verdict: VerificationVerdict, trace: VerificationTrace, context: VerificationContext) => Promise<void> | void>;
  } = {
    BeforeVerification: [],
    BeforeModule: [],
    AfterModule: [],
    OnModuleFailure: [],
    AfterVerification: []
  };

  constructor() {
    this.registry = VerificationDomainRegistry.getInstance();
    
    // Register all default services in the Module Registry
    const moduleRegistry = VerificationModuleRegistry.getInstance();
    moduleRegistry.registerModule(new TreasuryVerificationService());
    moduleRegistry.registerModule(new WalletVerificationService());
    moduleRegistry.registerModule(new LiquidityVerificationService());
    moduleRegistry.registerModule(new SettlementVerificationService());
    moduleRegistry.registerModule(new ReconciliationVerificationService());
    moduleRegistry.registerModule(new FinancialEventVerificationService());
    moduleRegistry.registerModule(new RiskVerificationService());
    moduleRegistry.registerModule(new VerificationRegistryService());
    moduleRegistry.registerModule(new ProviderResponseVerificationService());
  }

  // Hook Registration API
  public addHook(event: keyof typeof this.hooks, fn: any): void {
    this.hooks[event].push(fn);
  }

  public clearHooks(): void {
    this.hooks = {
      BeforeVerification: [],
      BeforeModule: [],
      AfterModule: [],
      OnModuleFailure: [],
      AfterVerification: []
    };
  }

  public async execute(
    context: VerificationContext,
    domain: VerificationDomainType,
    policy: VerificationPolicyType
  ): Promise<{ verdict: VerificationVerdict; trace: VerificationTrace }> {
    const totalStart = Date.now();
    const verificationId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const traceEntries: VerificationTraceEntry[] = [];
    const executedChecks: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Metrics counters
    let totalDbQueries = 0;
    let totalCacheHits = 0;
    let totalExternalCalls = 0;

    // 1. Run BeforeVerification Hooks
    for (const hook of this.hooks.BeforeVerification) {
      await hook(context);
    }

    let overallPassed = true;
    const modules = this.registry.getModulesForPolicy(domain, policy);
    const policyConfig = VerificationPolicyRegistry.getInstance().getPolicy(domain, policy);
    const policyVersion = policyConfig ? `${policyConfig.policyName}_v1` : 'unknown_v1';

    let order = 1;
    for (const mod of modules) {
      // Run BeforeModule Hooks
      for (const hook of this.hooks.BeforeModule) {
        await hook(mod.moduleId, context);
      }

      const start = Date.now();
      let outcome: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
      let errorMsg: string | undefined;
      let checkPassed = false;

      if (!overallPassed && mod.mandatory) {
        // Skip subsequent modules if previous failed
        outcome = 'SKIPPED';
        traceEntries.push({
          order,
          moduleName: mod.moduleId,
          durationMs: 0,
          outcome,
          recommendation: `Skipped due to prior validation failures`
        });
        order++;
        continue;
      }

      try {
        const result = await mod.verify(context);
        checkPassed = result.passed;
        
        // Aggregate metrics if provided
        if (result.metrics) {
          totalDbQueries += result.metrics.dbQueries || 0;
          totalCacheHits += result.metrics.cacheHits || 0;
          totalExternalCalls += result.metrics.externalCalls || 0;
        }

        if (result.warning) {
          warnings.push(`${mod.moduleId}: ${result.warning}`);
        }
        if (!checkPassed) {
          outcome = 'FAILED';
          errorMsg = result.error || 'Validation failed';
          errors.push(`${mod.moduleId}: ${errorMsg}`);
          overallPassed = false;

          // Run OnModuleFailure Hooks
          for (const hook of this.hooks.OnModuleFailure) {
            await hook(mod.moduleId, errorMsg, context);
          }
        }

        // Run AfterModule Hooks
        for (const hook of this.hooks.AfterModule) {
          await hook(mod.moduleId, result, context);
        }
      } catch (err: any) {
        outcome = 'FAILED';
        const errMsg = err.message || 'Unknown error';
        errorMsg = errMsg;
        errors.push(`${mod.moduleId} error: ${errMsg}`);
        overallPassed = false;

        // Run OnModuleFailure Hooks
        for (const hook of this.hooks.OnModuleFailure) {
          await hook(mod.moduleId, errMsg, context);
        }
      }

      const durationMs = Date.now() - start;
      executedChecks.push(mod.moduleId);

      traceEntries.push({
        order,
        moduleName: mod.moduleId,
        durationMs,
        outcome,
        failureReason: errorMsg,
        recommendation: checkPassed ? 'PASS' : `Investigate ${mod.moduleId} check failure`
      });

      order++;
    }

    const decision = overallPassed ? 'ALLOW' : 'REJECT';
    const totalExecutionTimeMs = Date.now() - totalStart;

    // Collect cache hits from context cache
    const contextCache = context.getCache();
    totalCacheHits += contextCache.getStats().hits;
    totalDbQueries += contextCache.getStats().misses;

    const verdict: VerificationVerdict = {
      verificationId,
      correlationId: context.correlationId,
      timestamp,
      passed: overallPassed,
      decision,
      severity: overallPassed ? 'INFO' : 'ERROR',
      riskScore: overallPassed ? 0.0 : 1.0,
      executedChecks,
      warnings,
      errors,
      verificationVersion: '2.1.0',
      policyVersion,
      modules: modules.map(m => ({ module: m.moduleId, version: m.version }))
    };

    const trace: VerificationTrace = {
      traceId: verificationId,
      correlationId: context.correlationId,
      timestamp,
      entries: traceEntries,
      decision
    };

    // Record metrics in metrics collector
    VerificationMetricsCollector.getInstance().recordMetric(verificationId, {
      totalExecutionTimeMs,
      dbQueriesCount: totalDbQueries,
      cacheHitsCount: totalCacheHits,
      externalCallsCount: totalExternalCalls,
      warningsCount: warnings.length,
      errorsCount: errors.length
    });

    // 2. Run AfterVerification Hooks
    for (const hook of this.hooks.AfterVerification) {
      await hook(verdict, trace, context);
    }

    return { verdict, trace };
  }
}
