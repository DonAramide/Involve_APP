-- device_telemetry_schema.sql
-- P6D: Device Telemetry & Fleet Visibility Operationalization
-- Run against STAGING Supabase database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: device_status
-- Purpose: One row per device representing the latest known state (upsert).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_status (
    device_id VARCHAR(255) PRIMARY KEY,
    tenant_id UUID NOT NULL,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    is_charging BOOLEAN DEFAULT false,
    network_status VARCHAR(50),
    sim_operator VARCHAR(100),
    sim_network_type VARCHAR(50),
    uptime BIGINT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location JSONB,
    telemetry_seq BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: device_telemetry
-- Purpose: Historical telemetry archive. Retain 30 days detailed.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    payload JSONB NOT NULL,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    network_status VARCHAR(50),
    uptime BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_device_telemetry_device_id ON public.device_telemetry(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_created_at ON public.device_telemetry(created_at);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: device_alerts
-- Purpose: Store critical events that generate alerts.
-- Alert types: BATTERY_LOW, BATTERY_CRITICAL, SIM_REMOVED, SIM_CHANGED,
--              DEVICE_ROOTED, DEVICE_DISABLED, LOCATION_ANOMALY,
--              DEVICE_TAMPERING, DEVICE_OFFLINE
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'CRITICAL',
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_alerts_device_id ON public.device_alerts(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_alerts_unresolved ON public.device_alerts(is_resolved) WHERE is_resolved = false;

-- ──────────────────────────────────────────────────────────────────────────────
-- Data Retention Policy (manual execution or pg_cron)
-- Purge telemetry records older than 30 days
-- ──────────────────────────────────────────────────────────────────────────────
-- DELETE FROM public.device_telemetry WHERE created_at < NOW() - INTERVAL '30 days';
