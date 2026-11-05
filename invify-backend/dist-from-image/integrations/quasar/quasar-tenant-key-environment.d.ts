export type QuasarTenantKeyEnvironment = 'live' | 'test';
export declare function resolveQuasarTenantKeyEnvironment(): QuasarTenantKeyEnvironment;
export declare function scopesForQuasarTenantKeyEnvironment(environment: QuasarTenantKeyEnvironment): string[];
