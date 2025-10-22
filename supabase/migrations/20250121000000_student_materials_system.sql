-- Student Materials System
-- Personal materials for students with block assignment and global sharing logic

-- Student personal materials table
create table if not exists student_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- File information
  file_name text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  file_hash text not null, -- SHA-256 for duplicate detection
  storage_path text not null, -- Supabase storage path

  -- Content
  title text not null,
  content_text text,
  outline text[],
  keywords text[],

  -- Classification
  material_type text not null check (material_type in ('lecture', 'powerpoint', 'textbook', 'notes', 'other')),
  category text,
  subject text,
  system text,

  -- Block assignment (students assign materials to blocks)
  block_id uuid, -- NULL means not assigned to a block yet
  block_name text,

  -- Metadata
  document_date timestamptz, -- Date of the actual document (from AI extraction)
  uploaded_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Global sharing
  shared_to_global boolean default false,
  global_material_id uuid references iuhs_global_materials(id),

  -- Usage
  view_count integer default 0,
  last_viewed_at timestamptz
);

-- Indexes for performance
create index idx_student_materials_user on student_materials(user_id);
create index idx_student_materials_block on student_materials(block_id);
create index idx_student_materials_hash on student_materials(file_hash);
create index idx_student_materials_type on student_materials(material_type);
create index idx_student_materials_system on student_materials(system);

-- Material blocks (study blocks that students organize materials into)
create table if not exists material_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  name text not null,
  description text,
  color text default '#3b82f6', -- Tailwind blue-500
  icon text default '📚',

  -- Organization
  position integer default 0,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Ensure unique block names per user
  unique(user_id, name)
);

create index idx_material_blocks_user on material_blocks(user_id);

-- Material access log (track which global materials students view)
create table if not exists material_access_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  material_id uuid references iuhs_global_materials(id) on delete cascade,
  student_material_id uuid references student_materials(id) on delete cascade,

  accessed_at timestamptz default now(),
  access_type text check (access_type in ('view', 'download'))
);

create index idx_material_access_user on material_access_log(user_id);
create index idx_material_access_global on material_access_log(material_id);

-- Row Level Security Policies

-- Student materials: users can only see their own
alter table student_materials enable row level security;

create policy "Users can view their own materials"
  on student_materials for select
  using (auth.uid() = user_id);

create policy "Users can insert their own materials"
  on student_materials for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own materials"
  on student_materials for update
  using (auth.uid() = user_id);

create policy "Users can delete their own materials"
  on student_materials for delete
  using (auth.uid() = user_id);

-- Material blocks: users can only see their own
alter table material_blocks enable row level security;

create policy "Users can view their own blocks"
  on material_blocks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own blocks"
  on material_blocks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own blocks"
  on material_blocks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own blocks"
  on material_blocks for delete
  using (auth.uid() = user_id);

-- Material access log: users can view their own access history
alter table material_access_log enable row level security;

create policy "Users can view their own access log"
  on material_access_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own access log"
  on material_access_log for insert
  with check (auth.uid() = user_id);

-- IUHS Global Materials: Add public read access for all authenticated users
create policy "All authenticated users can view global materials"
  on iuhs_global_materials for select
  using (auth.role() = 'authenticated');

-- Functions

-- Function to check if a document is newer based on AI-extracted date
create or replace function is_document_newer(
  p_new_doc_date timestamptz,
  p_existing_doc_date timestamptz
)
returns boolean
language plpgsql
as $$
begin
  -- If existing has no date, new one is newer
  if p_existing_doc_date is null then
    return true;
  end if;

  -- If new has no date, it's not newer
  if p_new_doc_date is null then
    return false;
  end if;

  -- Compare dates
  return p_new_doc_date > p_existing_doc_date;
end;
$$;

-- Function to find duplicate materials in global repository
create or replace function find_global_duplicate(
  p_file_hash text,
  p_material_type text
)
returns table(
  material_id uuid,
  title text,
  document_date timestamptz,
  version integer
)
language plpgsql
as $$
begin
  return query
  select
    id,
    iuhs_global_materials.title,
    created_at as document_date,
    iuhs_global_materials.version
  from iuhs_global_materials
  where file_hash = p_file_hash
    and category = p_material_type
    and status = 'active'
    and is_latest_version = true
  order by created_at desc
  limit 1;
end;
$$;

-- Function to update material's updated_at timestamp
create or replace function update_material_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers
create trigger update_student_materials_timestamp
  before update on student_materials
  for each row
  execute function update_material_timestamp();

create trigger update_material_blocks_timestamp
  before update on material_blocks
  for each row
  execute function update_material_timestamp();

-- Grant permissions for service role to manage materials
grant all on student_materials to service_role;
grant all on material_blocks to service_role;
grant all on material_access_log to service_role;

-- Comments
comment on table student_materials is 'Personal materials uploaded by students with block organization';
comment on table material_blocks is 'Study blocks that students create to organize their materials';
comment on table material_access_log is 'Tracks student access to both personal and global materials';
comment on column student_materials.material_type is 'Type of material: lecture/powerpoint/textbook are shared to global, notes stay personal';
comment on column student_materials.document_date is 'Actual date of the document content (extracted by AI), used for version comparison';
comment on column student_materials.shared_to_global is 'Whether this material has been added to IUHS global repository';
