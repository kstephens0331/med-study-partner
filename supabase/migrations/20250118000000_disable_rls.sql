-- Disable RLS on all tables since API routes handle authorization manually
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE mastery DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE lectures DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can manage own materials" ON materials;
DROP POLICY IF EXISTS "Users can manage own cards" ON cards;
DROP POLICY IF EXISTS "Users can access own skill_progress" ON skill_progress;
DROP POLICY IF EXISTS "Users can access own mastery" ON mastery;
DROP POLICY IF EXISTS "Users can access own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can access own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can access own lectures" ON lectures;
DROP POLICY IF EXISTS "Users can access own sessions" ON sessions;
