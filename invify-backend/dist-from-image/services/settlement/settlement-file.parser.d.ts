import { NormalizedSettlementRow, SettlementTemplateType } from './settlement-template.types';
export declare class SettlementFileParser {
    static parseBuffer(buffer: Buffer, templateType: SettlementTemplateType): NormalizedSettlementRow[];
}
