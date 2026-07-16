"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const s3Client = new client_s3_1.S3Client({
    endpoint: process.env.CONTABO_ENDPOINT,
    region: process.env.CONTABO_REGION || 'default',
    credentials: {
        accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
        secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
    },
    forcePathStyle: true // Important for many S3-compatible providers
});
class S3Service {
    /**
     * Uploads a file buffer to Contabo S3 bucket.
     * @param fileBuffer The file content as a Buffer.
     * @param originalName The original name of the file (to extract extension).
     * @param mimetype The MIME type of the file.
     * @param folder Optional folder path inside the bucket.
     * @returns The public URL of the uploaded file.
     */
    static async uploadFile(fileBuffer, originalName, mimetype, folder = 'kyc') {
        const bucket = process.env.CONTABO_BUCKET || 'iips.stargazer.bucket';
        const ext = path.extname(originalName) || '.bin';
        const fileName = `${folder}/${(0, uuid_1.v4)()}${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: fileName,
            Body: fileBuffer,
            ContentType: mimetype,
            ACL: 'public-read' // Assumes CONTABO_UPLOAD_PUBLIC_READ=true logic
        });
        try {
            await s3Client.send(command);
            // Construct the public URL
            let endpoint = process.env.CONTABO_ENDPOINT || '';
            // Ensure no trailing slash
            if (endpoint.endsWith('/')) {
                endpoint = endpoint.slice(0, -1);
            }
            return `${endpoint}/${bucket}/${fileName}`;
        }
        catch (error) {
            console.error('[S3Service] Error uploading file:', error);
            throw new Error(`Failed to upload file to S3: ${error.message}`);
        }
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=s3.service.js.map