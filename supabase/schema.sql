-- ============================================================
-- Sari-Sari Inventory: security + schema migration
-- =============================================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Two changes:
--   1. Adds the `stock_quantity` column used by low-stock alerts.
--   2. Enables Row Level Security and revokes ALL privileges from the
--      `anon`/`authenticated` roles so a leaked anon key can't read or
--      modify data. All data access now happens through the app's server
--      API routes, which use the service role key (bypasses RLS).

-- 1) POS columns (idempotent):
--    products.stock_quantity      -> low-stock alerts
--    products.product_code        -> barcode/scanner-friendly quick code
--    products.category            -> POS filter chips
--    sales.payment_method         -> how the sale was paid
alter table public.products
  add column if not exists stock_quantity integer,
  add column if not exists product_code text,
  add column if not exists category text;

alter table public.sales
  add column if not exists payment_method text
    check (payment_method in ('cash', 'gcash', 'utang'));

-- Unique product code (allow multiple NULLs, forbid duplicates).
create unique index if not exists products_product_code_uq
  on public.products (lower(product_code))
  where product_code is not null;

-- 2) Lock down tables.
do $$
declare
  t text;
begin
  foreach t in array array['products', 'sales', 'utang', 'customers', 'daily_profit']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end $$;

-- 3) The `update_daily_profit` RPC called by the Kita Overview page runs over
--    the service role connection (which bypasses RLS), so it keeps working.
--    For defence-in-depth you may also redeclare it as SECURITY DEFINER and
--    revoke execute from anon/authenticated so it can never be invoked by an
--    anonymous client:
--
--    alter function public.update_daily_profit() security definer;
--    revoke execute on function public.update_daily_profit() from anon, authenticated;

-- 4) GCash convenience-center service (cash-in / cash-out).
--    Fee tiers: editable rows (min amount -> max amount -> fee). The owner
--    adds rows as the service grows. Transactions are logged from the POS
--    till; each amount must fall inside a fee tier and the charged fee can
--    be raised above the tier's fee (never below).
create table if not exists public.gcash_fee_tiers (
  id bigint generated always as identity primary key,
  min_amount numeric(12, 2) not null check (min_amount >= 0),
  max_amount numeric(12, 2) not null check (max_amount >= min_amount),
  fee numeric(10, 2) not null check (fee >= 0)
);

drop table if exists public.gcash_settings;

create table if not exists public.gcash_transactions (
  id bigint generated always as identity primary key,
  type text not null check (type in ('cashin', 'cashout')),
  amount numeric(12, 2) not null check (amount > 0),
  fee numeric(10, 2) not null default 0 check (fee >= 0),
  customer_name text,
  note text,
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['gcash_fee_tiers', 'gcash_transactions']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end $$;