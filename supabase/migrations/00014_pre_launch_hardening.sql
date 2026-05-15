-- Pre-launch hardening, addressing audit findings:
--
-- 1) submit_team again locks the team (regression introduced in 00013 when
--    the function was replaced for video-field alignment) and now also
--    requires every accepted member to have age_attestation_at set.
-- 2) auto_lock_overdue uses GET DIAGNOSTICS to count rows. Previous
--    RETURNING INTO threw TOO_MANY_ROWS when multiple teams went overdue
--    in the same tick — the cron would then 500 and lock nothing.
-- 3) RLS tightening prevents browser-devtools bypass:
--    - team_members direct INSERT / UPDATE revoked (server actions own
--      these via service_role or SECURITY DEFINER RPCs).
--    - teams UPDATE is column-scoped and now has WITH CHECK matching
--      USING — leader can't reassign leader_id or unlock.
--    - users UPDATE policy gets WITH CHECK that pins email to the
--      caller's JWT email — user can't swap their own email to claim
--      someone else's invite.

create or replace function public.submit_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_leader_id uuid;
  v_locked boolean;
  v_deadline timestamptz;
  v_sub public.submissions%rowtype;
  v_missing_luma int;
  v_missing_age int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select t.leader_id, t.locked, h.submission_deadline_at
    into v_leader_id, v_locked, v_deadline
  from public.teams t
  join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_team_id;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'already_locked'; end if;
  if v_deadline <= now() then raise exception 'deadline_passed'; end if;

  select * into v_sub from public.submissions where team_id = p_team_id;

  if v_sub.project_name is null or length(trim(v_sub.project_name)) = 0
     or v_sub.description is null or length(trim(v_sub.description)) = 0
     or v_sub.pitch_url is null or length(trim(v_sub.pitch_url)) = 0
     or v_sub.pitch_video_url is null or length(trim(v_sub.pitch_video_url)) = 0
     or v_sub.github_url is null or length(trim(v_sub.github_url)) = 0
     or v_sub.image_path is null or length(trim(v_sub.image_path)) = 0 then
    raise exception 'missing_required_fields';
  end if;

  select count(*) into v_missing_luma
  from public.team_members tm
  join public.users u on u.id = tm.user_id
  where tm.team_id = p_team_id
    and tm.status = 'accepted'
    and u.luma_registered_at is null;

  if v_missing_luma > 0 then raise exception 'members_missing_luma'; end if;

  select count(*) into v_missing_age
  from public.team_members tm
  join public.users u on u.id = tm.user_id
  where tm.team_id = p_team_id
    and tm.status = 'accepted'
    and u.age_attestation_at is null;

  if v_missing_age > 0 then raise exception 'members_missing_age'; end if;

  update public.submissions
  set status = 'submitted', submitted_at = now()
  where team_id = p_team_id;

  update public.teams
  set locked = true
  where id = p_team_id;
end;
$$;

revoke execute on function public.submit_team(uuid) from anon, public;
grant  execute on function public.submit_team(uuid) to authenticated;

create or replace function public.auto_lock_overdue() returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with overdue as (
    select t.id from teams t
    join hackathons h on h.id = t.hackathon_id
    where t.locked = false and h.submission_deadline_at < now()
  ),
  locked_subs as (
    update submissions s
    set status = 'submitted', submitted_at = coalesce(s.submitted_at, now())
    from overdue
    where s.team_id = overdue.id and s.status = 'draft'
    returning 1
  )
  update teams set locked = true
  where id in (select id from overdue);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke insert, update on public.team_members from authenticated;

revoke update on public.teams from authenticated;
grant  update (name, description, updated_at) on public.teams to authenticated;
drop policy if exists "teams_leader_update" on public.teams;
create policy "teams_leader_update" on public.teams for update to authenticated
  using (leader_id = auth.uid() and locked = false)
  with check (leader_id = auth.uid() and locked = false);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and lower(email) = lower(auth.jwt()->>'email'));
