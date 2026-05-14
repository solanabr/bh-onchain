-- Storage bucket for project cover images.
-- Path convention: project-images/{team_id}/{filename}

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- Public read
create policy "project_images_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'project-images');

-- Authenticated users can upload to their team's folder
create policy "project_images_team_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] in (
      select team_id::text from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
  );

create policy "project_images_team_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] in (
      select team_id::text from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
  );

create policy "project_images_team_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] in (
      select team_id::text from team_members
      where user_id = auth.uid() and status = 'accepted'
    )
  );
