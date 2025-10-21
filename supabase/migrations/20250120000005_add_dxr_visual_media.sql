-- Add visual media support to DxR system
-- Supports AI-generated images for realistic patient simulation

-- Add image URL columns to existing tables
alter table dxr_cases
  add column if not exists patient_image_url text, -- AI-generated patient photo
  add column if not exists patient_characteristics jsonb; -- Hair color, build, notable features

-- Physical exam findings can now have associated images
-- This is stored in the existing physical_exam_findings JSONB with image_url field

-- Imaging studies already have findings field, we'll add image URLs there
-- Lab tests can have visual representations (EKG tracings, microscopy, etc.)

-- Create media storage table for organizing images
create table if not exists dxr_media (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references dxr_cases(id) on delete cascade,

  -- Media metadata
  media_type text not null check (media_type in (
    'patient_photo',
    'skin_finding',
    'eye_finding',
    'extremity_finding',
    'xray',
    'ct_scan',
    'mri',
    'ultrasound',
    'ekg',
    'microscopy',
    'other'
  )),

  -- Storage
  file_url text not null, -- URL to stored image
  thumbnail_url text, -- Optional thumbnail

  -- Description
  title text not null,
  description text,
  findings text, -- What the image shows

  -- Associated with
  associated_finding_id text, -- Links to specific finding in case data

  -- Display settings
  requires_action text, -- Which action reveals this (e.g., "examine_skin", "order_chest_xray")
  display_order integer default 0,

  -- Metadata
  ai_generated boolean default true,
  generation_prompt text, -- Prompt used to generate image
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_dxr_media_case on dxr_media(case_id);
create index if not exists idx_dxr_media_type on dxr_media(media_type);
create index if not exists idx_dxr_media_action on dxr_media(requires_action);

-- RLS Policies
alter table dxr_media enable row level security;

-- Anyone can view media (like cases, media is public)
create policy "Anyone can view dxr media" on dxr_media
  for select using (true);

-- Service role can insert media (for generation scripts)
create policy "Service role can insert dxr media" on dxr_media
  for insert with check (true);

-- Comments explaining the system
comment on table dxr_media is 'Stores AI-generated and curated medical images for realistic DxR case simulations';
comment on column dxr_media.media_type is 'Type of medical media (patient photo, findings, imaging, diagnostics)';
comment on column dxr_media.requires_action is 'Which student action reveals this image (e.g., examine_skin, order_chest_xray)';
comment on column dxr_media.generation_prompt is 'AI prompt used to generate this image for reproducibility';
