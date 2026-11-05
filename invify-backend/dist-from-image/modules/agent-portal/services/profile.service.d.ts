export declare class ProfileService {
    findAgent(authUserId: string, email?: string): Promise<{
        id: any;
        agent_code: any;
        first_name: any;
        last_name: any;
        email: any;
        phone: any;
        status: any;
        territory_id: any;
        created_at: any;
        auth_user_id: any;
    }>;
    getProfile(authUserId: string, email?: string): Promise<any>;
    updateProfile(authUserId: string, payload: any, email?: string): Promise<any>;
    uploadKycDocument(authUserId: string, type: string, url: string, email?: string): Promise<any>;
    getKycDocuments(authUserId: string, email?: string): Promise<any[]>;
}
export declare const profileService: ProfileService;
