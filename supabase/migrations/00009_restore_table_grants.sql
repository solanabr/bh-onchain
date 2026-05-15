-- Restore PostgREST role grants. The project was repurposed from
-- supabase-solana-lms and the original ALTER DEFAULT PRIVILEGES were
-- dropped along with that schema, so new tables inherited no grants
-- and every authenticated request 403s at the GRANT layer before RLS
-- can even run.

grant usage on schema public to anon, authenticated;

grant select on public.hackathons to anon, authenticated;

grant select, insert, update, delete on
  public.users,
  public.teams,
  public.team_members,
  public.submissions
to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

-- Restore the defaults so future migrations don't have to remember this.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
