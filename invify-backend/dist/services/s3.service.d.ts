export declare class S3Service {
    /**
     * Uploads a file buffer to Contabo S3 bucket.
     * @param fileBuffer The file content as a Buffer.
     * @param originalName The original name of the file (to extract extension).
     * @param mimetype The MIME type of the file.
     * @param folder Optional folder path inside the bucket.
     * @returns The public URL of the uploaded file.
     */
    static uploadFile(fileBuffer: Buffer, originalName: string, mimetype: string, folder?: string): Promise<string>;
}
