export declare function uploadBase64ToContabo(base64Data: string, prefix: string, fileName: string): Promise<string>;
/**
 * Validates and securely uploads an official institution logo to Contabo S3.
 * Enforces PNG/JPEG/WebP format, 2MB size limit, and dimension verification.
 */
export declare function uploadInstitutionLogo(base64Data: string, institutionCode: string): Promise<{
    logoUrl: string;
    width: number;
    height: number;
    sizeBytes: number;
}>;
/**
 * Removes an institution logo from object storage.
 */
export declare function deleteInstitutionLogo(logoUrl: string): Promise<boolean>;
