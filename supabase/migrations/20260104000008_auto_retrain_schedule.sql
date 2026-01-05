-- ============================================================
-- Automatic ML Model Retraining Schedule
-- Uses pg_cron to retrain model weekly
-- ============================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================
-- Function to trigger ML retraining via Edge Function
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_ml_retrain()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response JSONB;
  v_status INTEGER;
BEGIN
  -- Call the ml-retrain Edge Function
  SELECT
    status,
    content::jsonb
  INTO v_status, v_response
  FROM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/ml-retrain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );

  -- Log the result
  IF v_status = 200 THEN
    RAISE NOTICE 'ML Retrain triggered successfully: %', v_response;
  ELSE
    RAISE WARNING 'ML Retrain failed with status %: %', v_status, v_response;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'ML Retrain trigger failed: %', SQLERRM;
END;
$$;

-- ============================================================
-- Alternative: Simple retraining check function
-- Checks if retraining is needed and logs recommendation
-- ============================================================

CREATE OR REPLACE FUNCTION check_retraining_needed()
RETURNS TABLE (
  should_retrain BOOLEAN,
  reason TEXT,
  reports_since_last_train INTEGER,
  days_since_last_train INTEGER,
  current_accuracy NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_trained TIMESTAMPTZ;
  v_reports_count INTEGER;
  v_days_since INTEGER;
  v_accuracy NUMERIC;
  v_should_retrain BOOLEAN := FALSE;
  v_reason TEXT := 'No retraining needed';
BEGIN
  -- Get last training time
  SELECT (model_weights->>'trainedAt')::TIMESTAMPTZ
  INTO v_last_trained
  FROM ml_models
  WHERE is_active = TRUE AND model_type = 'gradient_boosting'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Default to 30 days ago if never trained
  IF v_last_trained IS NULL THEN
    v_last_trained := NOW() - INTERVAL '30 days';
    v_should_retrain := TRUE;
    v_reason := 'No trained model exists';
  END IF;

  -- Count reports since last training
  SELECT COUNT(*)
  INTO v_reports_count
  FROM reports
  WHERE created_at > v_last_trained
    AND occupancy_percent IS NOT NULL;

  -- Calculate days since last training
  v_days_since := EXTRACT(DAY FROM NOW() - v_last_trained)::INTEGER;

  -- Get current model accuracy
  SELECT COALESCE(accuracy_within_10, 0)
  INTO v_accuracy
  FROM get_model_accuracy(NULL, 7)
  LIMIT 1;

  -- Check retraining conditions
  IF v_reports_count >= 100 THEN
    v_should_retrain := TRUE;
    v_reason := 'Over 100 new reports since last training';
  ELSIF v_days_since >= 7 THEN
    v_should_retrain := TRUE;
    v_reason := 'Over 7 days since last training';
  ELSIF v_accuracy < 60 THEN
    v_should_retrain := TRUE;
    v_reason := 'Model accuracy below 60%';
  END IF;

  RETURN QUERY SELECT
    v_should_retrain,
    v_reason,
    v_reports_count,
    v_days_since,
    v_accuracy;
END;
$$;

-- ============================================================
-- Schedule weekly retraining (Sundays at 3 AM)
-- ============================================================

-- Remove existing job if exists
SELECT cron.unschedule('ml-weekly-retrain') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ml-weekly-retrain'
);

-- Note: pg_cron http calls require pg_net extension
-- If pg_net is not available, we'll use a different approach

-- Check if pg_net is available
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- Schedule with http call
    PERFORM cron.schedule(
      'ml-weekly-retrain',
      '0 3 * * 0',  -- Every Sunday at 3 AM
      'SELECT trigger_ml_retrain()'
    );
    RAISE NOTICE 'ML Retrain scheduled for weekly execution (Sundays 3 AM)';
  ELSE
    -- Just log that manual trigger is needed
    RAISE NOTICE 'pg_net not available - ML retrain must be triggered manually or via external scheduler';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Manual retraining recommended.', SQLERRM;
END $body$;

-- ============================================================
-- Create a simple retrain log table
-- ============================================================

CREATE TABLE IF NOT EXISTS ml_retrain_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_by TEXT DEFAULT 'manual', -- 'manual', 'scheduled', 'threshold'
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  samples_used INTEGER,
  metrics JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ml_retrain_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Retrain logs viewable by authenticated" ON ml_retrain_logs
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Function: Log retrain event
-- ============================================================

CREATE OR REPLACE FUNCTION log_retrain_event(
  p_triggered_by TEXT,
  p_status TEXT,
  p_samples INTEGER DEFAULT NULL,
  p_metrics JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ml_retrain_logs (triggered_by, status, samples_used, metrics, error_message, duration_ms)
  VALUES (p_triggered_by, p_status, p_samples, p_metrics, p_error, p_duration)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- Trigger: Auto-retrain when threshold reached
-- ============================================================

CREATE OR REPLACE FUNCTION check_auto_retrain_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check RECORD;
BEGIN
  -- Only check every 100 reports (to avoid overhead)
  IF (SELECT COUNT(*) FROM reports WHERE occupancy_percent IS NOT NULL) % 100 = 0 THEN
    SELECT * INTO v_check FROM check_retraining_needed();

    IF v_check.should_retrain THEN
      -- Log that retraining is recommended
      INSERT INTO ml_retrain_logs (triggered_by, status, error_message)
      VALUES ('threshold', 'recommended', v_check.reason);

      RAISE NOTICE 'ML Retraining recommended: %', v_check.reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (optional - can be resource intensive)
-- Uncomment if you want automatic threshold checking
-- DROP TRIGGER IF EXISTS on_report_check_retrain ON reports;
-- CREATE TRIGGER on_report_check_retrain
--   AFTER INSERT ON reports
--   FOR EACH ROW
--   EXECUTE FUNCTION check_auto_retrain_threshold();

-- ============================================================
-- Success message
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Auto-retrain schedule migration completed!';
  RAISE NOTICE 'Run SELECT * FROM check_retraining_needed() to check if retraining is needed';
END $$;
