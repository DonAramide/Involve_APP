/** ISO 8583 bitmap helpers (MSB-first bit numbering; field N => bit N-1). */
export declare function fieldIdsFromBitmaps(primaryHex: string, secondaryHex?: string): number[];
export declare function buildBitmapHex(fieldIds: number[]): {
    primaryHex: string;
    secondaryHex?: string;
};
export declare function hasSecondaryBitmap(primaryHex: string): boolean;
