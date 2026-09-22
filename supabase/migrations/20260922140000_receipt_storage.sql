-- Phase 7 — private storage for uploaded receipts.
--
-- Files are addressed as <workspace_id>/<uuid>.<ext>. The first path segment
-- is the tenancy boundary: the policies below check that the caller belongs
-- to the workspace named by the folder, which is the same membership test
-- every table in this schema uses.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,                                        -- never publicly readable
  5 * 1024 * 1024,                              -- 5 MB is ample for a photo
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- A member may upload into their own workspace's folder...
create policy "receipts are uploadable into your own workspace folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

-- ...read back what is in it...
create policy "receipts are readable within your own workspace folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

-- ...and delete it. Deletion matters here: a receipt is a photo of a real
-- purchase, and someone who changes their mind should be able to remove it
-- rather than only stop it being used.
create policy "receipts are deletable within your own workspace folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
