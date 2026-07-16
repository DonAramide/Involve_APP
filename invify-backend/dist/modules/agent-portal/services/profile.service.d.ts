export declare class ProfileService {
    getProfile(authUserId: string): Promise<{
        profile: {};
        id: any;
        agent_code: any;
        first_name: any;
        last_name: any;
        email: any;
        phone_number: any;
        status: any;
        territory: any;
        created_at: any;
    }>;
    updateProfile(authUserId: string, payload: any): Promise<{
        profile: {};
        id: any;
        agent_code: any;
        first_name: any;
        last_name: any;
        email: any;
        phone_number: any;
        status: any;
        territory: any;
        created_at: any;
    }>;
    uploadKycDocument(authUserId: string, type: string, url: string): Promise<any>;
    getKycDocuments(authUserId: string): Promise<any[]>;
}
export declare const profileService: ProfileService;
