export declare const ORIGIN_INVIFY = "INVIFY_UPLOAD";
export declare const ORIGIN_CUSTOMER = "CUSTOMER_INCOMING";
export type DeviceOriginLabel = 'INVIFY_UPLOADED' | 'CUSTOMER_INCOMING';
export declare function parseDeviceInfo(raw: any): Record<string, any>;
export declare function originOfDevice(row: any): DeviceOriginLabel;
export declare function mergeDeviceInfo(existing: any, incoming: any, origin: string): Record<string, any>;
