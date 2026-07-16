export declare class TerminalInventoryService {
    static getTablets(): Promise<{
        data: any[];
    }>;
    static getMposDevices(): Promise<{
        data: any[];
    }>;
    static getPrinters(): Promise<{
        data: never[];
    }>;
    static getTerminalIds(): Promise<{
        data: any[];
    }>;
    static getAssignments(): Promise<{
        data: any[];
    }>;
    static getAssignmentByDeviceId(deviceId: string): Promise<{
        terminal_id: {
            tid: any;
        };
        mpos: {
            id: any;
            serial_number: any;
            hardware_type: any;
        } | null;
        printer: {
            mac_address: any;
            model: any;
        } | null;
    } | null>;
    static assignHardware(data: any): Promise<any>;
    static unassignHardware(assignmentId: string): Promise<any>;
    static getStats(): Promise<{
        tablets: number;
        mpos: number;
        printers: number;
        tids: number;
        activeAssignments: number;
    }>;
    static bulkImportDecoupled(rows: any[], batchId: string, adminId: string, importType?: string, tenantId?: string): Promise<{
        total: number;
        successful: number;
        failed: number;
        duplicates: number;
        errors: string[];
    }>;
    static updateTablet(id: string, updates: any): Promise<any>;
    static updateMpos(id: string, updates: any): Promise<any>;
    static updatePrinter(id: string, updates: any): Promise<any>;
    static updateTid(id: string, updates: any): Promise<any>;
}
