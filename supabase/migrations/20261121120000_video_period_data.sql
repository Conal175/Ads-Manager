create table public.video_period_data (
 id bigint generated always as identity primary key,
 ad_id text not null,
 period_start date not null,
 period_end date not null,
 video_code text not null,
 report_rows jsonb not null,
 media jsonb not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 replaced_at timestamptz,
 check (period_start <= period_end)
);
create index video_period_data_active_ad_period on public.video_period_data (ad_id,period_start,period_end) where active;
alter table public.video_period_data enable row level security;
revoke all on public.video_period_data from public, anon, authenticated;
revoke all on sequence public.video_period_data_id_seq from public, anon, authenticated;
