-- BN_STONE Supabase Database & Storage Schema
-- Run this SQL in your Supabase SQL Editor before deploying to Vercel.

create extension if not exists "pgcrypto";

-- 1. Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  description text not null,
  category text not null check (category in ('helmets', 'gloves', 'jackets', 'accessories')),
  image_url text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_published_created
  on public.products (published, created_at desc);

create index if not exists idx_products_category
  on public.products (category);

-- 2. Store settings table (single row id = 'default')
create table if not exists public.store_settings (
  id text primary key default 'default',
  whatsapp_phone text not null default '+212763941307',
  currency text not null default 'ر.س',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id, whatsapp_phone, currency)
values ('default', '+212763941307', 'ر.س')
on conflict (id) do nothing;

-- 3. Server-only admin credentials table (only accessed via service role key)
create table if not exists public.admin_credentials (
  id text primary key default 'owner',
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_credentials enable row level security;

-- Public read access ONLY for published products and public store settings
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
  on public.products for select
  using (published = true);

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
  on public.store_settings for select
  using (true);

-- Note: admin_credentials has NO public policies; only server-side service role can read/write it.

-- 4. Public storage bucket for product images (writes only via server service role)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for product images" on storage.objects;
create policy "Public read access for product images"
  on storage.objects for select
  using (bucket_id = 'product-images');
