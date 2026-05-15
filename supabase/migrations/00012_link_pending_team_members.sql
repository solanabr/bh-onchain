-- Extend handle_new_user() so that signing up auto-links any "ghost"
-- team_members rows (user_id is null) where invited_email matches the
-- new account's email. Oldest pending invite for that email gets
-- accepted; if multiple teams happened to invite the same email, the
-- later rows get their user_id set but stay pending — the partial
-- unique index on (user_id, hackathon_id) WHERE status='accepted'
-- enforces "one accepted team per hackathon".

create or replace function public.handle_new_user()
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

  update public.team_members
  set user_id = new.id
  where user_id is null
    and lower(invited_email) = lower(new.email);

  update public.team_members
  set status = 'accepted', accepted_at = now()
  where id = (
    select id from public.team_members
    where user_id = new.id and status = 'pending'
    order by invited_at asc
    limit 1
  );

  return new;
end;
$$;
