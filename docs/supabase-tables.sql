-- Next Step PM, Phase 9a: the feedback and plan_counts tables.
-- Paste all of this into the Supabase SQL Editor and press Run. It's safe to run again.

-- 1. Feedback: a rating, an optional comment and the plan's category answers. No names, emails or companies.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  plan_summary jsonb not null default '{}'::jsonb,
  page_version text not null default 'unknown'
);

-- 2. Anonymous counts of plans built: one row per day and kind of plan.
create table if not exists public.plan_counts (
  day date not null,
  work_kind text not null check (work_kind in ('product', 'strategy', 'coaching', 'explore')),
  count integer not null default 0 check (count >= 0),
  primary key (day, work_kind)
);

-- 3. Row Level Security on, with no policies: nobody using the public key can read or write.
alter table public.feedback enable row level security;
alter table public.plan_counts enable row level security;

-- 4. "Automatically expose new tables" gives the public roles access. Take it away again.
revoke all on table public.feedback from anon, authenticated;
revoke all on table public.plan_counts from anon, authenticated;
grant select, insert, delete on table public.feedback to service_role;
grant select, insert, update on table public.plan_counts to service_role;

-- 5. Adds one to a day's count in a single step, so two plans at once can't lose a count.
create or replace function public.increment_plan_count(p_day date, p_work_kind text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.plan_counts (day, work_kind, count)
  values (p_day, p_work_kind, 1)
  on conflict (day, work_kind) do update set count = public.plan_counts.count + 1;
$$;

revoke execute on function public.increment_plan_count(date, text) from public, anon, authenticated;
grant execute on function public.increment_plan_count(date, text) to service_role;
