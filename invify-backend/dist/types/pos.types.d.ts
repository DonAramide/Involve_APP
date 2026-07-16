export interface CardIccDataInfo {
    pan: string;
    track2Data: string;
    expiryDate: string;
    expiryMonth: string;
    expiryYear: string;
    cardName: string;
    cardSequenceNumber: string;
    maskedPan?: string;
    cryptogram: string;
    cryptogramInformationData: string;
    atc: string;
    iad: string;
    applicationInterchangeProfile: string;
    terminalVerificationResult: string;
    unpredictableNumber: string;
    terminalCapabilities: string;
    terminalType: string;
    cvmResults: string;
    dedicatedFileName: string;
    amountAuthorized: string;
    amountOther: string;
    transactionCurrencyCode: string;
    terminalCountryCode: string;
    transactionType: string;
    transactionDate: string;
    transactionDateTime: string;
    transmissionDate: string;
    originalTransmissionDateTime: string;
    terminalId: string;
    merchantId: string;
    uniqueId: string;
    merhcantLocation: string;
    pinBlock: string;
    ksn: string;
    ksnd: string;
    pinType: string;
    retrievalReferenceNumber: string;
    rrn: string;
    stan: string;
    receivingInstitutionId: string;
    destinationAccountNumber: string;
    fromAccount: string;
    toAccount: string;
    minorAmount: string;
    surcharge: string;
    currencyCode: string;
    posEntryMode: string;
    posConditionCode: string;
    posDataCode: string;
    posGeoCode: string;
    printerStatus: string;
    batteryInformation: string;
    languageInfo: string;
    keyLabel: string;
    extendedTransactionType: string;
    accountNo?: string;
    billRefNo?: string;
}
export interface KimonoTerminalParams {
    code: string;
    terminalId: string;
    merchantId: string;
    uniqueId: string;
    institutionId: string;
    settlementAccount: string;
    ipek: string;
    ksn: string;
    keyLabel: string;
    token: string;
    tmk: string;
    tpk: string;
    tmk2?: string;
    tpk2?: string;
    tmk3?: string;
    tpk3?: string;
    extendedTransactionType: string;
    currencyCode: string;
    posDataCode: string;
    udfDataList: Array<{
        udfCode: string;
        udfValue: string;
    }>;
    lastUpdateDate?: string;
}
export interface SslCertMetadata {
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
    serialNumber: string;
    fingerprint: string;
}
export interface PosHostConfig {
    hostName: string;
    hostCode: 'medusa' | 'nibss' | 'kimono' | 'express_pay';
    ip: string;
    port: number;
    sslEnabled: boolean;
    sslCertMetadata: SslCertMetadata | null;
    timeoutSeconds: number;
    priority: number;
    failoverPriority: number;
    healthScore: number;
    status: 'ONLINE' | 'OFFLINE';
    thresholdMin: number;
    thresholdMax: number;
    supportedCardSchemes: string[];
    supportedTerminalTypes: string[];
    supportedTenantCategories: string[];
    supportedTransactionTypes: string[];
    isActive: boolean;
    baseUrl?: string;
    authToken?: string;
    merchantCode?: string;
    terminalGroup?: string;
    sslProfile?: string;
    transactionPath?: string;
    paramsPath?: string;
    kimonoIp?: string;
    kimonoPort?: number;
    kimonoSSL?: boolean;
    kimonoKeys?: {
        masterKey: string;
        pinKey: string;
    };
    kimonoFallbackParameters?: {
        merchantId: string;
        uniqueId: string;
        institutionId: string;
        settlementAccount: string;
        keyLabel: string;
        token: string;
    };
    nibssConfig?: {
        institutionCode: string;
        terminalId: string;
        merchantId: string;
        ctmk: string;
        ptspCode: string;
    };
}
export interface ThresholdRule {
    minAmount: number;
    maxAmount: number;
    preferredHost: 'medusa' | 'nibss' | 'kimono' | 'express_pay';
}
export interface TenantRoutingProfile {
    profileId?: string;
    scopeType?: string;
    targetValue?: string;
    processOnDevice?: boolean;
    webhookUrl?: string;
    category: string;
    preferredHosts: Array<'medusa' | 'nibss' | 'kimono' | 'express_pay'>;
    fallbackHosts: Array<'medusa' | 'nibss' | 'kimono' | 'express_pay'>;
    amountThresholds?: Array<{
        min: number;
        max: number;
        host: 'medusa' | 'nibss' | 'kimono' | 'express_pay';
    }>;
    transactionTypeRules?: Array<{
        txType: string;
        host: 'medusa' | 'nibss' | 'kimono' | 'express_pay';
    }>;
}
export interface PosRoutingConfig {
    activeHost: 'medusa' | 'nibss' | 'kimono' | 'express_pay';
    failoverOrder: Array<'medusa' | 'nibss' | 'kimono' | 'express_pay'>;
    splitThresholdNaira: number;
    thresholdRulesMatrix: ThresholdRule[];
    tenantRoutingProfiles: TenantRoutingProfile[];
    hosts: PosHostConfig[];
}
export interface PosTransactionResult {
    paymentSuccess: boolean;
    statusCode: string;
    message: string;
    rrn?: string;
    stan?: string;
    maskedPan?: string;
    authCode?: string;
    rawHex?: string;
    isoFields?: Record<string, any>;
    kimonoResponse?: any;
    host: 'MEDUSA' | 'NIBSS' | 'KIMONO' | 'EXPRESS_PAY';
}
export interface MposEmvData {
    pan?: string;
    cardNo?: string;
    track2Data?: string;
    cardExpirationDate?: string;
    cardSequenceNumber?: string;
    cardHolderName?: string;
    applicationLabel?: string;
    aid?: string;
    serviceCode?: string;
    acquirerInstitutionId?: string;
    terminalId?: string;
    appCryptogram?: string;
    cryptogramInformationData?: string;
    issuerApplicationData?: string;
    unpredictableNumber?: string;
    appTransactionCounter?: string;
    terminalVerificationResults?: string;
    transactionDate?: string;
    transactionType?: string;
    amountAuthorisedNumeric?: string;
    transactionCurrencyCode?: string;
    applicationInterchangeProfile?: string;
    terminalCountryCode?: string;
    amountOtherNumeric?: string;
    cardSequenceNumberTag?: string;
    dedicatedFileName?: string;
    pinBlock?: string;
    ksn?: string;
    pinType?: string;
    pointOfServiceEntryMode?: string;
    pinVerificationValue?: string;
    cardVerificationValue?: string;
    cvmResult?: string;
    terminalCapabilities?: string;
    terminalType?: string;
    rrn?: string;
    stan?: string;
    transactionTime?: string;
    iccData?: string;
    packedIsoMessage?: string;
    serverIP?: string;
    port?: number;
    merchantLocation?: string;
    minorAmount?: string | number;
    amount?: number;
}
