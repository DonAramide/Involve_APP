export type IsoFieldValue = string | Buffer;
export type IsoMessageFields = Record<number, IsoFieldValue>;
export declare function packPosMessage(fields: IsoMessageFields): Buffer;
export declare function unpackPosMessage(body: Buffer): IsoMessageFields;
/** Serialize fields for logs (binary → hex). */
export declare function isoFieldsToLogRecord(fields: IsoMessageFields): Record<string, string>;
