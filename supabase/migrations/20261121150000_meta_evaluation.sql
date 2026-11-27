-- Accessible only through the authorized server API; no direct client grants.
create table if not exists public.meta_evaluation_runs (
 id bigint generated always as identity primary key,
 account_id text not null check (account_id ~ '^[0-9]{1,30}$'),
 since_date date not null, until_date date not null,
 status text not null check (status in ('running','complete','partial','failed')),
 started_at timestamptz not null default now(), finished_at timestamptz,
 error_message text, rows jsonb not null default '[]', sheet jsonb not null default '[]',
 actor_id uuid references auth.users(id) on delete set null,
 check (since_date <= until_date)
);
create index if not exists meta_evaluation_runs_account_dates on public.meta_evaluation_runs(account_id,since_date,until_date,started_at desc);
create table if not exists public.meta_evaluation_rules (
 account_id text not null check (account_id ~ '^[0-9]{1,30}$'),
 objective text not null check (objective in ('MESS','PURCHASES','CONVERSION','TRAFFIC')),
 min_spend numeric not null check (min_spend>=0),
 min_results numeric not null check (min_results>=0),
 target numeric not null check (target>0),
 warning_margin_pct numeric not null check (warning_margin_pct between 0 and 100),
 updated_at timestamptz not null default now(),
 primary key (account_id,objective)
);
alter table public.meta_evaluation_runs enable row level security;
alter table public.meta_evaluation_rules enable row level security;
revoke all on public.meta_evaluation_runs, public.meta_evaluation_rules from public, anon, authenticated;
revoke all on sequence public.meta_evaluation_runs_id_seq from public, anon, authenticated;
