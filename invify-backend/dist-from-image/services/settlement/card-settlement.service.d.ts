import { SettlementTemplateType, SettlementUploadResult } from './settlement-template.types';
export declare class CardSettlementService {
    static listTemplates(): import("./settlement-template.types").SettlementTemplateMeta[];
    static listBatches(params: {
        tenantId?: string;
        limit?: number;
    }): Promise<any[]>;
    static getBatchDetails(batchId: string): Promise<{
        batch: any;
        matches: any[];
    }>;
    static processUpload(params: {
        buffer: Buffer;
        fileName: string;
        templateType: SettlementTemplateType;
        tenantId?: string | null;
        uploadedBy: {
            id: string;
            email?: string | null;
        };
        dryRun: boolean;
    }): Promise<SettlementUploadResult>;
    private static loadApprovedAttempts;
    private static matchRow;
}
