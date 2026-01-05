-- ============================================================
-- ML Models Table
-- Stores trained model weights for parking predictions
-- ============================================================

-- Create ml_models table
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL CHECK (model_type IN ('gradient_boosting', 'time_series', 'ensemble')),
  version TEXT NOT NULL,
  lot_id TEXT REFERENCES lots(id) ON DELETE CASCADE, -- NULL = global model
  model_weights JSONB NOT NULL,
  feature_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  training_metrics JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active models
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_models(model_type, is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

-- Read-only for all authenticated users
CREATE POLICY "ML models are viewable by authenticated users" ON ml_models
  FOR SELECT TO authenticated
  USING (true);

-- Only service role can modify
CREATE POLICY "Only service role can modify ML models" ON ml_models
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Prediction Logs Table
-- Tracks prediction accuracy for model improvement
-- ============================================================

CREATE TABLE IF NOT EXISTS prediction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  predicted_for TIMESTAMPTZ NOT NULL,
  predicted_occupancy INTEGER NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL,

  -- Actual values (filled in later)
  actual_occupancy INTEGER,
  actual_measured_at TIMESTAMPTZ,

  -- Accuracy metrics
  absolute_error INTEGER GENERATED ALWAYS AS (
    CASE WHEN actual_occupancy IS NOT NULL
      THEN ABS(predicted_occupancy - actual_occupancy)
      ELSE NULL
    END
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_prediction_logs_lot_time ON prediction_logs(lot_id, predicted_for);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_accuracy ON prediction_logs(model_version, absolute_error) WHERE actual_occupancy IS NOT NULL;

-- RLS
ALTER TABLE prediction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prediction logs are viewable by authenticated users" ON prediction_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only service role can insert prediction logs" ON prediction_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================
-- Function: Update prediction with actual value
-- ============================================================

CREATE OR REPLACE FUNCTION update_prediction_actual(
  p_lot_id TEXT,
  p_time TIMESTAMPTZ,
  p_actual_occupancy INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE prediction_logs
  SET
    actual_occupancy = p_actual_occupancy,
    actual_measured_at = NOW()
  WHERE
    lot_id = p_lot_id
    AND predicted_for BETWEEN p_time - INTERVAL '30 minutes' AND p_time + INTERVAL '30 minutes'
    AND actual_occupancy IS NULL;
END;
$$;

-- ============================================================
-- Function: Get model accuracy metrics
-- ============================================================

CREATE OR REPLACE FUNCTION get_model_accuracy(
  p_model_version TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  model_version TEXT,
  total_predictions BIGINT,
  validated_predictions BIGINT,
  mean_absolute_error NUMERIC,
  median_absolute_error NUMERIC,
  accuracy_within_10 NUMERIC,
  accuracy_within_20 NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.model_version,
    COUNT(*) as total_predictions,
    COUNT(pl.actual_occupancy) as validated_predictions,
    ROUND(AVG(pl.absolute_error), 2) as mean_absolute_error,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pl.absolute_error)::NUMERIC as median_absolute_error,
    ROUND(
      100.0 * COUNT(CASE WHEN pl.absolute_error <= 10 THEN 1 END) / NULLIF(COUNT(pl.actual_occupancy), 0),
      1
    ) as accuracy_within_10,
    ROUND(
      100.0 * COUNT(CASE WHEN pl.absolute_error <= 20 THEN 1 END) / NULLIF(COUNT(pl.actual_occupancy), 0),
      1
    ) as accuracy_within_20
  FROM prediction_logs pl
  WHERE
    (p_model_version IS NULL OR pl.model_version = p_model_version)
    AND pl.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pl.model_version
  ORDER BY validated_predictions DESC;
END;
$$;

-- ============================================================
-- Trigger: Auto-update predictions from reports
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_update_prediction_from_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a new report comes in, update any pending predictions
  -- Only for occupancy reports with a percentage
  IF NEW.occupancy_percent IS NOT NULL THEN
    PERFORM update_prediction_actual(
      NEW.lot_id,
      NEW.created_at,
      NEW.occupancy_percent
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_update_predictions ON reports;
CREATE TRIGGER on_report_update_predictions
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_prediction_from_report();

-- ============================================================
-- Add training_data_stats column to lots
-- ============================================================

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS ml_training_stats JSONB DEFAULT '{
    "total_reports": 0,
    "avg_occupancy": 50,
    "peak_hour": 10,
    "last_trained": null
  }'::jsonb;

COMMENT ON TABLE ml_models IS 'Stores trained ML model weights for parking predictions';
COMMENT ON TABLE prediction_logs IS 'Logs predictions for accuracy tracking and model improvement';
