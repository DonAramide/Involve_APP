"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
/** Approximate map % positions for stylized world wireframe (not GPS-accurate). */
const COUNTRY_MAP_POINTS = {
    nigeria: { x: 48, y: 48 },
    ghana: { x: 45, y: 48 },
    kenya: { x: 55, y: 52 },
    uganda: { x: 54, y: 50 },
    tanzania: { x: 56, y: 54 },
    'south africa': { x: 52, y: 62 },
    'united kingdom': { x: 46, y: 28 },
    uk: { x: 46, y: 28 },
    singapore: { x: 75, y: 40 },
    usa: { x: 22, y: 35 },
    'united states': { x: 22, y: 35 },
    global: { x: 50, y: 42 },
};
function parseLatLng(location) {
    if (!location || typeof location !== 'string')
        return null;
    const match = location.match(/Lat:\s*([-\d.]+),\s*Lng:\s*([-\d.]+)/i);
    if (!match)
        return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return null;
    return { lat, lng };
}
function latLngToMapPercent(lat, lng) {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(8, Math.min(90, y)),
    };
}
function resolveMapPoint(tenant, index) {
    const coords = parseLatLng(tenant.location);
    if (coords) {
        const point = latLngToMapPercent(coords.lat, coords.lng);
        const label = [tenant.city, tenant.state, tenant.country].filter(Boolean).join(', ') || 'GPS';
        return { ...point, location: label };
    }
    const countryKey = String(tenant.country || '').trim().toLowerCase();
    const countryPoint = countryKey ? COUNTRY_MAP_POINTS[countryKey] : undefined;
    if (countryPoint) {
        // Slight jitter so co-located tenants don't stack perfectly
        const jitterX = ((index % 5) - 2) * 1.2;
        const jitterY = ((index % 3) - 1) * 1.4;
        return {
            x: countryPoint.x + jitterX,
            y: countryPoint.y + jitterY,
            location: [tenant.city, tenant.state, tenant.country].filter(Boolean).join(', ') || tenant.country,
        };
    }
    // Fan across Africa/Europe band when location is unknown
    return {
        x: 42 + (index % 8) * 3.5,
        y: 30 + (index % 6) * 4,
        location: [tenant.city, tenant.state, tenant.country].filter(Boolean).join(', ') || 'Unspecified',
    };
}
function activityColor(count, risk) {
    if (String(risk).toLowerCase() === 'high')
        return '#FF5252';
    if (count >= 50)
        return '#00E676';
    if (count >= 10)
        return '#FFB300';
    if (count > 0)
        return '#00B8FF';
    return '#607D8B';
}
function activityStatus(count, risk) {
    if (String(risk).toLowerCase() === 'high')
        return 'risk';
    if (count >= 50)
        return 'high';
    if (count >= 10)
        return 'medium';
    if (count > 0)
        return 'low';
    return 'idle';
}
class DashboardController {
    static async getOverview(req, res) {
        try {
            const kpis = await dashboard_service_1.DashboardService.getOverviewKPIs();
            const hardwareResources = await dashboard_service_1.DashboardService.getHardwareResources();
            const activeModules = await dashboard_service_1.DashboardService.getActiveModules();
            return res.status(200).json({
                kpis,
                hardwareResources,
                activeModules
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getAlerts(req, res) {
        try {
            const alerts = await dashboard_service_1.DashboardService.getAlerts();
            return res.status(200).json(alerts);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getGovernance(req, res) {
        try {
            const governanceCards = await dashboard_service_1.DashboardService.getGovernance();
            return res.status(200).json(governanceCards);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getAnalytics(req, res) {
        try {
            const tenantMatrix = await dashboard_service_1.DashboardService.getTenantIntelligence();
            const systemHealth = await dashboard_service_1.DashboardService.getSystemHealth();
            const recommendations = await dashboard_service_1.DashboardService.getRecommendations();
            const infraChartSeries = await dashboard_service_1.DashboardService.getInfraChartSeries();
            const mapNodes = (tenantMatrix || []).slice(0, 24).map((t, i) => {
                const point = resolveMapPoint(t, i);
                const activity = Number(t.activity24h ?? 0);
                return {
                    id: t.id || t.tenant_id,
                    tenant: t.name,
                    location: point.location,
                    x: point.x,
                    y: point.y,
                    status: activityStatus(activity, t.risk),
                    color: activityColor(activity, t.risk),
                    activity,
                };
            });
            return res.status(200).json({
                tenantMatrix,
                tenantIntelligence: mapNodes,
                systemHealth,
                recommendations,
                infraChartSeries,
                dataSource: 'tenants+transactions_24h',
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboard.controller.js.map