export declare class TerritoryRepository {
    create(data: any): Promise<any>;
    findAll(): Promise<any[]>;
    update(id: string, updates: any): Promise<any>;
}
export declare const territoryRepository: TerritoryRepository;
