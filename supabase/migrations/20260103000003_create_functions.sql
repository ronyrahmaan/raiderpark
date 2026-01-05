-- Migration: Create Functions and Triggers
-- Description: Create all stored functions and triggers for RaiderPark

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lots_updated_at
  BEFORE UPDATE ON lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lot_status_updated_at
  BEFORE UPDATE ON lot_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enforcement_hotspots_updated_at
  BEFORE UPDATE ON enforcement_hotspots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Check if permit is valid for lot
-- ============================================
CREATE OR REPLACE FUNCTION is_permit_valid(
  p_permit_type permit_type,
  p_lot_id TEXT,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rule RECORD;
  v_day_of_week INTEGER;
  v_time_of_day TIME;
BEGIN
  -- Extract day of week and time
  v_day_of_week := EXTRACT(DOW FROM p_check_time)::INTEGER;
  v_time_of_day := p_check_time::TIME;

  -- Check for matching rule
  SELECT * INTO v_rule
  FROM permit_rules
  WHERE lot_id = p_lot_id
    AND permit_type = p_permit_type
    AND v_day_of_week = ANY(valid_days)
  ORDER BY priority DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check time validity
  IF v_rule.valid_from IS NOT NULL AND v_rule.valid_until IS NOT NULL THEN
    IF v_time_of_day < v_rule.valid_from OR v_time_of_day > v_rule.valid_until THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get valid lots for a permit type
-- ============================================
CREATE OR REPLACE FUNCTION get_valid_lots(
  p_permit_type permit_type,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  lot_id TEXT,
  lot_name TEXT,
  area lot_area,
  valid_from TIME,
  valid_until TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.area,
    pr.valid_from,
    pr.valid_until
  FROM lots l
  JOIN permit_rules pr ON l.id = pr.lot_id
  WHERE pr.permit_type = p_permit_type
    AND EXTRACT(DOW FROM p_check_time)::INTEGER = ANY(pr.valid_days)
    AND (
      pr.valid_from IS NULL
      OR (p_check_time::TIME >= pr.valid_from AND p_check_time::TIME <= pr.valid_until)
    )
  ORDER BY l.area, l.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get lots with current status
-- ============================================
CREATE OR REPLACE FUNCTION get_lots_with_status(
  p_permit_type permit_type DEFAULT NULL,
  p_area lot_area DEFAULT NULL
)
RETURNS TABLE (
  lot_id TEXT,
  lot_name TEXT,
  area lot_area,
  total_spaces INTEGER,
  status occupancy_status,
  occupancy_percent INTEGER,
  estimated_spaces INTEGER,
  confidence confidence_level,
  trend INTEGER,
  is_closed BOOLEAN,
  is_valid_for_permit BOOLEAN,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.area,
    l.total_spaces,
    COALESCE(ls.status, 'moderate'::occupancy_status),
    ls.occupancy_percent,
    ls.estimated_spaces,
    COALESCE(ls.confidence, 'low'::confidence_level),
    COALESCE(ls.trend, 0),
    COALESCE(ls.is_closed, FALSE),
    CASE
      WHEN p_permit_type IS NULL THEN TRUE
      ELSE is_permit_valid(p_permit_type, l.id, NOW())
    END,
    ls.updated_at
  FROM lots l
  LEFT JOIN lot_status ls ON l.id = ls.lot_id
  WHERE (p_area IS NULL OR l.area = p_area)
  ORDER BY
    CASE COALESCE(ls.status, 'moderate'::occupancy_status)
      WHEN 'empty' THEN 1
      WHEN 'light' THEN 2
      WHEN 'moderate' THEN 3
      WHEN 'busy' THEN 4
      WHEN 'full' THEN 5
    END,
    l.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Calculate occupancy from reports
-- ============================================
CREATE OR REPLACE FUNCTION calculate_lot_occupancy(p_lot_id TEXT)
RETURNS TABLE (
  avg_status occupancy_status,
  avg_percent INTEGER,
  confidence confidence_level,
  report_count BIGINT
) AS $$
DECLARE
  v_report_count BIGINT;
  v_avg_percent DECIMAL;
  v_weighted_avg DECIMAL;
  v_confidence confidence_level;
  v_status occupancy_status;
BEGIN
  -- Get active reports for this lot
  SELECT
    COUNT(*),
    AVG(occupancy_percent)
  INTO v_report_count, v_avg_percent
  FROM reports
  WHERE lot_id = p_lot_id
    AND report_type = 'occupancy'
    AND expires_at > NOW()
    AND occupancy_percent IS NOT NULL;

  -- Determine confidence based on report count and recency
  IF v_report_count = 0 THEN
    v_confidence := 'low';
  ELSIF v_report_count = 1 THEN
    v_confidence := 'low';
  ELSIF v_report_count <= 3 THEN
    v_confidence := 'medium';
  ELSIF v_report_count <= 10 THEN
    v_confidence := 'high';
  ELSE
    v_confidence := 'verified';
  END IF;

  -- Determine status from percentage
  IF v_avg_percent IS NULL THEN
    v_status := 'moderate';
    v_avg_percent := 50;
  ELSIF v_avg_percent <= 20 THEN
    v_status := 'empty';
  ELSIF v_avg_percent <= 40 THEN
    v_status := 'light';
  ELSIF v_avg_percent <= 60 THEN
    v_status := 'moderate';
  ELSIF v_avg_percent <= 80 THEN
    v_status := 'busy';
  ELSE
    v_status := 'full';
  END IF;

  RETURN QUERY SELECT v_status, v_avg_percent::INTEGER, v_confidence, v_report_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Update lot status from report
-- ============================================
CREATE OR REPLACE FUNCTION update_lot_status_from_report()
RETURNS TRIGGER AS $$
DECLARE
  v_calc RECORD;
  v_prev_percent INTEGER;
  v_trend INTEGER;
BEGIN
  -- Only process occupancy reports
  IF NEW.report_type != 'occupancy' THEN
    RETURN NEW;
  END IF;

  -- Get calculated values
  SELECT * INTO v_calc FROM calculate_lot_occupancy(NEW.lot_id);

  -- Get previous occupancy for trend calculation
  SELECT occupancy_percent INTO v_prev_percent
  FROM lot_status
  WHERE lot_id = NEW.lot_id;

  -- Calculate trend
  IF v_prev_percent IS NULL THEN
    v_trend := 0;
  ELSIF v_calc.avg_percent > v_prev_percent + 10 THEN
    v_trend := 1;  -- Filling up
  ELSIF v_calc.avg_percent < v_prev_percent - 10 THEN
    v_trend := -1; -- Emptying
  ELSE
    v_trend := 0;  -- Stable
  END IF;

  -- Upsert lot status
  INSERT INTO lot_status (
    lot_id, status, occupancy_percent, confidence,
    trend, report_count, last_report_at, updated_at
  )
  VALUES (
    NEW.lot_id, v_calc.avg_status, v_calc.avg_percent,
    v_calc.confidence, v_trend, v_calc.report_count, NOW(), NOW()
  )
  ON CONFLICT (lot_id) DO UPDATE SET
    status = EXCLUDED.status,
    occupancy_percent = EXCLUDED.occupancy_percent,
    confidence = EXCLUDED.confidence,
    trend = EXCLUDED.trend,
    report_count = EXCLUDED.report_count,
    last_report_at = EXCLUDED.last_report_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update lot status when reports come in
CREATE TRIGGER trigger_update_lot_status
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION update_lot_status_from_report();

-- ============================================
-- FUNCTION: Update user stats after report
-- ============================================
CREATE OR REPLACE FUNCTION update_user_stats_after_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert user stats
  INSERT INTO user_stats (
    user_id, total_reports, last_report_date,
    reports_this_week, reports_this_month, points
  )
  VALUES (
    NEW.user_id, 1, CURRENT_DATE, 1, 1, 10
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_reports = user_stats.total_reports + 1,
    last_report_date = CURRENT_DATE,
    reports_this_week = CASE
      WHEN user_stats.last_report_date >= CURRENT_DATE - INTERVAL '7 days'
      THEN user_stats.reports_this_week + 1
      ELSE 1
    END,
    reports_this_month = CASE
      WHEN user_stats.last_report_date >= DATE_TRUNC('month', CURRENT_DATE)
      THEN user_stats.reports_this_month + 1
      ELSE 1
    END,
    consecutive_days = CASE
      WHEN user_stats.last_report_date = CURRENT_DATE - INTERVAL '1 day'
      THEN user_stats.consecutive_days + 1
      WHEN user_stats.last_report_date = CURRENT_DATE
      THEN user_stats.consecutive_days
      ELSE 1
    END,
    points = user_stats.points + 10,
    updated_at = NOW();

  -- Update reporter level based on total reports
  UPDATE users
  SET reporter_level = CASE
    WHEN (SELECT total_reports FROM user_stats WHERE user_id = NEW.user_id) >= 1000 THEN 'hall_of_fame'
    WHEN (SELECT total_reports FROM user_stats WHERE user_id = NEW.user_id) >= 500 THEN 'mvp'
    WHEN (SELECT total_reports FROM user_stats WHERE user_id = NEW.user_id) >= 200 THEN 'legend'
    WHEN (SELECT total_reports FROM user_stats WHERE user_id = NEW.user_id) >= 75 THEN 'veteran'
    WHEN (SELECT total_reports FROM user_stats WHERE user_id = NEW.user_id) >= 25 THEN 'regular'
    WHEN (SELECT total_reports FROM user_stats WHERE user_id = NEW.user_id) >= 5 THEN 'rookie'
    ELSE 'newbie'
  END
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user stats
CREATE TRIGGER trigger_update_user_stats
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_after_report();

-- ============================================
-- FUNCTION: Update enforcement hotspots
-- ============================================
CREATE OR REPLACE FUNCTION update_enforcement_hotspots()
RETURNS TRIGGER AS $$
DECLARE
  v_hour INTEGER;
  v_day INTEGER;
BEGIN
  -- Only process enforcement reports
  IF NEW.report_type != 'enforcement' THEN
    RETURN NEW;
  END IF;

  v_hour := EXTRACT(HOUR FROM NEW.created_at)::INTEGER;
  v_day := EXTRACT(DOW FROM NEW.created_at)::INTEGER;

  -- Upsert enforcement hotspot
  INSERT INTO enforcement_hotspots (
    lot_id, location, report_count, last_reported_at,
    common_hours, common_days, risk_level
  )
  VALUES (
    NEW.lot_id, NEW.location, 1, NOW(),
    ARRAY[v_hour], ARRAY[v_day],
    1
  )
  ON CONFLICT ON CONSTRAINT enforcement_hotspots_pkey DO UPDATE SET
    report_count = enforcement_hotspots.report_count + 1,
    last_reported_at = NOW(),
    common_hours = CASE
      WHEN NOT (v_hour = ANY(enforcement_hotspots.common_hours))
      THEN enforcement_hotspots.common_hours || ARRAY[v_hour]
      ELSE enforcement_hotspots.common_hours
    END,
    common_days = CASE
      WHEN NOT (v_day = ANY(enforcement_hotspots.common_days))
      THEN enforcement_hotspots.common_days || ARRAY[v_day]
      ELSE enforcement_hotspots.common_days
    END,
    risk_level = LEAST(5, (enforcement_hotspots.report_count + 1) / 5 + 1),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for enforcement hotspots
CREATE TRIGGER trigger_update_enforcement_hotspots
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION update_enforcement_hotspots();

-- ============================================
-- FUNCTION: Find nearest lots
-- ============================================
CREATE OR REPLACE FUNCTION find_nearest_lots(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_limit INTEGER DEFAULT 5,
  p_permit_type permit_type DEFAULT NULL
)
RETURNS TABLE (
  lot_id TEXT,
  lot_name TEXT,
  distance_meters DECIMAL,
  status occupancy_status,
  is_valid_for_permit BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    ST_Distance(
      l.center,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
    ) as distance_meters,
    COALESCE(ls.status, 'moderate'::occupancy_status),
    CASE
      WHEN p_permit_type IS NULL THEN TRUE
      ELSE is_permit_valid(p_permit_type, l.id, NOW())
    END
  FROM lots l
  LEFT JOIN lot_status ls ON l.id = ls.lot_id
  WHERE (p_permit_type IS NULL OR is_permit_valid(p_permit_type, l.id, NOW()))
  ORDER BY ST_Distance(
    l.center,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
  )
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Check if user is within lot geofence
-- ============================================
CREATE OR REPLACE FUNCTION is_user_in_lot(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_lot_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_in_geofence BOOLEAN;
BEGIN
  SELECT ST_Covers(
    l.geofence,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
  ) INTO v_in_geofence
  FROM lots l
  WHERE l.id = p_lot_id;

  RETURN COALESCE(v_in_geofence, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;
