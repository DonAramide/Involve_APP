/*
Rollback for 20261006120000_tenant_billing_collections.sql
Does not touch fee orchestration, wallets, merchant invoices, or production data.
*/

BEGIN;

DROP TABLE IF EXISTS public.billing_domain_events CASCADE;
DROP TABLE IF EXISTS public.billing_audit_events CASCADE;
DROP TABLE IF EXISTS public.billing_payment_reversals CASCADE;
DROP TABLE IF EXISTS public.billing_payment_allocations CASCADE;
DROP TABLE IF EXISTS public.billing_payments CASCADE;
DROP TABLE IF EXISTS public.billing_installments CASCADE;
DROP TABLE IF EXISTS public.billing_installment_plans CASCADE;
DROP TABLE IF EXISTS public.billing_obligations CASCADE;
DROP TABLE IF EXISTS public.billing_subscriptions CASCADE;
DROP TABLE IF EXISTS public.billing_accounts CASCADE;

COMMIT;
