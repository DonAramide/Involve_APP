export declare const PASSWORD_MIN_LENGTH = 9;
export interface PasswordPolicyOptions {
    email?: string;
    currentPassword?: string;
}
export interface PasswordPolicyResult {
    ok: boolean;
    errors: string[];
    checks: {
        minLength: boolean;
        uppercase: boolean;
        lowercase: boolean;
        number: boolean;
        special: boolean;
        notWeak: boolean;
        notRepeated: boolean;
        notCurrent: boolean;
    };
}
export declare function evaluatePasswordPolicy(password: string, options?: PasswordPolicyOptions): PasswordPolicyResult;
export declare function assertPasswordPolicy(password: string, options?: PasswordPolicyOptions): PasswordPolicyResult;
