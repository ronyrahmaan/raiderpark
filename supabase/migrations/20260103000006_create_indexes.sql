-- Migration: Create Additional Indexes
-- Description: Performance optimization indexes

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Reports: Find reports by type and lot
CREATE INDEX IF NOT EXISTS idx_reports_lot_type
  ON reports(lot_id, report_type, created_at DESC);

-- Events: Find upcoming events by type (filter at query time)
CREATE INDEX IF NOT EXISTS idx_events_type_upcoming
  ON events(event_type, starts_at, ends_at);

-- Lot predictions: Find predictions for specific time range
CREATE INDEX IF NOT EXISTS idx_predictions_time_range
  ON lot_predictions(lot_id, predicted_for);

-- Parking timers: Find expiring timers
CREATE INDEX IF NOT EXISTS idx_timers_expiring
  ON parking_timers(expires_at)
  WHERE is_active = TRUE AND reminder_sent = FALSE;

-- ============================================
-- FULL TEXT SEARCH INDEXES
-- ============================================

-- Events: Search by name and description
CREATE INDEX IF NOT EXISTS idx_events_search
  ON events USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Lots: Search by name
CREATE INDEX IF NOT EXISTS idx_lots_name_search
  ON lots USING gin(name gin_trgm_ops);

-- ============================================
-- JSONB INDEXES
-- ============================================

-- Users: Index notification preferences
CREATE INDEX IF NOT EXISTS idx_users_notifications
  ON users USING gin(notification_preferences);

-- Lots: Index walk times
CREATE INDEX IF NOT EXISTS idx_lots_walk_times
  ON lots USING gin(walk_times);

-- User stats: Index achievements
CREATE INDEX IF NOT EXISTS idx_user_stats_achievements
  ON user_stats USING gin(achievements);

-- ============================================
-- PARTIAL INDEXES FOR EFFICIENCY
-- ============================================

-- Reports: Index only enforcement reports
CREATE INDEX IF NOT EXISTS idx_reports_enforcement
  ON reports(lot_id, created_at DESC)
  WHERE report_type = 'enforcement';

-- Lot status: Index only closed lots
CREATE INDEX IF NOT EXISTS idx_lot_status_closed
  ON lot_status(lot_id)
  WHERE is_closed = TRUE;

-- Events: Index high-impact events
CREATE INDEX IF NOT EXISTS idx_events_high_impact
  ON events(starts_at, ends_at)
  WHERE impact_level >= 4;

-- ============================================
-- COVERING INDEXES (Include commonly accessed columns)
-- ============================================

-- Lot status with common query columns
CREATE INDEX IF NOT EXISTS idx_lot_status_covering
  ON lot_status(lot_id)
  INCLUDE (status, occupancy_percent, confidence, trend, is_closed);

-- Reports with vote info
CREATE INDEX IF NOT EXISTS idx_reports_votes
  ON reports(lot_id, created_at DESC)
  INCLUDE (upvotes, downvotes, occupancy_status);
