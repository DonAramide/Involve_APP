-- ============================================================
-- Invify Terminal Governance System - Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- terminal_inventory: master table for all terminal records
CREATE TABLE IF NOT EXISTS terminal_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id VARCHAR(50) NOT NULL,
  mpos_terminal_id VARCHAR(50),
  business_name VARCHAR(200),
  pos_serial_number VARCHAR(100),
  account_number VARCHAR(100),
  account_name VARCHAR(200),
  mobile_number VARCHAR(20),
  email VARCHAR(200),
  terminal_type VARCHAR(20) DEFAULT 'N3',
  assigned_device_id VARCHAR(200),
  assigned_tenant_id UUID,
  assignment_status VARCHAR(20) DEFAULT 'unassigned' CHECK (assignment_status IN ('unassigned','assigned','suspended')),
  assigned_at TIMESTAMPTZ,
  unassigned_at TIMESTAMPTZ,
  uploaded_batch_id VARCHAR(100),
  uploaded_by VARCHAR(200),
  last_sync_at TIMESTAMPTZ,
  config_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- terminal_audit_log: immutable event log for all terminal actions
CREATE TABLE IF NOT EXISTS terminal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  terminal_id VARCHAR(50),
  mpos_terminal_id VARCHAR(50),
  old_device_id VARCHAR(200),
  new_device_id VARCHAR(200),
  admin_id VARCHAR(200),
  reason TEXT,
  ip_address VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────

-- Terminal ID must be globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_terminal_id
  ON terminal_inventory(terminal_id);

-- MPOS Terminal ID must be unique (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mpos_terminal_id
  ON terminal_inventory(mpos_terminal_id)
  WHERE mpos_terminal_id IS NOT NULL;

-- POS Serial Number must be unique (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_serial_number
  ON terminal_inventory(pos_serial_number)
  WHERE pos_serial_number IS NOT NULL;

-- CORE BUSINESS RULE: Only ONE terminal can be actively assigned to ONE device at a time
-- This partial unique index enforces the constraint at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_device_assignment
  ON terminal_inventory(assigned_device_id)
  WHERE assignment_status = 'assigned';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_terminal_assignment_status ON terminal_inventory(assignment_status);
CREATE INDEX IF NOT EXISTS idx_terminal_created_at ON terminal_inventory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_terminal_id ON terminal_audit_log(terminal_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON terminal_audit_log(created_at DESC);

-- ── Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_terminal_inventory_updated_at ON terminal_inventory;
CREATE TRIGGER update_terminal_inventory_updated_at
  BEFORE UPDATE ON terminal_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security (optional, enable if using Supabase auth) ──
-- ALTER TABLE terminal_inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE terminal_audit_log ENABLE ROW LEVEL SECURITY;
