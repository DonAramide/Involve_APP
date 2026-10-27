/**
 * DELIVERY TARGETING ENGINE LAYER
 * Evaluates inclusion expressions against live registered terminals and tenants.
 * Computes recipient footprints for pre-flight dry-run simulations.
 */

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function deviceRegion(device) {
  return (
    device?.region_id ||
    device?.region ||
    device?.location ||
    device?.device_info?.region ||
    device?.device_info?.location ||
    null
  );
}

function isQuarantined(device) {
  const status = String(device?.status || '').toUpperCase();
  const integrity = String(device?.device_info?.integrity || '').toUpperCase();
  return status === 'QUARANTINED' || integrity === 'CRITICAL';
}

class DeliveryTargetingEngine {
  constructor() {
    this.devices = [];
    this.tenants = [];
    this.totalRegisteredFleet = 0;
    this.activeTenantCount = 0;
    this.activeRegionCount = 0;
    this.hydrated = false;
  }

  hydrateFleet({ devices = [], tenants = [] } = {}) {
    this.devices = unwrapList(devices);
    this.tenants = unwrapList(tenants);
    this.totalRegisteredFleet = this.devices.length;

    const tenantIds = new Set([
      ...this.tenants.map((t) => t.id).filter(Boolean),
      ...this.devices.map((d) => d.tenant_id).filter(Boolean),
    ]);
    this.activeTenantCount = tenantIds.size;

    const regions = new Set(this.devices.map(deviceRegion).filter(Boolean));
    this.activeRegionCount = regions.size;
    this.hydrated = true;
  }

  normalizeDevice(device) {
    return {
      tenantId: device?.tenant_id,
      regionId: deviceRegion(device),
      serialNumber: device?.device_id || device?.serial_number || device?.id,
      status: isQuarantined(device) ? 'QUARANTINED' : 'CLEAN',
    };
  }

  evaluateTargetFootprint(targetScopes = {}) {
    const tenants = targetScopes.tenants || [];
    const regions = targetScopes.regions || [];
    const deviceTags = targetScopes.deviceTags || [];

    const matchedDevices = this.devices.filter((device) =>
      this.matchesDeviceProfile(this.normalizeDevice(device), targetScopes),
    );

    const matchedTenantIds = new Set(matchedDevices.map((d) => d.tenant_id).filter(Boolean));
    const matchedRegions = new Set(matchedDevices.map(deviceRegion).filter(Boolean));

    let devicesCount = matchedDevices.length;
    let tenantsCount = tenants.length > 0 ? matchedTenantIds.size : this.activeTenantCount;
    let regionsCount = regions.length > 0 ? matchedRegions.size : this.activeRegionCount;

    if (deviceTags.length > 0) {
      devicesCount = matchedDevices.length;
      tenantsCount = matchedTenantIds.size;
      regionsCount = matchedRegions.size;
    }

    const scopeLabel = tenants.length > 0 ? tenants.join(', ') : 'all registered tenants';
    const reportLines = [
      this.hydrated
        ? `Registered fleet (database, not live sockets): ${this.totalRegisteredFleet.toLocaleString()} device(s), ${this.activeTenantCount} tenant(s).`
        : 'Fleet snapshot not loaded yet. Counts will update after devices and tenants are fetched.',
      `This broadcast will target those registered rows:`,
      `- ${devicesCount.toLocaleString()} devices`,
      `- ${tenantsCount} tenants (${scopeLabel})`,
      `- ${regionsCount} region(s)`,
    ];

    return {
      devicesCount,
      tenantsCount,
      regionsCount,
      simulationReport: reportLines.join('\n'),
      isHighImpact: devicesCount > 50000,
      hydrated: this.hydrated,
    };
  }

  matchesDeviceProfile(deviceContext, targetScopes) {
    if (!targetScopes) return true;

    if (targetScopes.tenants?.length > 0 && !targetScopes.tenants.includes(deviceContext.tenantId)) {
      return false;
    }

    if (targetScopes.regions?.length > 0 && !targetScopes.regions.includes(deviceContext.regionId)) {
      return false;
    }

    if (targetScopes.deviceTags?.length > 0 && !targetScopes.deviceTags.includes(deviceContext.serialNumber)) {
      return false;
    }

    if (targetScopes.quarantineState && targetScopes.quarantineState !== 'ANY') {
      const isDevQuarantined = deviceContext.status === 'QUARANTINED';
      if (targetScopes.quarantineState === 'QUARANTINED' && !isDevQuarantined) return false;
      if (targetScopes.quarantineState === 'CLEAN' && isDevQuarantined) return false;
    }

    return true;
  }
}

export const targetingEngineSingleton = new DeliveryTargetingEngine();
