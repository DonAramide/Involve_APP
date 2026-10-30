import { SettlementTemplateMeta, SettlementTemplateType } from './settlement-template.types';
/** Column aliases per template (normalized header → logical field). */
export declare const SETTLEMENT_COLUMN_ALIASES: Record<SettlementTemplateType, Record<string, string[]>>;
export declare const SETTLEMENT_TEMPLATES: SettlementTemplateMeta[];
export declare function isSettlementTemplateType(value: string): value is SettlementTemplateType;
