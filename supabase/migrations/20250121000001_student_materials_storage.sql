-- Create storage bucket for student materials
insert into storage.buckets (id, name, public)
values ('student-materials', 'student-materials', false)
on conflict (id) do nothing;

-- RLS policies for storage bucket
create policy "Users can upload their own materials"
on storage.objects for insert
with check (
  bucket_id = 'student-materials' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own materials"
on storage.objects for select
using (
  bucket_id = 'student-materials' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own materials"
on storage.objects for delete
using (
  bucket_id = 'student-materials' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to increment view count for global materials
create or replace function increment_view_count(material_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update iuhs_global_materials
  set view_count = view_count + 1
  where id = material_id;
end;
$$;

-- Grant execute permission
grant execute on function increment_view_count(uuid) to authenticated;
