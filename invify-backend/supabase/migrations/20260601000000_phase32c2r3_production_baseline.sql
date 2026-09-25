-- =============================================================================
-- INVIFY Phase 32C.2R.3 — Production authoritative BASELINE (schema-only)
-- Source: artifacts/phase32c2r1 staging schema metadata + phase32c2r2 scope freeze
-- Scope: INCLUDE IN BASELINE only. No OPTIONAL/DEFERRED/LEGACY/UNKNOWN.
-- GUARANTEE: no business row data, no secrets, no QFS, no demo tenants.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== ENUMS / TYPES ==========
DO $$ BEGIN
  CREATE TYPE public."audit_severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."banking_provider_enum" AS ENUM ('PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."channel_enum" AS ENUM ('EMAIL', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."circuit_state_enum" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."config_value_type" AS ENUM ('string', 'number', 'boolean', 'json');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."financial_event_state_enum" AS ENUM ('INITIALIZED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."financial_event_type_enum" AS ENUM ('INWARD_PAYMENT', 'PAYOUT_WITHDRAWAL', 'INTERNAL_RECLASSIFICATION', 'REVERSAL_ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."freeze_scope_enum" AS ENUM ('WITHDRAWALS_ONLY', 'PAYOUTS_ONLY', 'SETTLEMENTS_ONLY', 'FULL_ACCOUNT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."freeze_type_enum" AS ENUM ('AML_REVIEW', 'FRAUD_REVIEW', 'CHARGEBACK_INVESTIGATION', 'COMPLIANCE_REVIEW', 'COURT_ORDER', 'MANUAL_LOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."ledger_type_enum" AS ENUM ('CREDIT_PENDING', 'CREDIT_AVAILABLE', 'DEBIT_WITHDRAWAL', 'DEBIT_CLAWBACK', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."owner_type_enum" AS ENUM ('SYSTEM', 'TENANT', 'AGENT', 'PROVIDER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."provider_capability_enum" AS ENUM ('VIRTUAL_ACCOUNT', 'NAME_ENQUIRY', 'TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."purpose_enum" AS ENUM ('SIGNUP', 'PASSWORD_RESET', 'LOGIN', 'PHONE_CHANGE', 'EMAIL_CHANGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."reconciliation_status" AS ENUM ('BALANCED', 'MISMATCHED_DRIFT', 'UNRECONCILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."reserve_status" AS ENUM ('active', 'released_success', 'released_failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."settlement_state_enum" AS ENUM ('REPORTED', 'RECEIVED', 'VERIFIED', 'SETTLED', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."transfer_attempt_status_enum" AS ENUM ('ATTEMPT_PENDING', 'ATTEMPT_SENT', 'ATTEMPT_TIMEOUT', 'ATTEMPT_FAILED', 'ATTEMPT_SUCCESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."transfer_status_enum" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'INVESTIGATION', 'REVERSAL_PENDING', 'REVERSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."treasury_account_type" AS ENUM ('MERCHANT_TREASURY', 'PLATFORM_TREASURY', 'AGENT_TREASURY', 'RESERVE_TREASURY', 'ESCROW_TREASURY', 'PAYSTACK_SETTLEMENT', 'FLUTTERWAVE_SETTLEMENT', 'PROVIDUS_SETTLEMENT', 'WEMA_SETTLEMENT', 'NIBSS_SETTLEMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."treasury_status_enum" AS ENUM ('ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."virtual_account_type_enum" AS ENUM ('STATIC', 'DYNAMIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."webhook_verification_status" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'REPLAY_REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public."withdrawal_status_enum" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== SEQUENCES ==========
CREATE SEQUENCE IF NOT EXISTS public."onboarding_settings_id_seq";

-- ========== TABLES ==========
CREATE TABLE IF NOT EXISTS public."banks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nip_bank_code" varchar(10) NOT NULL,
  "bank_name" varchar(150) NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "effective_from" timestamptz DEFAULT now() NOT NULL,
  "effective_to" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."billing_audit_journal" (
  "audit_id" varchar(50) NOT NULL,
  "timestamp" timestamptz DEFAULT now() NOT NULL,
  "operator" varchar(100) NOT NULL,
  "action" varchar(100) NOT NULL,
  "fee_class" varchar(100) NOT NULL,
  "previous_value" varchar(50),
  "new_value" varchar(50),
  "effective_date" timestamptz,
  "reason" text,
  "tamper_check_hash" varchar(100),
  CONSTRAINT "billing_audit_journal_pkey" PRIMARY KEY ("audit_id")
);

CREATE TABLE IF NOT EXISTS public."daily_reconciliation_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recon_date" date NOT NULL,
  "ledger_total" numeric(15,2) NOT NULL,
  "treasury_total" numeric(15,2) NOT NULL,
  "mismatch_amount" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "status" public.reconciliation_status DEFAULT 'UNRECONCILED'::reconciliation_status NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "daily_reconciliation_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."device_alerts" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "device_id" varchar(255) NOT NULL,
  "tenant_id" uuid NOT NULL,
  "alert_type" varchar(100) NOT NULL,
  "message" text NOT NULL,
  "severity" varchar(50) DEFAULT 'CRITICAL'::character varying,
  "is_resolved" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "device_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."device_status" (
  "device_id" varchar(255) NOT NULL,
  "tenant_id" uuid NOT NULL,
  "battery_level" integer,
  "is_charging" boolean DEFAULT false,
  "network_status" varchar(50),
  "sim_operator" varchar(100),
  "sim_network_type" varchar(50),
  "uptime" bigint,
  "last_seen" timestamptz DEFAULT now(),
  "location" jsonb,
  "telemetry_seq" bigint DEFAULT 0,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "device_status_pkey" PRIMARY KEY ("device_id")
);

CREATE TABLE IF NOT EXISTS public."device_telemetry" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "device_id" varchar(255) NOT NULL,
  "tenant_id" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  "battery_level" integer,
  "network_status" varchar(50),
  "uptime" bigint,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "device_telemetry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."devices" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "device_id" text NOT NULL,
  "tenant_id" text,
  "device_name" text,
  "platform" text,
  "is_active" boolean DEFAULT true,
  "last_seen" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now(),
  "device_category" varchar(20) DEFAULT 'USER_DEVICE'::character varying,
  "device_role" varchar(20) DEFAULT 'PHONE'::character varying,
  "status" varchar(20) DEFAULT 'active'::character varying,
  "device_suffix" varchar(20),
  "device_info" jsonb,
  "theme_color" varchar(20),
  "inventory_record_id" uuid,
  CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."finance_settings" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "min_withdrawal_amount" numeric(15,2) DEFAULT 5000.00,
  "max_withdrawal_amount" numeric(15,2) DEFAULT 5000000.00,
  "withdrawal_fee" numeric(15,2) DEFAULT 0.00,
  "updated_at" timestamptz DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "finance_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."financial_execution_locks" (
  "lock_key" varchar(255) NOT NULL,
  "owner_id" uuid NOT NULL,
  "acquired_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "financial_execution_locks_pkey" PRIMARY KEY ("lock_key")
);

CREATE TABLE IF NOT EXISTS public."incoming_webhook_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_type" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "signature_header" text NOT NULL,
  "status" public.webhook_verification_status DEFAULT 'PENDING_VERIFICATION'::webhook_verification_status NOT NULL,
  "provider_event_id" varchar(255) NOT NULL,
  "payload_hash" varchar(64) NOT NULL,
  "verification_algorithm" varchar(50),
  "verification_result" text,
  "verified_at" timestamptz,
  "received_at" timestamptz DEFAULT now() NOT NULL,
  "replay_window_seconds" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz,
  CONSTRAINT "incoming_webhook_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."integration_vault" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "service_identifier" varchar(100) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "category" varchar(100) NOT NULL,
  "scope" varchar(50) DEFAULT 'GLOBAL'::character varying NOT NULL,
  "tenant_id" uuid,
  "status" varchar(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_vault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."onboarding_settings" (
  "id" integer DEFAULT nextval('onboarding_settings_id_seq'::regclass) NOT NULL,
  "required_channels" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT "onboarding_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."platform_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "platform_name" varchar(100) NOT NULL,
  "support_email" varchar(150),
  "timezone" varchar(50) DEFAULT 'UTC'::character varying,
  "is_maintenance_locked" boolean DEFAULT false,
  "maintenance_message" text,
  "require_mfa" boolean DEFAULT true,
  "strict_ip_binding" boolean DEFAULT false,
  "enforce_device_control" boolean DEFAULT false,
  "session_timeout" integer DEFAULT 15,
  "audit_archive_hours" integer DEFAULT 72,
  "primary_color" varchar(20) DEFAULT '#00d2ff'::character varying,
  "logo_url" text,
  "hide_invify_watermark" boolean DEFAULT false,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."pos_gateway_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "terminal_id" varchar(50),
  "transaction_type" varchar(50),
  "raw_request" text,
  "raw_response" text,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "pos_gateway_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_bank_mappings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "bank_id" uuid NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "provider_bank_code" varchar(20) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_bank_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_capabilities" (
  "provider" public.banking_provider_enum NOT NULL,
  "supports_virtual_accounts" boolean DEFAULT false NOT NULL,
  "supports_name_enquiry" boolean DEFAULT false NOT NULL,
  "supports_nip_transfer" boolean DEFAULT false NOT NULL,
  "supports_bulk_transfer" boolean DEFAULT false NOT NULL,
  "supports_webhooks" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_capabilities_pkey" PRIMARY KEY ("provider")
);

CREATE TABLE IF NOT EXISTS public."provider_clearing_profiles" (
  "provider" public.banking_provider_enum NOT NULL,
  "transfer_fee_flat" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "transfer_fee_percent" numeric(5,2) DEFAULT 0.00 NOT NULL,
  "min_transfer_limit" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "max_transfer_limit" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_clearing_profiles_pkey" PRIMARY KEY ("provider")
);

CREATE TABLE IF NOT EXISTS public."provider_credentials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key_version" varchar(50) NOT NULL,
  "public_key" text,
  "vault_key_reference" varchar(255) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "rotated_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "environment" varchar(50) DEFAULT 'staging'::character varying NOT NULL,
  "status" varchar(50) DEFAULT 'ACTIVE'::character varying,
  CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_daily_limits" (
  "provider" public.banking_provider_enum NOT NULL,
  "daily_limit" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "consumed_today" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "remaining_capacity" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "reset_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_daily_limits_pkey" PRIMARY KEY ("provider")
);

CREATE TABLE IF NOT EXISTS public."provider_environments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "environment" varchar(50) DEFAULT 'staging'::character varying NOT NULL,
  "base_url" varchar(255) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "supports_live_funds" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_environments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_health_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "old_state" public.circuit_state_enum NOT NULL,
  "new_state" public.circuit_state_enum NOT NULL,
  "reason_code" varchar(100) NOT NULL,
  "details" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_health_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_health_registry" (
  "is_active" boolean DEFAULT true NOT NULL,
  "error_rate_pct" numeric(5,2) DEFAULT 0.00 NOT NULL,
  "avg_latency_ms" integer DEFAULT 0 NOT NULL,
  "health_score" numeric(5,2) DEFAULT 100.00 NOT NULL,
  "circuit_state" public.circuit_state_enum DEFAULT 'CLOSED'::circuit_state_enum NOT NULL,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "last_failure_at" timestamptz,
  "next_retry_at" timestamptz,
  "last_pinged_at" timestamptz DEFAULT now(),
  "maintenance_mode" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public."provider_settlement_batches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "batch_reference" varchar(255) NOT NULL,
  "provider_type" varchar(100) NOT NULL,
  "total_records" integer DEFAULT 0 NOT NULL,
  "total_amount" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "processed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_settlement_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."school_entities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "sync_id" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "school_entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."schools" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "webhook_secret" text DEFAULT encode(gen_random_bytes(32), 'hex'::text) NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."security_context_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "scenario" varchar(255) NOT NULL,
  "current_user_val" varchar(255) NOT NULL,
  "session_user_val" varchar(255) NOT NULL,
  "auth_role_val" varchar(255) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "security_context_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."subscriptions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "plan" text DEFAULT 'standard'::text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "start_date" timestamptz DEFAULT now(),
  "end_date" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."system_configurations" (
  "config_key" varchar(100) NOT NULL,
  "config_value" jsonb NOT NULL,
  "value_type" public.config_value_type DEFAULT 'string'::config_value_type NOT NULL,
  "category" varchar(50),
  "description" text,
  "is_system_reserved" boolean DEFAULT false,
  "requires_restart" boolean DEFAULT false,
  "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  "updated_by" uuid,
  CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("config_key")
);

CREATE TABLE IF NOT EXISTS public."tenants" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" varchar(50),
  "plan" varchar(50),
  "status" varchar(50) DEFAULT 'active'::character varying,
  "quaser_api_key" varchar(255),
  "virtual_account_number" varchar(50),
  "virtual_account_bank" varchar(100),
  "virtual_account_status" varchar(50),
  "onboarded_at" timestamptz,
  "last_active_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "kyc_status" varchar(50) DEFAULT 'PENDING'::character varying,
  "tenant_code" varchar(20),
  "agent_code" varchar(20),
  "location" text,
  "phone" text,
  "owner_email" text,
  "owner_name" text,
  "support_phone" text,
  "support_email" text,
  "support_whatsapp" text,
  "emergency_lock_code" text,
  "is_emergency_locked" boolean DEFAULT false,
  "settings" jsonb,
  "device_count" integer DEFAULT 1 NOT NULL,
  "country" text,
  "state" text,
  "lga" text,
  "street_address" text,
  "system_access_password" text,
  "system_access_password_updated_at" timestamptz,
  "plan_expires_at" timestamptz,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."terminal_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "action_type" varchar(50) NOT NULL,
  "terminal_id" varchar(50),
  "mpos_terminal_id" varchar(50),
  "old_device_id" varchar(200),
  "new_device_id" varchar(200),
  "admin_id" varchar(200),
  "reason" text,
  "ip_address" varchar(50),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "terminal_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."terminal_inventory" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "terminal_id" varchar(50) NOT NULL,
  "mpos_terminal_id" varchar(50),
  "business_name" varchar(200),
  "pos_serial_number" varchar(100),
  "account_number" varchar(100),
  "account_name" varchar(200),
  "mobile_number" varchar(20),
  "email" varchar(200),
  "terminal_type" varchar(20) DEFAULT 'N3'::character varying,
  "assigned_device_id" varchar(200),
  "assigned_tenant_id" uuid,
  "assignment_status" varchar(20) DEFAULT 'unassigned'::character varying,
  "assigned_at" timestamptz,
  "unassigned_at" timestamptz,
  "uploaded_batch_id" varchar(100),
  "uploaded_by" varchar(200),
  "last_sync_at" timestamptz,
  "config_version" integer DEFAULT 1,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "printer_mac_address" varchar(50),
  "printer_model" varchar(100),
  "merchant_id" varchar(50),
  "bank_name" varchar(100),
  CONSTRAINT "terminal_inventory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."treasury_accounts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "account_type" public.treasury_account_type NOT NULL,
  "owner_type" public.owner_type_enum NOT NULL,
  "status" public.treasury_status_enum DEFAULT 'ACTIVE'::treasury_status_enum NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid,
  "agent_id" uuid,
  "provider_id" uuid,
  CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."users" (
  "id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "role" varchar(50) DEFAULT 'TENANT_OPERATOR'::character varying NOT NULL,
  "tenant_id" varchar(255),
  "is_active" boolean DEFAULT true,
  "require_password_reset" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "name" text,
  "mfa_secret" text,
  "mfa_enabled" boolean DEFAULT false NOT NULL,
  "virtual_account_number" varchar(255),
  "virtual_account_bank" varchar(255),
  "virtual_account_name" varchar(255),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."vault_credentials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(150) NOT NULL,
  "environment" varchar(50) DEFAULT 'production'::character varying,
  "secret_type" varchar(50) NOT NULL,
  "mock_plaintext" varchar(255),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "vault_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."verification_codes" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "tenant_id" uuid,
  "email" varchar(255),
  "phone" varchar(50),
  "code" varchar(255) NOT NULL,
  "channel" public.channel_enum NOT NULL,
  "purpose" public.purpose_enum NOT NULL,
  "attempt_count" integer DEFAULT 0,
  "expires_at" timestamptz NOT NULL,
  "verified_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "status" text DEFAULT 'pending'::text,
  "plain_code" varchar(6),
  CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."wallet_ledger" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "agent_id" uuid NOT NULL,
  "commission_event_id" uuid,
  "reference_type" varchar(50) NOT NULL,
  "reference_id" uuid NOT NULL,
  "transaction_type" public.ledger_type_enum NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "description" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."whatsapp_otps" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "phone_number" varchar(20) NOT NULL,
  "otp_hash" varchar(255) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "attempts" integer DEFAULT 0,
  "verified" boolean DEFAULT false,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_otps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."withdrawal_audit_logs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "withdrawal_id" uuid NOT NULL,
  "old_status" public.withdrawal_status_enum,
  "new_status" public.withdrawal_status_enum NOT NULL,
  "changed_by" uuid NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "withdrawal_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."beneficiaries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "bank_code" varchar(5) NOT NULL,
  "account_number" varchar(20) NOT NULL,
  "account_name" varchar(255) NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "verified_at" timestamptz,
  "verified_by" uuid,
  "verification_provider" varchar(50),
  "verification_reference" varchar(255),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."configuration_versions" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "config_key" varchar(100),
  "old_value" jsonb,
  "new_value" jsonb NOT NULL,
  "changed_by" uuid,
  "changed_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuration_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."customers" (
  "id" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "phone" varchar(255),
  "email" varchar(255),
  "address" varchar(255),
  "image" bytea,
  "balance" double precision DEFAULT 0,
  "virtual_account_number" varchar(255),
  "virtual_account_name" varchar(255),
  "virtual_account_bank" varchar(255),
  "created_at" timestamp DEFAULT now(),
  "sync_status" varchar(255),
  "tenant_id" uuid,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."device_activations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "activation_code" varchar(50) NOT NULL,
  "tenant_id" uuid NOT NULL,
  "duration_days" integer DEFAULT 30 NOT NULL,
  "plan_index" integer DEFAULT 0,
  "device_suffix" varchar(20) DEFAULT '0'::character varying,
  "device_id" text,
  "status" varchar(20) DEFAULT 'pending'::character varying,
  "is_used" boolean DEFAULT false,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "used_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "device_activations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."fee_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ledger_entry_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "gross_amount" numeric(15,2) NOT NULL,
  "fee_percentage_bps" integer NOT NULL,
  "total_fee_deducted" numeric(15,2) NOT NULL,
  "platform_revenue_share" numeric(15,2) NOT NULL,
  "agent_commission_share" numeric(15,2) NOT NULL,
  "agent_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "fee_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."financial_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_type" public.financial_event_type_enum NOT NULL,
  "state" public.financial_event_state_enum DEFAULT 'INITIALIZED'::financial_event_state_enum NOT NULL,
  "idempotency_key" varchar(255),
  "reference" varchar(255) NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid,
  "agent_id" uuid,
  "created_by" uuid,
  "type" varchar(50),
  "wallet_id" uuid,
  "amount" numeric,
  CONSTRAINT "financial_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."financial_freezes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "freeze_type" public.freeze_type_enum NOT NULL,
  "freeze_scope" public.freeze_scope_enum DEFAULT 'FULL_ACCOUNT'::freeze_scope_enum NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "reason_code" varchar(100) NOT NULL,
  "created_by" uuid,
  "approved_by" uuid,
  "released_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "released_at" timestamptz,
  CONSTRAINT "financial_freezes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."integration_credentials" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "vault_id" uuid NOT NULL,
  "credential_type" varchar(100) NOT NULL,
  "environment" varchar(50) DEFAULT 'PRODUCTION'::character varying NOT NULL,
  "status" varchar(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
  "key_name" varchar(100) NOT NULL,
  "encrypted_value" text NOT NULL,
  "iv" text NOT NULL,
  "auth_tag" text NOT NULL,
  "key_version" varchar(50) DEFAULT 'v1'::character varying NOT NULL,
  "expires_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" timestamptz,
  CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."integration_health_logs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "vault_id" uuid NOT NULL,
  "environment" varchar(50) DEFAULT 'PRODUCTION'::character varying NOT NULL,
  "status" varchar(50) NOT NULL,
  "latency_ms" integer,
  "error_message" text,
  "checked_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_health_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."pos_transaction_attempts" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "terminal_id" varchar(50) NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "status" varchar(20) DEFAULT 'Pending'::character varying NOT NULL,
  "status_code" varchar(10),
  "host" varchar(50),
  "masked_pan" varchar(20),
  "rrn" varchar(50),
  "stan" varchar(20),
  "auth_code" varchar(50),
  "staff_name" varchar(100),
  "items_jsonb" jsonb,
  "raw_request" jsonb,
  "raw_response" jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "settlement_status" varchar(20) DEFAULT 'unsettled'::character varying NOT NULL,
  "settled_at" timestamptz,
  "settlement_batch_id" uuid,
  "settlement_processor" varchar(80),
  CONSTRAINT "pos_transaction_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_api_audit_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "capability" public.provider_capability_enum NOT NULL,
  "financial_event_id" uuid,
  "request_hash" varchar(64) NOT NULL,
  "response_hash" varchar(64) NOT NULL,
  "status_code" integer NOT NULL,
  "latency_ms" integer NOT NULL,
  "request_type" varchar(50) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_api_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_balance_snapshots" (
  "provider" public.banking_provider_enum NOT NULL,
  "available_balance" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_balance_snapshots_pkey" PRIMARY KEY ("provider")
);

CREATE TABLE IF NOT EXISTS public."provider_routing_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "preferred_va_provider" public.banking_provider_enum NOT NULL,
  "preferred_transfer_provider" public.banking_provider_enum NOT NULL,
  "preferred_settlement_provider" public.banking_provider_enum NOT NULL,
  "priority_order" banking_provider_enum[] DEFAULT '{PROVIDUS,WEMA,PAYSTACK,FLUTTERWAVE}'::banking_provider_enum[] NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "provider_routing_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."provider_settlements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "status" public.settlement_state_enum DEFAULT 'REPORTED'::settlement_state_enum NOT NULL,
  "provider_account_ref" varchar(255) NOT NULL,
  "provider_settlement_reference" varchar(255) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "provider_type" varchar(100) NOT NULL,
  "provider_account_id" uuid NOT NULL,
  "batch_id" uuid,
  CONSTRAINT "provider_settlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quasar_integrations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invify_tenant_id" uuid NOT NULL,
  "quasar_tenant_id" varchar(64) NOT NULL,
  "quasar_tenant_slug" varchar(128) NOT NULL,
  "quasar_tenant_code" varchar(32) NOT NULL,
  "quasar_vertical" varchar(32) NOT NULL,
  "quasar_public_key" text,
  "quasar_sk_secret_enc" text NOT NULL,
  "quasar_environment" varchar(8) DEFAULT 'test'::character varying NOT NULL,
  "quasar_webhook_endpoint_id" varchar(64),
  "quasar_webhook_signing_secret_enc" text,
  "status" varchar(16) DEFAULT 'provisioned'::character varying NOT NULL,
  "quasar_provisioned_at" timestamptz DEFAULT now() NOT NULL,
  "quasar_webhook_registered_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "quasar_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quasar_verification_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "withdrawal_id" uuid NOT NULL,
  "signed_token" text NOT NULL,
  "nonce" varchar(100) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "verification_status" varchar(50) DEFAULT 'PENDING'::character varying NOT NULL,
  "tenant_id" uuid NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "issued_by" uuid,
  "verification_hash" varchar(64) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "quasar_verification_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quasar_verification_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "verification_request_id" uuid NOT NULL,
  "result_status" varchar(50) NOT NULL,
  "reason_code" varchar(100) NOT NULL,
  "response_payload_hash" varchar(64) NOT NULL,
  "decision_type" varchar(50) NOT NULL,
  "verified_at" timestamptz DEFAULT now() NOT NULL,
  "consumed_at" timestamptz,
  "execution_reference" uuid,
  CONSTRAINT "quasar_verification_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."reserved_funds" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "reason" varchar(100) NOT NULL,
  "status" public.reserve_status DEFAULT 'active'::reserve_status NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "released_at" timestamptz,
  CONSTRAINT "reserved_funds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."settlement_discrepancies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_settlement_id" uuid NOT NULL,
  "financial_event_id" uuid,
  "discrepancy_type" varchar(50) NOT NULL,
  "expected_amount" numeric(15,2) NOT NULL,
  "actual_amount" numeric(15,2) NOT NULL,
  "resolved" boolean DEFAULT false NOT NULL,
  "resolved_by" uuid,
  "resolved_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "settlement_discrepancies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."students" (
  "id" uuid NOT NULL,
  "school_id" uuid,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "admission_number" text NOT NULL,
  "current_class" text,
  "running_balance" numeric DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "tenant_id" uuid,
  "virtual_account_number" varchar(255),
  "virtual_account_bank" varchar(255),
  "virtual_account_status" varchar(50),
  CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."subscription_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "subscription_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "event_type" varchar(20) NOT NULL,
  "days_added" integer DEFAULT 0,
  "performed_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."tenant_fee_profile_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "old_config" jsonb,
  "new_config" jsonb NOT NULL,
  "changed_by" uuid,
  "changed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_fee_profile_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."tenant_fee_profiles" (
  "tenant_id" uuid NOT NULL,
  "card_inward_fee_bps" integer,
  "card_inward_fee_cap" numeric(15,2),
  "card_inward_agent_share_bps" integer,
  "transfer_inward_fee_bps" integer,
  "transfer_inward_fee_cap" numeric(15,2),
  "transfer_inward_agent_share_bps" integer,
  "withdrawal_outward_fee_bps" integer,
  "withdrawal_outward_fee_cap" numeric(15,2),
  "withdrawal_outward_agent_share_bps" integer,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_fee_profiles_pkey" PRIMARY KEY ("tenant_id")
);

CREATE TABLE IF NOT EXISTS public."tenant_kyc_documents" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "document_type" varchar(50) NOT NULL,
  "document_url" varchar NOT NULL,
  "status" varchar(50) DEFAULT 'PENDING'::character varying,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "tenant_kyc_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."treasury_journal_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "treasury_account_id" uuid NOT NULL,
  "direction" varchar(6) NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "treasury_journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."treasury_movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "source_account_id" uuid,
  "destination_account_id" uuid,
  "amount" numeric(15,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "treasury_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."bank_transfer_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "beneficiary_id" uuid NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "status" public.transfer_status_enum DEFAULT 'PENDING'::transfer_status_enum NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN'::character varying NOT NULL,
  "fee_amount" numeric(15,2) DEFAULT 0.00 NOT NULL,
  "net_amount" numeric(15,2) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "bank_transfer_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."bank_virtual_accounts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "account_type" public.virtual_account_type_enum NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "bank_name" varchar(100) NOT NULL,
  "account_number" varchar(20) NOT NULL,
  "account_name" varchar(255) NOT NULL,
  "expires_at" timestamptz,
  "financial_event_id" uuid,
  "reference_type" varchar(50),
  "reference_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "bank_virtual_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."financial_consistency_audits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "financial_event_id" uuid,
  "tenant_id" uuid,
  "severity" public.audit_severity NOT NULL,
  "mismatch_type" varchar(100) NOT NULL,
  "details" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "financial_consistency_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."financial_event_state_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "financial_event_id" uuid NOT NULL,
  "old_state" public.financial_event_state_enum,
  "new_state" public.financial_event_state_enum NOT NULL,
  "changed_by" uuid,
  "changed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "financial_event_state_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."student_virtual_accounts" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "student_id" uuid,
  "school_id" uuid,
  "quasar_account_id" text NOT NULL,
  "account_number" text NOT NULL,
  "bank_name" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "student_virtual_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."bank_transfer_attempts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "transfer_log_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "provider" public.banking_provider_enum NOT NULL,
  "provider_reference" varchar(255) NOT NULL,
  "status" public.transfer_attempt_status_enum DEFAULT 'ATTEMPT_PENDING'::transfer_attempt_status_enum NOT NULL,
  "error_code" varchar(100),
  "error_message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "bank_transfer_attempts_pkey" PRIMARY KEY ("id")
);

-- ========== CHECK / UNIQUE ==========
DO $$ BEGIN ALTER TABLE public."bank_transfer_attempts" ADD CONSTRAINT "bank_transfer_attempts_attempt_number_check" CHECK ((attempt_number > 0)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_attempts" ADD CONSTRAINT "uq_provider_attempt_ref" UNIQUE (provider, provider_reference); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_attempts" ADD CONSTRAINT "uq_transfer_attempt" UNIQUE (transfer_log_id, attempt_number); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "bank_transfer_logs_amount_check" CHECK ((amount > (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "bank_transfer_logs_fee_amount_check" CHECK ((fee_amount >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "bank_transfer_logs_net_amount_check" CHECK ((net_amount > (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "chk_net_amount_snapshot" CHECK ((net_amount = (amount - fee_amount))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_virtual_accounts" ADD CONSTRAINT "uq_provider_account" UNIQUE (provider, account_number); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."banks" ADD CONSTRAINT "chk_banks_effective_dates" CHECK (((effective_to IS NULL) OR (effective_to > effective_from))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."banks" ADD CONSTRAINT "uq_bank_code_version" UNIQUE (nip_bank_code, version); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."beneficiaries" ADD CONSTRAINT "uq_tenant_beneficiary" UNIQUE (tenant_id, bank_code, account_number); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."daily_reconciliation_reports" ADD CONSTRAINT "daily_reconciliation_reports_recon_date_key" UNIQUE (recon_date); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."device_activations" ADD CONSTRAINT "device_activations_activation_code_key" UNIQUE (activation_code); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."device_status" ADD CONSTRAINT "device_status_battery_level_check" CHECK (((battery_level >= 0) AND (battery_level <= 100))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."device_telemetry" ADD CONSTRAINT "device_telemetry_battery_level_check" CHECK (((battery_level >= 0) AND (battery_level <= 100))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."devices" ADD CONSTRAINT "chk_device_category" CHECK (((device_category)::text = ANY ((ARRAY['USER_DEVICE'::character varying, 'COMPANY_DEVICE'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."devices" ADD CONSTRAINT "chk_device_role" CHECK (((device_role)::text = ANY ((ARRAY['PHONE'::character varying, 'TABLET'::character varying, 'MPOS'::character varying, 'PRINTER'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."devices" ADD CONSTRAINT "devices_device_id_key" UNIQUE (device_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_agent_commission_share_check" CHECK ((agent_commission_share >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_fee_percentage_bps_check" CHECK ((fee_percentage_bps >= 0)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_gross_amount_check" CHECK ((gross_amount >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_ledger_entry_id_key" UNIQUE (ledger_entry_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_platform_revenue_share_check" CHECK ((platform_revenue_share >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_total_fee_deducted_check" CHECK ((total_fee_deducted >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."finance_settings" ADD CONSTRAINT "finance_settings_max_withdrawal_amount_check" CHECK ((max_withdrawal_amount >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."finance_settings" ADD CONSTRAINT "finance_settings_min_withdrawal_amount_check" CHECK ((min_withdrawal_amount >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."finance_settings" ADD CONSTRAINT "finance_settings_withdrawal_fee_check" CHECK ((withdrawal_fee >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_events" ADD CONSTRAINT "financial_events_idempotency_key_key" UNIQUE (idempotency_key); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."integration_vault" ADD CONSTRAINT "integration_vault_service_identifier_key" UNIQUE (service_identifier); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_api_audit_logs" ADD CONSTRAINT "provider_api_audit_logs_latency_ms_check" CHECK ((latency_ms >= 0)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_api_audit_logs" ADD CONSTRAINT "provider_api_audit_logs_request_type_check" CHECK (((request_type)::text = ANY ((ARRAY['NAME_ENQUIRY'::character varying, 'TRANSFER'::character varying, 'WEBHOOK'::character varying, 'VA_CREATION'::character varying, 'TRANSFER_STATUS'::character varying, 'SETTLEMENT_IMPORT'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_balance_snapshots" ADD CONSTRAINT "provider_balance_snapshots_available_balance_check" CHECK ((available_balance >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_bank_mappings" ADD CONSTRAINT "uq_provider_bank_map" UNIQUE (bank_id, provider); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_clearing_profiles" ADD CONSTRAINT "provider_clearing_profiles_check" CHECK ((max_transfer_limit >= min_transfer_limit)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_clearing_profiles" ADD CONSTRAINT "provider_clearing_profiles_min_transfer_limit_check" CHECK ((min_transfer_limit >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_clearing_profiles" ADD CONSTRAINT "provider_clearing_profiles_transfer_fee_flat_check" CHECK ((transfer_fee_flat >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_clearing_profiles" ADD CONSTRAINT "provider_clearing_profiles_transfer_fee_percent_check" CHECK ((transfer_fee_percent >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_credentials" ADD CONSTRAINT "provider_credentials_status_check" CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ROTATING'::character varying, 'RETIRED'::character varying, 'COMPROMISED'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_credentials" ADD CONSTRAINT "uq_provider_env_key_version" UNIQUE (provider, environment, key_version); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_daily_limits" ADD CONSTRAINT "chk_remaining_capacity" CHECK ((remaining_capacity = (daily_limit - consumed_today))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_daily_limits" ADD CONSTRAINT "provider_daily_limits_consumed_today_check" CHECK ((consumed_today >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_daily_limits" ADD CONSTRAINT "provider_daily_limits_daily_limit_check" CHECK ((daily_limit >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_daily_limits" ADD CONSTRAINT "provider_daily_limits_remaining_capacity_check" CHECK ((remaining_capacity >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_environments" ADD CONSTRAINT "provider_environments_environment_check" CHECK (((environment)::text = ANY ((ARRAY['staging'::character varying, 'production'::character varying, 'sandbox'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_environments" ADD CONSTRAINT "uq_provider_env" UNIQUE (provider, environment); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_health_registry" ADD CONSTRAINT "provider_health_registry_consecutive_failures_check" CHECK ((consecutive_failures >= 0)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_routing_profiles" ADD CONSTRAINT "uq_tenant_routing_profile" UNIQUE (tenant_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_settlement_batches" ADD CONSTRAINT "provider_settlement_batches_batch_reference_key" UNIQUE (batch_reference); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_settlements" ADD CONSTRAINT "provider_settlements_amount_check" CHECK ((amount > (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_settlements" ADD CONSTRAINT "provider_settlements_provider_settlement_reference_key" UNIQUE (provider_settlement_reference); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_integrations" ADD CONSTRAINT "quasar_integrations_quasar_environment_check" CHECK (((quasar_environment)::text = ANY ((ARRAY['test'::character varying, 'live'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_integrations" ADD CONSTRAINT "quasar_integrations_quasar_vertical_check" CHECK (((quasar_vertical)::text = ANY ((ARRAY['invify_retail'::character varying, 'invify_school'::character varying, 'invify_services'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_integrations" ADD CONSTRAINT "quasar_integrations_status_check" CHECK (((status)::text = ANY ((ARRAY['provisioned'::character varying, 'active'::character varying, 'suspended'::character varying, 'error'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_requests" ADD CONSTRAINT "quasar_verification_requests_nonce_key" UNIQUE (nonce); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_requests" ADD CONSTRAINT "quasar_verification_requests_verification_status_check" CHECK (((verification_status)::text = ANY ((ARRAY['PENDING'::character varying, 'VERIFIED'::character varying, 'EXPIRED'::character varying, 'FAILED'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_requests" ADD CONSTRAINT "uq_quasar_verification_requests_nonce" UNIQUE (nonce); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_results" ADD CONSTRAINT "quasar_verification_results_decision_type_check" CHECK (((decision_type)::text = ANY ((ARRAY['APPROVED'::character varying, 'TREASURY_REJECTED'::character varying, 'LIQUIDITY_REJECTED'::character varying, 'RISK_REJECTED'::character varying, 'PROVIDER_REJECTED'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_results" ADD CONSTRAINT "quasar_verification_results_result_status_check" CHECK (((result_status)::text = ANY ((ARRAY['VERIFIED'::character varying, 'EXPIRED'::character varying, 'FAILED'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_results" ADD CONSTRAINT "uq_quasar_verification_request" UNIQUE (verification_request_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."reserved_funds" ADD CONSTRAINT "reserved_funds_amount_check" CHECK ((amount > (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."reserved_funds" ADD CONSTRAINT "reserved_funds_financial_event_id_key" UNIQUE (financial_event_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."reserved_funds" ADD CONSTRAINT "reserved_funds_reason_check" CHECK (((reason)::text = ANY ((ARRAY['withdrawal_hold'::character varying, 'chargeback_risk'::character varying, 'settlement_hold'::character varying, 'dispute_lock'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."school_entities" ADD CONSTRAINT "school_entities_tenant_id_entity_type_sync_id_key" UNIQUE (tenant_id, entity_type, sync_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."settlement_discrepancies" ADD CONSTRAINT "settlement_discrepancies_discrepancy_type_check" CHECK (((discrepancy_type)::text = ANY ((ARRAY['UNDER_SETTLEMENT'::character varying, 'OVER_SETTLEMENT'::character varying, 'DUPLICATE'::character varying, 'MISSING'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."students" ADD CONSTRAINT "students_school_id_admission_number_key" UNIQUE (school_id, admission_number); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_card_inward_agent_share_bps_check" CHECK (((card_inward_agent_share_bps IS NULL) OR ((card_inward_agent_share_bps >= 0) AND (card_inward_agent_share_bps <= 10000)))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_card_inward_fee_bps_check" CHECK (((card_inward_fee_bps IS NULL) OR (card_inward_fee_bps >= 0))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_card_inward_fee_cap_check" CHECK (((card_inward_fee_cap IS NULL) OR (card_inward_fee_cap >= (0)::numeric))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_transfer_inward_agent_share_bps_check" CHECK (((transfer_inward_agent_share_bps IS NULL) OR ((transfer_inward_agent_share_bps >= 0) AND (transfer_inward_agent_share_bps <= 10000)))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_transfer_inward_fee_bps_check" CHECK (((transfer_inward_fee_bps IS NULL) OR (transfer_inward_fee_bps >= 0))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_transfer_inward_fee_cap_check" CHECK (((transfer_inward_fee_cap IS NULL) OR (transfer_inward_fee_cap >= (0)::numeric))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_withdrawal_outward_agent_share_bps_check" CHECK (((withdrawal_outward_agent_share_bps IS NULL) OR ((withdrawal_outward_agent_share_bps >= 0) AND (withdrawal_outward_agent_share_bps <= 10000)))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_withdrawal_outward_fee_bps_check" CHECK (((withdrawal_outward_fee_bps IS NULL) OR (withdrawal_outward_fee_bps >= 0))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_withdrawal_outward_fee_cap_check" CHECK (((withdrawal_outward_fee_cap IS NULL) OR (withdrawal_outward_fee_cap >= (0)::numeric))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenants" ADD CONSTRAINT "tenants_tenant_code_key" UNIQUE (tenant_code); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."terminal_inventory" ADD CONSTRAINT "terminal_inventory_assignment_status_check" CHECK (((assignment_status)::text = ANY ((ARRAY['unassigned'::character varying, 'assigned'::character varying, 'suspended'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_accounts" ADD CONSTRAINT "chk_ownership_integrity" CHECK ((((owner_type = 'SYSTEM'::owner_type_enum) AND (tenant_id IS NULL) AND (agent_id IS NULL) AND (provider_id IS NULL)) OR ((owner_type = 'TENANT'::owner_type_enum) AND (tenant_id IS NOT NULL) AND (agent_id IS NULL) AND (provider_id IS NULL)) OR ((owner_type = 'AGENT'::owner_type_enum) AND (tenant_id IS NULL) AND (agent_id IS NOT NULL) AND (provider_id IS NULL)) OR ((owner_type = 'PROVIDER'::owner_type_enum) AND (tenant_id IS NULL) AND (agent_id IS NULL) AND (provider_id IS NOT NULL)))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_journal_entries" ADD CONSTRAINT "treasury_journal_entries_amount_check" CHECK ((amount > (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_journal_entries" ADD CONSTRAINT "treasury_journal_entries_direction_check" CHECK (((direction)::text = ANY ((ARRAY['debit'::character varying, 'credit'::character varying])::text[]))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_movements" ADD CONSTRAINT "treasury_movements_amount_check" CHECK ((amount > (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."wallet_ledger" ADD CONSTRAINT "wallet_ledger_amount_check" CHECK ((amount >= (0)::numeric)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== FOREIGN KEYS ==========
DO $$ BEGIN ALTER TABLE public."bank_transfer_attempts" ADD CONSTRAINT "bank_transfer_attempts_transfer_log_id_fkey" FOREIGN KEY (transfer_log_id) REFERENCES bank_transfer_logs(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "bank_transfer_logs_beneficiary_id_fkey" FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "bank_transfer_logs_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_transfer_logs" ADD CONSTRAINT "bank_transfer_logs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_virtual_accounts" ADD CONSTRAINT "bank_virtual_accounts_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."bank_virtual_accounts" ADD CONSTRAINT "bank_virtual_accounts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."beneficiaries" ADD CONSTRAINT "beneficiaries_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."beneficiaries" ADD CONSTRAINT "beneficiaries_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."configuration_versions" ADD CONSTRAINT "configuration_versions_config_key_fkey" FOREIGN KEY (config_key) REFERENCES system_configurations(config_key) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."device_activations" ADD CONSTRAINT "device_activations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."fee_transactions" ADD CONSTRAINT "fee_transactions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_consistency_audits" ADD CONSTRAINT "financial_consistency_audits_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_consistency_audits" ADD CONSTRAINT "financial_consistency_audits_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_event_state_history" ADD CONSTRAINT "financial_event_state_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_event_state_history" ADD CONSTRAINT "financial_event_state_history_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_events" ADD CONSTRAINT "financial_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_events" ADD CONSTRAINT "financial_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_freezes" ADD CONSTRAINT "financial_freezes_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_freezes" ADD CONSTRAINT "financial_freezes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_freezes" ADD CONSTRAINT "financial_freezes_released_by_fkey" FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."financial_freezes" ADD CONSTRAINT "financial_freezes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."integration_credentials" ADD CONSTRAINT "integration_credentials_vault_id_fkey" FOREIGN KEY (vault_id) REFERENCES integration_vault(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."integration_health_logs" ADD CONSTRAINT "integration_health_logs_vault_id_fkey" FOREIGN KEY (vault_id) REFERENCES integration_vault(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."pos_transaction_attempts" ADD CONSTRAINT "pos_transaction_attempts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_api_audit_logs" ADD CONSTRAINT "provider_api_audit_logs_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_balance_snapshots" ADD CONSTRAINT "provider_balance_snapshots_provider_fkey" FOREIGN KEY (provider) REFERENCES provider_capabilities(provider) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_bank_mappings" ADD CONSTRAINT "provider_bank_mappings_bank_id_fkey" FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_clearing_profiles" ADD CONSTRAINT "provider_clearing_profiles_provider_fkey" FOREIGN KEY (provider) REFERENCES provider_capabilities(provider) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_daily_limits" ADD CONSTRAINT "provider_daily_limits_provider_fkey" FOREIGN KEY (provider) REFERENCES provider_capabilities(provider) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_routing_profiles" ADD CONSTRAINT "provider_routing_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_settlements" ADD CONSTRAINT "provider_settlements_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES provider_settlement_batches(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_settlements" ADD CONSTRAINT "provider_settlements_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."provider_settlements" ADD CONSTRAINT "provider_settlements_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_integrations" ADD CONSTRAINT "quasar_integrations_invify_tenant_id_fkey" FOREIGN KEY (invify_tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_requests" ADD CONSTRAINT "quasar_verification_requests_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_requests" ADD CONSTRAINT "quasar_verification_requests_issued_by_fkey" FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_requests" ADD CONSTRAINT "quasar_verification_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."quasar_verification_results" ADD CONSTRAINT "quasar_verification_results_verification_request_id_fkey" FOREIGN KEY (verification_request_id) REFERENCES quasar_verification_requests(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."reserved_funds" ADD CONSTRAINT "reserved_funds_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."reserved_funds" ADD CONSTRAINT "reserved_funds_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."settlement_discrepancies" ADD CONSTRAINT "settlement_discrepancies_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."settlement_discrepancies" ADD CONSTRAINT "settlement_discrepancies_provider_settlement_id_fkey" FOREIGN KEY (provider_settlement_id) REFERENCES provider_settlements(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."settlement_discrepancies" ADD CONSTRAINT "settlement_discrepancies_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES users(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."student_virtual_accounts" ADD CONSTRAINT "student_virtual_accounts_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."student_virtual_accounts" ADD CONSTRAINT "student_virtual_accounts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."subscription_events" ADD CONSTRAINT "subscription_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profile_history" ADD CONSTRAINT "tenant_fee_profile_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profile_history" ADD CONSTRAINT "tenant_fee_profile_history_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_fee_profiles" ADD CONSTRAINT "tenant_fee_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."tenant_kyc_documents" ADD CONSTRAINT "tenant_kyc_documents_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_accounts" ADD CONSTRAINT "treasury_accounts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_journal_entries" ADD CONSTRAINT "treasury_journal_entries_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_journal_entries" ADD CONSTRAINT "treasury_journal_entries_treasury_account_id_fkey" FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_movements" ADD CONSTRAINT "treasury_movements_destination_account_id_fkey" FOREIGN KEY (destination_account_id) REFERENCES treasury_accounts(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_movements" ADD CONSTRAINT "treasury_movements_financial_event_id_fkey" FOREIGN KEY (financial_event_id) REFERENCES financial_events(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."treasury_movements" ADD CONSTRAINT "treasury_movements_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES treasury_accounts(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public."verification_codes" ADD CONSTRAINT "verification_codes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skipped FKs (parent not in baseline scope):
--   fee_transactions.fee_transactions_ledger_entry_id_fkey -> ledger_entries
--   financial_events.financial_events_agent_id_fkey -> agents
--   pos_transaction_attempts.fk_pos_attempts_settlement_batch -> card_settlement_batches
--   treasury_accounts.treasury_accounts_agent_id_fkey -> agents
--   wallet_ledger.wallet_ledger_agent_id_fkey -> agents
--   wallet_ledger.wallet_ledger_commission_event_id_fkey -> commission_events
--   withdrawal_audit_logs.withdrawal_audit_logs_withdrawal_id_fkey -> agent_withdrawal_requests

-- ========== FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.is_platform_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'internal_staff', 'admin_ops', 'support', 'admin_deploy')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_or_service()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        auth.role() = 'service_role' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auth_user_tenant_id_text()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.tenant_id::text
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_tenant_text(p_tenant_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.is_platform_staff()
    OR (
      p_tenant_id IS NOT NULL
      AND public.auth_user_tenant_id_text() = p_tenant_id
    );
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_tenant_uuid(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.is_platform_staff()
    OR (
      p_tenant_id IS NOT NULL
      AND public.auth_user_tenant_id_text() = p_tenant_id::text
    );
$function$
;

CREATE OR REPLACE FUNCTION public.update_timestamp_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_tenant_codes_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.tenant_code IS DISTINCT FROM NEW.tenant_code THEN
        RAISE EXCEPTION 'tenant_code is immutable and cannot be updated.';
    END IF;
    IF OLD.agent_code IS DISTINCT FROM NEW.agent_code THEN
        RAISE EXCEPTION 'agent_code attribution is immutable and cannot be updated.';
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_bank_transfer_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT (
            (OLD.status = 'PENDING' AND NEW.status = 'PROCESSING') OR
            (OLD.status = 'PENDING' AND NEW.status = 'CANCELLED') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'CANCELLED') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'SUCCESS') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'FAILED') OR
            (OLD.status = 'PROCESSING' AND NEW.status = 'INVESTIGATION') OR
            (OLD.status = 'FAILED' AND NEW.status = 'INVESTIGATION') OR
            (OLD.status = 'INVESTIGATION' AND NEW.status = 'REVERSAL_PENDING') OR
            (OLD.status = 'REVERSAL_PENDING' AND NEW.status = 'REVERSED')
        ) THEN
            RAISE EXCEPTION 'Illegal bank transfer state transition from % to %', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_beneficiary_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_beneficiary_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_beneficiary_tenant_id
    FROM public.beneficiaries
    WHERE id = NEW.beneficiary_id;
    
    IF NEW.tenant_id IS DISTINCT FROM v_beneficiary_tenant_id THEN
        RAISE EXCEPTION 'Transaction blocked. Beneficiary does not belong to tenant.';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_transfer_financial_event()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_event_type public.financial_event_type_enum;
BEGIN
    SELECT event_type INTO v_event_type
    FROM public.financial_events
    WHERE id = NEW.financial_event_id;
    
    IF v_event_type::text NOT IN ('PAYOUT_WITHDRAWAL', 'BANK_TRANSFER', 'MERCHANT_PAYOUT') THEN
        RAISE EXCEPTION 'Transaction blocked. Referenced financial event type is invalid: %', v_event_type;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_verified_beneficiary()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_is_verified BOOLEAN;
BEGIN
    SELECT is_verified INTO v_is_verified
    FROM public.beneficiaries
    WHERE id = NEW.beneficiary_id;
    
    IF NOT COALESCE(v_is_verified, false) THEN
        RAISE EXCEPTION 'Transaction blocked. Beneficiary profile is not verified.';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_fee_modification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'Fee transaction details are strictly immutable.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_financial_event_state_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state) OR (TG_OP = 'INSERT') THEN
        INSERT INTO public.financial_event_state_history (financial_event_id, old_state, new_state, changed_at)
        VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.state ELSE NULL END, NEW.state, now());
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_financial_event_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validate lifecycle transitions on UPDATE
    IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
        IF NOT (
            (OLD.state = 'INITIALIZED' AND NEW.state = 'PENDING') OR
            (OLD.state = 'PENDING' AND NEW.state = 'PROCESSING') OR
            (OLD.state = 'PROCESSING' AND NEW.state = 'COMPLETED') OR
            (OLD.state = 'PROCESSING' AND NEW.state = 'FAILED') OR
            (OLD.state = 'COMPLETED' AND NEW.state = 'REVERSED')
        ) THEN
            RAISE EXCEPTION 'Illegal financial event state transition from % to %', OLD.state, NEW.state;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_provider_health_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.circuit_state IS DISTINCT FROM NEW.circuit_state THEN
        INSERT INTO public.provider_health_events (
            provider,
            old_state,
            new_state,
            reason_code,
            details
        )
        VALUES (
            NEW.provider,
            OLD.circuit_state,
            NEW.circuit_state,
            'CIRCUIT_TRANSITION',
            format('Circuit transitioned from %s to %s. Consecutive failures: %s.', OLD.circuit_state, NEW.circuit_state, NEW.consecutive_failures)
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quasar_integrations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_audit_system_configurations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Only log if the value actually changed
    IF (TG_OP = 'UPDATE' AND OLD.config_value IS DISTINCT FROM NEW.config_value) OR TG_OP = 'INSERT' THEN
        -- 1. Record into configuration_versions
        INSERT INTO public.configuration_versions (config_key, old_value, new_value, changed_by)
        VALUES (
            NEW.config_key, 
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.config_value ELSE NULL END, 
            NEW.config_value, 
            NEW.updated_by
        );

        -- 2. Emit SYSTEM_CONFIGURATION_UPDATED to commission_events
        IF TG_OP = 'UPDATE' THEN
            INSERT INTO public.commission_events (agent_id, event_type, amount, previous_state, new_state, reference_id, metadata)
            VALUES (
                NULL, 
                'SYSTEM_CONFIGURATION_UPDATED', 
                0, 
                'APPROVED', 
                'APPROVED', 
                NULL, 
                jsonb_build_object(
                    'config_key', NEW.config_key,
                    'old_value', OLD.config_value,
                    'new_value', NEW.config_value,
                    'operator_id', NEW.updated_by
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_tenant_fee_profile_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_changed_by UUID;
BEGIN
    BEGIN
        v_changed_by := NULLIF(CURRENT_SETTING('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_changed_by := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.tenant_fee_profile_history (tenant_id, old_config, new_config, changed_by, changed_at)
        VALUES (
            NEW.tenant_id,
            NULL,
            jsonb_build_object(
                'card_inward_fee_bps', NEW.card_inward_fee_bps,
                'card_inward_fee_cap', NEW.card_inward_fee_cap,
                'card_inward_agent_share_bps', NEW.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', NEW.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', NEW.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', NEW.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', NEW.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', NEW.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', NEW.withdrawal_outward_agent_share_bps
            ),
            v_changed_by,
            now()
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.tenant_fee_profile_history (tenant_id, old_config, new_config, changed_by, changed_at)
        VALUES (
            NEW.tenant_id,
            jsonb_build_object(
                'card_inward_fee_bps', OLD.card_inward_fee_bps,
                'card_inward_fee_cap', OLD.card_inward_fee_cap,
                'card_inward_agent_share_bps', OLD.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', OLD.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', OLD.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', OLD.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', OLD.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', OLD.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', OLD.withdrawal_outward_agent_share_bps
            ),
            jsonb_build_object(
                'card_inward_fee_bps', NEW.card_inward_fee_bps,
                'card_inward_fee_cap', NEW.card_inward_fee_cap,
                'card_inward_agent_share_bps', NEW.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', NEW.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', NEW.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', NEW.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', NEW.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', NEW.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', NEW.withdrawal_outward_agent_share_bps
            ),
            v_changed_by,
            now()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.tenant_fee_profile_history (tenant_id, old_config, new_config, changed_by, changed_at)
        VALUES (
            OLD.tenant_id,
            jsonb_build_object(
                'card_inward_fee_bps', OLD.card_inward_fee_bps,
                'card_inward_fee_cap', OLD.card_inward_fee_cap,
                'card_inward_agent_share_bps', OLD.card_inward_agent_share_bps,
                'transfer_inward_fee_bps', OLD.transfer_inward_fee_bps,
                'transfer_inward_fee_cap', OLD.transfer_inward_fee_cap,
                'transfer_inward_agent_share_bps', OLD.transfer_inward_agent_share_bps,
                'withdrawal_outward_fee_bps', OLD.withdrawal_outward_fee_bps,
                'withdrawal_outward_fee_cap', OLD.withdrawal_outward_fee_cap,
                'withdrawal_outward_agent_share_bps', OLD.withdrawal_outward_agent_share_bps
            ),
            '{}'::jsonb,
            v_changed_by,
            now()
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$
;

-- ========== TRIGGERS ==========
DROP TRIGGER IF EXISTS "trg_validate_bank_transfer_transition" ON public."bank_transfer_logs";
CREATE TRIGGER trg_validate_bank_transfer_transition BEFORE UPDATE ON bank_transfer_logs FOR EACH ROW EXECUTE FUNCTION validate_bank_transfer_transition();
DROP TRIGGER IF EXISTS "trg_validate_beneficiary_tenant_match" ON public."bank_transfer_logs";
CREATE TRIGGER trg_validate_beneficiary_tenant_match BEFORE INSERT ON bank_transfer_logs FOR EACH ROW EXECUTE FUNCTION validate_beneficiary_tenant_match();
DROP TRIGGER IF EXISTS "trg_validate_transfer_financial_event" ON public."bank_transfer_logs";
CREATE TRIGGER trg_validate_transfer_financial_event BEFORE INSERT ON bank_transfer_logs FOR EACH ROW EXECUTE FUNCTION validate_transfer_financial_event();
DROP TRIGGER IF EXISTS "trg_validate_verified_beneficiary" ON public."bank_transfer_logs";
CREATE TRIGGER trg_validate_verified_beneficiary BEFORE INSERT ON bank_transfer_logs FOR EACH ROW EXECUTE FUNCTION validate_verified_beneficiary();
DROP TRIGGER IF EXISTS "trg_prevent_fee_modification" ON public."fee_transactions";
CREATE TRIGGER trg_prevent_fee_modification BEFORE DELETE OR UPDATE ON fee_transactions FOR EACH ROW EXECUTE FUNCTION prevent_fee_modification();
DROP TRIGGER IF EXISTS "trg_log_financial_event_state_changes" ON public."financial_events";
CREATE TRIGGER trg_log_financial_event_state_changes AFTER INSERT OR UPDATE ON financial_events FOR EACH ROW EXECUTE FUNCTION log_financial_event_state_changes();
DROP TRIGGER IF EXISTS "trg_validate_financial_event_transition" ON public."financial_events";
CREATE TRIGGER trg_validate_financial_event_transition BEFORE UPDATE ON financial_events FOR EACH ROW EXECUTE FUNCTION validate_financial_event_transition();
DROP TRIGGER IF EXISTS "trg_log_provider_health_transition" ON public."provider_health_registry";
CREATE TRIGGER trg_log_provider_health_transition BEFORE UPDATE ON provider_health_registry FOR EACH ROW EXECUTE FUNCTION log_provider_health_transition();
DROP TRIGGER IF EXISTS "trg_quasar_integrations_updated_at" ON public."quasar_integrations";
CREATE TRIGGER trg_quasar_integrations_updated_at BEFORE UPDATE ON quasar_integrations FOR EACH ROW EXECUTE FUNCTION update_quasar_integrations_updated_at();
DROP TRIGGER IF EXISTS "trigger_audit_system_configurations" ON public."system_configurations";
CREATE TRIGGER trigger_audit_system_configurations AFTER INSERT OR UPDATE ON system_configurations FOR EACH ROW EXECUTE FUNCTION trg_audit_system_configurations();
DROP TRIGGER IF EXISTS "trg_log_tenant_fee_profile_history" ON public."tenant_fee_profiles";
CREATE TRIGGER trg_log_tenant_fee_profile_history AFTER INSERT OR DELETE OR UPDATE ON tenant_fee_profiles FOR EACH ROW EXECUTE FUNCTION log_tenant_fee_profile_history();
DROP TRIGGER IF EXISTS "trg_prevent_tenant_codes_update" ON public."tenants";
CREATE TRIGGER trg_prevent_tenant_codes_update BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION prevent_tenant_codes_update();
DROP TRIGGER IF EXISTS "update_terminal_inventory_updated_at" ON public."terminal_inventory";
CREATE TRIGGER update_terminal_inventory_updated_at BEFORE UPDATE ON terminal_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== INDEXES ==========
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_attempt_ref ON public.bank_transfer_attempts USING btree (provider, provider_reference);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transfer_attempt ON public.bank_transfer_attempts USING btree (transfer_log_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_transfers_event ON public.bank_transfer_logs USING btree (financial_event_id);
CREATE INDEX IF NOT EXISTS idx_vas_tenant ON public.bank_virtual_accounts USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_account ON public.bank_virtual_accounts USING btree (provider, account_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bank_version ON public.banks USING btree (nip_bank_code) WHERE (effective_to IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_code_version ON public.banks USING btree (nip_bank_code, version);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_beneficiary ON public.beneficiaries USING btree (tenant_id, bank_code, account_number);
CREATE UNIQUE INDEX IF NOT EXISTS daily_reconciliation_reports_recon_date_key ON public.daily_reconciliation_reports USING btree (recon_date);
CREATE UNIQUE INDEX IF NOT EXISTS device_activations_activation_code_key ON public.device_activations USING btree (activation_code);
CREATE INDEX IF NOT EXISTS idx_device_activations_code ON public.device_activations USING btree (activation_code);
CREATE INDEX IF NOT EXISTS idx_device_activations_device ON public.device_activations USING btree (device_id);
CREATE INDEX IF NOT EXISTS idx_device_activations_tenant ON public.device_activations USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_alerts_device_id ON public.device_alerts USING btree (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_alerts_unresolved ON public.device_alerts USING btree (is_resolved) WHERE (is_resolved = false);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_created_at ON public.device_telemetry USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_device_id ON public.device_telemetry USING btree (device_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS devices_device_id_key ON public.devices USING btree (device_id);
CREATE INDEX IF NOT EXISTS idx_devices_category ON public.devices USING btree (device_category);
CREATE INDEX IF NOT EXISTS idx_devices_inventory_record ON public.devices USING btree (inventory_record_id);
CREATE UNIQUE INDEX IF NOT EXISTS fee_transactions_ledger_entry_id_key ON public.fee_transactions USING btree (ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_fee_tx_tenant ON public.fee_transactions USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS financial_events_idempotency_key_key ON public.financial_events USING btree (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_freezes_tenant ON public.financial_freezes USING btree (tenant_id) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON public.incoming_webhook_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_vault_id ON public.integration_credentials USING btree (vault_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_vault_id ON public.integration_health_logs USING btree (vault_id);
CREATE UNIQUE INDEX IF NOT EXISTS integration_vault_service_identifier_key ON public.integration_vault USING btree (service_identifier);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_created_at ON public.pos_transaction_attempts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_rrn_stan_terminal ON public.pos_transaction_attempts USING btree (tenant_id, rrn, stan, terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_settlement_status ON public.pos_transaction_attempts USING btree (tenant_id, settlement_status, status);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_status ON public.pos_transaction_attempts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pos_attempts_tenant ON public.pos_transaction_attempts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_provider_api_audit_logs_created_at ON public.provider_api_audit_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_api_audit_logs_event_id ON public.provider_api_audit_logs USING btree (financial_event_id);
CREATE INDEX IF NOT EXISTS idx_provider_api_audit_logs_provider_cap ON public.provider_api_audit_logs USING btree (provider, capability);
CREATE INDEX IF NOT EXISTS idx_provider_bank_code ON public.provider_bank_mappings USING btree (provider, provider_bank_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_bank_map ON public.provider_bank_mappings USING btree (bank_id, provider);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_active_credential ON public.provider_credentials USING btree (provider, environment) WHERE (is_active = true);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_env_key_version ON public.provider_credentials USING btree (provider, environment, key_version);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_env ON public.provider_environments USING btree (provider, environment);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_routing_profile ON public.provider_routing_profiles USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS provider_settlement_batches_batch_reference_key ON public.provider_settlement_batches USING btree (batch_reference);
CREATE UNIQUE INDEX IF NOT EXISTS provider_settlements_provider_settlement_reference_key ON public.provider_settlements USING btree (provider_settlement_reference);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quasar_integrations_invify_tenant ON public.quasar_integrations USING btree (invify_tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quasar_integrations_quasar_tenant ON public.quasar_integrations USING btree (quasar_tenant_id);
CREATE INDEX IF NOT EXISTS idx_quasar_integrations_vertical_status ON public.quasar_integrations USING btree (quasar_vertical, status);
CREATE UNIQUE INDEX IF NOT EXISTS quasar_verification_requests_nonce_key ON public.quasar_verification_requests USING btree (nonce);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quasar_verification_requests_nonce ON public.quasar_verification_requests USING btree (nonce);
CREATE INDEX IF NOT EXISTS idx_quasar_verification_results_verified_at ON public.quasar_verification_results USING btree (verified_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quasar_verification_request ON public.quasar_verification_results USING btree (verification_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS reserved_funds_financial_event_id_key ON public.reserved_funds USING btree (financial_event_id);
CREATE INDEX IF NOT EXISTS idx_school_entities_tenant_type ON public.school_entities USING btree (tenant_id, entity_type);
CREATE UNIQUE INDEX IF NOT EXISTS school_entities_tenant_id_entity_type_sync_id_key ON public.school_entities USING btree (tenant_id, entity_type, sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_school_id_admission_number_key ON public.students USING btree (school_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON public.subscription_events USING btree (subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON public.subscription_events USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_history_tenant ON public.tenant_fee_profile_history USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agent_code ON public.tenants USING btree (agent_code);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON public.tenants USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_code ON public.tenants USING btree (tenant_code);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_tenant_code_key ON public.tenants USING btree (tenant_code);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.terminal_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_terminal_id ON public.terminal_audit_log USING btree (terminal_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_device_assignment ON public.terminal_inventory USING btree (assigned_device_id) WHERE ((assignment_status)::text = 'assigned'::text);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mpos_terminal_id ON public.terminal_inventory USING btree (mpos_terminal_id) WHERE (mpos_terminal_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_serial_number ON public.terminal_inventory USING btree (pos_serial_number) WHERE (pos_serial_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_terminal_assignment_status ON public.terminal_inventory USING btree (assignment_status);
CREATE INDEX IF NOT EXISTS idx_terminal_created_at ON public.terminal_inventory USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_terminal_id ON public.terminal_inventory USING btree (terminal_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_treasury_agent ON public.treasury_accounts USING btree (account_type, agent_id) WHERE (agent_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_treasury_merchant ON public.treasury_accounts USING btree (account_type, tenant_id) WHERE (tenant_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_treasury_provider ON public.treasury_accounts USING btree (account_type, provider_id) WHERE (provider_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_treasury_system ON public.treasury_accounts USING btree (account_type) WHERE (owner_type = 'SYSTEM'::owner_type_enum);
CREATE INDEX IF NOT EXISTS idx_journal_event ON public.treasury_journal_entries USING btree (financial_event_id);
CREATE INDEX IF NOT EXISTS idx_verification_channel ON public.verification_codes USING btree (channel);
CREATE INDEX IF NOT EXISTS idx_verification_email ON public.verification_codes USING btree (email);
CREATE INDEX IF NOT EXISTS idx_verification_expires_at ON public.verification_codes USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_phone ON public.verification_codes USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_verification_purpose ON public.verification_codes USING btree (purpose);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_agent ON public.wallet_ledger USING btree (agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_phone_unverified ON public.whatsapp_otps USING btree (phone_number, verified, expires_at);

-- ========== RLS ==========
ALTER TABLE public."bank_transfer_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bank_transfer_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bank_virtual_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."banks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."beneficiaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."billing_audit_journal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."configuration_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."daily_reconciliation_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."device_activations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."device_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."device_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."device_telemetry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fee_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."finance_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."financial_consistency_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."financial_event_state_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."financial_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."financial_execution_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."financial_freezes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."incoming_webhook_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."integration_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."integration_health_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."integration_vault" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."onboarding_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."platform_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pos_gateway_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pos_transaction_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_api_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_balance_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_bank_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_capabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_clearing_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_daily_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_environments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_health_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_health_registry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_routing_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_settlement_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."quasar_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."quasar_verification_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."quasar_verification_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reserved_funds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_entities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."security_context_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."settlement_discrepancies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_virtual_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscription_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."system_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_fee_profile_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_fee_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_kyc_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."terminal_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."terminal_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."treasury_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."treasury_journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."treasury_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vault_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verification_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."wallet_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."whatsapp_otps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."withdrawal_audit_logs" ENABLE ROW LEVEL SECURITY;

-- ========== POLICIES ==========
DROP POLICY IF EXISTS "Service role full access" ON public."device_activations";
CREATE POLICY "Service role full access" ON public."device_activations" AS PERMISSIVE FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Allow anon read device_alerts" ON public."device_alerts";
CREATE POLICY "Allow anon read device_alerts" ON public."device_alerts" AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert device_alerts" ON public."device_alerts";
CREATE POLICY "Allow authenticated insert device_alerts" ON public."device_alerts" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated read device_alerts" ON public."device_alerts";
CREATE POLICY "Allow authenticated read device_alerts" ON public."device_alerts" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow anon read device_status" ON public."device_status";
CREATE POLICY "Allow anon read device_status" ON public."device_status" AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert device_status" ON public."device_status";
CREATE POLICY "Allow authenticated insert device_status" ON public."device_status" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated read device_status" ON public."device_status";
CREATE POLICY "Allow authenticated read device_status" ON public."device_status" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated update device_status" ON public."device_status";
CREATE POLICY "Allow authenticated update device_status" ON public."device_status" AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon read device_telemetry" ON public."device_telemetry";
CREATE POLICY "Allow anon read device_telemetry" ON public."device_telemetry" AS PERMISSIVE FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert device_telemetry" ON public."device_telemetry";
CREATE POLICY "Allow authenticated insert device_telemetry" ON public."device_telemetry" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated read device_telemetry" ON public."device_telemetry";
CREATE POLICY "Allow authenticated read device_telemetry" ON public."device_telemetry" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role full access" ON public."devices";
CREATE POLICY "Service role full access" ON public."devices" AS PERMISSIVE FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "no_client_write_fees" ON public."fee_transactions";
CREATE POLICY "no_client_write_fees" ON public."fee_transactions" AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "super_admin_reads_fees" ON public."fee_transactions";
CREATE POLICY "super_admin_reads_fees" ON public."fee_transactions" AS PERMISSIVE FOR SELECT TO public USING (is_admin_or_service());
DROP POLICY IF EXISTS "tenant_owner_reads_own_fees" ON public."fee_transactions";
CREATE POLICY "tenant_owner_reads_own_fees" ON public."fee_transactions" AS PERMISSIVE FOR SELECT TO public USING (((tenant_id IS NOT NULL) AND (( SELECT (users.tenant_id)::text AS tenant_id
   FROM users
  WHERE (users.id = auth.uid())) = (tenant_id)::text)));
DROP POLICY IF EXISTS "financial_events_select_tenant" ON public."financial_events";
CREATE POLICY "financial_events_select_tenant" ON public."financial_events" AS PERMISSIVE FOR SELECT TO authenticated USING (can_access_tenant_uuid(tenant_id));
DROP POLICY IF EXISTS "pos_attempts_select_tenant" ON public."pos_transaction_attempts";
CREATE POLICY "pos_attempts_select_tenant" ON public."pos_transaction_attempts" AS PERMISSIVE FOR SELECT TO authenticated USING (can_access_tenant_uuid(tenant_id));
DROP POLICY IF EXISTS "pos_attempts_service_role_all" ON public."pos_transaction_attempts";
CREATE POLICY "pos_attempts_service_role_all" ON public."pos_transaction_attempts" AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "quasar_integrations_service_policy" ON public."quasar_integrations";
CREATE POLICY "quasar_integrations_service_policy" ON public."quasar_integrations" AS PERMISSIVE FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Allow anyone to delete context logs" ON public."security_context_logs";
CREATE POLICY "Allow anyone to delete context logs" ON public."security_context_logs" AS PERMISSIVE FOR DELETE TO public USING (true);
DROP POLICY IF EXISTS "Allow anyone to read context logs" ON public."security_context_logs";
CREATE POLICY "Allow anyone to read context logs" ON public."security_context_logs" AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow anyone to write context logs" ON public."security_context_logs";
CREATE POLICY "Allow anyone to write context logs" ON public."security_context_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON public."subscription_events";
CREATE POLICY "Service role full access" ON public."subscription_events" AS PERMISSIVE FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access" ON public."subscriptions";
CREATE POLICY "Service role full access" ON public."subscriptions" AS PERMISSIVE FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "no_client_write_history" ON public."tenant_fee_profile_history";
CREATE POLICY "no_client_write_history" ON public."tenant_fee_profile_history" AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "super_admin_reads_history" ON public."tenant_fee_profile_history";
CREATE POLICY "super_admin_reads_history" ON public."tenant_fee_profile_history" AS PERMISSIVE FOR SELECT TO public USING (is_admin_or_service());
DROP POLICY IF EXISTS "tenant_owner_reads_own_history" ON public."tenant_fee_profile_history";
CREATE POLICY "tenant_owner_reads_own_history" ON public."tenant_fee_profile_history" AS PERMISSIVE FOR SELECT TO public USING (((tenant_id IS NOT NULL) AND (( SELECT (users.tenant_id)::text AS tenant_id
   FROM users
  WHERE (users.id = auth.uid())) = (tenant_id)::text)));
DROP POLICY IF EXISTS "no_client_write_profiles" ON public."tenant_fee_profiles";
CREATE POLICY "no_client_write_profiles" ON public."tenant_fee_profiles" AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "super_admin_reads_profiles" ON public."tenant_fee_profiles";
CREATE POLICY "super_admin_reads_profiles" ON public."tenant_fee_profiles" AS PERMISSIVE FOR SELECT TO public USING (is_admin_or_service());
DROP POLICY IF EXISTS "tenant_owner_reads_own_profile" ON public."tenant_fee_profiles";
CREATE POLICY "tenant_owner_reads_own_profile" ON public."tenant_fee_profiles" AS PERMISSIVE FOR SELECT TO public USING ((( SELECT (users.tenant_id)::text AS tenant_id
   FROM users
  WHERE (users.id = auth.uid())) = (tenant_id)::text));
DROP POLICY IF EXISTS "tenants_select_scoped" ON public."tenants";
CREATE POLICY "tenants_select_scoped" ON public."tenants" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_staff() OR (auth_user_tenant_id_text() = (id)::text)));
DROP POLICY IF EXISTS "tenants_service_role_all" ON public."tenants";
CREATE POLICY "tenants_service_role_all" ON public."tenants" AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "allow_select_own_user" ON public."users";
CREATE POLICY "allow_select_own_user" ON public."users" AS PERMISSIVE FOR SELECT TO public USING ((id = auth.uid()));
DROP POLICY IF EXISTS "users_select_own" ON public."users";
CREATE POLICY "users_select_own" ON public."users" AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
DROP POLICY IF EXISTS "users_select_platform_staff" ON public."users";
CREATE POLICY "users_select_platform_staff" ON public."users" AS PERMISSIVE FOR SELECT TO authenticated USING (is_platform_staff());
DROP POLICY IF EXISTS "users_service_role_all" ON public."users";
CREATE POLICY "users_service_role_all" ON public."users" AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Enable all for service_role" ON public."verification_codes";
CREATE POLICY "Enable all for service_role" ON public."verification_codes" AS PERMISSIVE FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Admin Full Ledger" ON public."wallet_ledger";
CREATE POLICY "Admin Full Ledger" ON public."wallet_ledger" AS PERMISSIVE FOR ALL TO public USING (is_admin_or_service());

-- END baseline
