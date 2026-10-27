export function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

export function hydrateTenantOwnerContact(tenant: any, users: any[] = [], devices: any[] = []) {
  if (!tenant) return tenant;

  const owner =
    users.find((u) => String(u?.role || '').toLowerCase() === 'owner') ||
    users.find((u) => String(u?.role || '').toLowerCase().includes('admin')) ||
    users[0] ||
    null;
  const device = devices[0] || {};
  const settings =
    tenant.settings && typeof tenant.settings === 'object' ? { ...tenant.settings } : {};
  const prev =
    settings.owner_profile && typeof settings.owner_profile === 'object'
      ? { ...settings.owner_profile }
      : {};

  const email = firstNonEmpty(
    prev.email,
    tenant.owner_email,
    owner?.email,
    device.ownerEmail,
    device.owner_email,
  );
  const phone = firstNonEmpty(prev.phone, tenant.phone, owner?.phone, device.ownerPhone);
  const ownerName = firstNonEmpty(prev.name, tenant.owner_name, owner?.name);
  const nameParts = ownerName.split(/\s+/).filter(Boolean);
  const firstName = firstNonEmpty(prev.firstName, nameParts[0]);
  const lastName = firstNonEmpty(prev.lastName, nameParts.slice(1).join(' '));

  settings.owner_profile = {
    ...prev,
    firstName,
    lastName,
    email,
    phone,
    businessName: firstNonEmpty(prev.businessName, tenant.name),
    name: ownerName,
  };

  return {
    ...tenant,
    owner_email: firstNonEmpty(tenant.owner_email, email),
    owner_name: firstNonEmpty(tenant.owner_name, ownerName),
    settings,
  };
}
