"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudMetricsController = void 0;
const cloud_metrics_service_1 = require("../services/cloud-metrics.service");
const cloudMetricsService = new cloud_metrics_service_1.CloudMetricsService();
class CloudMetricsController {
    async getOverview(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getOverview(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getSyncHealth(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getSyncHealth(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getTerminals(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getTerminals(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getDevices(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getDevices(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getBackups(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getBackups(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getActivityFeed(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getActivityFeed(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getAlerts(req, res) {
        try {
            const tenantId = req.user?.tenantId || 'system';
            const data = await cloudMetricsService.getAlerts(tenantId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.CloudMetricsController = CloudMetricsController;
//# sourceMappingURL=cloud-metrics.controller.js.map