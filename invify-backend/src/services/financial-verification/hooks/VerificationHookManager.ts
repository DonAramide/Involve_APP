// src/services/financial-verification/hooks/VerificationHookManager.ts

import { BeforeVerificationHook } from "./BeforeVerificationHook";
import { BeforeModuleHook } from "./BeforeModuleHook";
import { AfterModuleHook } from "./AfterModuleHook";
import { AfterVerificationHook } from "./AfterVerificationHook";
import { VerificationContext } from "../shared/VerificationContext";
import { VerificationResult, VerificationVerdict, VerificationTrace } from "../shared/interfaces";

export class VerificationHookManager {
  private static instance: VerificationHookManager;

  private beforeVerificationHooks: BeforeVerificationHook[] = [];
  private beforeModuleHooks: BeforeModuleHook[] = [];
  private afterModuleHooks: AfterModuleHook[] = [];
  private afterVerificationHooks: AfterVerificationHook[] = [];
  private onModuleFailureHooks: Array<(moduleId: string, error: string, context: VerificationContext) => Promise<void> | void> = [];

  private constructor() {}

  public static getInstance(): VerificationHookManager {
    if (!this.instance) {
      this.instance = new VerificationHookManager();
    }
    return this.instance;
  }

  public registerBeforeVerification(hook: BeforeVerificationHook): void {
    this.beforeVerificationHooks.push(hook);
  }

  public registerBeforeModule(hook: BeforeModuleHook): void {
    this.beforeModuleHooks.push(hook);
  }

  public registerAfterModule(hook: AfterModuleHook): void {
    this.afterModuleHooks.push(hook);
  }

  public registerAfterVerification(hook: AfterVerificationHook): void {
    this.afterVerificationHooks.push(hook);
  }

  public registerOnModuleFailure(hook: (moduleId: string, error: string, context: VerificationContext) => Promise<void> | void): void {
    this.onModuleFailureHooks.push(hook);
  }

  public async executeBeforeVerification(context: VerificationContext): Promise<void> {
    for (const hook of this.beforeVerificationHooks) {
      await hook(context);
    }
  }

  public async executeBeforeModule(moduleId: string, context: VerificationContext): Promise<void> {
    for (const hook of this.beforeModuleHooks) {
      await hook(moduleId, context);
    }
  }

  public async executeAfterModule(moduleId: string, result: VerificationResult, context: VerificationContext): Promise<void> {
    for (const hook of this.afterModuleHooks) {
      await hook(moduleId, result, context);
    }
  }

  public async executeAfterVerification(verdict: VerificationVerdict, trace: VerificationTrace, context: VerificationContext): Promise<void> {
    for (const hook of this.afterVerificationHooks) {
      await hook(verdict, trace, context);
    }
  }

  public async executeOnModuleFailure(moduleId: string, error: string, context: VerificationContext): Promise<void> {
    for (const hook of this.onModuleFailureHooks) {
      await hook(moduleId, error, context);
    }
  }

  public clear(): void {
    this.beforeVerificationHooks = [];
    this.beforeModuleHooks = [];
    this.afterModuleHooks = [];
    this.afterVerificationHooks = [];
    this.onModuleFailureHooks = [];
  }
}
