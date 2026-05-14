-- Batch 1 hardening from the Codex audit:
--   - Drops the over-permissive team_members_self_accept policy.
--   - Tightens accept_team_invite: email match, team-size cap (with row lock),
--     team-not-locked check.
--   - Tightens submit_team: image required, deadline check, every accepted
--     member must have luma_registered_at.
--   - Revokes direct UPDATE on submissions.status + submissions.submitted_at;
--     adds a trigger that forces last_edited_by = auth.uid() on every update.
--   - Rebuilds the three project-images storage policies to also require
--     team-not-locked + deadline-not-passed.
--   - Sets bucket-level file_size_limit + allowed_mime_types.

drop policy if exists "team_members_self_accept" on public.team_members;

create or replace function public.accept_team_invite(p_invite_token text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_member_id uuid;
  v_team_id uuid;
  v_hackathon_id uuid;
  v_invited_email text;
  v_existing_count int;
  v_accepted_count int;
  v_locked boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select email into v_user_email from public.users where id = v_user_id;

  select id, team_id, invited_email
    into v_member_id, v_team_id, v_invited_email
  from public.team_members
  where invite_token = p_invite_token and status = 'pending';

  if v_member_id is null then raise exception 'invite_not_found'; end if;

  if lower(v_invited_email) <> lower(coalesce(v_user_email, '')) then
    raise exception 'invite_email_mismatch';
  end if;

  select hackathon_id, locked into v_hackathon_id, v_locked
  from public.teams where id = v_team_id for update;

  if v_locked then raise exception 'team_locked'; end if;

  select count(*) into v_accepted_count
  from public.team_members
  where team_id = v_team_id and status = 'accepted';

  if v_accepted_count >= 4 then raise exception 'team_full'; end if;

  select count(*) into v_existing_count
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
    and tm.status = 'accepted'
    and t.hackathon_id = v_hackathon_id;

  if v_existing_count > 0 then raise exception 'already_on_team'; end if;

  update public.team_members
  set user_id = v_user_id,
      status = 'accepted',
      accepted_at = now(),
      invite_token = null
  where id = v_member_id;

  return v_team_id;
end;
$$;

revoke execute on function public.accept_team_invite(text) from anon, public;
grant  execute on function public.accept_team_invite(text) to authenticated;

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
     or v_sub.demo_video_url is null or length(trim(v_sub.demo_video_url)) = 0
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

  update public.teams set locked = true where id = p_team_id;
end;
$$;

revoke execute on function public.submit_team(uuid) from anon, public;
grant  execute on function public.submit_team(uuid) to authenticated;

revoke update (status, submitted_at) on public.submissions from authenticated;
grant update (
  project_name, description,
  pitch_url, pitch_video_url, demo_video_url,
  github_url, twitter_url, website_url,
  image_path, last_edited_by, updated_at
) on public.submissions to authenticated;

create or replace function public.set_submission_last_edited_by()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  new.last_edited_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists submissions_set_last_edited_by on public.submissions;
create trigger submissions_set_last_edited_by
  before update on public.submissions
  for each row execute function public.set_submission_last_edited_by();

revoke execute on function public.set_submission_last_edited_by()
  from anon, authenticated, public;

drop policy if exists "project_images_team_upload" on storage.objects;
drop policy if exists "project_images_team_update" on storage.objects;
drop policy if exists "project_images_team_delete" on storage.objects;

create policy "project_images_team_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] in (
      select tm.team_id::text
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      join public.hackathons h on h.id = t.hackathon_id
      where tm.user_id = auth.uid()
        and tm.status = 'accepted'
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  );

create policy "project_images_team_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] in (
      select tm.team_id::text
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      join public.hackathons h on h.id = t.hackathon_id
      where tm.user_id = auth.uid()
        and tm.status = 'accepted'
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  );

create policy "project_images_team_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] in (
      select tm.team_id::text
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      join public.hackathons h on h.id = t.hackathon_id
      where tm.user_id = auth.uid()
        and tm.status = 'accepted'
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  );

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'project-images';
