import { Request, Response, NextFunction } from 'express';
export type GuardianCapability = 'can_view_coverage' | 'can_view_premiums' | 'can_pay_premiums' | 'can_manage_enrolment';
/**
 * Object-level guard for parents/guardians accessing linked child health records.
 */
export declare function requireGuardianLink(capability?: GuardianCapability): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
