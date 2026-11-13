export declare const SIGNATURE_STORAGE_PREREQUISITE: string;
export interface SchoolSignatureUploader {
    put(input: {
        tenantId: string;
        body: Buffer;
        contentType: string;
    }): Promise<string>;
}
export declare function validateSchoolSignature(image: unknown): {
    buffer: Buffer;
    contentType: string;
};
