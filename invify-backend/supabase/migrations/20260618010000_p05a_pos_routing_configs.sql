-- ─────────────────────────────────────────────────────────────────────────────
-- P0-5A Migration: pos_routing_configs table
-- Purpose: Replace pos_routing_config.json filesystem persistence.
-- Config is stored as an AES-256-CBC encrypted JSON blob (same encryption as
-- the previous filesystem version). Key version and config version are tracked
-- separately to support key rotation and config audit trails.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists pos_routing_configs (
  id             uuid        primary key default gen_random_uuid(),

  -- Encrypted JSON blob containing the full PosRoutingConfig structure.
  -- Secrets (authToken, masterKey, pinKey, fallbackToken) are AES-256-CBC
  -- encrypted by PosService.mapSecrets() before being stored here.
  config_blob    text        not null,

  -- Tracks which encryption key version was used to encrypt this blob.
  -- Increment key_version when POS_ENCRYPTION_KEY is rotated.
  -- All blobs with key_version=N must be re-encrypted with key_version=N+1
  -- before the old key is retired.
  key_version    integer     not null default 1,

  -- Tracks the configuration revision number (separate from key rotation).
  -- Increments on every routing configuration update regardless of key changes.
  -- Enables point-in-time config restoration and audit trails.
  config_version integer     not null default 1,

  -- Identity of the operator or system that saved this config revision.
  -- 'system_bootstrap' = initial default config saved on first startup.
  updated_by     text        null,

  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

comment on table pos_routing_configs is
  'POS routing configuration revisions. Encrypted blobs stored by PosService. '
  'Each insert is a new immutable revision — never update in place.';

comment on column pos_routing_configs.key_version is
  'Encryption key version. Increment when POS_ENCRYPTION_KEY env var is rotated.';

comment on column pos_routing_configs.config_version is
  'Config revision number. Increments on every routing configuration update.';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Block all direct client access.
-- PosService uses the service-role client which bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pos_routing_configs enable row level security;

-- Restrictive policy: deny all direct JWT/anon client access.
create policy "no_direct_client_access"
  on pos_routing_configs
  as restrictive
  for all
  using (false);
