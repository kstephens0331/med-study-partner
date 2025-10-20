-- Grant service role permissions to insert DxR cases
-- This allows the generation scripts to create cases

-- Grant all permissions on dxr_cases to service role
grant all on dxr_cases to service_role;

-- Grant all permissions on dxr_case_attempts to service role
grant all on dxr_case_attempts to service_role;

-- Grant all permissions on dxr_progress to service role
grant all on dxr_progress to service_role;

-- Grant usage on sequences if they exist
do $$ begin
  if exists (select 1 from pg_class where relname = 'dxr_cases_id_seq') then
    grant usage on sequence dxr_cases_id_seq to service_role;
  end if;

  if exists (select 1 from pg_class where relname = 'dxr_case_attempts_id_seq') then
    grant usage on sequence dxr_case_attempts_id_seq to service_role;
  end if;

  if exists (select 1 from pg_class where relname = 'dxr_progress_id_seq') then
    grant usage on sequence dxr_progress_id_seq to service_role;
  end if;
end $$;
