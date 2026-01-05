-- Migration: Fix Report Trigger
-- Description: Fix the trigger to process correct report types for lot_status updates

-- ============================================
-- FUNCTION: Update lot status from report (FIXED)
-- Now handles: status_report, full_report, parked, left
-- ============================================
CREATE OR REPLACE FUNCTION update_lot_status_from_report()
RETURNS TRIGGER AS $$
DECLARE
  v_calc RECORD;
  v_prev_percent INTEGER;
  v_trend INTEGER;
  v_new_percent INTEGER;
BEGIN
  -- Only process reports that affect lot status
  -- Skip enforcement and hazard reports
  IF NEW.report_type IN ('enforcement', 'hazard') THEN
    RETURN NEW;
  END IF;

  -- For 'parked' and 'left' reports without occupancy data,
  -- we still want to record activity but may not have percentage
  IF NEW.report_type IN ('parked', 'left') AND NEW.occupancy_percent IS NULL THEN
    -- Just update the last_report_at timestamp to show activity
    UPDATE lot_status
    SET
      last_report_at = NOW(),
      updated_at = NOW(),
      report_count = report_count + 1
    WHERE lot_id = NEW.lot_id;

    -- If no row exists, create one with estimated values
    IF NOT FOUND THEN
      INSERT INTO lot_status (
        lot_id, status, occupancy_percent, confidence,
        trend, report_count, last_report_at, updated_at
      )
      VALUES (
        NEW.lot_id,
        COALESCE(NEW.occupancy_status, 'busy'::occupancy_status),
        50, -- Default to 50% if unknown
        'low'::confidence_level,
        0,
        1,
        NOW(),
        NOW()
      );
    END IF;

    RETURN NEW;
  END IF;

  -- For status_report and full_report with occupancy data
  -- Get previous occupancy for trend calculation
  SELECT occupancy_percent INTO v_prev_percent
  FROM lot_status
  WHERE lot_id = NEW.lot_id;

  -- Use the reported percentage or map from status
  IF NEW.occupancy_percent IS NOT NULL THEN
    v_new_percent := NEW.occupancy_percent;
  ELSIF NEW.occupancy_status IS NOT NULL THEN
    -- Map status to approximate percentage
    v_new_percent := CASE NEW.occupancy_status
      WHEN 'open' THEN 25
      WHEN 'busy' THEN 50
      WHEN 'filling' THEN 70
      WHEN 'full' THEN 95
      WHEN 'closed' THEN 100
      ELSE 50
    END;
  ELSE
    v_new_percent := 50; -- Default
  END IF;

  -- Calculate trend
  IF v_prev_percent IS NULL THEN
    v_trend := 0;
  ELSIF v_new_percent > v_prev_percent + 10 THEN
    v_trend := 1;  -- Filling up
  ELSIF v_new_percent < v_prev_percent - 10 THEN
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
    NEW.lot_id,
    COALESCE(NEW.occupancy_status,
      CASE
        WHEN v_new_percent < 40 THEN 'open'::occupancy_status
        WHEN v_new_percent < 60 THEN 'busy'::occupancy_status
        WHEN v_new_percent < 80 THEN 'filling'::occupancy_status
        ELSE 'full'::occupancy_status
      END
    ),
    v_new_percent,
    CASE
      WHEN NEW.report_type = 'full_report' THEN 'high'::confidence_level
      ELSE 'medium'::confidence_level
    END,
    v_trend,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (lot_id) DO UPDATE SET
    status = EXCLUDED.status,
    occupancy_percent = EXCLUDED.occupancy_percent,
    confidence = CASE
      WHEN lot_status.report_count >= 5 THEN 'high'::confidence_level
      WHEN lot_status.report_count >= 2 THEN 'medium'::confidence_level
      ELSE 'low'::confidence_level
    END,
    trend = EXCLUDED.trend,
    report_count = lot_status.report_count + 1,
    last_report_at = EXCLUDED.last_report_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, just updating the function
-- No need to recreate the trigger
