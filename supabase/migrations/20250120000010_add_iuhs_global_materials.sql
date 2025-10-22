-- IUHS Global Materials System
-- Central repository for all IUHS educational materials with versioning and duplicate detection

-- ============================================================================
-- IUHS GLOBAL MATERIALS
-- ============================================================================

create table if not exists iuhs_global_materials (
  id uuid primary key default gen_random_uuid(),

  -- File identification
  file_name text not null,
  file_type text not null, -- 'pptx', 'pdf', 'docx', 'mp3', 'mp4', etc.
  file_size_bytes bigint not null,
  file_hash text not null, -- SHA-256 hash for duplicate detection

  -- Content
  title text not null,
  content_text text, -- Extracted text for search
  outline text[], -- Extracted outline/structure
  keywords text[], -- Auto-extracted keywords

  -- Classification
  category text not null, -- 'lecture', 'lab', 'clinical_skills', 'exam_prep', 'research'
  subject text not null, -- 'Anatomy', 'Physiology', 'Pharmacology', etc.
  system text, -- 'Cardiology', 'Neurology', etc.
  year integer, -- Academic year (1, 2, 3, 4)
  semester text check (semester in ('fall', 'spring', 'summer')),
  course_code text, -- e.g., 'MED-501', 'ANAT-101'

  -- Source
  source text default 'iuhs_admin', -- 'iuhs_admin', 'faculty', 'student'
  uploaded_by uuid references auth.users(id) on delete set null,
  instructor_name text,
  department text,

  -- Versioning
  version integer default 1,
  is_latest_version boolean default true,
  previous_version_id uuid references iuhs_global_materials(id) on delete set null,
  next_version_id uuid references iuhs_global_materials(id) on delete set null,

  -- Status
  status text default 'active' check (status in ('active', 'archived', 'superseded', 'deprecated')),
  archived_at timestamptz,
  archived_reason text,

  -- Access control
  is_public boolean default true, -- All IUHS students can access
  restricted_to_year integer, -- If set, only students in this year can access
  requires_approval boolean default false,

  -- Usage tracking
  view_count integer default 0,
  download_count integer default 0,
  last_accessed_at timestamptz,

  -- Metadata
  upload_date timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb -- Additional custom metadata
);

-- Indexes for performance
create index idx_global_materials_hash on iuhs_global_materials(file_hash);
create index idx_global_materials_subject on iuhs_global_materials(subject);
create index idx_global_materials_system on iuhs_global_materials(system);
create index idx_global_materials_year on iuhs_global_materials(year);
create index idx_global_materials_status on iuhs_global_materials(status);
create index idx_global_materials_is_latest on iuhs_global_materials(is_latest_version);
create index idx_global_materials_course on iuhs_global_materials(course_code);
create index idx_global_materials_upload_date on iuhs_global_materials(upload_date desc);

-- Full-text search on title and content
create index idx_global_materials_search on iuhs_global_materials
  using gin(to_tsvector('english', title || ' ' || coalesce(content_text, '')));

-- ============================================================================
-- MATERIAL TAGS (for flexible categorization)
-- ============================================================================

create table if not exists iuhs_material_tags (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references iuhs_global_materials(id) on delete cascade,
  tag text not null,
  created_at timestamptz default now(),

  unique(material_id, tag)
);

create index idx_material_tags_tag on iuhs_material_tags(tag);
create index idx_material_tags_material on iuhs_material_tags(material_id);

-- ============================================================================
-- DUPLICATE UPLOADS LOG (track when students try to upload duplicates)
-- ============================================================================

create table if not exists iuhs_duplicate_uploads (
  id uuid primary key default gen_random_uuid(),

  -- The duplicate file
  file_hash text not null,
  file_name text not null,

  -- Who tried to upload it
  attempted_by uuid references auth.users(id) on delete set null,

  -- Which existing material it matched
  existing_material_id uuid references iuhs_global_materials(id) on delete cascade,

  -- When
  attempted_at timestamptz default now(),

  -- Was it actually a newer version?
  was_newer_version boolean default false,
  version_replaced_id uuid references iuhs_global_materials(id) on delete set null
);

create index idx_duplicate_uploads_hash on iuhs_duplicate_uploads(file_hash);
create index idx_duplicate_uploads_user on iuhs_duplicate_uploads(attempted_by);
create index idx_duplicate_uploads_date on iuhs_duplicate_uploads(attempted_at desc);

-- ============================================================================
-- MATERIAL ACCESS LOG (track who accesses what)
-- ============================================================================

create table if not exists iuhs_material_access_log (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references iuhs_global_materials(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  -- Access type
  access_type text check (access_type in ('view', 'download', 'search_result')),

  -- When
  accessed_at timestamptz default now(),

  -- User info (snapshot in case user deleted)
  user_year integer,
  user_email text
);

create index idx_access_log_material on iuhs_material_access_log(material_id);
create index idx_access_log_user on iuhs_material_access_log(user_id);
create index idx_access_log_date on iuhs_material_access_log(accessed_at desc);

-- ============================================================================
-- MATERIAL RATINGS/FEEDBACK (students can rate materials)
-- ============================================================================

create table if not exists iuhs_material_ratings (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references iuhs_global_materials(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  -- Rating
  rating integer check (rating between 1 and 5),

  -- Feedback
  helpful boolean,
  accurate boolean,
  up_to_date boolean,
  comment text,

  -- When
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(material_id, user_id)
);

create index idx_material_ratings_material on iuhs_material_ratings(material_id);
create index idx_material_ratings_rating on iuhs_material_ratings(rating);

-- ============================================================================
-- ADMIN USERS (who can upload to global repository)
-- ============================================================================

create table if not exists iuhs_admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,

  -- Admin role
  role text not null check (role in ('super_admin', 'faculty', 'course_coordinator', 'librarian')),

  -- Permissions
  can_upload boolean default true,
  can_archive boolean default false,
  can_delete boolean default false,
  can_manage_users boolean default false,

  -- Restrictions
  subject_restrictions text[], -- If set, can only upload for these subjects
  year_restrictions integer[], -- If set, can only upload for these years

  -- Metadata
  added_at timestamptz default now(),
  added_by uuid references auth.users(id) on delete set null,
  is_active boolean default true
);

create index idx_admin_users_user on iuhs_admin_users(user_id);
create index idx_admin_users_role on iuhs_admin_users(role);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Global materials
alter table iuhs_global_materials enable row level security;

-- All IUHS students can view active, public materials
create policy "IUHS students can view public active materials" on iuhs_global_materials
  for select using (
    status = 'active'
    and is_public = true
    and (restricted_to_year is null or restricted_to_year = (
      select year from user_profiles where user_id = auth.uid()
    ))
  );

-- Admins can view all materials
create policy "Admins can view all materials" on iuhs_global_materials
  for select using (
    exists (
      select 1 from iuhs_admin_users
      where user_id = auth.uid() and is_active = true
    )
  );

-- Admins can insert materials
create policy "Admins can insert materials" on iuhs_global_materials
  for insert with check (
    exists (
      select 1 from iuhs_admin_users
      where user_id = auth.uid() and is_active = true and can_upload = true
    )
  );

-- Admins can update materials (for versioning, archiving)
create policy "Admins can update materials" on iuhs_global_materials
  for update using (
    exists (
      select 1 from iuhs_admin_users
      where user_id = auth.uid() and is_active = true
    )
  );

-- Only super admins can delete
create policy "Super admins can delete materials" on iuhs_global_materials
  for delete using (
    exists (
      select 1 from iuhs_admin_users
      where user_id = auth.uid() and is_active = true and can_delete = true
    )
  );

-- Material tags
alter table iuhs_material_tags enable row level security;

create policy "Anyone can view tags" on iuhs_material_tags
  for select using (true);

create policy "Admins can manage tags" on iuhs_material_tags
  for all using (
    exists (
      select 1 from iuhs_admin_users
      where user_id = auth.uid() and is_active = true
    )
  );

-- Duplicate uploads log
alter table iuhs_duplicate_uploads enable row level security;

create policy "Users can view own duplicate attempts" on iuhs_duplicate_uploads
  for select using (attempted_by = auth.uid());

create policy "Anyone can insert duplicate logs" on iuhs_duplicate_uploads
  for insert with check (true);

-- Access log
alter table iuhs_material_access_log enable row level security;

create policy "Users can view own access log" on iuhs_material_access_log
  for select using (user_id = auth.uid());

create policy "Anyone can insert access logs" on iuhs_material_access_log
  for insert with check (true);

-- Ratings
alter table iuhs_material_ratings enable row level security;

create policy "Anyone can view ratings" on iuhs_material_ratings
  for select using (true);

create policy "Users can rate materials" on iuhs_material_ratings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own ratings" on iuhs_material_ratings
  for update using (auth.uid() = user_id);

-- Admin users
alter table iuhs_admin_users enable row level security;

create policy "Admins can view admin users" on iuhs_admin_users
  for select using (
    exists (
      select 1 from iuhs_admin_users
      where user_id = auth.uid() and is_active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check for duplicate files by hash
create or replace function check_duplicate_material(
  p_file_hash text
)
returns table(
  material_id uuid,
  title text,
  version integer,
  upload_date timestamptz
) as $$
begin
  return query
  select
    id,
    iuhs_global_materials.title,
    iuhs_global_materials.version,
    iuhs_global_materials.upload_date
  from iuhs_global_materials
  where file_hash = p_file_hash
    and status = 'active'
    and is_latest_version = true
  order by upload_date desc
  limit 1;
end;
$$ language plpgsql security definer;

-- Function to archive old version when uploading new version
create or replace function archive_old_version(
  p_old_material_id uuid,
  p_new_material_id uuid
)
returns void as $$
begin
  -- Mark old version as superseded
  update iuhs_global_materials
  set
    status = 'superseded',
    is_latest_version = false,
    next_version_id = p_new_material_id,
    archived_at = now(),
    archived_reason = 'Replaced by newer version'
  where id = p_old_material_id;

  -- Link new version to old
  update iuhs_global_materials
  set
    previous_version_id = p_old_material_id,
    version = (select version + 1 from iuhs_global_materials where id = p_old_material_id)
  where id = p_new_material_id;
end;
$$ language plpgsql security definer;

-- Function to increment view/download counts
create or replace function increment_material_access(
  p_material_id uuid,
  p_access_type text
)
returns void as $$
begin
  if p_access_type = 'view' then
    update iuhs_global_materials
    set
      view_count = view_count + 1,
      last_accessed_at = now()
    where id = p_material_id;
  elsif p_access_type = 'download' then
    update iuhs_global_materials
    set
      download_count = download_count + 1,
      last_accessed_at = now()
    where id = p_material_id;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table iuhs_global_materials is 'Central repository of all IUHS educational materials with versioning and duplicate detection';
comment on column iuhs_global_materials.file_hash is 'SHA-256 hash of file content for duplicate detection';
comment on column iuhs_global_materials.is_latest_version is 'True only for the most recent version of a material';
comment on column iuhs_global_materials.status is 'active=current, archived=old but kept, superseded=replaced by newer version, deprecated=no longer valid';

comment on table iuhs_duplicate_uploads is 'Logs all duplicate upload attempts for tracking and analytics';
comment on table iuhs_material_access_log is 'Tracks student access to materials for usage analytics';
comment on table iuhs_material_ratings is 'Student ratings and feedback on materials';
comment on table iuhs_admin_users is 'Users authorized to upload to global repository';

comment on function check_duplicate_material is 'Check if a file hash already exists in the repository';
comment on function archive_old_version is 'Archive old version and link to new version when material is updated';
comment on function increment_material_access is 'Increment view or download count for a material';
