import { HealthContext } from '../types';
import { bankSubscriptionReference } from './invify-catalogue.rules';
export declare class InvifyCatalogueService {
    static bankSubscriptionReference: typeof bankSubscriptionReference;
    static listOfferings(query: any): Promise<{
        offerings: {
            id: any;
            code: any;
            name: any;
            description: any;
            status: any;
            ownership_scope: any;
            owner_provider_id: any;
            created_by: any;
            published_by: any;
            published_at: any;
            retired_at: any;
            created_at: any;
            updated_at: any;
        }[];
        total: number;
        ownership: {
            scope: string;
            aaa000Bound: boolean;
            note: string;
        };
        phase3: {
            subscribeBy: string;
            optionalProduct: string;
            existingBankSwitch: string;
        };
    }>;
    static getOfferingTree(offeringId: string): Promise<{
        offering: {
            id: any;
            code: any;
            name: any;
            description: any;
            status: any;
            ownership_scope: any;
            owner_provider_id: any;
            created_by: any;
            published_by: any;
            published_at: any;
            retired_at: any;
            created_at: any;
            updated_at: any;
        };
        services: {
            products: any[];
            id: any;
            offering_id: any;
            code: any;
            name: any;
            description: any;
            status: any;
            sort_order: any;
            created_at: any;
            updated_at: any;
        }[];
        financial: {
            enrolsMembers: boolean;
            issuesInvoice: boolean;
            postsPayout: boolean;
        };
    }>;
    static createOffering(ctx: HealthContext, body: any): Promise<any>;
    static updateOffering(ctx: HealthContext, offeringId: string, body: any): Promise<any>;
    static setOfferingStatus(ctx: HealthContext, offeringId: string, body: any): Promise<any>;
    static addService(ctx: HealthContext, offeringId: string, body: any): Promise<any>;
    static addProduct(ctx: HealthContext, serviceId: string, body: any): Promise<any>;
    static assignFacility(ctx: HealthContext, productId: string, body: any): Promise<any>;
    static removeFacility(ctx: HealthContext, productId: string, facilityId: string, reason: unknown): Promise<{
        productId: string;
        facilityId: string;
        removed: boolean;
    }>;
}
