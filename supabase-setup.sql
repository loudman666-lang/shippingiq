-- ============================================
-- ShippingIQ Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- MERCHANTS TABLE
-- One merchant account per business
create table public.merchants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'starter', 'growth', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROFILES TABLE
-- One profile per user, linked to a merchant
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  merchant_id uuid references public.merchants(id) on delete cascade not null,
  full_name text not null,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.merchants enable row level security;
alter table public.profiles enable row level security;

-- Helper function: get current user's merchant_id
create or replace function public.get_merchant_id()
returns uuid
language sql
security definer
stable
as $$
  select merchant_id from public.profiles where id = auth.uid()
$$;

-- Helper function: get current user's role
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- MERCHANTS policies
-- Users can only see their own merchant
create policy "Users can view their own merchant"
  on public.merchants for select
  using (id = public.get_merchant_id());

-- Only admins can update merchant details
create policy "Admins can update their merchant"
  on public.merchants for update
  using (id = public.get_merchant_id() and public.get_user_role() = 'admin');

-- PROFILES policies
-- Users can view all profiles in their merchant
create policy "Users can view profiles in their merchant"
  on public.profiles for select
  using (merchant_id = public.get_merchant_id());

-- Users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Only admins can insert new profiles (invite users)
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    merchant_id = public.get_merchant_id()
    and public.get_user_role() = 'admin'
  );

-- Only admins can delete profiles (remove users)
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (
    merchant_id = public.get_merchant_id()
    and public.get_user_role() = 'admin'
    and id != auth.uid()
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchants_updated_at
  before update on public.merchants
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================
-- DONE
-- ============================================
-- Tables created: merchants, profiles
-- RLS enabled on both tables
-- Helper functions: get_merchant_id(), get_user_role()
-- Run this once. Do not run again — it will error on duplicate objects.
