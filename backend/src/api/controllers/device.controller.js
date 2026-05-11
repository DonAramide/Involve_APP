// backend/src/api/controllers/device.controller.js
const { supabase } = require('../../config/supabase');
const crypto = require('crypto');
const licenseService = require('../../services/license.service');

class DeviceController {
    /**
     * Fetch all activated devices with tenant info
     */
    async getDevices(req, res) {
        try {
            const { data, error } = await supabase
                .from('devices')
                .select('*, tenants(name, plan)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Generate a new activation code (Mobile Compatible)
     */
    async createActivationCode(req, res) {
        const { tenantId, durationDays, planIndex } = req.body;

        if (!tenantId || !durationDays) {
            return res.status(400).json({ message: 'tenantId and durationDays are required' });
        }

        try {
            // Fetch Tenant Name for hashing
            const { data: tenant, error: tError } = await supabase
                .from('tenants')
                .select('name')
                .eq('id', tenantId)
                .single();
            
            if (tError) throw tError;

            // Generate Real Mobile Code
            const code = licenseService.generateLicense({
                businessName: tenant.name,
                durationDays: parseInt(durationDays),
                planIndex: planIndex || 0,
                licenseId: req.body.deviceSuffix || 0
            });

            const { data, error } = await supabase
                .from('device_activations')
                .insert([{
                    tenant_id: tenantId,
                    activation_code: code,
                    duration_days: durationDays,
                    is_used: false
                }])
                .select();

            if (error) throw error;
            res.status(201).json(data[0]);
        } catch (err) {
            console.error('Activation Code Error:', err.message);
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Get activation history/pending codes
     */
    async getActivationHistory(req, res) {
        try {
            const { data, error } = await supabase
                .from('device_activations')
                .select('*, tenants(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Decode and validate an existing code
     */
    async validateCode(req, res) {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Code is required' });

        try {
            const data = licenseService.decodeLicense(code);
            res.json(data);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }

    /**
     * Block/Deactivate device
     */
    async updateDeviceStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;

        try {
            const { data, error } = await supabase
                .from('devices')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;
            res.json(data[0]);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = new DeviceController();
