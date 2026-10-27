-- DO NOT APPLY
-- Phase 1.1 corrected proposal. Extends existing public.items / public.categories.
-- Does not create a parallel product registry.
-- Does not touch wallets, ledgers, payouts, fee_profiles, school fee billing,
-- or invoice_items.unit_price.
--
-- Approval required before any migration is run.
-- Isolated disposable-database testing only.

-- 1) Catalog version on the tenant (published head devices ack against)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS catalog_version BIGINT NOT NULL DEFAULT 0;

-- 2) Shop vs fee vs internal. DEFAULT 'shop' does NOT reclassify existing
--    school fee rows. An operator-approved backfill is required before shop
--    sync is enabled for school tenants.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS catalog_kind TEXT NOT NULL DEFAULT 'shop';

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_catalog_kind_check;
ALTER TABLE public.items
  ADD CONSTRAINT items_catalog_kind_check
  CHECK (catalog_kind IN ('shop', 'fee', 'internal'));

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS catalog_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3) Durable ordered change log (realtime is a hint only)
CREATE TABLE IF NOT EXISTS public.catalog_change_events (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  catalog_version BIGINT NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('category', 'item', 'variant', 'stock', 'price')),
  entity_id       TEXT NOT NULL,
  op              TEXT NOT NULL CHECK (op IN ('upsert', 'archive')),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, catalog_version)
);

CREATE INDEX IF NOT EXISTS idx_catalog_change_events_tenant_version
  ON public.catalog_change_events (tenant_id, catalog_version);

-- 4) Device acknowledgement of applied catalog version
CREATE TABLE IF NOT EXISTS public.device_catalog_sync_state (
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id             TEXT NOT NULL,
  last_applied_version  BIGINT NOT NULL DEFAULT 0,
  last_sync_at          TIMESTAMPTZ,
  last_acknowledged_at  TIMESTAMPTZ,
  sync_status           TEXT NOT NULL DEFAULT 'unknown'
    CHECK (sync_status IN ('unknown', 'up_to_date', 'pending', 'offline', 'failed', 'incompatible')),
  last_error            TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, device_id)
);

-- 5) Immutable selling/cost price history (completed invoices stay on invoice_items.unit_price)
CREATE TABLE IF NOT EXISTS public.catalog_price_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  price_type    TEXT NOT NULL CHECK (price_type IN ('selling', 'cost')),
  old_amount    NUMERIC(12,2) NOT NULL,
  new_amount    NUMERIC(12,2) NOT NULL,
  changed_by    UUID REFERENCES public.users(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_price_history_item
  ON public.catalog_price_history (tenant_id, item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.catalog_idempotency (
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key  TEXT NOT NULL,
  catalog_version  BIGINT NOT NULL,
  request_hash     TEXT NOT NULL,
  body             JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

-- Helpers: distinguish omitted JSON keys from explicit null.
CREATE OR REPLACE FUNCTION public.catalog_json_has(p jsonb, p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p IS NOT NULL AND p ? p_key;
$$;

CREATE OR REPLACE FUNCTION public.catalog_json_text(p jsonb, p_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p IS NULL OR NOT (p ? p_key) THEN NULL
    WHEN jsonb_typeof(p -> p_key) = 'null' THEN NULL
    ELSE NULLIF(p ->> p_key, '')
  END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_json_num(p jsonb, p_key text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p IS NULL OR NOT (p ? p_key) THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(p -> p_key) = 'null' THEN
    RETURN NULL;
  END IF;
  RETURN (p ->> p_key)::numeric;
END;
$$;

-- Shop catalog publisher. Authorization stays in the API.
-- p_tenant_id is the already-resolved authoritative tenant from the server.
-- Invoked only as service_role (REVOKE FROM PUBLIC).
-- SECURITY INVOKER + service_role: RLS is bypassed, so tenant checks below
-- are mandatory. Do not GRANT this function to authenticated or anon.
CREATE OR REPLACE FUNCTION public.publish_catalog_mutation(
  p_tenant_id uuid,
  p_idempotency_key text,
  p_entity_type text,
  p_entity_id text,
  p_op text,
  p_item jsonb,
  p_category jsonb,
  p_price_changes jsonb,
  p_payload jsonb,
  p_changed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_version bigint;
  v_result jsonb;
  v_item public.items%ROWTYPE;
  v_category public.categories%ROWTYPE;
  v_item_id uuid;
  v_category_id uuid;
  v_entity_id text;
  v_op text;
  v_key text;
  v_hash text;
  v_claimed int;
  v_existing public.catalog_idempotency%ROWTYPE;
  v_price numeric;
  v_cost numeric;
  v_sku text;
  v_cat_ref uuid;
  v_cat_tenant uuid;
  v_sku_owner uuid;
  v_name text;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'tenant not found' USING ERRCODE = '22023';
  END IF;

  -- p_changed_by is audit-only. It is not authorization. Drop unknown FKs
  -- rather than trusting a client-supplied actor id.
  IF p_changed_by IS NOT NULL AND to_regclass('public.users') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_changed_by) THEN
    p_changed_by := NULL;
  END IF;

  v_op := COALESCE(NULLIF(p_op, ''), 'upsert');
  IF v_op NOT IN ('upsert', 'archive') THEN
    RAISE EXCEPTION 'invalid op' USING ERRCODE = '22023';
  END IF;
  IF p_entity_type NOT IN ('category', 'item') THEN
    RAISE EXCEPTION 'unsupported entity_type' USING ERRCODE = '22023';
  END IF;

  v_hash := md5(
    COALESCE(p_entity_type, '') || '|' ||
    COALESCE(p_entity_id, '') || '|' ||
    v_op || '|' ||
    COALESCE(p_item::text, '') || '|' ||
    COALESCE(p_category::text, '')
  );

  v_key := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  IF v_key IS NOT NULL THEN
    INSERT INTO public.catalog_idempotency (
      tenant_id, idempotency_key, catalog_version, request_hash, body
    ) VALUES (
      p_tenant_id, v_key, -1, v_hash, '{}'::jsonb
    )
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

    GET DIAGNOSTICS v_claimed = ROW_COUNT;
    IF v_claimed = 0 THEN
      SELECT * INTO v_existing
        FROM public.catalog_idempotency
       WHERE tenant_id = p_tenant_id AND idempotency_key = v_key;
      IF v_existing.request_hash IS DISTINCT FROM v_hash THEN
        RAISE EXCEPTION 'idempotency key reuse with different request' USING ERRCODE = '23505';
      END IF;
      RETURN COALESCE(v_existing.body, '{}'::jsonb) || jsonb_build_object('replayed', true);
    END IF;
  END IF;

  -- Tenant row lock: concurrent mutations get unique ordered versions.
  UPDATE public.tenants
     SET catalog_version = COALESCE(catalog_version, 0) + 1
   WHERE id = p_tenant_id
   RETURNING catalog_version INTO v_version;

  IF p_entity_type = 'item' THEN
    v_item_id := COALESCE(
      NULLIF(public.catalog_json_text(p_item, 'id'), '')::uuid,
      NULLIF(p_entity_id, '')::uuid
    );

    IF v_item_id IS NOT NULL THEN
      SELECT * INTO v_item FROM public.items WHERE id = v_item_id;
      IF FOUND AND v_item.tenant_id IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'item belongs to another tenant' USING ERRCODE = '42501';
      END IF;
      IF FOUND AND v_item.catalog_kind IN ('fee', 'internal') THEN
        RAISE EXCEPTION 'protected catalog kind cannot be mutated via shop publisher' USING ERRCODE = '42501';
      END IF;
    END IF;

    IF v_op = 'archive' THEN
      IF NOT FOUND OR v_item.id IS NULL THEN
        RAISE EXCEPTION 'item not found' USING ERRCODE = 'P0002';
      END IF;
      UPDATE public.items
         SET status = 'archived',
             catalog_version = v_version,
             updated_at = now()
       WHERE id = v_item.id AND tenant_id = p_tenant_id
       RETURNING * INTO v_item;
      v_entity_id := v_item.id::text;
    ELSE
      IF v_item.id IS NULL THEN
        v_price := public.catalog_json_num(p_item, 'price');
        IF NOT public.catalog_json_has(p_item, 'price') OR v_price IS NULL THEN
          RAISE EXCEPTION 'selling price is required when creating an item' USING ERRCODE = '22023';
        END IF;
        IF v_price < 0 THEN
          RAISE EXCEPTION 'selling price must be non-negative' USING ERRCODE = '22023';
        END IF;
        v_cost := COALESCE(public.catalog_json_num(p_item, 'cost_price'), 0);
        IF v_cost < 0 THEN
          RAISE EXCEPTION 'cost price must be non-negative' USING ERRCODE = '22023';
        END IF;
        v_name := COALESCE(public.catalog_json_text(p_item, 'name'), '');
        IF v_name = '' THEN
          RAISE EXCEPTION 'item name is required' USING ERRCODE = '22023';
        END IF;
        v_sku := public.catalog_json_text(p_item, 'sku');
        IF v_sku IS NOT NULL THEN
          SELECT id INTO v_sku_owner FROM public.items
           WHERE tenant_id = p_tenant_id AND sku = v_sku LIMIT 1;
          IF v_sku_owner IS NOT NULL THEN
            RAISE EXCEPTION 'duplicate sku' USING ERRCODE = '23505';
          END IF;
        END IF;
        v_cat_ref := NULLIF(public.catalog_json_text(p_item, 'category_id'), '')::uuid;
        IF v_cat_ref IS NOT NULL THEN
          SELECT tenant_id INTO v_cat_tenant FROM public.categories WHERE id = v_cat_ref;
          IF v_cat_tenant IS NULL OR v_cat_tenant IS DISTINCT FROM p_tenant_id THEN
            RAISE EXCEPTION 'category does not belong to tenant' USING ERRCODE = '42501';
          END IF;
        END IF;
        v_item_id := COALESCE(v_item_id, gen_random_uuid());
        INSERT INTO public.items (
          id, tenant_id, name, sku, barcode, category_id, price, cost_price,
          stock_qty, min_stock_qty, type, status, catalog_kind, catalog_version,
          image_url, description, updated_at
        ) VALUES (
          v_item_id,
          p_tenant_id,
          v_name,
          v_sku,
          public.catalog_json_text(p_item, 'barcode'),
          v_cat_ref,
          v_price,
          v_cost,
          COALESCE(public.catalog_json_num(p_item, 'stock_qty'), 0)::integer,
          COALESCE(public.catalog_json_num(p_item, 'min_stock_qty'), 0),
          COALESCE(public.catalog_json_text(p_item, 'type'), 'product'),
          COALESCE(public.catalog_json_text(p_item, 'status'), 'active'),
          'shop',
          v_version,
          public.catalog_json_text(p_item, 'image_url'),
          public.catalog_json_text(p_item, 'description'),
          now()
        ) RETURNING * INTO v_item;

        INSERT INTO public.catalog_price_history (
          tenant_id, item_id, price_type, old_amount, new_amount, changed_by
        ) VALUES (
          p_tenant_id, v_item.id, 'selling', 0, v_item.price, p_changed_by
        );
        IF public.catalog_json_has(p_item, 'cost_price') THEN
          INSERT INTO public.catalog_price_history (
            tenant_id, item_id, price_type, old_amount, new_amount, changed_by
          ) VALUES (
            p_tenant_id, v_item.id, 'cost', 0, v_item.cost_price, p_changed_by
          );
        END IF;
      ELSE
        IF public.catalog_json_has(p_item, 'price') THEN
          v_price := public.catalog_json_num(p_item, 'price');
          IF v_price IS NULL OR v_price < 0 THEN
            RAISE EXCEPTION 'selling price must be a non-negative amount' USING ERRCODE = '22023';
          END IF;
        ELSE
          v_price := v_item.price;
        END IF;
        IF public.catalog_json_has(p_item, 'cost_price') THEN
          v_cost := public.catalog_json_num(p_item, 'cost_price');
          IF v_cost IS NULL OR v_cost < 0 THEN
            RAISE EXCEPTION 'cost price must be a non-negative amount' USING ERRCODE = '22023';
          END IF;
        ELSE
          v_cost := v_item.cost_price;
        END IF;
        v_sku := CASE
          WHEN public.catalog_json_has(p_item, 'sku') THEN public.catalog_json_text(p_item, 'sku')
          ELSE v_item.sku
        END;
        IF v_sku IS NOT NULL THEN
          SELECT id INTO v_sku_owner FROM public.items
           WHERE tenant_id = p_tenant_id AND sku = v_sku AND id <> v_item.id LIMIT 1;
          IF v_sku_owner IS NOT NULL THEN
            RAISE EXCEPTION 'duplicate sku' USING ERRCODE = '23505';
          END IF;
        END IF;
        IF public.catalog_json_has(p_item, 'category_id') THEN
          v_cat_ref := NULLIF(public.catalog_json_text(p_item, 'category_id'), '')::uuid;
          IF v_cat_ref IS NOT NULL THEN
            SELECT tenant_id INTO v_cat_tenant FROM public.categories WHERE id = v_cat_ref;
            IF v_cat_tenant IS NULL OR v_cat_tenant IS DISTINCT FROM p_tenant_id THEN
              RAISE EXCEPTION 'category does not belong to tenant' USING ERRCODE = '42501';
            END IF;
          END IF;
        ELSE
          v_cat_ref := v_item.category_id;
        END IF;

        IF public.catalog_json_has(p_item, 'price') AND v_price IS DISTINCT FROM v_item.price THEN
          INSERT INTO public.catalog_price_history (
            tenant_id, item_id, price_type, old_amount, new_amount, changed_by
          ) VALUES (p_tenant_id, v_item.id, 'selling', v_item.price, v_price, p_changed_by);
        END IF;
        IF public.catalog_json_has(p_item, 'cost_price') AND v_cost IS DISTINCT FROM v_item.cost_price THEN
          INSERT INTO public.catalog_price_history (
            tenant_id, item_id, price_type, old_amount, new_amount, changed_by
          ) VALUES (p_tenant_id, v_item.id, 'cost', v_item.cost_price, v_cost, p_changed_by);
        END IF;

        UPDATE public.items SET
          name = CASE WHEN public.catalog_json_has(p_item, 'name')
                      THEN COALESCE(public.catalog_json_text(p_item, 'name'), v_item.name)
                      ELSE v_item.name END,
          sku = v_sku,
          barcode = CASE WHEN public.catalog_json_has(p_item, 'barcode')
                         THEN public.catalog_json_text(p_item, 'barcode')
                         ELSE v_item.barcode END,
          category_id = v_cat_ref,
          price = v_price,
          cost_price = v_cost,
          stock_qty = CASE WHEN public.catalog_json_has(p_item, 'stock_qty')
                           THEN COALESCE(public.catalog_json_num(p_item, 'stock_qty'), 0)::integer
                           ELSE v_item.stock_qty END,
          min_stock_qty = CASE WHEN public.catalog_json_has(p_item, 'min_stock_qty')
                               THEN COALESCE(public.catalog_json_num(p_item, 'min_stock_qty'), 0)
                               ELSE v_item.min_stock_qty END,
          type = CASE WHEN public.catalog_json_has(p_item, 'type')
                      THEN COALESCE(public.catalog_json_text(p_item, 'type'), v_item.type)
                      ELSE v_item.type END,
          status = CASE WHEN public.catalog_json_has(p_item, 'status')
                        THEN COALESCE(public.catalog_json_text(p_item, 'status'), v_item.status)
                        ELSE v_item.status END,
          catalog_kind = 'shop',
          catalog_version = v_version,
          image_url = CASE WHEN public.catalog_json_has(p_item, 'image_url')
                           THEN public.catalog_json_text(p_item, 'image_url')
                           ELSE v_item.image_url END,
          description = CASE WHEN public.catalog_json_has(p_item, 'description')
                             THEN public.catalog_json_text(p_item, 'description')
                             ELSE v_item.description END,
          updated_at = now()
         WHERE id = v_item.id AND tenant_id = p_tenant_id
         RETURNING * INTO v_item;
      END IF;
      v_entity_id := v_item.id::text;
    END IF;
  END IF;

  IF p_entity_type = 'category' THEN
    v_category_id := COALESCE(
      NULLIF(public.catalog_json_text(p_category, 'id'), '')::uuid,
      NULLIF(p_entity_id, '')::uuid
    );
    IF v_category_id IS NOT NULL THEN
      SELECT * INTO v_category FROM public.categories WHERE id = v_category_id;
      IF FOUND AND v_category.tenant_id IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'category belongs to another tenant' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF v_category.id IS NULL THEN
      v_name := COALESCE(public.catalog_json_text(p_category, 'name'), '');
      IF v_name = '' THEN
        RAISE EXCEPTION 'category name is required' USING ERRCODE = '22023';
      END IF;
      v_category_id := COALESCE(v_category_id, gen_random_uuid());
      INSERT INTO public.categories (id, tenant_id, name, description, is_active, updated_at)
      VALUES (
        v_category_id,
        p_tenant_id,
        v_name,
        public.catalog_json_text(p_category, 'description'),
        COALESCE((public.catalog_json_text(p_category, 'is_active'))::boolean, true),
        now()
      ) RETURNING * INTO v_category;
    ELSE
      UPDATE public.categories SET
        name = CASE WHEN public.catalog_json_has(p_category, 'name')
                    THEN COALESCE(public.catalog_json_text(p_category, 'name'), v_category.name)
                    ELSE v_category.name END,
        description = CASE WHEN public.catalog_json_has(p_category, 'description')
                           THEN public.catalog_json_text(p_category, 'description')
                           ELSE v_category.description END,
        is_active = CASE WHEN public.catalog_json_has(p_category, 'is_active')
                         THEN COALESCE((public.catalog_json_text(p_category, 'is_active'))::boolean, v_category.is_active)
                         ELSE v_category.is_active END,
        updated_at = now()
       WHERE id = v_category.id AND tenant_id = p_tenant_id
       RETURNING * INTO v_category;
    END IF;
    v_entity_id := v_category.id::text;
  END IF;

  INSERT INTO public.catalog_change_events (
    tenant_id, catalog_version, entity_type, entity_id, op, payload, created_at
  ) VALUES (
    p_tenant_id,
    v_version,
    p_entity_type,
    COALESCE(v_entity_id, 'unknown'),
    v_op,
    jsonb_strip_nulls(
      COALESCE(p_payload, '{}'::jsonb)
      || jsonb_build_object(
        'catalog_version', v_version,
        'id', v_entity_id,
        'tenant_id', p_tenant_id,
        'op', v_op
      )
    ),
    now()
  );

  v_result := jsonb_strip_nulls(jsonb_build_object(
    'catalog_version', v_version,
    'item', to_jsonb(v_item),
    'category', to_jsonb(v_category),
    'replayed', false
  ));

  IF v_key IS NOT NULL THEN
    UPDATE public.catalog_idempotency
       SET catalog_version = v_version,
           body = v_result,
           request_hash = v_hash
     WHERE tenant_id = p_tenant_id AND idempotency_key = v_key;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_catalog_mutation(
  uuid, text, text, text, text, jsonb, jsonb, jsonb, jsonb, uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_catalog_mutation(
  uuid, text, text, text, text, jsonb, jsonb, jsonb, jsonb, uuid
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_catalog_mutation(
  uuid, text, text, text, text, jsonb, jsonb, jsonb, jsonb, uuid
) TO service_role;

REVOKE ALL ON FUNCTION public.catalog_json_has(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_json_text(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_json_num(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_json_has(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_json_text(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_json_num(jsonb, text) TO service_role;

ALTER TABLE public.catalog_change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_catalog_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_change_events_select ON public.catalog_change_events;
CREATE POLICY catalog_change_events_select ON public.catalog_change_events
  FOR SELECT TO authenticated
  USING (public.can_access_tenant_uuid(tenant_id));

DROP POLICY IF EXISTS catalog_price_history_select ON public.catalog_price_history;
CREATE POLICY catalog_price_history_select ON public.catalog_price_history
  FOR SELECT TO authenticated
  USING (public.can_access_tenant_uuid(tenant_id));

DROP POLICY IF EXISTS device_catalog_sync_select ON public.device_catalog_sync_state;
CREATE POLICY device_catalog_sync_select ON public.device_catalog_sync_state
  FOR SELECT TO authenticated
  USING (public.can_access_tenant_uuid(tenant_id));

-- No INSERT/UPDATE/DELETE policies for authenticated: writes are service_role only.
-- catalog_idempotency: no authenticated policies (deny by default once RLS is on).

GRANT SELECT ON public.catalog_change_events TO authenticated;
GRANT SELECT ON public.catalog_price_history TO authenticated;
GRANT SELECT ON public.device_catalog_sync_state TO authenticated;
REVOKE ALL ON public.catalog_idempotency FROM authenticated, anon;
GRANT ALL ON public.catalog_change_events TO service_role;
GRANT ALL ON public.catalog_price_history TO service_role;
GRANT ALL ON public.device_catalog_sync_state TO service_role;
GRANT ALL ON public.catalog_idempotency TO service_role;

-- Later phases: catalog_variants, catalog_branch_prices, scheduled prices,
-- stock_movements replacing direct items.stock_qty overwrites.
