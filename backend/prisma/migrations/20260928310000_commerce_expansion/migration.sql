-- Commerce expansion: immutable cart lines, recurring products, entitlements and refunds.
ALTER TABLE studio.products
  ADD COLUMN billing_type varchar(20) NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN billing_interval varchar(20),
  ADD COLUMN inventory_quantity integer;
ALTER TABLE studio.products
  ADD CONSTRAINT studio_product_billing_type CHECK (billing_type IN ('ONE_TIME','RECURRING')),
  ADD CONSTRAINT studio_product_billing_interval CHECK (
    (billing_type='ONE_TIME' AND billing_interval IS NULL) OR
    (billing_type='RECURRING' AND billing_interval IN ('month','year'))
  ),
  ADD CONSTRAINT studio_product_inventory CHECK (inventory_quantity IS NULL OR inventory_quantity>=0);

ALTER TABLE studio.checkout_orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE studio.checkout_orders
  ADD COLUMN checkout_mode varchar(20) NOT NULL DEFAULT 'payment',
  ADD COLUMN provider_subscription varchar(180),
  ADD COLUMN provider_payment_intent varchar(180),
  ADD COLUMN provider_customer varchar(180);
ALTER TABLE studio.checkout_orders ADD CONSTRAINT studio_checkout_mode CHECK(checkout_mode IN ('payment','subscription'));

CREATE TABLE studio.checkout_order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES studio.checkout_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES studio.products(id),
  product_name varchar(120) NOT NULL,
  price_id varchar(120) NOT NULL,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 20),
  unit_minor integer NOT NULL CHECK(unit_minor BETWEEN 1 AND 100000000),
  total_minor integer NOT NULL CHECK(total_minor BETWEEN 1 AND 2000000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,product_id)
);
CREATE INDEX studio_checkout_items_order ON studio.checkout_order_items(order_id);

CREATE TABLE studio.entitlements (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES studio.checkout_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES studio.products(id),
  provider_subscription varchar(180),
  state varchar(30) NOT NULL CHECK(state IN ('ACTIVE','PAST_DUE','CANCELED')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_entitlements_site_state ON studio.entitlements(site_id,state);

CREATE TABLE studio.refunds (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES studio.checkout_orders(id),
  operation_id uuid NOT NULL UNIQUE,
  amount_minor integer NOT NULL CHECK(amount_minor>0),
  state varchar(30) NOT NULL DEFAULT 'REQUESTED' CHECK(state IN ('REQUESTED','SUCCEEDED','FAILED')),
  provider_ref varchar(180) UNIQUE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_refunds_order ON studio.refunds(order_id,created_at DESC);
