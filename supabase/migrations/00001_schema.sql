-- BH Onchain Hackathon — Submission Platform
-- Initial schema: users, hackathons, teams, team_members, submissions

create extension if not exists "pgcrypto";

-- =====================================================================
-- USERS — mirrors auth.users with profile data
-- =====================================================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  github_url text,
  twitter_url text,
  linkedin_url text,
  telegram_handle text,
  avatar_url text,
  luma_registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- HACKATHONS — one row per edition
-- =====================================================================
create table hackathons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  starts_at timestamptz not null,
  submission_deadline_at timestamptz not null,
  presential_at timestamptz,
  luma_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into hackathons (
  slug, name, description,
  starts_at, submission_deadline_at, presential_at,
  luma_url, metadata
) values (
  'bh-onchain-2026',
  'Hackathon BH Onchain — Trilha Solana Superteam',
  'Hackathon de 5 dias com curadoria da Solana Superteam. Construa em Solana, dispute USD 3.000 em prêmios.',
  '2026-05-13 12:00:00-03',
  '2026-05-16 23:59:59-03',
  '2026-05-17 14:00:00-03',
  'https://luma.com/2teevtax',
  jsonb_build_object(
    'prize_total_usd', 3000,
    'team_size_min', 1,
    'team_size_max', 4,
    'prizes', jsonb_build_array(
      jsonb_build_object('place', 1, 'usd', 1200),
      jsonb_build_object('place', 2, 'usd', 700),
      jsonb_build_object('place', 3, 'usd', 500),
      jsonb_build_object('place', 4, 'usd', 200, 'note', 'Menção Honrosa'),
      jsonb_build_object('place', 5, 'usd', 200, 'note', 'Menção Honrosa'),
      jsonb_build_object('place', 6, 'usd', 200, 'note', 'Menção Honrosa')
    )
  )
);

-- =====================================================================
-- TEAMS — one team per hackathon, owned by a leader
-- =====================================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  name text not null,
  description text,
  leader_id uuid not null references users(id),
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hackathon_id, name)
);

create index idx_teams_hackathon on teams(hackathon_id);
create index idx_teams_leader on teams(leader_id);

-- =====================================================================
-- TEAM_MEMBERS — invitations + memberships
-- =====================================================================
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  invited_email text not null,
  is_leader boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'removed')),
  invite_token text unique,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (team_id, invited_email)
);

create index idx_team_members_team on team_members(team_id);
create index idx_team_members_user on team_members(user_id);
create index idx_team_members_email_lower on team_members(lower(invited_email));

-- Denormalized hackathon_id lets us enforce "one accepted team per hackathon
-- per user" with a plain unique index. The hackathon_id is populated by the
-- triggers below so callers never have to set it.
create unique index uniq_active_membership_per_hackathon
  on team_members (user_id, hackathon_id)
  where status = 'accepted' and user_id is not null;

create or replace function set_team_member_hackathon_id()
returns trigger
language plpgsql
as $$
begin
  select hackathon_id into new.hackathon_id from public.teams where id = new.team_id;
  return new;
end;
$$;

create trigger team_members_set_hackathon_id
  before insert on team_members
  for each row execute function set_team_member_hackathon_id();

-- =====================================================================
-- SUBMISSIONS — one per team
-- =====================================================================
create table submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid unique not null references teams(id) on delete cascade,
  project_name text,
  description text,
  pitch_url text,
  pitch_video_url text,
  demo_video_url text,
  github_url text,
  twitter_url text,
  website_url text,
  image_path text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  last_edited_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_submissions_status on submissions(status);

-- Auto-create the submission row when a team is created
create or replace function handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into submissions (team_id) values (new.id);
  -- Also auto-add the leader as an accepted member
  insert into team_members (team_id, user_id, invited_email, is_leader, status, accepted_at)
  select new.id, new.leader_id, u.email, true, 'accepted', now()
  from users u where u.id = new.leader_id;
  return new;
end;
$$;

create trigger on_team_created
  after insert on teams
  for each row execute function handle_new_team();

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
  before update on users
  for each row execute function touch_updated_at();

create trigger teams_touch_updated_at
  before update on teams
  for each row execute function touch_updated_at();

create trigger submissions_touch_updated_at
  before update on submissions
  for each row execute function touch_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table users enable row level security;
alter table hackathons enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table submissions enable row level security;

-- HACKATHONS — public read
create policy "hackathons_read"
  on hackathons for select to anon, authenticated
  using (true);

-- USERS — own row read/write; teammates can read minimal fields
create policy "users_read_self"
  on users for select to authenticated
  using (auth.uid() = id);

create policy "users_update_self"
  on users for update to authenticated
  using (auth.uid() = id);

create policy "users_read_teammates"
  on users for select to authenticated
  using (
    id in (
      select tm.user_id from team_members tm
      where tm.status = 'accepted'
        and tm.team_id in (
          select team_id from team_members
          where user_id = auth.uid() and status = 'accepted'
        )
    )
  );

-- TEAMS — members can read; leader can update; anyone authenticated can create
create policy "teams_member_read"
  on teams for select to authenticated
  using (
    id in (
      select team_id from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
  );

create policy "teams_leader_update"
  on teams for update to authenticated
  using (leader_id = auth.uid() and locked = false);

create policy "teams_insert"
  on teams for insert to authenticated
  with check (leader_id = auth.uid());

-- TEAM_MEMBERS — accepted members can read teammates;
-- leader can insert/delete pending invites;
-- invited user can update own row to accept
create policy "team_members_read"
  on team_members for select to authenticated
  using (
    team_id in (
      select team_id from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
  );

create policy "team_members_leader_insert"
  on team_members for insert to authenticated
  with check (
    team_id in (
      select id from teams where leader_id = auth.uid() and locked = false
    )
  );

create policy "team_members_leader_delete"
  on team_members for delete to authenticated
  using (
    team_id in (
      select id from teams where leader_id = auth.uid() and locked = false
    )
    and is_leader = false
  );

create policy "team_members_self_accept"
  on team_members for update to authenticated
  using (
    user_id = auth.uid()
    or lower(invited_email) = lower((select email from users where id = auth.uid()))
  );

-- SUBMISSIONS — team members can read; can update while team not locked
create policy "submissions_member_read"
  on submissions for select to authenticated
  using (
    team_id in (
      select team_id from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
  );

create policy "submissions_member_update"
  on submissions for update to authenticated
  using (
    team_id in (
      select team_id from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
    and team_id in (select id from teams where locked = false)
  );
