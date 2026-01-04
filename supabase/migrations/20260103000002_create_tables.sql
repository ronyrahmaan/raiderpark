-- Migration: Create Tables
-- Description: Create all tables for RaiderPark database

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  permit_type permit_type,

  -- User preferences stored as JSONB
  notification_preferences JSONB DEFAULT '{
    "push_enabled": true,
    "lot_alerts": true,
    "enforcement_alerts": true,
    "event_reminders": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00"
  }'::jsonb,

  -- User's class schedule for smart recommendations
  schedule JSONB DEFAULT '[]'::jsonb,

  -- Favorite lots for quick access
  favorite_lots TEXT[] DEFAULT '{}',

  -- Gamification
  reporter_level reporter_level DEFAULT 'newcomer',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick permit-based queries
CREATE INDEX idx_users_permit_type ON users(permit_type);

-- ============================================
-- LOTS TABLE
-- ============================================
CREATE TABLE lots (
  id TEXT PRIMARY KEY,  -- e.g., 'C1', 'C4', 'S1'
  name TEXT NOT NULL,   -- e.g., 'Commuter Lot 1'
  area lot_area NOT NULL,

  -- PostGIS geography columns for location
  center GEOGRAPHY(POINT, 4326) NOT NULL,
  geofence GEOGRAPHY(POLYGON, 4326),

  -- Capacity info
  total_spaces INTEGER NOT NULL DEFAULT 0,
  accessible_spaces INTEGER DEFAULT 0,
  ev_spaces INTEGER DEFAULT 0,
  motorcycle_spaces INTEGER DEFAULT 0,

  -- Walk times to key destinations (in minutes)
  walk_times JSONB DEFAULT '{
    "library": null,
    "student_union": null,
    "rec_center": null,
    "engineering": null,
    "business": null
  }'::jsonb,

  -- Lot features
  has_covered_parking BOOLEAN DEFAULT FALSE,
  has_ev_charging BOOLEAN DEFAULT FALSE,
  has_lighting BOOLEAN DEFAULT TRUE,

  -- Operating hours (null means 24/7)
  hours_start TIME,
  hours_end TIME,

  -- Metadata
  image_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for location queries
CREATE INDEX idx_lots_center ON lots USING GIST(center);
CREATE INDEX idx_lots_geofence ON lots USING GIST(geofence);
CREATE INDEX idx_lots_area ON lots(area);

-- ============================================
-- LOT STATUS TABLE (Real-time occupancy)
-- ============================================
CREATE TABLE lot_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,

  -- Current status
  status occupancy_status NOT NULL DEFAULT 'moderate',
  occupancy_percent INTEGER CHECK (occupancy_percent >= 0 AND occupancy_percent <= 100),
  estimated_spaces INTEGER,

  -- Confidence in this data
  confidence confidence_level DEFAULT 'low',

  -- Trend indicator (-1 = emptying, 0 = stable, 1 = filling)
  trend INTEGER DEFAULT 0 CHECK (trend >= -1 AND trend <= 1),

  -- Data source tracking
  report_count INTEGER DEFAULT 0,
  last_report_at TIMESTAMPTZ,

  -- Is lot currently closed?
  is_closed BOOLEAN DEFAULT FALSE,
  closure_reason TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each lot should have only one current status
  CONSTRAINT unique_lot_status UNIQUE (lot_id)
);

CREATE INDEX idx_lot_status_updated ON lot_status(updated_at DESC);

-- ============================================
-- PERMIT RULES TABLE
-- ============================================
CREATE TABLE permit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  permit_type permit_type NOT NULL,

  -- When this rule is valid
  valid_from TIME DEFAULT '07:30',
  valid_until TIME DEFAULT '17:30',

  -- Days of week (0 = Sunday, 6 = Saturday)
  valid_days INTEGER[] DEFAULT '{1,2,3,4,5}',

  -- Seasonal overrides
  valid_during_summer BOOLEAN DEFAULT TRUE,
  valid_during_breaks BOOLEAN DEFAULT TRUE,

  -- Rule metadata
  priority INTEGER DEFAULT 0,  -- Higher priority rules override lower
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_permit_rule UNIQUE (lot_id, permit_type)
);

CREATE INDEX idx_permit_rules_lot ON permit_rules(lot_id);
CREATE INDEX idx_permit_rules_permit ON permit_rules(permit_type);

-- ============================================
-- REPORTS TABLE (Crowdsourced data)
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,

  report_type report_type NOT NULL,

  -- Occupancy report data
  occupancy_status occupancy_status,
  occupancy_percent INTEGER CHECK (occupancy_percent >= 0 AND occupancy_percent <= 100),

  -- Location verification
  location GEOGRAPHY(POINT, 4326),
  is_verified_location BOOLEAN DEFAULT FALSE,

  -- Report details
  description TEXT,
  image_url TEXT,

  -- Report quality tracking
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,

  -- Expiry (reports become stale)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_lot ON reports(lot_id);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
-- Active reports index (no partial filter - filter at query time)
CREATE INDEX idx_reports_lot_expires ON reports(lot_id, expires_at DESC, created_at DESC);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type event_type NOT NULL,

  -- Event timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Affected lots
  affected_lot_ids TEXT[] DEFAULT '{}',

  -- Impact level (1-5, how much it affects parking)
  impact_level INTEGER DEFAULT 3 CHECK (impact_level >= 1 AND impact_level <= 5),

  -- Event details
  description TEXT,
  venue TEXT,
  expected_attendance INTEGER,

  -- Recommendations for users
  arrival_recommendation INTERVAL,  -- e.g., '2 hours' before
  alternative_lots TEXT[],

  -- Source of event info
  source TEXT,
  source_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_starts ON events(starts_at);
-- Active events index (filter at query time rather than in index)
CREATE INDEX idx_events_ends ON events(ends_at DESC, starts_at);

-- ============================================
-- LOT PREDICTIONS TABLE (ML predictions)
-- ============================================
CREATE TABLE lot_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,

  -- When this prediction is for
  predicted_for TIMESTAMPTZ NOT NULL,

  -- Predicted values
  predicted_status occupancy_status NOT NULL,
  predicted_percent INTEGER CHECK (predicted_percent >= 0 AND predicted_percent <= 100),

  -- Confidence interval
  confidence confidence_level DEFAULT 'medium',
  confidence_lower INTEGER,
  confidence_upper INTEGER,

  -- Model info
  model_version TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_prediction UNIQUE (lot_id, predicted_for)
);

CREATE INDEX idx_predictions_lot ON lot_predictions(lot_id);
CREATE INDEX idx_predictions_time ON lot_predictions(predicted_for);

-- ============================================
-- USER STATS TABLE (Gamification)
-- ============================================
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Reporting stats
  total_reports INTEGER DEFAULT 0,
  accurate_reports INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0,

  -- Engagement stats
  consecutive_days INTEGER DEFAULT 0,
  last_report_date DATE,

  -- Points and achievements
  points INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]'::jsonb,

  -- Weekly/monthly stats
  reports_this_week INTEGER DEFAULT 0,
  reports_this_month INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PARKING TIMERS TABLE
-- ============================================
CREATE TABLE parking_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,

  -- Timer details
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  expires_at TIMESTAMPTZ,  -- Computed by trigger

  -- Reminder settings
  reminder_minutes INTEGER DEFAULT 15,
  reminder_sent BOOLEAN DEFAULT FALSE,

  -- Timer status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to set expires_at on insert/update
CREATE OR REPLACE FUNCTION set_timer_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.started_at + (NEW.duration_minutes || ' minutes')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_timer_expires
  BEFORE INSERT OR UPDATE ON parking_timers
  FOR EACH ROW EXECUTE FUNCTION set_timer_expires_at();

CREATE INDEX idx_timers_user ON parking_timers(user_id);
CREATE INDEX idx_timers_active ON parking_timers(user_id, is_active)
  WHERE is_active = TRUE;

-- ============================================
-- ENFORCEMENT HOTSPOTS TABLE
-- ============================================
CREATE TABLE enforcement_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,

  -- Location within lot
  location GEOGRAPHY(POINT, 4326),

  -- Statistics
  report_count INTEGER DEFAULT 0,
  last_reported_at TIMESTAMPTZ,

  -- Time patterns (hours of day when commonly seen)
  common_hours INTEGER[] DEFAULT '{}',
  common_days INTEGER[] DEFAULT '{}',

  -- Risk level (calculated from frequency)
  risk_level INTEGER DEFAULT 1 CHECK (risk_level >= 1 AND risk_level <= 5),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hotspots_lot ON enforcement_hotspots(lot_id);
CREATE INDEX idx_hotspots_risk ON enforcement_hotspots(risk_level DESC);
