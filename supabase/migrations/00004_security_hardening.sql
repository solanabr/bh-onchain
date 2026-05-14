-- Security hardening — drops anon/authenticated EXECUTE on functions that
-- are either internal trigger callbacks or service-role-only (cron). Pins
-- search_path on the two trigger functions that lacked it.

revoke execute on function public.create_team_with_leader(uuid, text, text) from anon;
revoke execute on function public.accept_team_invite(text) from anon;
revoke execute on function public.submit_team(uuid) from anon;

revoke execute on function public.auto_lock_overdue() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.handle_new_team() from anon, authenticated, public;
revoke execute on function public.set_team_member_hackathon_id() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;

alter function public.set_team_member_hackathon_id() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
