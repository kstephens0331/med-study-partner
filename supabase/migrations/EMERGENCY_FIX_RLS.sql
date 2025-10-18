-- EMERGENCY FIX: Enable RLS and create policies for all tables
-- This fixes the "permission denied" errors

-- First, ensure RLS is enabled on all tables
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can access own skill_progress" ON skill_progress;
DROP POLICY IF EXISTS "Users can manage own materials" ON materials;
DROP POLICY IF EXISTS "Users can manage own cards" ON cards;
DROP POLICY IF EXISTS "Users can manage own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can manage own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can manage own lectures" ON lectures;
DROP POLICY IF EXISTS "Users can manage own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage own mastery" ON mastery;

-- Create policies for skill_progress table
CREATE POLICY "Users can access own skill_progress" ON skill_progress
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for materials table
CREATE POLICY "Users can manage own materials" ON materials
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for cards table
CREATE POLICY "Users can manage own cards" ON cards
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for reviews table
CREATE POLICY "Users can manage own reviews" ON reviews
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for blocks table
CREATE POLICY "Users can manage own blocks" ON blocks
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for lectures table
CREATE POLICY "Users can manage own lectures" ON lectures
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for sessions table
CREATE POLICY "Users can manage own sessions" ON sessions
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Create policies for mastery table
CREATE POLICY "Users can manage own mastery" ON mastery
  FOR ALL USING ((SELECT auth.uid()) = user_id);
