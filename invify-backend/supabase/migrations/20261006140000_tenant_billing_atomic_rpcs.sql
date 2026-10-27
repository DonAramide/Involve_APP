/*
=============================================================================
Migration: tenant_billing_atomic_rpcs
Description: Atomic post/reverse/create-plan for Tenant Billing (staging).
             Integer kobo. Does not touch wallets, ledgers, or fee tables.
=============================================================================
*/

BEGIN;

CREATE OR REPLACE FUNCTION public.post_tenant_billing_payment(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_account public.billing_accounts%ROWTYPE;
  v_payment public.billing_payments%ROWTYPE;
  v_existing public.billing_payments%ROWTYPE;
  v_alloc jsonb;
  v_inst public.billing_installments%ROWTYPE;
  v_ob public.billing_obligations%ROWTYPE;
  v_apply bigint;
  v_allocated bigint := 0;
  v_today date := CURRENT_DATE;
  v_status text;
  v_ob_status text;
BEGIN
  v_tenant := (p->>'tenant_id')::uuid;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  SELECT * INTO v_account
  FROM public.billing_accounts
  WHERE tenant_id = v_tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'billing account not found';
  END IF;

  SELECT * INTO v_existing
  FROM public.billing_payments
  WHERE tenant_id = v_tenant
    AND (
      idempotency_key = COALESCE(p->>'idempotency_key', '')
      OR reference = COALESCE(p->>'reference', '')
    )
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('duplicate', true, 'payment', to_jsonb(v_existing));
  END IF;

  INSERT INTO public.billing_payments (
    tenant_id, billing_account_id, amount_kobo, allocated_kobo, unapplied_kobo,
    method, reference, idempotency_key, payment_date, notes, status, verification,
    posted_by, posted_by_role
  ) VALUES (
    v_tenant,
    v_account.id,
    (p->>'amount_kobo')::bigint,
    0,
    0,
    p->>'method',
    p->>'reference',
    COALESCE(NULLIF(p->>'idempotency_key', ''), 'ref:' || v_tenant::text || ':' || (p->>'reference')),
    COALESCE((p->>'payment_date')::date, v_today),
    p->>'notes',
    'PENDING',
    p->>'verification',
    COALESCE(p->>'posted_by', 'system'),
    COALESCE(p->>'posted_by_role', 'unknown')
  ) RETURNING * INTO v_payment;

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(COALESCE(p->'allocations', '[]'::jsonb))
  LOOP
    SELECT * INTO v_inst
    FROM public.billing_installments
    WHERE id = (v_alloc->>'installment_id')::uuid
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'installment not found';
    END IF;
    IF v_inst.tenant_id <> v_tenant THEN
      RAISE EXCEPTION 'TENANT_ISOLATION';
    END IF;
    IF v_inst.cancelled THEN
      RAISE EXCEPTION 'cancelled installment cannot receive payment';
    END IF;
    SELECT * INTO v_ob FROM public.billing_obligations WHERE id = v_inst.obligation_id FOR UPDATE;
    IF v_ob.status = 'CANCELLED' THEN
      RAISE EXCEPTION 'cancelled obligation cannot receive payment';
    END IF;
    v_apply := LEAST((v_alloc->>'amount_kobo')::bigint, v_inst.outstanding_kobo);
    IF v_apply < 0 THEN
      RAISE EXCEPTION 'negative allocation';
    END IF;
    IF v_apply = 0 THEN
      CONTINUE;
    END IF;
    UPDATE public.billing_installments
    SET
      paid_kobo = paid_kobo + v_apply,
      outstanding_kobo = amount_kobo - (paid_kobo + v_apply),
      status = CASE
        WHEN cancelled THEN 'CANCELLED'
        WHEN waived THEN 'WAIVED'
        WHEN paid_kobo + v_apply >= amount_kobo THEN 'PAID'
        WHEN paid_kobo + v_apply > 0 THEN 'PARTIALLY_PAID'
        WHEN due_date < v_today THEN 'OVERDUE'
        WHEN due_date = v_today THEN 'DUE'
        ELSE 'UPCOMING'
      END,
      updated_at = now()
    WHERE id = v_inst.id
    RETURNING * INTO v_inst;
    IF v_inst.outstanding_kobo < 0 OR v_inst.paid_kobo > v_inst.amount_kobo THEN
      RAISE EXCEPTION 'installment balance corrupted';
    END IF;
    INSERT INTO public.billing_payment_allocations (payment_id, installment_id, obligation_id, amount_kobo)
    VALUES (v_payment.id, v_inst.id, v_inst.obligation_id, v_apply);
    v_allocated := v_allocated + v_apply;
    UPDATE public.billing_obligations ob
    SET
      amount_paid_kobo = sub.paid,
      amount_outstanding_kobo = sub.outstanding,
      status = CASE
        WHEN ob.status = 'CANCELLED' THEN 'CANCELLED'
        WHEN sub.outstanding = 0 THEN 'PAID'
        WHEN sub.paid > 0 THEN 'PARTIAL'
        ELSE 'OPEN'
      END,
      updated_at = now()
    FROM (
      SELECT COALESCE(SUM(paid_kobo),0) AS paid, COALESCE(SUM(outstanding_kobo),0) AS outstanding
      FROM public.billing_installments
      WHERE obligation_id = v_inst.obligation_id
    ) sub
    WHERE ob.id = v_inst.obligation_id;
  END LOOP;

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(COALESCE(p->'obligation_allocations', '[]'::jsonb))
  LOOP
    SELECT * INTO v_ob FROM public.billing_obligations WHERE id = (v_alloc->>'obligation_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'obligation not found'; END IF;
    IF v_ob.tenant_id <> v_tenant THEN RAISE EXCEPTION 'TENANT_ISOLATION'; END IF;
    IF v_ob.status = 'CANCELLED' THEN RAISE EXCEPTION 'cancelled obligation cannot receive payment'; END IF;
    v_apply := LEAST((v_alloc->>'amount_kobo')::bigint, v_ob.amount_outstanding_kobo);
    IF v_apply <= 0 THEN CONTINUE; END IF;
    UPDATE public.billing_obligations
    SET
      amount_paid_kobo = amount_paid_kobo + v_apply,
      amount_outstanding_kobo = gross_amount_kobo - (amount_paid_kobo + v_apply),
      status = CASE
        WHEN status = 'CANCELLED' THEN 'CANCELLED'
        WHEN gross_amount_kobo - (amount_paid_kobo + v_apply) = 0 THEN 'PAID'
        WHEN amount_paid_kobo + v_apply > 0 THEN 'PARTIAL'
        ELSE 'OPEN'
      END,
      updated_at = now()
    WHERE id = v_ob.id
    RETURNING * INTO v_ob;
    IF v_ob.amount_outstanding_kobo < 0 THEN RAISE EXCEPTION 'obligation balance corrupted'; END IF;
    INSERT INTO public.billing_payment_allocations (payment_id, installment_id, obligation_id, amount_kobo)
    VALUES (v_payment.id, NULL, v_ob.id, v_apply);
    v_allocated := v_allocated + v_apply;
  END LOOP;

  IF v_allocated > v_payment.amount_kobo THEN
    RAISE EXCEPTION 'total allocation exceeds payment';
  END IF;

  UPDATE public.billing_payments
  SET
    allocated_kobo = v_allocated,
    unapplied_kobo = amount_kobo - v_allocated,
    status = 'CONFIRMED'
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  UPDATE public.billing_accounts
  SET unapplied_credit_kobo = unapplied_credit_kobo + v_payment.unapplied_kobo, updated_at = now()
  WHERE id = v_account.id;

  INSERT INTO public.billing_audit_events (
    actor_id, actor_role, action, tenant_id, billing_account_id, payment_id, amount_kobo, reference, new_state, ip
  ) VALUES (
    COALESCE(p->>'actor_id', 'system'),
    COALESCE(p->>'posted_by_role', 'unknown'),
    'CONFIRM_PAYMENT',
    v_tenant,
    v_account.id,
    v_payment.id,
    v_payment.amount_kobo,
    v_payment.reference,
    jsonb_build_object('allocated', v_payment.allocated_kobo, 'unapplied', v_payment.unapplied_kobo),
    p->>'ip'
  );

  INSERT INTO public.billing_domain_events (type, payload)
  VALUES ('billing.payment.confirmed', jsonb_build_object('payment_id', v_payment.id));

  RETURN jsonb_build_object('duplicate', false, 'payment', to_jsonb(v_payment));
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.billing_payments
    WHERE tenant_id = v_tenant
      AND (
        idempotency_key = COALESCE(p->>'idempotency_key', '')
        OR reference = COALESCE(p->>'reference', '')
      )
    LIMIT 1;
    RETURN jsonb_build_object('duplicate', true, 'payment', to_jsonb(v_existing));
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_tenant_billing_payment(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.billing_payments%ROWTYPE;
  v_line public.billing_payment_allocations%ROWTYPE;
  v_inst public.billing_installments%ROWTYPE;
  v_today date := CURRENT_DATE;
  v_rev uuid := gen_random_uuid();
BEGIN
  SELECT * INTO v_payment
  FROM public.billing_payments
  WHERE id = (p->>'payment_id')::uuid
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_payment.tenant_id <> (p->>'tenant_id')::uuid THEN RAISE EXCEPTION 'TENANT_ISOLATION'; END IF;
  IF v_payment.reversal_id IS NOT NULL OR v_payment.status = 'REVERSED' THEN
    RAISE EXCEPTION 'ALREADY_REVERSED';
  END IF;

  FOR v_line IN SELECT * FROM public.billing_payment_allocations WHERE payment_id = v_payment.id
  LOOP
    IF v_line.installment_id IS NOT NULL THEN
      UPDATE public.billing_installments
      SET
        paid_kobo = paid_kobo - v_line.amount_kobo,
        outstanding_kobo = amount_kobo - (paid_kobo - v_line.amount_kobo),
        status = CASE
          WHEN cancelled THEN 'CANCELLED'
          WHEN waived THEN 'WAIVED'
          WHEN paid_kobo - v_line.amount_kobo <= 0 AND due_date < v_today THEN 'OVERDUE'
          WHEN paid_kobo - v_line.amount_kobo <= 0 AND due_date = v_today THEN 'DUE'
          WHEN paid_kobo - v_line.amount_kobo <= 0 THEN 'UPCOMING'
          WHEN paid_kobo - v_line.amount_kobo >= amount_kobo THEN 'PAID'
          ELSE 'PARTIALLY_PAID'
        END,
        updated_at = now()
      WHERE id = v_line.installment_id
      RETURNING * INTO v_inst;
      IF v_inst.paid_kobo < 0 THEN RAISE EXCEPTION 'reversal underflow'; END IF;
      UPDATE public.billing_obligations ob
      SET
        amount_paid_kobo = sub.paid,
        amount_outstanding_kobo = sub.outstanding,
        status = CASE WHEN ob.status = 'CANCELLED' THEN 'CANCELLED' WHEN sub.outstanding = 0 THEN 'PAID' WHEN sub.paid > 0 THEN 'PARTIAL' ELSE 'OPEN' END,
        updated_at = now()
      FROM (
        SELECT COALESCE(SUM(paid_kobo),0) AS paid, COALESCE(SUM(outstanding_kobo),0) AS outstanding
        FROM public.billing_installments WHERE obligation_id = v_inst.obligation_id
      ) sub
      WHERE ob.id = v_inst.obligation_id;
    ELSIF v_line.obligation_id IS NOT NULL THEN
      UPDATE public.billing_obligations
      SET
        amount_paid_kobo = amount_paid_kobo - v_line.amount_kobo,
        amount_outstanding_kobo = gross_amount_kobo - (amount_paid_kobo - v_line.amount_kobo),
        status = CASE
          WHEN status = 'CANCELLED' THEN 'CANCELLED'
          WHEN amount_paid_kobo - v_line.amount_kobo <= 0 THEN 'OPEN'
          WHEN gross_amount_kobo - (amount_paid_kobo - v_line.amount_kobo) = 0 THEN 'PAID'
          ELSE 'PARTIAL'
        END,
        updated_at = now()
      WHERE id = v_line.obligation_id;
    END IF;
  END LOOP;

  UPDATE public.billing_accounts
  SET unapplied_credit_kobo = GREATEST(0, unapplied_credit_kobo - v_payment.unapplied_kobo), updated_at = now()
  WHERE id = v_payment.billing_account_id;

  INSERT INTO public.billing_payment_reversals (id, payment_id, amount_kobo, reason, actor)
  VALUES (v_rev, v_payment.id, v_payment.amount_kobo, COALESCE(p->>'reason', 'reversal'), COALESCE(p->>'actor', 'system'));

  UPDATE public.billing_payments
  SET status = 'REVERSED', reversal_id = v_rev
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  INSERT INTO public.billing_audit_events (
    actor_id, actor_role, action, tenant_id, billing_account_id, payment_id, amount_kobo, reason, reference
  ) VALUES (
    COALESCE(p->>'actor_id', 'system'),
    COALESCE(p->>'actor_role', 'unknown'),
    'REVERSE_PAYMENT',
    v_payment.tenant_id,
    v_payment.billing_account_id,
    v_payment.id,
    v_payment.amount_kobo,
    p->>'reason',
    v_payment.reference
  );

  INSERT INTO public.billing_domain_events (type, payload)
  VALUES ('billing.payment.reversed', jsonb_build_object('payment_id', v_payment.id, 'reversal_id', v_rev));

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'reversal_id', v_rev);
END;
$$;

REVOKE ALL ON FUNCTION public.post_tenant_billing_payment(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_tenant_billing_payment(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_tenant_billing_payment(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_tenant_billing_payment(jsonb) TO service_role;

COMMIT;
