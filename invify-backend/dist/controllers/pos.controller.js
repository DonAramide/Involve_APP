"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosController = void 0;
const pos_service_1 = require("../services/pos.service");
const supabase_1 = require("../db/supabase");
class PosController {
    static async processTransaction(req, res) {
        try {
            const { terminalId, amount, emvData, staffName, items, isDeviceProcessed, deviceStatus, transactionResponse, tenantProfile, deviceInfo } = req.body;
            const tenantId = req.headers['x-tenant-id'] || 'default';
            if (isDeviceProcessed) {
                const response = await pos_service_1.PosService.recordDeviceTransaction({
                    tenantId,
                    terminalId,
                    amount,
                    emvData,
                    isDeviceProcessed: true,
                    staffName,
                    items,
                    deviceStatus,
                    transactionResponse,
                    tenantProfile,
                    deviceInfo
                });
                return res.status(200).json(response);
            }
            const response = await pos_service_1.PosService.processTransaction({
                tenantId,
                terminalId,
                amount,
                emvData,
                staffName,
                items
            });
            res.status(200).json(response);
        }
        catch (error) {
            console.error('[POS Controller] Error:', error);
            res.status(500).json({ error: error.message || 'POS Transaction failed' });
        }
    }
    static async getTransactionHistory(req, res) {
        try {
            const tenantId = req.headers['x-tenant-id'] || 'default';
            const history = await pos_service_1.PosService.getTransactionHistory(tenantId);
            res.status(200).json(history);
        }
        catch (error) {
            res.status(500).json({ error: error.message || 'Failed to fetch POS history' });
        }
    }
    static async getRoutingConfig(req, res) {
        try {
            const config = await pos_service_1.PosService.getRoutingConfig();
            res.status(200).json(config);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async updateRoutingConfig(req, res) {
        try {
            const { config, adminId, reason } = req.body;
            const actualConfig = config || req.body;
            const actualAdminId = adminId || req.headers['x-admin-id'] || 'Admin';
            const actualReason = reason || req.headers['x-audit-reason'] || 'Updated POS routing configuration';
            const updatedConfig = await pos_service_1.PosService.updateRoutingConfig(actualConfig, actualAdminId, actualReason);
            res.status(200).json(updatedConfig);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async getObservabilityMetrics(req, res) {
        try {
            const metrics = await pos_service_1.PosService.getObservabilityMetrics();
            res.status(200).json(metrics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async simulateRoute(req, res) {
        try {
            const { amount, tenantCategory, transactionType, cardScheme, hostHealthOverrides } = req.body;
            const route = pos_service_1.PosService.determineRoute(Number(amount), tenantCategory || 'Retail', transactionType || 'PURCHASE', cardScheme || 'VISA', hostHealthOverrides);
            res.status(200).json({
                routeName: route.name,
                config: route.config
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * Force-refresh the Kimono terminal params cache for a specific terminal.
     * Useful after key rotation at Cpoint.
     * POST /admin/pos/kimono-params/refresh  { terminalId }
     */
    static async refreshKimonoParams(req, res) {
        try {
            const { terminalId } = req.body;
            if (!terminalId) {
                return res.status(400).json({ error: 'terminalId is required' });
            }
            pos_service_1.PosService.clearKimonoParamsCache(terminalId);
            const freshParams = await pos_service_1.PosService.fetchKimonoParams(terminalId);
            res.status(200).json({
                message: `Terminal params refreshed for ${terminalId}`,
                code: freshParams.code,
                terminalId: freshParams.terminalId
            });
        }
        catch (error) {
            console.error('[POS Controller] Kimono params refresh failed:', error);
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * Debug endpoint — parses a raw hex ISO8583 message and returns decoded fields.
     * POST /api/pos/test-iso  { hexMessage: "0210..." }
     * Protected by authenticate middleware in app.ts.
     */
    static async testIso(req, res) {
        try {
            const { hexMessage } = req.body;
            if (!hexMessage || typeof hexMessage !== 'string') {
                return res.status(400).json({ error: 'hexMessage (string) is required' });
            }
            const buf = Buffer.from(hexMessage, 'hex');
            const result = pos_service_1.PosService.parseIsoMessage(buf, 'TEST-ISO');
            res.status(200).json({
                inputLength: buf.length,
                responseCode: result.responseCode,
                approved: result.responseCode === '00',
                fields: result.isoFields,
            });
        }
        catch (error) {
            console.error('[POS Controller] testIso failed:', error);
            res.status(500).json({ error: error.message });
        }
    }
    static async getAffectedDevices(req, res) {
        try {
            const { scopeType, targetValue } = req.query;
            if (!scopeType || !targetValue) {
                return res.status(400).json({ error: 'scopeType and targetValue are required' });
            }
            let affectedDevices = [];
            if (scopeType === 'Tenant') {
                const { data: assignments, error: err } = await supabase_1.supabase
                    .from('terminal_inventory')
                    .select('terminal_id, mpos_terminal_id, terminal_type, assigned_device_id')
                    .eq('assigned_tenant_id', targetValue)
                    .eq('assignment_status', 'assigned');
                if (err)
                    throw err;
                if (assignments && assignments.length > 0) {
                    const deviceIds = assignments.map(a => a.assigned_device_id).filter(Boolean);
                    let devices = [];
                    if (deviceIds.length > 0) {
                        const { data, error: devErr } = await supabase_1.supabase
                            .from('devices')
                            .select('device_id, device_name, device_info')
                            .in('device_id', deviceIds);
                        if (devErr)
                            throw devErr;
                        devices = data || [];
                    }
                    affectedDevices = assignments.map((a) => {
                        const device = devices.find(d => d.device_id === a.assigned_device_id);
                        return {
                            tabletModel: device?.device_info?.model || device?.device_name || 'Unknown',
                            tabletSerial: device?.device_id || 'Unknown',
                            mposModel: a.terminal_type || 'Unknown',
                            mposSerial: a.mpos_terminal_id || 'Unknown',
                            terminalId: a.terminal_id || 'Unknown',
                        };
                    });
                }
            }
            res.status(200).json(affectedDevices);
        }
        catch (error) {
            console.error('[POS Controller] getAffectedDevices failed:', error);
            if (PosController.isNetworkTimeout(error)) {
                return res.status(503).json({
                    error: 'Database unavailable',
                    retryable: true,
                    retryAfterMs: 2000
                });
            }
            res.status(500).json({ error: error.message });
        }
    }
    static isNetworkTimeout(error) {
        return (error.message?.includes('fetch failed') ||
            error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
            error.message?.includes('timeout') ||
            error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
            process.env.OFFLINE_LOCAL_AUTH === 'true');
    }
}
exports.PosController = PosController;
//# sourceMappingURL=pos.controller.js.map