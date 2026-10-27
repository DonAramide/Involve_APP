export type SubjectType = 'student' | 'staff' | 'admin';
export type CardStatus = 'pending' | 'active' | 'revoked';
export type RevokeKind = 'replaced' | 'retired';
export type TemplateKey =
  | 'classic_school'
  | 'modern_corporate'
  | 'minimal_white'
  | 'academic_blue'
  | 'premium_identity'
  | 'compact_barcode';

export const TEMPLATE_KEYS: TemplateKey[] = [
  'classic_school',
  'modern_corporate',
  'minimal_white',
  'academic_blue',
  'premium_identity',
  'compact_barcode',
];

export const DEFAULT_DISCLAIMER =
  'This card remains the property of the issuing institution. It must be presented when requested by authorized school personnel. If found, please return it to the issuing institution. Unauthorized use, alteration, or transfer is prohibited.';

export interface CardActor {
  id?: string;
  role?: string | null;
  tenantId?: string | null;
  email?: string | null;
}

export interface TenantBrief {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
}

export interface StudentRow {
  id: string;
  tenantId: string | null;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClass: string | null;
}

export interface StaffRow {
  id: string;
  tenantId: string;
  name: string;
  staffCode: string | null;
  role: string | null;
  isActive: boolean;
}

export interface UserRow {
  id: string;
  tenantId: string | null;
  role: string;
  isActive: boolean;
  name: string | null;
  email: string;
}

export interface SettingsRow {
  tenantId: string;
  studentTemplate: TemplateKey;
  staffTemplate: TemplateKey;
  adminTemplate: TemplateKey;
  paperSize: 'A4' | 'Letter' | 'CR80';
  cardWidthMm: number;
  cardHeightMm: number;
  printOrientation: 'portrait' | 'landscape';
  logoPlacement: 'left' | 'center' | 'right';
  accentColor: string;
  showAddress: boolean;
  showClassOrDepartment: boolean;
  showStatus: boolean;
  showIssueDate: boolean;
  showExpiry: boolean;
  disclaimer: string;
  signatureImageUrl: string | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
  lostFoundPhone: string | null;
  lostFoundEmail: string | null;
  notifyStudentArrival: boolean;
  notifyStudentDeparture: boolean;
  notifyStaffArrival: boolean;
  notifyStaffDeparture: boolean;
  trackAdminEntry: boolean;
  duplicateScanWindowSeconds: number;
  updatedBy: string;
}

export interface CardRow {
  id: string;
  tenantId: string;
  subjectType: SubjectType;
  studentId: string | null;
  staffId: string | null;
  adminUserId: string | null;
  tokenSha256: string;
  status: CardStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeKind: RevokeKind | null;
  replacesCardId: string | null;
  printedName: string;
  printedCode: string;
  printedDetail: string | null;
  category: 'STUDENT' | 'STAFF' | 'ADMIN';
  issuedBy: string;
}

export interface AuditRow {
  id: string;
  tenantId: string;
  actorUserId: string;
  action: 'settings_saved' | 'card_issued' | 'card_revoked';
  cardId: string | null;
  reason: string | null;
  occurredAt: string;
}

export interface PublicCard {
  id: string;
  subjectType: SubjectType;
  subjectId: string;
  status: CardStatus;
  category: 'STUDENT' | 'STAFF' | 'ADMIN';
  printedName: string;
  printedCode: string;
  printedDetail: string | null;
  issuedAt: string;
  expiresAt: string | null;
  revokeKind: RevokeKind | null;
}

export interface CardFace {
  pairId: string;
  templateKey: TemplateKey;
  schoolName: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  photoUrl: null;
  initials: string;
  fullName: string;
  printedCode: string;
  detail: string | null;
  category: 'STUDENT' | 'STAFF' | 'ADMIN';
  statusLabel: string | null;
  barcodeValue: string | null;
  barcodeState: 'ready' | 'not_issued' | 'replacement_required';
  issuedAt: string | null;
  expiresAt: string | null;
  disclaimer: string;
  signatoryName: string | null;
  signatoryDesignation: string | null;
  signatureUrl: string | null;
  lostFoundPhone: string | null;
  lostFoundEmail: string | null;
  logoPlacement: SettingsRow['logoPlacement'];
  accentColor: string;
  cardWidthMm: number;
  cardHeightMm: number;
  paperSize: SettingsRow['paperSize'];
  showIssueDate: boolean;
  showExpiry: boolean;
}

export interface IssuedCardResult {
  card: PublicCard;
  face: CardFace;
  barcodeValue: string;
}
