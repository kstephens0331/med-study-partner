-- Grant permissions for seeding challenge data

-- Grant all permissions on challenge tables to service_role
grant all on speed_round_templates to service_role;
grant all on boss_battle_templates to service_role;
grant all on daily_challenges to service_role;

-- Also grant authenticated users ability to read these tables
grant select on speed_round_templates to authenticated;
grant select on boss_battle_templates to authenticated;
grant select on daily_challenges to authenticated;

-- Confirm grants
\dp speed_round_templates
\dp boss_battle_templates
\dp daily_challenges
