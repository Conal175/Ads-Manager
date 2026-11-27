-- Record change attempts before Meta is called. Never store tokens.
create table if not exists public.meta_ad_change_log (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 account_id text not null check (account_id ~ '^[0-9]{1,30}$'),
 campaign_id text not null check (campaign_id ~ '^[0-9]{1,30}$'),
 campaign_name text not null,
 from_status text not null check (from_status in ('ACTIVE','PAUSED')),
 to_status text not null check (to_status in ('ACTIVE','PAUSED')),
 outcome text not null check (outcome in ('pending','confirmed','rejected','unknown')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists meta_ad_change_log_account_time on public.meta_ad_change_log (account_id, created_at desc, id desc);
alter table public.meta_ad_change_log enable row level security;
revoke all on public.meta_ad_change_log from public, anon, authenticated;
revoke all on sequence public.meta_ad_change_log_id_seq from public, anon, authenticated;
