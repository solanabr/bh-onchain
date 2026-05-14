-- Atomic operations needing privileged checks.

-- create_team_with_leader: leaders create a team. The trigger on insert
-- auto-creates the submission row and the leader's team_members entry.
-- This RPC validates that the user isn't already in another team for
-- the same hackathon and that the team name is unique.
create or replace function create_team_with_leader(
  p_hackathon_id uuid,
  p_name text,
  p_description text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_team_id uuid;
  v_existing_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_existing_count
  from team_members tm
  join teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
    and tm.status = 'accepted'
    and t.hackathon_id = p_hackathon_id;

  if v_existing_count > 0 then
    raise exception 'already_on_team';
  end if;

  insert into teams (hackathon_id, name, description, leader_id)
  values (p_hackathon_id, trim(p_name), nullif(trim(p_description), ''), v_user_id)
  returning id into v_team_id;

  return v_team_id;
end;
$$;

-- accept_team_invite: consume a pending invite, attach the authenticated
-- user. Caller validates the HMAC of the token before invoking.
create or replace function accept_team_invite(
  p_invite_token text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_member_id uuid;
  v_team_id uuid;
  v_hackathon_id uuid;
  v_existing_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select email into v_user_email from users where id = v_user_id;

  select id, team_id into v_member_id, v_team_id
  from team_members
  where invite_token = p_invite_token
    and status = 'pending';

  if v_member_id is null then
    raise exception 'invite_not_found';
  end if;

  select hackathon_id into v_hackathon_id from teams where id = v_team_id;

  select count(*) into v_existing_count
  from team_members tm
  join teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
    and tm.status = 'accepted'
    and t.hackathon_id = v_hackathon_id;

  if v_existing_count > 0 then
    raise exception 'already_on_team';
  end if;

  update team_members
  set user_id = v_user_id,
      invited_email = v_user_email,
      status = 'accepted',
      accepted_at = now(),
      invite_token = null
  where id = v_member_id;

  return v_team_id;
end;
$$;

-- submit_team: leader-only finalize. Validates required fields, flips
-- submission to 'submitted' and locks the team.
create or replace function submit_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_leader_id uuid;
  v_locked boolean;
  v_sub submissions%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select leader_id, locked into v_leader_id, v_locked
  from teams where id = p_team_id;

  if v_leader_id is null then
    raise exception 'team_not_found';
  end if;

  if v_leader_id <> v_user_id then
    raise exception 'not_leader';
  end if;

  if v_locked then
    raise exception 'already_locked';
  end if;

  select * into v_sub from submissions where team_id = p_team_id;

  if v_sub.project_name is null or length(trim(v_sub.project_name)) = 0
     or v_sub.description is null or length(trim(v_sub.description)) = 0
     or v_sub.pitch_url is null or length(trim(v_sub.pitch_url)) = 0
     or v_sub.demo_video_url is null or length(trim(v_sub.demo_video_url)) = 0
     or v_sub.github_url is null or length(trim(v_sub.github_url)) = 0 then
    raise exception 'missing_required_fields';
  end if;

  update submissions
  set status = 'submitted', submitted_at = now()
  where team_id = p_team_id;

  update teams set locked = true where id = p_team_id;
end;
$$;

-- auto_lock_overdue: called by cron — locks any team past the deadline.
create or replace function auto_lock_overdue() returns int
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
  where id in (select id from overdue)
  returning 1 into v_count;

  return v_count;
end;
$$;
