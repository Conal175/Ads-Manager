-- Applied to Adsmanager as Supabase migration 20261121072710.
-- No public Data API policies: role assignments must be managed server-side.
create table public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_user_roles enable row level security;
revoke all on table public.app_user_roles from public, anon, authenticated;
