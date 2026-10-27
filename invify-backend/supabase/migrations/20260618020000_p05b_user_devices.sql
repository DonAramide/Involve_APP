-- ─────────────────────────────────────────────────────────────────────────────
-- P0-5B Migration: user_devices table (if not already present)
-- Purpose: Replace user_devices_db.json filesystem persistence.
-- user_devices stores device registration records for each user, including
-- approval status, IP/UA for security, and auto-approval for first devices.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists user_devices (
  id            uuid        primary key default gen_random_uuid(),

  -- The platform user ID (from users table).
  user_id       text        not null,

  -- Email of the user (denormalised for quick lookup without joining users table).
  email         text        not null,

  -- Unique device fingerprint (e.g., browser fingerprint or device UUID).
  device_id     text        not null,

  -- Human-readable device label (e.g., "Web Browser Interface", "iPhone 14").
  device_name   text        not null default 'Unknown Device',

  -- 'approved' = allowed to authenticate.
  -- 'pending'  = awaiting admin/owner approval.
  -- 'blocked'  = explicitly revoked.
  status        text        not null default 'pending'
                check (status in ('approved', 'pending', 'blocked')),

  -- Network context captured at registration time.
  ip_address    text        null,
  user_agent    text        null,

  -- Approval tracking.
  approved_at   timestamptz null,
  approved_by   text        null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table user_devices is
  'Device registration records for platform users. '
  'First device per user is auto-approved. Subsequent devices start as pending.';

-- Performance indices
create index if not exists user_devices_user_id_idx   on user_devices(user_id);
create index if not exists user_devices_device_id_idx on user_devices(device_id);
create index if not exists user_devices_status_idx    on user_devices(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Only super_admin and internal_staff may read all records.
-- Users can only see their own devices.
-- ─────────────────────────────────────────────────────────────────────────────

alter table user_devices enable row level security;

-- Service role (used by UserDeviceService) bypasses RLS entirely.
-- These policies apply only to direct JWT-authenticated client queries.

create policy "user_sees_own_devices"
  on user_devices for select
  using (user_id = auth.uid()::text);

create policy "admin_sees_all_devices"
  on user_devices for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('super_admin', 'internal_staff', 'admin_ops')
    )
  );
