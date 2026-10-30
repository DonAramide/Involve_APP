export declare class StudentService {
    /**
     * Retrieves an existing virtual account or provisions a new one via Quasar.
     * Requirement: Idempotent and retry-safe.
     */
    static getOrCreateVirtualAccount(studentId: string, schoolId: string): Promise<any>;
}
