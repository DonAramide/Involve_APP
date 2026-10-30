import { Request, Response } from 'express';
/**
 * School-mode Web Sync: push local SQLite academic entities to Supabase
 * so invify-admin tenant pages can show students / academics / roster.
 */
export declare class SchoolSyncController {
    /**
     * POST /api/school/bulk-sync
     * Body: { years, terms, classes, teachers, subjects, students, results }
     */
    static bulkSync(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/school/roster
     * Returns synced school entities + students for the tenant.
     */
    static getRoster(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/school/billing
     * Fee catalog plus term bills already stored for this school.
     * School fees are saved as service items, so this is not the product search.
     */
    static getBilling(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Keep one row per admission number (or name+class). Prefer richer / newer rows. */
    private static dedupeStudents;
    private static ensureSchoolRow;
    /** Returns true when school_entities is queryable. */
    private static ensureEntitiesTable;
    private static upsertEntities;
    private static upsertStudents;
    /** Mirror parent VAs (canonical + legacy) as customers so webhooks prefer par-* ids. */
    private static upsertParentCustomers;
}
