/**
 * P0-1 Migration: Device Onboarding Schema
 *
 * Adds:
 * - tenants.tenant_code (UNIQUE VARCHAR(20))
 * - tenants: agent_code, location, phone, owner_email, owner_name, support fields, settings
 * - devices: device_category, device_role, status, device_suffix, device_info, theme_color, inventory_record_id
 * - Indexes on frequently queried columns
 *
 * Run: npx ts-node src/db/migrations/001_p0_1_device_onboarding.ts
 */
export {};
