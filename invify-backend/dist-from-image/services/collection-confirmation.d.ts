export type CollectionConfirmation = 'unconfirmed' | 'recorded' | 'settled';
export declare function isStableCommandId(value: unknown): boolean;
export declare function classifyCollectionConfirmation(method: unknown, opts?: {
    confirmed?: boolean;
    providerReference?: string | null;
}): CollectionConfirmation;
export declare function providerCreditIdempotencyKey(reference: string): string;
