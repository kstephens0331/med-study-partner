-- Set info@stephenscode.dev as the only IUHS Global Materials admin

-- Insert admin user (will only work after user signs up with this email)
insert into iuhs_admin_users (user_id, role, can_upload, can_archive, can_delete, can_manage_users)
select
  id,
  'super_admin',
  true,
  true,
  true,
  true
from auth.users
where email = 'info@stephenscode.dev'
on conflict (user_id) do update set
  role = 'super_admin',
  can_upload = true,
  can_archive = true,
  can_delete = true,
  can_manage_users = true,
  is_active = true;

-- Update RLS policies to be more strict - only info@stephenscode.dev can upload
drop policy if exists "Admins can insert materials" on iuhs_global_materials;

create policy "Only super admin can insert global materials" on iuhs_global_materials
  for insert with check (
    exists (
      select 1 from auth.users
      where id = auth.uid()
      and email = 'info@stephenscode.dev'
    )
  );

drop policy if exists "Admins can update materials" on iuhs_global_materials;

create policy "Only super admin can update global materials" on iuhs_global_materials
  for update using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
      and email = 'info@stephenscode.dev'
    )
  );

drop policy if exists "Super admins can delete materials" on iuhs_global_materials;

create policy "Only super admin can delete materials" on iuhs_global_materials
  for delete using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
      and email = 'info@stephenscode.dev'
    )
  );

-- Students can still view public active materials
-- (existing policy remains unchanged)

comment on table iuhs_admin_users is 'Only info@stephenscode.dev can upload to IUHS Global Materials repository';
