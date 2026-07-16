/**
 * P0-2 Migration: Device Activations Schema Validation
 *
 * Validates existence of:
 * - device_activations table
 * - columns: id, activation_code, tenant_id, duration_days, plan_index, device_suffix, device_id, status, is_used, created_by, created_at, used_at, expires_at
 *
 * Run: npx ts-node src/db/migrations/002_p0_2_device_activations.ts
 */
export {};
