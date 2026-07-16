"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profile_service_1 = require("../services/profile.service");
class ProfileController {
    static async getProfile(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const profile = await profile_service_1.profileService.getProfile(authUserId);
            res.status(200).json({ success: true, data: profile });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async updateProfile(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const updated = await profile_service_1.profileService.updateProfile(authUserId, req.body);
            res.status(200).json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async uploadPhoto(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            // In a real implementation this would upload to S3/Supabase Storage.
            // We simulate success and patch the profile:
            const simulatedUrl = `https://storage.invify.app/agents/photos/${authUserId}.png`;
            const updated = await profile_service_1.profileService.updateProfile(authUserId, { photo_url: simulatedUrl });
            res.status(200).json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async uploadKyc(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { type } = req.body; // PASSPORT, NIN, BVN, GOVT_ID, PROOF_OF_ADDRESS
            const simulatedUrl = `https://storage.invify.app/agents/kyc/${authUserId}_${type}.png`;
            const doc = await profile_service_1.profileService.uploadKycDocument(authUserId, type, simulatedUrl);
            // If they uploaded BVN, we also save the masked BVN to their profile for easy retrieval
            if (type === 'BVN' && req.body.document_number) {
                const bvn = req.body.document_number;
                const masked = '***' + bvn.slice(-4);
                await profile_service_1.profileService.updateProfile(authUserId, { bvn_masked: masked });
            }
            res.status(200).json({ success: true, data: doc });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getKycDocuments(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const docs = await profile_service_1.profileService.getKycDocuments(authUserId);
            res.status(200).json({ success: true, data: docs });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getIdCard(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const profile = await profile_service_1.profileService.getProfile(authUserId);
            const idCardData = {
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                agentCode: profile.agent_code,
                email: profile.email,
                phone: profile.phone_number,
                territory: profile.territory || 'Unassigned',
                qrData: Buffer.from(`invify:agent:${profile.agent_code}`).toString('base64')
            };
            res.status(200).json({ success: true, data: idCardData });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getQrCode(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const profile = await profile_service_1.profileService.getProfile(authUserId);
            const qrData = {
                uuid: profile.id,
                code: profile.agent_code,
                url: `https://verify.invify.app/agent/${profile.agent_code}`
            };
            res.status(200).json({ success: true, data: qrData });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.ProfileController = ProfileController;
//# sourceMappingURL=profile.controller.js.map