# ShippingIQ — Database Documentation

## Supabase Project
- URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Plan: Paid (daily backups with Point-in-Time Recovery)

## Tables

### profiles
Stores user profile data. Created automatically via trigger when a user signs up.
- id (uuid) — matches auth.uid()
- merchant_id (uuid) — foreign key to merchants
- full_name (text)
- email (text)
- role (text) — 'admin' or 'user'
- created_at, updated_at

### merchants
Stores the merchant/store data. Created automatically via trigger when a user signs up.
- id (uuid)
- name (text) — store name
- plan (text) — 'free', 'starter', 'growth', 'pro'
- stripe_customer_id (text)
- stripe_subscription_id (text)
- created_at, updated_at

## RLS (Row Level Security)
- profiles: DISABLED (disabled during setup, review before going to production)
- merchants: DISABLED (disabled during setup, review before going to production)

## API Access
- profiles: ENABLED (toggled on in Supabase API settings)
- merchants: ENABLED (toggled on in Supabase API settings)

## Triggers
- On new user signup: automatically creates a profile row and merchant row

## Changes Log
### 2026-04-27
- Fixed profiles and merchants tables not being exposed to Data API
- Disabled RLS on both tables to resolve 403 errors during development
- Added RLS policies for profiles (select, insert, update, delete)
- TODO: Re-enable and properly configure RLS before going to production

### carriers
Stores carrier rate card data parsed by AI.
- id (uuid)
- merchant_id (uuid) — foreign key to merchants
- name (text) — carrier name entered by merchant
- status (text) — 'active' or 'inactive'
- parsed_data (jsonb) — AI parsed zones, rates, weight breaks, service types
- created_at, updated_at

## RLS Status
- carriers: DISABLED
- profiles: DISABLED
- merchants: DISABLED
Note: All RLS disabled for development. Must be properly configured before production launch.
