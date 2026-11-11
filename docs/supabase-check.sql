-- Run this after docs/supabase-tables.sql. You should see three results.

-- A. Row Level Security: both rows should say true.
select relname as table_name, relrowsecurity as rls_on
from pg_class
where relnamespace = 'public'::regnamespace and relname in ('feedback', 'plan_counts');

-- B. Public access to the tables: this should return NO rows.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('feedback', 'plan_counts') and grantee in ('anon', 'authenticated');

-- C. Public access to the counting function: both columns should say false.
select
  has_function_privilege('anon', 'public.increment_plan_count(date, text)', 'execute') as anon_can_run,
  has_function_privilege('authenticated', 'public.increment_plan_count(date, text)', 'execute') as signed_in_can_run;
