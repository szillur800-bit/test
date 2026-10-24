create extension if not exists pgcrypto;

create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  storage_path text not null,
  original_filename text not null,
  print_mode text not null check (print_mode in ('bw','color')),
  copies integer not null check (copies between 1 and 20),
  page_count integer not null check (page_count between 1 and 1000),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'BDT',
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','payment_pending','paid','queued','printing','printed','failed','cancelled')),
  bkash_payment_id text,
  bkash_trx_id text,
  payment_status text,
  print_agent_id text,
  print_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  printed_at timestamptz
);

create index if not exists print_orders_queue_idx
  on public.print_orders(status, created_at);

alter table public.print_orders enable row level security;
-- No public policies: all order access must go through trusted server routes using service-role key.
