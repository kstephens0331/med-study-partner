-- Fix permissions for base_vignettes table
-- Run this in Supabase SQL Editor if you get "permission denied" errors

grant all on base_vignettes to service_role;
grant select on base_vignettes to authenticated;
grant select on base_vignettes to anon;
