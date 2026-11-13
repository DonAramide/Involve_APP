import { SchoolCardStore } from './school-card.store';
import { SchoolSignatureUploader } from './school-card.signature';
import { CardActor, CardFace, IssuedCardResult, PublicCard, SettingsRow, SubjectType, TEMPLATE_KEYS } from './school-card.types';
export interface SubjectRequest {
    subjectType?: unknown;
    subjectId?: unknown;
    expiresAt?: unknown;
    printedName?: unknown;
    printedCode?: unknown;
    tenantId?: unknown;
}
export declare class SchoolCardService {
    private readonly store;
    private readonly signatureUploader;
    constructor(store: SchoolCardStore, signatureUploader?: SchoolSignatureUploader | null);
    templates(actor: CardActor | undefined): typeof TEMPLATE_KEYS;
    getSettings(actor: CardActor | undefined): SettingsRow;
    saveSettings(actor: CardActor | undefined, patch: Partial<SettingsRow>): SettingsRow;
    listEligible(actor: CardActor | undefined): {
        students: {
            subjectType: SubjectType;
            subjectId: string;
            name: string;
            printedCode: string;
            detail: string | null;
            cardStatus: string;
            activeCardId: string | null;
        }[];
        staff: {
            subjectType: SubjectType;
            subjectId: string;
            name: string;
            printedCode: string;
            detail: string | null;
            cardStatus: string;
            activeCardId: string | null;
        }[];
        administrators: {
            subjectType: SubjectType;
            subjectId: string;
            name: string;
            printedCode: string;
            detail: string | null;
            cardStatus: string;
            activeCardId: string | null;
        }[];
    };
    listCards(actor: CardActor | undefined): PublicCard[];
    preview(actor: CardActor | undefined, request: SubjectRequest): CardFace;
    issue(actor: CardActor | undefined, request: SubjectRequest): IssuedCardResult;
    replace(actor: CardActor | undefined, cardId: string): IssuedCardResult;
    revoke(actor: CardActor | undefined, cardId: string, reason: unknown): PublicCard;
    batch(actor: CardActor | undefined, people: SubjectRequest[]): IssuedCardResult[];
    acceptSignature(actor: CardActor | undefined, image: unknown): Promise<{
        signatureImageUrl: string;
    }>;
    myCard(actor: CardActor | undefined): {
        card: PublicCard | null;
        barcodeAvailable: false;
        message: string;
    };
    signatureUnavailable(actor: CardActor | undefined): never;
    lookupToken(actor: CardActor | undefined, rawToken: unknown): PublicCard | null;
    private persistNewCard;
    private tokenFor;
    private requireManager;
    private identity;
    private identityFromCard;
    private activeCard;
    private latestRetired;
    private cardRow;
    private face;
    private eligiblePerson;
}
export declare function createSchoolCardService(store: SchoolCardStore, signatureUploader?: SchoolSignatureUploader | null): SchoolCardService;
