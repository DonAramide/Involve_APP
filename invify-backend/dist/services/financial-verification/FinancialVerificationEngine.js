"use strict";
// src/services/financial-verification/FinancialVerificationEngine.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialVerificationEngine = void 0;
const crypto = __importStar(require("crypto"));
const VerificationDomainRegistry_1 = require("./registry/VerificationDomainRegistry");
const VerificationModuleRegistry_1 = require("./registry/VerificationModuleRegistry");
const VerificationPolicyRegistry_1 = require("./registry/VerificationPolicyRegistry");
const VerificationMetricsCollector_1 = require("./metrics/VerificationMetricsCollector");
// Import modules from the standardized modules path
const TreasuryVerificationService_1 = require("./modules/treasury/TreasuryVerificationService");
const WalletVerificationService_1 = require("./modules/wallet/WalletVerificationService");
const LiquidityVerificationService_1 = require("./modules/liquidity/LiquidityVerificationService");
const SettlementVerificationService_1 = require("./modules/settlement/SettlementVerificationService");
const ReconciliationVerificationService_1 = require("./modules/reconciliation/ReconciliationVerificationService");
const FinancialEventVerificationService_1 = require("./modules/events/FinancialEventVerificationService");
const RiskVerificationService_1 = require("./modules/risk/RiskVerificationService");
const VerificationRegistryService_1 = require("./modules/registry/VerificationRegistryService");
const ProviderResponseVerificationService_1 = require("./modules/provider/ProviderResponseVerificationService");
class FinancialVerificationEngine {
    registry;
    hooks = {
        BeforeVerification: [],
        BeforeModule: [],
        AfterModule: [],
        OnModuleFailure: [],
        AfterVerification: []
    };
    constructor() {
        this.registry = VerificationDomainRegistry_1.VerificationDomainRegistry.getInstance();
        // Register all default services in the Module Registry
        const moduleRegistry = VerificationModuleRegistry_1.VerificationModuleRegistry.getInstance();
        moduleRegistry.registerModule(new TreasuryVerificationService_1.TreasuryVerificationService());
        moduleRegistry.registerModule(new WalletVerificationService_1.WalletVerificationService());
        moduleRegistry.registerModule(new LiquidityVerificationService_1.LiquidityVerificationService());
        moduleRegistry.registerModule(new SettlementVerificationService_1.SettlementVerificationService());
        moduleRegistry.registerModule(new ReconciliationVerificationService_1.ReconciliationVerificationService());
        moduleRegistry.registerModule(new FinancialEventVerificationService_1.FinancialEventVerificationService());
        moduleRegistry.registerModule(new RiskVerificationService_1.RiskVerificationService());
        moduleRegistry.registerModule(new VerificationRegistryService_1.VerificationRegistryService());
        moduleRegistry.registerModule(new ProviderResponseVerificationService_1.ProviderResponseVerificationService());
    }
    // Hook Registration API
    addHook(event, fn) {
        this.hooks[event].push(fn);
    }
    clearHooks() {
        this.hooks = {
            BeforeVerification: [],
            BeforeModule: [],
            AfterModule: [],
            OnModuleFailure: [],
            AfterVerification: []
        };
    }
    async execute(context, domain, policy) {
        const totalStart = Date.now();
        const verificationId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const traceEntries = [];
        const executedChecks = [];
        const warnings = [];
        const errors = [];
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
        const policyConfig = VerificationPolicyRegistry_1.VerificationPolicyRegistry.getInstance().getPolicy(domain, policy);
        const policyVersion = policyConfig ? `${policyConfig.policyName}_v1` : 'unknown_v1';
        let order = 1;
        for (const mod of modules) {
            // Run BeforeModule Hooks
            for (const hook of this.hooks.BeforeModule) {
                await hook(mod.moduleId, context);
            }
            const start = Date.now();
            let outcome = 'PASSED';
            let errorMsg;
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
            }
            catch (err) {
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
        const verdict = {
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
        const trace = {
            traceId: verificationId,
            correlationId: context.correlationId,
            timestamp,
            entries: traceEntries,
            decision
        };
        // Record metrics in metrics collector
        VerificationMetricsCollector_1.VerificationMetricsCollector.getInstance().recordMetric(verificationId, {
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
exports.FinancialVerificationEngine = FinancialVerificationEngine;
//# sourceMappingURL=FinancialVerificationEngine.js.map