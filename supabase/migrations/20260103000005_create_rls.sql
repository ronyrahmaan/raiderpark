-- Migration: Create Row Level Security Policies
-- Description: Set up RLS for all tables

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_hotspots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to see other users' display names (for leaderboard)
CREATE POLICY "Users can view other display names"
  ON users FOR SELECT
  USING (TRUE);

-- ============================================
-- LOTS TABLE POLICIES
-- ============================================

-- Anyone can view lots (public data)
CREATE POLICY "Lots are viewable by everyone"
  ON lots FOR SELECT
  USING (TRUE);

-- Only service role can modify lots
CREATE POLICY "Only service role can insert lots"
  ON lots FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update lots"
  ON lots FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete lots"
  ON lots FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- LOT STATUS TABLE POLICIES
-- ============================================

-- Anyone can view lot status
CREATE POLICY "Lot status is viewable by everyone"
  ON lot_status FOR SELECT
  USING (TRUE);

-- Only authenticated users and service role can modify
CREATE POLICY "Authenticated users can update lot status"
  ON lot_status FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can insert lot status"
  ON lot_status FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ============================================
-- PERMIT RULES TABLE POLICIES
-- ============================================

-- Anyone can view permit rules
CREATE POLICY "Permit rules are viewable by everyone"
  ON permit_rules FOR SELECT
  USING (TRUE);

-- Only service role can modify permit rules
CREATE POLICY "Only service role can modify permit rules"
  ON permit_rules FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- REPORTS TABLE POLICIES
-- ============================================

-- Anyone can view non-expired reports
CREATE POLICY "Reports are viewable by everyone"
  ON reports FOR SELECT
  USING (TRUE);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports (for voting)
CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

-- Anyone can view events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (TRUE);

-- Only service role can modify events
CREATE POLICY "Only service role can modify events"
  ON events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- LOT PREDICTIONS TABLE POLICIES
-- ============================================

-- Anyone can view predictions
CREATE POLICY "Predictions are viewable by everyone"
  ON lot_predictions FOR SELECT
  USING (TRUE);

-- Only service role can modify predictions
CREATE POLICY "Only service role can modify predictions"
  ON lot_predictions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- USER STATS TABLE POLICIES
-- ============================================

-- Users can view all stats (for leaderboard)
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats FOR SELECT
  USING (TRUE);

-- Users can only modify their own stats
CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Stats can be inserted by system"
  ON user_stats FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ============================================
-- PARKING TIMERS TABLE POLICIES
-- ============================================

-- Users can only view their own timers
CREATE POLICY "Users can view own timers"
  ON parking_timers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own timers
CREATE POLICY "Users can create own timers"
  ON parking_timers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own timers
CREATE POLICY "Users can update own timers"
  ON parking_timers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own timers
CREATE POLICY "Users can delete own timers"
  ON parking_timers FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ENFORCEMENT HOTSPOTS TABLE POLICIES
-- ============================================

-- Anyone can view enforcement hotspots
CREATE POLICY "Enforcement hotspots are viewable by everyone"
  ON enforcement_hotspots FOR SELECT
  USING (TRUE);

-- Only service role can directly modify hotspots
CREATE POLICY "Only service role can modify hotspots"
  ON enforcement_hotspots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Note: Helper functions are created in public schema
-- ============================================
CREATE OR REPLACE FUNCTION public.is_anon()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.role() = 'anon';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
