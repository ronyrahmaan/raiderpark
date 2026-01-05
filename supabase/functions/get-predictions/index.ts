// Supabase Edge Function: get-predictions
// Fetches ML predictions for a specific parking lot
// Input: lot_id, permit_type, time_horizon
// Returns: predicted occupancy and best times to arrive

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Type definitions
interface PredictionRequest {
  lot_id: string;
  permit_type?: string;
  time_horizon?: number; // hours into the future (default: 4)
}

interface PredictionResult {
  lot_id: string;
  predictions: HourlyPrediction[];
  best_times: BestTime[];
  current_status: CurrentStatus | null;
}

interface HourlyPrediction {
  time: string;
  predicted_status: string;
  predicted_percent: number;
  confidence: string;
}

interface BestTime {
  time: string;
  predicted_status: string;
  predicted_percent: number;
  reason: string;
}

interface CurrentStatus {
  status: string;
  occupancy_percent: number;
  confidence: string;
  trend: number;
  is_closed: boolean;
}

// Calculate predicted occupancy based on historical patterns and current data
function calculatePrediction(
  hour: number,
  dayOfWeek: number,
  currentPercent: number,
  trend: number
): { status: string; percent: number; confidence: string } {
  // Base patterns by hour (typical university parking patterns)
  const hourlyPatterns: Record<number, number> = {
    0: 15, 1: 10, 2: 8, 3: 5, 4: 5, 5: 10,
    6: 20, 7: 40, 8: 65, 9: 80, 10: 90, 11: 95,
    12: 85, 13: 90, 14: 85, 15: 75, 16: 60, 17: 45,
    18: 35, 19: 30, 20: 25, 21: 20, 22: 18, 23: 15,
  };

  // Weekend adjustment (less busy)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekendMultiplier = isWeekend ? 0.3 : 1.0;

  // Base prediction from patterns
  let basePercent = hourlyPatterns[hour] * weekendMultiplier;

  // Adjust based on current trend
  const trendAdjustment = trend * 5; // +/- 5% per trend unit
  basePercent += trendAdjustment;

  // Blend with current status if we have it (more weight for near-term predictions)
  const currentWeight = 0.3;
  let predictedPercent = basePercent * (1 - currentWeight) + currentPercent * currentWeight;

  // Clamp to valid range
  predictedPercent = Math.max(0, Math.min(100, Math.round(predictedPercent)));

  // Determine status from percentage
  let status: string;
  if (predictedPercent <= 20) {
    status = "empty";
  } else if (predictedPercent <= 40) {
    status = "light";
  } else if (predictedPercent <= 60) {
    status = "moderate";
  } else if (predictedPercent <= 80) {
    status = "busy";
  } else {
    status = "full";
  }

  // Confidence decreases for further predictions
  const confidence = "medium"; // Can be enhanced with ML model confidence

  return { status, percent: predictedPercent, confidence };
}

// Find the best times to arrive based on predictions
function findBestTimes(predictions: HourlyPrediction[]): BestTime[] {
  const bestTimes: BestTime[] = [];

  // Sort predictions by predicted_percent (lowest first)
  const sorted = [...predictions].sort(
    (a, b) => a.predicted_percent - b.predicted_percent
  );

  // Get top 3 best times
  for (const pred of sorted.slice(0, 3)) {
    let reason: string;
    if (pred.predicted_percent <= 20) {
      reason = "Lot is predicted to be nearly empty";
    } else if (pred.predicted_percent <= 40) {
      reason = "Light traffic expected, easy parking";
    } else if (pred.predicted_percent <= 60) {
      reason = "Moderate availability, some spots available";
    } else {
      reason = "Best available option in the time range";
    }

    bestTimes.push({
      time: pred.time,
      predicted_status: pred.predicted_status,
      predicted_percent: pred.predicted_percent,
      reason,
    });
  }

  return bestTimes;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: PredictionRequest = await req.json();
    const { lot_id, permit_type, time_horizon = 4 } = body;

    // Validate required fields
    if (!lot_id) {
      return new Response(
        JSON.stringify({ error: "lot_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate time_horizon (max 24 hours)
    const validatedHorizon = Math.min(Math.max(1, time_horizon), 24);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify lot exists
    const { data: lot, error: lotError } = await supabase
      .from("lots")
      .select("id, name, total_spaces")
      .eq("id", lot_id)
      .single();

    if (lotError || !lot) {
      return new Response(
        JSON.stringify({ error: `Lot not found: ${lot_id}` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get current lot status
    const { data: currentStatus } = await supabase
      .from("lot_status")
      .select("status, occupancy_percent, confidence, trend, is_closed")
      .eq("lot_id", lot_id)
      .single();

    // Check for existing predictions in the database
    const now = new Date();
    const endTime = new Date(now.getTime() + validatedHorizon * 60 * 60 * 1000);

    const { data: existingPredictions } = await supabase
      .from("lot_predictions")
      .select("predicted_for, predicted_status, predicted_percent, confidence")
      .eq("lot_id", lot_id)
      .gte("predicted_for", now.toISOString())
      .lte("predicted_for", endTime.toISOString())
      .order("predicted_for", { ascending: true });

    // Use existing predictions or generate new ones
    let predictions: HourlyPrediction[] = [];

    if (existingPredictions && existingPredictions.length > 0) {
      // Use predictions from database
      predictions = existingPredictions.map((p) => ({
        time: p.predicted_for,
        predicted_status: p.predicted_status,
        predicted_percent: p.predicted_percent,
        confidence: p.confidence,
      }));
    } else {
      // Generate predictions based on patterns
      const currentPercent = currentStatus?.occupancy_percent ?? 50;
      const trend = currentStatus?.trend ?? 0;

      for (let i = 0; i <= validatedHorizon; i++) {
        const predictionTime = new Date(now.getTime() + i * 60 * 60 * 1000);
        const hour = predictionTime.getHours();
        const dayOfWeek = predictionTime.getDay();

        const prediction = calculatePrediction(
          hour,
          dayOfWeek,
          currentPercent,
          trend
        );

        predictions.push({
          time: predictionTime.toISOString(),
          predicted_status: prediction.status,
          predicted_percent: prediction.percent,
          confidence: prediction.confidence,
        });
      }
    }

    // Check if permit is valid for this lot (if permit_type provided)
    let permitValid = true;
    if (permit_type) {
      const { data: permitCheck } = await supabase.rpc("is_permit_valid", {
        p_permit_type: permit_type,
        p_lot_id: lot_id,
        p_check_time: now.toISOString(),
      });
      permitValid = permitCheck ?? false;
    }

    // Find best times to arrive
    const bestTimes = findBestTimes(predictions);

    // Build response
    const result: PredictionResult = {
      lot_id,
      predictions,
      best_times: bestTimes,
      current_status: currentStatus
        ? {
            status: currentStatus.status,
            occupancy_percent: currentStatus.occupancy_percent,
            confidence: currentStatus.confidence,
            trend: currentStatus.trend,
            is_closed: currentStatus.is_closed,
          }
        : null,
    };

    // Add permit validity warning if applicable
    const response = {
      ...result,
      permit_type: permit_type || null,
      permit_valid: permitValid,
      warning: !permitValid
        ? `Your ${permit_type} permit may not be valid for lot ${lot_id} at the current time`
        : null,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-predictions:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
