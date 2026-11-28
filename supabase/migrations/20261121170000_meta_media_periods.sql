-- Automatically retained, confidently matched period metrics; no direct client access.
create table if not exists public.meta_media_periods (
 id bigint generated always as identity primary key,
 account_id text not null check (account_id ~ '^[0-9]{1,30}$'),
 campaign_id text not null check (campaign_id ~ '^[0-9]{1,30}$'),
 media_code text not null check (media_code ~ '^M[0-9]+$'),
 since_date date not null,
 until_date date not null,
 pulled_at timestamptz not null,
 actor_id uuid references auth.users(id) on delete set null,
 data jsonb not null,
 check (since_date <= until_date),
 unique (account_id,campaign_id,media_code,since_date,until_date)
);
create index if not exists meta_media_periods_account_media on public.meta_media_periods (account_id,campaign_id,media_code,since_date,until_date);
alter table public.meta_media_periods enable row level security;
revoke all on public.meta_media_periods from public, anon, authenticated;
revoke all on sequence public.meta_media_periods_id_seq from public, anon, authenticated;
