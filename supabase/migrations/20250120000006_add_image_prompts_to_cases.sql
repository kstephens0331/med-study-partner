-- Add image generation prompts to DxR cases
-- This ensures 100% accuracy: prompts are created WITH the case by AI

alter table dxr_cases
  add column if not exists image_generation_prompts jsonb;

comment on column dxr_cases.image_generation_prompts is 'AI-generated Stable Diffusion prompts that precisely match this case. Ensures visual accuracy.';
