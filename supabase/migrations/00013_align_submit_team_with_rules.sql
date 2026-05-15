-- Align submit_team validation with the regulamento's official deliverables:
--   1) Repositório Git
--   2) Vídeo de apresentação (demo)
--   3) Deck
-- The form previously had two video fields (Pitch + Demo) but the rules
-- only require ONE video. We now require pitch_video_url and drop the
-- demo_video_url requirement. The demo_video_url column stays on the
-- table for backward compatibility with any existing submissions.

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

  update public.submissions
  set status = 'submitted', submitted_at = now()
  where team_id = p_team_id;
end;
$$;

revoke execute on function public.submit_team(uuid) from anon, public;
grant  execute on function public.submit_team(uuid) to authenticated;
