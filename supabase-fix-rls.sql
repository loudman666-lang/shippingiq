-- ============================================
-- ShippingIQ — Fix RLS for signup flow
-- Run this in Supabase SQL Editor
-- ============================================

-- Allow anyone authenticated to insert a merchant during signup
-- (they won't have a profile yet so get_merchant_id() returns null)
drop policy if exists "Users can view their own merchant" on public.merchants;
drop policy if exists "Admins can update their merchant" on public.merchants;
drop policy if exists "Users can view profiles in their merchant" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

-- MERCHANTS policies
create policy "Users can view their own merchant"
  on public.merchants for select
  using (id = public.get_merchant_id());

-- Allow authenticated users to insert a merchant (signup flow)
create policy "Authenticated users can create a merchant"
  on public.merchants for insert
  with check (auth.uid() is not null);

create policy "Admins can update their merchant"
  on public.merchants for update
  using (id = public.get_merchant_id() and public.get_user_role() = 'admin');

-- PROFILES policies
create policy "Users can view profiles in their merchant"
  on public.profiles for select
  using (merchant_id = public.get_merchant_id());

-- Allow authenticated users to insert their own profile (signup flow)
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Admins can delete profiles"
  on public.profiles for delete
  using (
    merchant_id = public.get_merchant_id()
    and public.get_user_role() = 'admin'
    and id != auth.uid()
  );

-- ============================================
-- DONE — policies updated for signup flow
-- ============================================
