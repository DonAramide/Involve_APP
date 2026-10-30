/** NIBSS production switch (ISO 8583). Admin host drawer uses these as empty-IP defaults. */
export declare const DEFAULT_NIBSS_IP = "196.6.103.18";
export declare const DEFAULT_NIBSS_PORT = 5001;
export declare function nonEmptyHostValue(raw: unknown): string | null;
export declare function hostCodeOf(host: any): string;
export declare function pickHostIp(host: any): string | null;
export declare function pickHostPort(host: any): number | null;
export type PosHostResolution = {
    allHosts: any[];
    activeHosts: any[];
    activeCode: string;
    primaryHost: any | null;
    secondaryHost: any | null;
    tertiaryHost: any | null;
    expressPay: any | undefined;
    kimono: any | undefined;
    nibssEndpoint: {
        nibssIp: string | null;
        nibssPort: number | null;
        nibssSsl: boolean;
    };
};
/**
 * Build the host payload for terminal sync.
 * Looks up the configured activeHost in ALL hosts (not only isActive),
 * so NIBSS IP/port still sync when the NIBSS row is selected but not flagged active.
 * Empty NIBSS IP/port (admin drawer shows defaults without Save) use production switch defaults.
 */
export declare function resolvePosHosts(routingConfig: any): PosHostResolution;
