export declare class TerritoryService {
    createTerritory(data: any, actorId: string, ip: string, ua: string): Promise<any>;
    listTerritories(): Promise<any[]>;
    updateTerritory(id: string, updates: any, actorId: string, ip: string, ua: string): Promise<any>;
}
export declare const territoryService: TerritoryService;
