"use strict";
// src/services/financial-verification/hooks/VerificationHookManager.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationHookManager = void 0;
class VerificationHookManager {
    static instance;
    beforeVerificationHooks = [];
    beforeModuleHooks = [];
    afterModuleHooks = [];
    afterVerificationHooks = [];
    onModuleFailureHooks = [];
    constructor() { }
    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationHookManager();
        }
        return this.instance;
    }
    registerBeforeVerification(hook) {
        this.beforeVerificationHooks.push(hook);
    }
    registerBeforeModule(hook) {
        this.beforeModuleHooks.push(hook);
    }
    registerAfterModule(hook) {
        this.afterModuleHooks.push(hook);
    }
    registerAfterVerification(hook) {
        this.afterVerificationHooks.push(hook);
    }
    registerOnModuleFailure(hook) {
        this.onModuleFailureHooks.push(hook);
    }
    async executeBeforeVerification(context) {
        for (const hook of this.beforeVerificationHooks) {
            await hook(context);
        }
    }
    async executeBeforeModule(moduleId, context) {
        for (const hook of this.beforeModuleHooks) {
            await hook(moduleId, context);
        }
    }
    async executeAfterModule(moduleId, result, context) {
        for (const hook of this.afterModuleHooks) {
            await hook(moduleId, result, context);
        }
    }
    async executeAfterVerification(verdict, trace, context) {
        for (const hook of this.afterVerificationHooks) {
            await hook(verdict, trace, context);
        }
    }
    async executeOnModuleFailure(moduleId, error, context) {
        for (const hook of this.onModuleFailureHooks) {
            await hook(moduleId, error, context);
        }
    }
    clear() {
        this.beforeVerificationHooks = [];
        this.beforeModuleHooks = [];
        this.afterModuleHooks = [];
        this.afterVerificationHooks = [];
        this.onModuleFailureHooks = [];
    }
}
exports.VerificationHookManager = VerificationHookManager;
//# sourceMappingURL=VerificationHookManager.js.map