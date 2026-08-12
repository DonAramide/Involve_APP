import { SettlementTemplateMeta, SettlementTemplateType } from './settlement-template.types';

/** Column aliases per template (normalized header → logical field). */
export const SETTLEMENT_COLUMN_ALIASES: Record<
  SettlementTemplateType,
  Record<string, string[]>
> = {
  UPSL_T1_NIBSS: {
    rrn: ['ACQUIRERREFERENCENUMBER', 'TRANNUMBER', 'TRANSACTION ID'],
    stan: ['TRANNUMBER', 'INVOICENUM'],
    terminalId: ['TERMINALID', 'RETAILER ID'],
    amount: ['TRANAMOUNT', 'LCY AMOUNT DUE MERCHANT', 'ORIGINALAMOUNT'],
    authCode: ['APPROVAL CODE'],
    settlementDate: ['SETTLEMENT DATE', 'TRANSACTION DATETIME'],
    processorRef: ['UPHSS_TRANSREF', 'UPHSS'],
    maskedPan: ['MASKEDPAN'],
  },
  ONEVIEW_T1_NIBSS: {
    rrn: ['RETRIEVAL_REFERENCE_NR', 'RETRIEVAL REFERENCE NR'],
    stan: ['STAN'],
    terminalId: ['TERMINAL_ID', 'TERMINAL ID'],
    amount: ['TRAN_AMOUNT_RSP', 'TRAN AMOUNT RSP', 'TRAN_AMOUNT_REQ', 'TRAN AMOUNT REQ', 'AMOUNT_IMPACT'],
    authCode: ['AUTH_ID', 'AUTH ID'],
    settlementDate: ['DATETIME', 'LOCAL_DATE_TIME', 'LOCAL DATE TIME'],
    processorRef: ['TRAN_ID', 'TRAN ID'],
    maskedPan: ['PAN'],
  },
  NIBSS_REXCONNECT: {
    rrn: ['RRN'],
    stan: ['STAN'],
    terminalId: ['TERMINAL ID', 'TERMINAL_ID'],
    amount: ['AMOUNT'],
    authCode: ['AUTH CODE', 'AUTH_CODE'],
    settlementDate: ['CREATION DATE', 'CREATION_DATE'],
    processorRef: ['TRANSACTION ID', 'TRANSACTION_ID'],
    maskedPan: ['PAN/ACCOUNT', 'PAN', 'PAN ACCOUNT'],
  },
  ONEVIEW_INSTANT: {
    rrn: ['RETRIEVAL_REFERENCE_NR', 'RETRIEVAL REFERENCE NR'],
    stan: ['STAN'],
    terminalId: ['TERMINAL_ID', 'TERMINAL ID'],
    amount: ['TRAN_AMOUNT_RSP', 'TRAN AMOUNT RSP', 'TRAN_AMOUNT_REQ', 'AMOUNT_IMPACT'],
    authCode: ['AUTH_ID', 'AUTH ID'],
    settlementDate: ['DATETIME', 'LOCAL_DATE_TIME'],
    processorRef: ['TRAN_ID', 'TRAN ID'],
    maskedPan: ['PAN', 'CARD_ACCOUNT_NR'],
  },
  ANP_CARD_WITHDRAWAL: {
    rrn: ['RRN'],
    stan: ['STAN'],
    terminalId: ['TERMINAL ID', 'TERMINAL_ID', 'TERMINAL Id'],
    amount: ['AMOUNT'],
    authCode: ['TRANS REFERENCE', 'TRANS_REFERENCE'],
    settlementDate: ['DATE OF TRANSACTION', 'DATE_OF_TRANSACTION'],
    processorRef: ['TRAN REF NO', 'TRAN_REF_NO'],
    maskedPan: ['PAN'],
  },
};

export const SETTLEMENT_TEMPLATES: SettlementTemplateMeta[] = [
  {
    id: 'UPSL_T1_NIBSS',
    label: 'UPSL T+1 (NIBSS Routed)',
    description: 'T+1 settlement report for UPSL NIBSS-routed card transactions.',
    processor: 'UPSL',
    settlementTiming: 'T+1',
  },
  {
    id: 'ONEVIEW_T1_NIBSS',
    label: 'OneView T+1 (Interswitch NIBSS)',
    description: 'T+1 OneView settlement for Interswitch NIBSS-routed transactions.',
    processor: 'Interswitch OneView',
    settlementTiming: 'T+1',
  },
  {
    id: 'NIBSS_REXCONNECT',
    label: 'NIBSS & RexConnect',
    description: 'NIBSS and RexConnect combined transaction report.',
    processor: 'NIBSS / RexConnect',
    settlementTiming: 'VARIABLE',
  },
  {
    id: 'ONEVIEW_INSTANT',
    label: 'OneView Instant Settlement',
    description: 'Instant settlement report from Interswitch OneView.',
    processor: 'Interswitch OneView',
    settlementTiming: 'INSTANT',
  },
  {
    id: 'ANP_CARD_WITHDRAWAL',
    label: 'ANP Card Withdrawal',
    description: 'ANP card withdrawal / POS settlement report.',
    processor: 'ANP',
    settlementTiming: 'VARIABLE',
  },
];

export function isSettlementTemplateType(value: string): value is SettlementTemplateType {
  return SETTLEMENT_TEMPLATES.some((t) => t.id === value);
}
