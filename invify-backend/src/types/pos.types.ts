// src/types/pos.types.ts
// Mirrors the Android CardIccDataInfo model used by the Cpoint-Kimono processor.
// These fields are the EMV TLV tags read from the card and packaged into the
// JSON payload sent to connectpoint.app/postcashposwithdrawalkim

export interface CardIccDataInfo {
  // Card Identification
  pan: string;                          // Primary Account Number (masked for logs, full for request)
  track2Data: string;                   // Track 2 equivalent data
  expiryDate: string;                   // YYMM
  expiryMonth: string;
  expiryYear: string;
  cardName: string;                     // Cardholder name
  cardSequenceNumber: string;           // tag 5F34
  maskedPan?: string;

  // EMV Cryptographic Tags
  cryptogram: string;                   // tag 9F26 - Application Cryptogram
  cryptogramInformationData: string;    // tag 9F27
  atc: string;                          // tag 9F36 - Application Transaction Counter
  iad: string;                          // tag 9F10 - Issuer Application Data
  applicationInterchangeProfile: string; // tag 82
  terminalVerificationResult: string;   // tag 95
  unpredictableNumber: string;          // tag 9F37
  terminalCapabilities: string;         // tag 9F33
  terminalType: string;                 // tag 9F35
  cvmResults: string;                   // tag 9F34
  dedicatedFileName: string;            // tag 84 (AID)

  // Transaction Details
  amountAuthorized: string;             // tag 9F02 (in minor units, e.g. kobo)
  amountOther: string;                  // tag 9F03
  transactionCurrencyCode: string;      // tag 5F2A (e.g. "566" for NGN)
  terminalCountryCode: string;          // tag 9F1A (e.g. "566" for Nigeria)
  transactionType: string;              // tag 9C ("00" = purchase)
  transactionDate: string;              // tag 9A (YYMMDD)
  transactionDateTime: string;          // ISO8601 datetime
  transmissionDate: string;
  originalTransmissionDateTime: string;

  // Terminal & Merchant IDs
  terminalId: string;                   // 8-char terminal ID from Kimono params
  merchantId: string;                   // 15-char merchant ID from Kimono params
  uniqueId: string;                     // Kimono unique ID
  merhcantLocation: string;             // Merchant address/location string

  // PIN Block (DUKPT encrypted on-device by mPOS hardware)
  pinBlock: string;                     // DUKPT-encrypted PIN block hex
  ksn: string;                          // Key Serial Number for this transaction
  ksnd: string;                         // KSN descriptor (e.g. "605")
  pinType: string;                      // "Dukpt"

  // Reference Numbers
  retrievalReferenceNumber: string;     // RRN (12 digits)
  rrn: string;
  stan: string;                         // System Trace Audit Number

  // Routing / Processing Metadata
  receivingInstitutionId: string;       // Interswitch institution ID (e.g. "636088")
  destinationAccountNumber: string;     // Settlement account from Kimono params
  fromAccount: string;                  // "Default"
  toAccount: string;

  // Financial
  minorAmount: string;                  // Amount in kobo (amount * 100)
  surcharge: string;                    // "0"
  currencyCode: string;                 // "566"

  // Flags / Status
  posEntryMode: string;                 // "051" = chip + PIN
  posConditionCode: string;             // "00"
  posDataCode: string;
  posGeoCode: string;
  printerStatus: string;                // "1" = printer available
  batteryInformation: string;           // "100" = full
  languageInfo: string;                 // "EN"

  // Interswitch DUKPT key reference
  keyLabel: string;                     // from Kimono params (e.g. "000002")
  extendedTransactionType: string;      // "6104" for cash withdrawal

  // Billing & Account
  accountNo?: string;
  billRefNo?: string;
}

// Parameters returned by /getkimonoparams endpoint
export interface KimonoTerminalParams {
  code: string;                         // "00" = success
  terminalId: string;
  merchantId: string;
  uniqueId: string;
  institutionId: string;
  settlementAccount: string;
  ipek: string;                         // Initial PIN Encryption Key (base64)
  ksn: string;                          // Key Serial Number
  keyLabel: string;
  token: string;
  tmk: string;                          // Terminal Master Key (base64)
  tpk: string;                          // Terminal PIN Key (base64)
  tmk2?: string;
  tpk2?: string;
  tmk3?: string;
  tpk3?: string;
  extendedTransactionType: string;
  currencyCode: string;
  posDataCode: string;
  udfDataList: Array<{ udfCode: string; udfValue: string }>;
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
  
  // Host-specific details (ExpressPay / Kimono / NIBSS / Medusa)
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
  category: string; // Retail, School, Hospitality, etc.
  preferredHosts: Array<'medusa' | 'nibss' | 'kimono' | 'express_pay'>;
  fallbackHosts: Array<'medusa' | 'nibss' | 'kimono' | 'express_pay'>;
  amountThresholds?: Array<{ min: number; max: number; host: 'medusa' | 'nibss' | 'kimono' | 'express_pay' }>;
  transactionTypeRules?: Array<{ txType: string; host: 'medusa' | 'nibss' | 'kimono' | 'express_pay' }>;
}

export interface PosRoutingConfig {
  activeHost: 'medusa' | 'nibss' | 'kimono' | 'express_pay';
  failoverOrder: Array<'medusa' | 'nibss' | 'kimono' | 'express_pay'>;
  splitThresholdNaira: number;
  thresholdRulesMatrix: ThresholdRule[];
  tenantRoutingProfiles: TenantRoutingProfile[];
  hosts: PosHostConfig[];
}

// Normalised response shape returned to mPOS after any route
export interface PosTransactionResult {
  paymentSuccess: boolean;
  statusCode: string;               // "00" = approved, "05" = declined, "96" = system error
  message: string;
  rrn?: string;
  stan?: string;
  maskedPan?: string;
  authCode?: string;
  rawHex?: string;                  // Only for Medusa/NIBSS TCP route
  isoFields?: Record<string, any>;  // Decoded ISO8583 field map (Medusa/NIBSS routes)
  kimonoResponse?: any;             // Full JSON from Cpoint for Kimono route
  host: 'MEDUSA' | 'NIBSS' | 'KIMONO' | 'EXPRESS_PAY';
}

// Shape of each EMV field sent by the mPOS device
// (matches EmvDetailResult from com.demo.mposaisino as observed in device logs)
export interface MposEmvData {
  // Card identity
  pan?: string;                     // normalised alias (may be absent — use cardNo)
  cardNo?: string;                  // Android SDK field name for the PAN
  track2Data?: string;              // e.g. "5366132277281612D2812221012908360F"
  cardExpirationDate?: string;      // YYMM e.g. "2812"
  cardSequenceNumber?: string;      // e.g. "01"
  cardHolderName?: string;          // e.g. "ADEBAYO/KAZEEM/ARAMIDE"
  applicationLabel?: string;        // e.g. "Debit Mastercard"
  aid?: string;                     // tag 84 e.g. "A0000000041010"
  serviceCode?: string;             // e.g. "221"
  acquirerInstitutionId?: string;   // e.g. "536613"
  terminalId?: string;              // e.g. "2CU1F5JG"

  // EMV TLV tags (extracted individually by mPOS SDK)
  appCryptogram?: string;           // tag 9F26 e.g. "C9D04E12B7F3DAC8"
  cryptogramInformationData?: string; // tag 9F27 e.g. "40"
  issuerApplicationData?: string;   // tag 9F10 e.g. "0110600003220000..."
  unpredictableNumber?: string;     // tag 9F37 e.g. "3EEE7872"
  appTransactionCounter?: string;   // tag 9F36 e.g. "00FD"
  terminalVerificationResults?: string; // tag 95 e.g. "0480008800"
  transactionDate?: string;         // tag 9A  e.g. "260525"
  transactionType?: string;         // tag 9C  e.g. "00"
  amountAuthorisedNumeric?: string; // tag 9F02 e.g. "000000012000" (kobo)
  transactionCurrencyCode?: string; // tag 5F2A e.g. "0566"
  applicationInterchangeProfile?: string; // tag 82 e.g. "3900"
  terminalCountryCode?: string;     // tag 9F1A e.g. "0566"
  amountOtherNumeric?: string;      // tag 9F03 e.g. "000000000000"
  cardSequenceNumberTag?: string;   // tag 5F34 e.g. "01"
  dedicatedFileName?: string;       // tag 84  e.g. "A0000000041010"

  // PIN
  pinBlock?: string;                // DUKPT-encrypted PIN block hex e.g. "D1A0E33AF8B5070E"
  ksn?: string;                     // Key Serial Number
  pinType?: string;                 // e.g. "Dukpt"
  pointOfServiceEntryMode?: string; // e.g. "0221"
  pinVerificationValue?: string;    // e.g. "0129"
  cardVerificationValue?: string;   // e.g. "083"
  cvmResult?: string;               // Android SDK alias for cvmResults
  terminalCapabilities?: string;    // tag 9F33 e.g. "1F4000"
  terminalType?: string;            // tag 9F35 e.g. "22"

  // References
  rrn?: string;
  stan?: string;
  transactionTime?: string;

  // Full ICC data blob (concatenated TLV hex assembled by mPOS)
  iccData?: string;

  // For Medusa/NIBSS TCP route only
  packedIsoMessage?: string;        // Full ISO8583 message in hex
  serverIP?: string;
  port?: number;

  // Misc
  merchantLocation?: string;
  minorAmount?: string | number;    // Already-converted kobo amount
  amount?: number;                  // Naira amount (used if minorAmount is absent)
}
