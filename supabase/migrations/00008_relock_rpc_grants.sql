-- Reapplies the EXECUTE revokes that got reset when we replaced function bodies
-- in batch 1. Without this, the security advisor flags create_team_with_leader
-- (anon-callable) and auto_lock_overdue (authenticated-callable).

revoke execute on function public.create_team_with_leader(uuid, text, text) from anon, public;
grant  execute on function public.create_team_with_leader(uuid, text, text) to authenticated;

revoke execute on function public.auto_lock_overdue() from anon, authenticated, public;
