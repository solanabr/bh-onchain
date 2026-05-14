-- Fixes infinite-recursion in policies that query team_members from within
-- team-related RLS rules. SECURITY DEFINER helpers bypass RLS for the
-- membership check, breaking the loop. Same pattern as superteam-maker's
-- 00008_fix_recursive_membership_policies.sql.

create or replace function public.is_active_team_member(p_team_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_exists boolean;
begin
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and status = 'accepted'
  ) into v_exists;
  return coalesce(v_exists, false);
end;
$$;

create or replace function public.shares_active_team_with(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_exists boolean;
begin
  select exists (
    select 1
    from public.team_members tm_other
    join public.team_members tm_self
      on tm_self.team_id = tm_other.team_id
    where tm_other.user_id = p_user_id
      and tm_other.status = 'accepted'
      and tm_self.user_id = auth.uid()
      and tm_self.status = 'accepted'
  ) into v_exists;
  return coalesce(v_exists, false);
end;
$$;

revoke execute on function public.is_active_team_member(uuid) from anon, authenticated, public;
revoke execute on function public.shares_active_team_with(uuid) from anon, authenticated, public;
grant  execute on function public.is_active_team_member(uuid) to authenticated;
grant  execute on function public.shares_active_team_with(uuid) to authenticated;

drop policy if exists "users_read_teammates" on public.users;
create policy "users_read_teammates" on public.users for select to authenticated
  using (public.shares_active_team_with(id));

drop policy if exists "teams_member_read" on public.teams;
create policy "teams_member_read" on public.teams for select to authenticated
  using (public.is_active_team_member(id));

drop policy if exists "team_members_read" on public.team_members;
create policy "team_members_read" on public.team_members for select to authenticated
  using (public.is_active_team_member(team_id));

drop policy if exists "submissions_member_read" on public.submissions;
create policy "submissions_member_read" on public.submissions for select to authenticated
  using (public.is_active_team_member(team_id));

-- Tightens the existing update policy with both lock + deadline checks
-- (the deadline check is also part of Batch 1's "deadline at the data boundary"
-- fix from the security audit).
drop policy if exists "submissions_member_update" on public.submissions;
create policy "submissions_member_update" on public.submissions for update to authenticated
  using (
    public.is_active_team_member(team_id)
    and exists (
      select 1 from public.teams t
      join public.hackathons h on h.id = t.hackathon_id
      where t.id = submissions.team_id
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  );

-- Backfill public.users for any auth.users row that's missing its mirror.
insert into public.users (id, email, full_name, avatar_url)
select
  au.id,
  au.email,
  nullif(au.raw_user_meta_data->>'full_name', ''),
  nullif(au.raw_user_meta_data->>'avatar_url', '')
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id);

-- Lets the onboarding form upsert (insert-or-update) self-heal if the
-- on_auth_user_created trigger ever misses an account.
create policy "users_insert_self" on public.users for insert to authenticated
  with check (auth.uid() = id);
