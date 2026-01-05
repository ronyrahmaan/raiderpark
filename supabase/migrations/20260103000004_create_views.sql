-- Migration: Create Views
-- Description: Create database views for common queries

-- ============================================
-- VIEW: Lots with current status
-- ============================================
CREATE OR REPLACE VIEW lots_with_status AS
SELECT
  l.id,
  l.name,
  l.area,
  l.total_spaces,
  l.accessible_spaces,
  l.ev_spaces,
  l.motorcycle_spaces,
  ST_Y(l.center::geometry) as latitude,
  ST_X(l.center::geometry) as longitude,
  l.walk_times,
  l.has_covered_parking,
  l.has_ev_charging,
  l.has_lighting,
  l.hours_start,
  l.hours_end,
  l.image_url,
  COALESCE(ls.status, 'busy'::occupancy_status) as status,
  COALESCE(ls.occupancy_percent, 50) as occupancy_percent,
  ls.estimated_spaces,
  COALESCE(ls.confidence, 'low'::confidence_level) as confidence,
  COALESCE(ls.trend, 0) as trend,
  COALESCE(ls.is_closed, FALSE) as is_closed,
  ls.closure_reason,
  ls.report_count,
  ls.last_report_at,
  ls.updated_at as status_updated_at
FROM lots l
LEFT JOIN lot_status ls ON l.id = ls.lot_id;

-- ============================================
-- VIEW: Active events
-- ============================================
CREATE OR REPLACE VIEW active_events AS
SELECT
  e.id,
  e.name,
  e.event_type,
  e.starts_at,
  e.ends_at,
  e.affected_lot_ids,
  e.impact_level,
  e.description,
  e.venue,
  e.expected_attendance,
  e.arrival_recommendation,
  e.alternative_lots,
  CASE
    WHEN NOW() BETWEEN e.starts_at AND e.ends_at THEN 'active'
    WHEN NOW() < e.starts_at THEN 'upcoming'
    ELSE 'ended'
  END as status,
  CASE
    WHEN NOW() < e.starts_at THEN e.starts_at - NOW()
    ELSE NULL
  END as time_until_start
FROM events e
WHERE e.ends_at > NOW()
ORDER BY e.starts_at;

-- ============================================
-- VIEW: Reporter leaderboard
-- ============================================
CREATE OR REPLACE VIEW reporter_leaderboard AS
SELECT
  u.id as user_id,
  u.display_name,
  u.reporter_level,
  us.total_reports,
  us.accurate_reports,
  us.accuracy_rate,
  us.consecutive_days,
  us.points,
  us.reports_this_week,
  us.reports_this_month,
  us.achievements,
  RANK() OVER (ORDER BY us.points DESC) as rank
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.total_reports > 0
ORDER BY us.points DESC;

-- ============================================
-- VIEW: Recent reports with user info
-- ============================================
CREATE OR REPLACE VIEW recent_reports AS
SELECT
  r.id,
  r.lot_id,
  l.name as lot_name,
  r.report_type,
  r.occupancy_status,
  r.occupancy_percent,
  r.description,
  r.upvotes,
  r.downvotes,
  r.upvotes - r.downvotes as net_votes,
  r.created_at,
  r.expires_at,
  r.expires_at > NOW() as is_active,
  u.display_name as reporter_name,
  u.reporter_level
FROM reports r
JOIN lots l ON r.lot_id = l.id
JOIN users u ON r.user_id = u.id
WHERE r.created_at > NOW() - INTERVAL '24 hours'
ORDER BY r.created_at DESC;

-- ============================================
-- VIEW: Lot predictions for today
-- ============================================
CREATE OR REPLACE VIEW today_predictions AS
SELECT
  lp.lot_id,
  l.name as lot_name,
  lp.predicted_for,
  lp.predicted_status,
  lp.predicted_percent,
  lp.confidence,
  lp.confidence_lower,
  lp.confidence_upper,
  lp.model_version
FROM lot_predictions lp
JOIN lots l ON lp.lot_id = l.id
WHERE lp.predicted_for::DATE = CURRENT_DATE
ORDER BY lp.lot_id, lp.predicted_for;

-- ============================================
-- VIEW: Active parking timers
-- ============================================
CREATE OR REPLACE VIEW active_timers AS
SELECT
  pt.id,
  pt.user_id,
  pt.lot_id,
  l.name as lot_name,
  pt.started_at,
  pt.duration_minutes,
  pt.expires_at,
  pt.reminder_minutes,
  pt.reminder_sent,
  GREATEST(0, EXTRACT(EPOCH FROM (pt.expires_at - NOW())) / 60)::INTEGER as minutes_remaining,
  CASE
    WHEN pt.expires_at < NOW() THEN 'expired'
    WHEN pt.expires_at < NOW() + (pt.reminder_minutes || ' minutes')::INTERVAL THEN 'warning'
    ELSE 'active'
  END as timer_status
FROM parking_timers pt
JOIN lots l ON pt.lot_id = l.id
WHERE pt.is_active = TRUE
ORDER BY pt.expires_at;

-- ============================================
-- VIEW: Enforcement activity summary
-- ============================================
CREATE OR REPLACE VIEW enforcement_summary AS
SELECT
  eh.lot_id,
  l.name as lot_name,
  l.area,
  eh.report_count,
  eh.last_reported_at,
  eh.common_hours,
  eh.common_days,
  eh.risk_level,
  CASE eh.risk_level
    WHEN 1 THEN 'Low'
    WHEN 2 THEN 'Moderate'
    WHEN 3 THEN 'Elevated'
    WHEN 4 THEN 'High'
    WHEN 5 THEN 'Very High'
  END as risk_label
FROM enforcement_hotspots eh
JOIN lots l ON eh.lot_id = l.id
ORDER BY eh.risk_level DESC, eh.report_count DESC;

-- ============================================
-- VIEW: Lots by area with availability
-- ============================================
CREATE OR REPLACE VIEW lots_by_area AS
SELECT
  l.area,
  COUNT(*) as lot_count,
  SUM(l.total_spaces) as total_spaces,
  SUM(CASE WHEN ls.status = 'full' THEN 1 ELSE 0 END) as full_lots,
  SUM(CASE WHEN ls.status = 'open' THEN 1 ELSE 0 END) as available_lots,
  ROUND(AVG(COALESCE(ls.occupancy_percent, 50)), 1) as avg_occupancy,
  MODE() WITHIN GROUP (ORDER BY COALESCE(ls.status, 'busy'::occupancy_status)) as typical_status
FROM lots l
LEFT JOIN lot_status ls ON l.id = ls.lot_id
GROUP BY l.area
ORDER BY l.area;
