-- Application-level account grants. Meta access is still limited by the server token.
create table if not exists public.meta_ad_account_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null check (account_id ~ '^[0-9]{1,30}$'),
  can_manage boolean not null default false,
  primary key (user_id, account_id)
);
alter table public.meta_ad_account_grants enable row level security;
revoke all on public.meta_ad_account_grants from public, anon, authenticated;
