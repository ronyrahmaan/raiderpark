-- Migration: Auth Setup
-- Creates user profile automatically on signup and sets up auth policies

-- ============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================

-- Function to create user profile when auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, permit_type, reporter_level)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'none',
    'newbie'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also create user_stats entry
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS POLICIES FOR USERS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for cases where trigger fails)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS POLICIES FOR USER_STATS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own stats
DROP POLICY IF EXISTS "Users can read own stats" ON user_stats;
CREATE POLICY "Users can read own stats" ON user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own stats
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Public can read leaderboard (top stats)
DROP POLICY IF EXISTS "Public can read leaderboard" ON user_stats;
CREATE POLICY "Public can read leaderboard" ON user_stats
  FOR SELECT
  USING (true);

-- ============================================
-- RLS POLICIES FOR REPORTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit reports (including anonymous)
DROP POLICY IF EXISTS "Anyone can submit reports" ON reports;
CREATE POLICY "Anyone can submit reports" ON reports
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read reports (for lot status)
DROP POLICY IF EXISTS "Anyone can read reports" ON reports;
CREATE POLICY "Anyone can read reports" ON reports
  FOR SELECT
  USING (true);

-- Users can update their own reports
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- EMAIL CONFIRMATION SETTINGS
-- Note: Configure these in Supabase Dashboard > Auth > Email Templates
-- ============================================

-- For development, we'll disable email confirmation
-- In production, enable it in the Supabase dashboard

COMMENT ON TABLE users IS 'User profiles - auto-created on signup via trigger';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Auth setup completed successfully!';
  RAISE NOTICE '- User profile trigger created';
  RAISE NOTICE '- RLS policies applied to users, user_stats, reports';
END $$;
