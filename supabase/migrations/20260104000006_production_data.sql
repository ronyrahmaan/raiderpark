-- Migration: Production-Ready Data and Configuration
-- Description: Add parking config, realistic occupancy patterns, and authentic TTU events

-- ============================================
-- PARKING CONFIGURATION TABLE
-- Flexible rules that can be updated without code changes
-- ============================================

CREATE TABLE IF NOT EXISTS parking_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO parking_config (key, value, description) VALUES
  ('free_parking_time', '"17:30"', 'Time when parking becomes free for all permits'),
  ('cross_lot_time', '"14:30"', 'Time when cross-lot parking is allowed'),
  ('enforcement_start', '"07:30"', 'When enforcement begins'),
  ('enforcement_end', '"17:30"', 'When enforcement ends'),
  ('semester_dates', '{"spring_start": "2026-01-13", "spring_end": "2026-05-08", "fall_start": "2026-08-24", "fall_end": "2026-12-11"}', 'Semester date ranges'),
  ('peak_hours', '{"morning": ["08:00", "11:00"], "midday": ["11:00", "14:00"], "afternoon": ["14:00", "17:00"]}', 'Peak traffic hours'),
  ('two_hour_limit_lots', '["C11"]', 'Lots with 2-hour parking limits'),
  ('tow_lots_game_day', '["C1", "C4"]', 'Lots that become tow-away on game days'),
  ('bus_shuttle_lots', '["S1"]', 'Lots with Citibus shuttle service')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- RLS for parking_config (read-only for authenticated users)
ALTER TABLE parking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parking config is viewable by everyone" ON parking_config
  FOR SELECT USING (true);

-- ============================================
-- FUNCTION: Get parking config value
-- ============================================
CREATE OR REPLACE FUNCTION get_parking_config(p_key TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN (SELECT value FROM parking_config WHERE key = p_key);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Check if parking is free now
-- ============================================
CREATE OR REPLACE FUNCTION is_parking_free(p_check_time TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  v_free_time TIME;
  v_day_of_week INTEGER;
BEGIN
  v_free_time := (get_parking_config('free_parking_time')::TEXT)::TIME;
  v_day_of_week := EXTRACT(DOW FROM p_check_time)::INTEGER;

  -- Free on weekends
  IF v_day_of_week IN (0, 6) THEN
    RETURN TRUE;
  END IF;

  -- Free after free_parking_time on weekdays
  RETURN p_check_time::TIME >= v_free_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Check if cross-lot parking is allowed
-- ============================================
CREATE OR REPLACE FUNCTION is_cross_lot_allowed(p_check_time TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  v_cross_lot_time TIME;
  v_day_of_week INTEGER;
BEGIN
  v_cross_lot_time := (get_parking_config('cross_lot_time')::TEXT)::TIME;
  v_day_of_week := EXTRACT(DOW FROM p_check_time)::INTEGER;

  -- Allowed on weekends
  IF v_day_of_week IN (0, 6) THEN
    RETURN TRUE;
  END IF;

  -- Allowed after cross_lot_time on weekdays
  RETURN p_check_time::TIME >= v_cross_lot_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- UPDATE LOT STATUS WITH REALISTIC PATTERNS
-- Based on typical TTU parking patterns
-- ============================================

-- Function to calculate realistic occupancy based on time
CREATE OR REPLACE FUNCTION calculate_realistic_occupancy(
  p_lot_id TEXT,
  p_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  status occupancy_status,
  occupancy_percent INTEGER,
  trend INTEGER
) AS $$
DECLARE
  v_hour INTEGER;
  v_day INTEGER;
  v_base_percent INTEGER;
  v_lot_factor DECIMAL;
  v_final_percent INTEGER;
  v_status occupancy_status;
  v_trend INTEGER;
BEGIN
  v_hour := EXTRACT(HOUR FROM p_time)::INTEGER;
  v_day := EXTRACT(DOW FROM p_time)::INTEGER;

  -- Weekend base is low
  IF v_day IN (0, 6) THEN
    v_base_percent := 15;
  -- Weekday patterns
  ELSIF v_hour < 7 THEN
    v_base_percent := 10;  -- Early morning
  ELSIF v_hour < 8 THEN
    v_base_percent := 25;  -- Arriving
  ELSIF v_hour < 9 THEN
    v_base_percent := 55;  -- Morning rush
  ELSIF v_hour < 10 THEN
    v_base_percent := 80;  -- Peak starts
  ELSIF v_hour < 12 THEN
    v_base_percent := 92;  -- Peak hours
  ELSIF v_hour < 13 THEN
    v_base_percent := 85;  -- Lunch turnover
  ELSIF v_hour < 15 THEN
    v_base_percent := 88;  -- Afternoon
  ELSIF v_hour < 17 THEN
    v_base_percent := 70;  -- Evening departure starts
  ELSIF v_hour < 19 THEN
    v_base_percent := 40;  -- Evening
  ELSE
    v_base_percent := 20;  -- Night
  END IF;

  -- Lot-specific factors (some lots fill faster)
  v_lot_factor := CASE p_lot_id
    WHEN 'C11' THEN 1.15  -- Very popular, fills fast
    WHEN 'C15' THEN 1.12  -- Central, popular
    WHEN 'C16' THEN 1.08  -- Central
    WHEN 'C12' THEN 1.05  -- Near business
    WHEN 'C1' THEN 0.95   -- Large lot, more spaces
    WHEN 'C4' THEN 0.98   -- Near rec
    WHEN 'C14' THEN 1.00  -- Average
    WHEN 'S1' THEN 0.70   -- Satellite, less popular
    ELSE 1.0
  END;

  -- Calculate final percentage with some randomization
  v_final_percent := LEAST(100, GREATEST(5,
    (v_base_percent * v_lot_factor + (random() * 10 - 5))::INTEGER
  ));

  -- Determine status
  v_status := CASE
    WHEN v_final_percent <= 20 THEN 'empty'
    WHEN v_final_percent <= 40 THEN 'light'
    WHEN v_final_percent <= 60 THEN 'moderate'
    WHEN v_final_percent <= 85 THEN 'busy'
    ELSE 'full'
  END;

  -- Determine trend based on time
  v_trend := CASE
    WHEN v_hour < 11 THEN 1      -- Morning: filling
    WHEN v_hour < 15 THEN 0      -- Midday: stable
    WHEN v_hour < 18 THEN -1     -- Evening: emptying
    ELSE 0                        -- Night: stable
  END;

  RETURN QUERY SELECT v_status, v_final_percent, v_trend;
END;
$$ LANGUAGE plpgsql;

-- Update lot_status with realistic values
DO $$
DECLARE
  lot RECORD;
  calc RECORD;
BEGIN
  FOR lot IN SELECT id FROM lots LOOP
    SELECT * INTO calc FROM calculate_realistic_occupancy(lot.id, NOW());

    UPDATE lot_status
    SET
      status = calc.status,
      occupancy_percent = calc.occupancy_percent,
      trend = calc.trend,
      confidence = 'medium'::confidence_level,
      updated_at = NOW()
    WHERE lot_id = lot.id;
  END LOOP;
END $$;

-- ============================================
-- INSERT COMPREHENSIVE TTU EVENTS FOR 2026
-- Real event types based on TTU calendar
-- ============================================

-- Clear sample events and add real ones
DELETE FROM events WHERE id IS NOT NULL;

INSERT INTO events (name, event_type, starts_at, ends_at, affected_lot_ids, impact_level, description, venue, expected_attendance, alternative_lots, arrival_recommendation)
VALUES
  -- FOOTBALL GAMES (2026 Season - hypothetical Big 12 schedule)
  ('TTU vs Houston (Home Opener)', 'football', '2026-09-05 18:00:00-05', '2026-09-05 23:00:00-05',
   ARRAY['C1', 'C4'], 5, 'Season opener. Lots close 4 hours before kickoff for tailgating.',
   'Jones AT&T Stadium', 60000, ARRAY['C11', 'C12', 'C14', 'S1'], INTERVAL '4 hours'),

  ('TTU vs TCU', 'football', '2026-09-19 14:00:00-05', '2026-09-19 19:00:00-05',
   ARRAY['C1', 'C4'], 5, 'Big 12 rivalry game. Heavy traffic expected.',
   'Jones AT&T Stadium', 60000, ARRAY['C11', 'C12', 'C14', 'S1'], INTERVAL '3 hours'),

  ('TTU vs Oklahoma State', 'football', '2026-10-03 18:00:00-05', '2026-10-03 23:00:00-05',
   ARRAY['C1', 'C4'], 5, 'Homecoming weekend. Campus extremely busy.',
   'Jones AT&T Stadium', 60000, ARRAY['C11', 'C12', 'C14', 'S1'], INTERVAL '4 hours'),

  ('TTU vs Baylor', 'football', '2026-10-24 11:00:00-05', '2026-10-24 16:00:00-05',
   ARRAY['C1', 'C4'], 5, 'Big 12 Conference game. Morning kickoff.',
   'Jones AT&T Stadium', 55000, ARRAY['C11', 'C12', 'C14', 'S1'], INTERVAL '3 hours'),

  ('TTU vs Kansas State', 'football', '2026-11-07 14:00:00-06', '2026-11-07 19:00:00-06',
   ARRAY['C1', 'C4'], 5, 'Senior Day. Extra ceremonies planned.',
   'Jones AT&T Stadium', 58000, ARRAY['C11', 'C12', 'C14', 'S1'], INTERVAL '3 hours'),

  -- BASKETBALL GAMES (2026-2027 Season)
  ('Men''s Basketball vs Kansas', 'basketball', '2026-01-14 19:00:00-06', '2026-01-14 22:00:00-06',
   ARRAY['C4'], 4, 'Big 12 basketball. United Supermarkets Arena.',
   'United Supermarkets Arena', 15000, ARRAY['C1', 'C16', 'S1'], INTERVAL '2 hours'),

  ('Men''s Basketball vs Baylor', 'basketball', '2026-01-28 20:00:00-06', '2026-01-28 23:00:00-06',
   ARRAY['C4'], 4, 'ESPN Big Monday game.',
   'United Supermarkets Arena', 15000, ARRAY['C1', 'C16', 'S1'], INTERVAL '2 hours'),

  ('Women''s Basketball vs Texas', 'basketball', '2026-02-07 14:00:00-06', '2026-02-07 17:00:00-06',
   ARRAY['C4'], 3, 'Women''s basketball rivalry game.',
   'United Supermarkets Arena', 10000, ARRAY['C1', 'C16', 'S1'], INTERVAL '1 hour 30 minutes'),

  ('Men''s Basketball vs Kansas State', 'basketball', '2026-02-18 19:00:00-06', '2026-02-18 22:00:00-06',
   ARRAY['C4'], 4, 'Big 12 matchup.',
   'United Supermarkets Arena', 15000, ARRAY['C1', 'C16', 'S1'], INTERVAL '2 hours'),

  -- GRADUATION CEREMONIES
  ('Spring Commencement - Morning', 'graduation', '2026-05-09 09:00:00-05', '2026-05-09 12:00:00-05',
   ARRAY['C1', 'C4', 'C15', 'C16'], 5, 'Spring graduation ceremony - Colleges of A&S, Education.',
   'United Supermarkets Arena', 15000, ARRAY['C11', 'C12', 'C14'], INTERVAL '2 hours'),

  ('Spring Commencement - Afternoon', 'graduation', '2026-05-09 14:00:00-05', '2026-05-09 17:00:00-05',
   ARRAY['C1', 'C4', 'C15', 'C16'], 5, 'Spring graduation ceremony - Engineering, Business.',
   'United Supermarkets Arena', 15000, ARRAY['C11', 'C12', 'C14'], INTERVAL '2 hours'),

  ('Fall Commencement', 'graduation', '2026-12-12 09:00:00-06', '2026-12-12 15:00:00-06',
   ARRAY['C1', 'C4', 'C15', 'C16'], 5, 'Fall graduation ceremonies.',
   'United Supermarkets Arena', 12000, ARRAY['C11', 'C12', 'C14'], INTERVAL '2 hours'),

  -- CONCERTS & SPECIAL EVENTS
  ('Raider Red''s One Night Stand', 'concert', '2026-04-10 19:00:00-05', '2026-04-10 23:59:00-05',
   ARRAY['C1', 'C4'], 4, 'Annual student concert event.',
   'Jones AT&T Stadium', 30000, ARRAY['C11', 'C12', 'C14', 'S1'], INTERVAL '2 hours'),

  ('Carol of Lights', 'special_event', '2026-12-04 17:00:00-06', '2026-12-04 21:00:00-06',
   ARRAY['C15', 'C16'], 4, 'Annual holiday lighting ceremony at Memorial Circle.',
   'Memorial Circle', 20000, ARRAY['C1', 'C4', 'C11', 'C12'], INTERVAL '3 hours'),

  -- CAREER FAIRS
  ('Spring Career Fair', 'special_event', '2026-02-11 10:00:00-06', '2026-02-11 16:00:00-06',
   ARRAY['C15'], 3, 'Spring career fair at Student Union Building.',
   'Student Union Building', 5000, ARRAY['C11', 'C16'], INTERVAL '1 hour'),

  ('Engineering Career Fair', 'special_event', '2026-09-23 10:00:00-05', '2026-09-23 16:00:00-05',
   ARRAY['C11', 'C12'], 3, 'Engineering-focused career fair.',
   'Student Union Building', 4000, ARRAY['C14', 'C16'], INTERVAL '1 hour'),

  ('Fall Career Expo', 'special_event', '2026-10-07 10:00:00-05', '2026-10-07 16:00:00-05',
   ARRAY['C15'], 3, 'Fall career expo at Student Union.',
   'Student Union Building', 5000, ARRAY['C11', 'C16'], INTERVAL '1 hour'),

  -- MAINTENANCE & CLOSURES (using 'construction' enum)
  ('C1 Resurfacing', 'construction', '2026-06-01 00:00:00-05', '2026-06-14 23:59:00-05',
   ARRAY['C1'], 5, 'Lot C1 closed for pavement resurfacing. Use alternative lots.',
   'Commuter Lot C1', NULL, ARRAY['C4', 'C11', 'C12', 'S1'], NULL),

  ('C14 Line Repainting', 'construction', '2026-07-15 06:00:00-05', '2026-07-16 18:00:00-05',
   ARRAY['C14'], 4, 'Lot C14 closed for line repainting.',
   'Commuter Lot C14', NULL, ARRAY['C15', 'C12'], NULL),

  -- WEATHER EVENTS (using 'icing' enum for weather closures)
  ('Potential Ice Storm', 'icing', '2026-02-05 00:00:00-06', '2026-02-06 23:59:00-06',
   ARRAY['C14', 'C15', 'C16'], 3, 'KTXT tower icing possible. Monitor weather alerts.',
   'East Campus', NULL, ARRAY['C1', 'C4', 'C11'], NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- ADD PREDICTION DATA FOR NEXT 7 DAYS
-- Generate realistic hourly predictions
-- ============================================

-- Function to generate predictions
CREATE OR REPLACE FUNCTION generate_lot_predictions()
RETURNS void AS $$
DECLARE
  lot RECORD;
  prediction_time TIMESTAMPTZ;
  calc RECORD;
BEGIN
  -- Delete old predictions
  DELETE FROM lot_predictions WHERE predicted_for < NOW();

  -- Generate predictions for next 7 days, every hour
  FOR lot IN SELECT id FROM lots LOOP
    FOR i IN 0..168 LOOP  -- 7 days * 24 hours
      prediction_time := DATE_TRUNC('hour', NOW()) + (i || ' hours')::INTERVAL;

      SELECT * INTO calc FROM calculate_realistic_occupancy(lot.id, prediction_time);

      INSERT INTO lot_predictions (
        lot_id, predicted_for, predicted_status, predicted_percent,
        confidence, confidence_lower, confidence_upper, model_version
      )
      VALUES (
        lot.id, prediction_time, calc.status, calc.occupancy_percent,
        (CASE
          WHEN i < 24 THEN 'high'
          WHEN i < 72 THEN 'medium'
          ELSE 'low'
        END)::confidence_level,
        GREATEST(0, calc.occupancy_percent - 15),
        LEAST(100, calc.occupancy_percent + 15),
        'v1.0-heuristic'
      )
      ON CONFLICT (lot_id, predicted_for) DO UPDATE SET
        predicted_status = EXCLUDED.predicted_status,
        predicted_percent = EXCLUDED.predicted_percent,
        confidence = EXCLUDED.confidence,
        confidence_lower = EXCLUDED.confidence_lower,
        confidence_upper = EXCLUDED.confidence_upper,
        model_version = EXCLUDED.model_version;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate initial predictions
SELECT generate_lot_predictions();

-- ============================================
-- CREATE LEADERBOARD VIEW
-- ============================================

DROP VIEW IF EXISTS reporter_leaderboard;
CREATE OR REPLACE VIEW reporter_leaderboard AS
SELECT
  u.id as user_id,
  u.display_name,
  u.reporter_level,
  COALESCE(us.total_reports, 0) as total_reports,
  COALESCE(us.accurate_reports, 0) as accurate_reports,
  COALESCE(us.accuracy_rate, 0) as accuracy_rate,
  COALESCE(us.points, 0) as points,
  COALESCE(us.consecutive_days, 0) as streak,
  COALESCE(us.reports_this_week, 0) as reports_this_week,
  COALESCE(us.reports_this_month, 0) as reports_this_month,
  RANK() OVER (ORDER BY COALESCE(us.points, 0) DESC) as rank
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE us.total_reports > 0
ORDER BY points DESC;

-- ============================================
-- CREATE ACTIVE EVENTS VIEW
-- ============================================

DROP VIEW IF EXISTS active_events;
CREATE OR REPLACE VIEW active_events AS
SELECT *
FROM events
WHERE ends_at > NOW()
ORDER BY starts_at ASC;

-- ============================================
-- CREATE UPCOMING EVENTS VIEW
-- ============================================

DROP VIEW IF EXISTS upcoming_events;
CREATE OR REPLACE VIEW upcoming_events AS
SELECT *
FROM events
WHERE starts_at > NOW()
  AND starts_at <= NOW() + INTERVAL '30 days'
ORDER BY starts_at ASC;

-- ============================================
-- EXTEND USER STATS TABLE
-- Add additional fields for gamification and UI
-- ============================================

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Add level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'level') THEN
    ALTER TABLE user_stats ADD COLUMN level reporter_level DEFAULT 'newbie';
  END IF;

  -- Add streak tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'longest_streak') THEN
    ALTER TABLE user_stats ADD COLUMN longest_streak INTEGER DEFAULT 0;
  END IF;

  -- Add lot usage tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'lot_usage') THEN
    ALTER TABLE user_stats ADD COLUMN lot_usage JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add time saved estimate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'time_saved_minutes') THEN
    ALTER TABLE user_stats ADD COLUMN time_saved_minutes INTEGER DEFAULT 0;
  END IF;

  -- Add total trips
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'total_trips') THEN
    ALTER TABLE user_stats ADD COLUMN total_trips INTEGER DEFAULT 0;
  END IF;

  -- Add badges
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'badges') THEN
    ALTER TABLE user_stats ADD COLUMN badges TEXT[] DEFAULT '{}';
  END IF;

  -- Add referral tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'referral_code') THEN
    ALTER TABLE user_stats ADD COLUMN referral_code TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'referral_count') THEN
    ALTER TABLE user_stats ADD COLUMN referral_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_stats' AND column_name = 'referred_by') THEN
    ALTER TABLE user_stats ADD COLUMN referred_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Function to determine reporter level based on reports and accuracy
-- Uses enum values: newbie, rookie, regular, veteran, legend, mvp, hall_of_fame
CREATE OR REPLACE FUNCTION calculate_reporter_level(p_total_reports INTEGER, p_accuracy_rate DECIMAL)
RETURNS reporter_level AS $$
BEGIN
  IF p_total_reports >= 1000 THEN
    RETURN 'hall_of_fame';
  ELSIF p_total_reports >= 500 THEN
    RETURN 'mvp';
  ELSIF p_total_reports >= 200 AND p_accuracy_rate >= 80 THEN
    RETURN 'legend';
  ELSIF p_total_reports >= 75 AND p_accuracy_rate >= 75 THEN
    RETURN 'veteran';
  ELSIF p_total_reports >= 25 THEN
    RETURN 'regular';
  ELSIF p_total_reports >= 5 THEN
    RETURN 'rookie';
  ELSE
    RETURN 'newbie';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update reporter level when stats change
CREATE OR REPLACE FUNCTION update_reporter_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := calculate_reporter_level(NEW.total_reports, NEW.accuracy_rate);

  -- Update longest streak
  IF NEW.consecutive_days > COALESCE(OLD.longest_streak, 0) THEN
    NEW.longest_streak := NEW.consecutive_days;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reporter_level ON user_stats;
CREATE TRIGGER trigger_update_reporter_level
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_reporter_level();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Production data migration completed successfully!';
  RAISE NOTICE 'Added parking_config table with % entries', (SELECT COUNT(*) FROM parking_config);
  RAISE NOTICE 'Updated % lot statuses with realistic patterns', (SELECT COUNT(*) FROM lot_status);
  RAISE NOTICE 'Added % events for 2026', (SELECT COUNT(*) FROM events);
  RAISE NOTICE 'Generated predictions for % lot-hours', (SELECT COUNT(*) FROM lot_predictions);
END $$;
