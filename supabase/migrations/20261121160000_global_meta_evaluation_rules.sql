-- Keep account-specific rules untouched as a historical record. Global rules must
-- be deliberately configured rather than inferred from one account's settings.
create table if not exists public.meta_evaluation_global_rules (
 objective text primary key check (objective in ('MESS','PURCHASES','CONVERSION','TRAFFIC')),
 min_spend numeric not null check (min_spend >= 0),
 min_results numeric not null check (min_results >= 0),
 target numeric not null check (target > 0),
 warning_margin_pct numeric not null check (warning_margin_pct between 0 and 100),
 updated_at timestamptz not null default now()
);
alter table public.meta_evaluation_global_rules enable row level security;
revoke all on public.meta_evaluation_global_rules from public, anon, authenticated;
