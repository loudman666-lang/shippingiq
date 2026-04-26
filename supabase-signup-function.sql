-- ============================================
-- ShippingIQ — Signup function fix
-- Run this in Supabase SQL Editor
-- ============================================

-- Create a secure function that handles signup
-- Runs as SECURITY DEFINER so it bypasses RLS
create or replace function public.create_merchant_and_profile(
  user_id uuid,
  user_email text,
  user_full_name text,
  store_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_merchant_id uuid;
begin
  -- Create merchant
  insert into public.merchants (name, plan)
  values (store_name, 'free')
  returning id into new_merchant_id;

  -- Create profile
  insert into public.profiles (id, merchant_id, full_name, email, role)
  values (user_id, new_merchant_id, user_full_name, user_email, 'admin');
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_merchant_and_profile to authenticated;
grant execute on function public.create_merchant_and_profile to anon;

-- ============================================
-- DONE
-- ============================================
