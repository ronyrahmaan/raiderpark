// Supabase Edge Function: update-lot-status
// Aggregates reports and updates lot status
// Called via cron or after report submission
// Aggregates recent reports and updates lot_status table

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Type definitions
interface UpdateRequest {
  lot_id?: string; // Optional: update specific lot, or all lots if not provided
  force?: boolean; // Force update even if recent data exists
}

interface LotStatusUpdate {
  lot_id: string;
  status: string;
  occupancy_percent: number;
  confidence: string;
  trend: number;
  report_count: number;
  is_closed: boolean;
}

interface UpdateResult {
  updated_lots: LotStatusUpdate[];
  total_updated: number;
  skipped: number;
  errors: string[];
}

// Map percentage to status
function percentToStatus(percent: number): string {
  if (percent <= 20) return "empty";
  if (percent <= 40) return "light";
  if (percent <= 60) return "moderate";
  if (percent <= 80) return "busy";
  return "full";
}

// Determine confidence level based on report count and recency
function calculateConfidence(
  reportCount: number,
  mostRecentReportAge: number // in minutes
): string {
  if (reportCount === 0) return "low";
  if (reportCount === 1 && mostRecentReportAge > 15) return "low";
  if (reportCount <= 2) return "low";
  if (reportCount <= 5) return "medium";
  if (reportCount <= 10 && mostRecentReportAge < 10) return "high";
  if (reportCount > 10 && mostRecentReportAge < 5) return "verified";
  return "medium";
}

// Calculate weighted average based on report age and user trust level
function calculateWeightedOccupancy(
  reports: Array<{
    occupancy_percent: number;
    created_at: string;
    reporter_level?: string;
    upvotes: number;
    downvotes: number;
  }>
): number {
  if (reports.length === 0) return 50; // Default to moderate

  let totalWeight = 0;
  let weightedSum = 0;

  const now = Date.now();

  for (const report of reports) {
    const reportAge = (now - new Date(report.created_at).getTime()) / 1000 / 60; // in minutes

    // Base weight decreases with age (exponential decay)
    let weight = Math.exp(-reportAge / 30); // 30-minute half-life

    // Boost weight for trusted reporters
    const trustMultiplier: Record<string, number> = {
      newbie: 1.0,
      rookie: 1.1,
      regular: 1.3,
      veteran: 1.5,
      legend: 1.7,
      mvp: 1.9,
      hall_of_fame: 2.0,
    };
    weight *= trustMultiplier[report.reporter_level || "newbie"] || 1.0;

    // Adjust weight based on votes
    const netVotes = report.upvotes - report.downvotes;
    if (netVotes > 0) {
      weight *= 1 + netVotes * 0.1; // 10% boost per net upvote
    } else if (netVotes < 0) {
      weight *= Math.max(0.5, 1 + netVotes * 0.15); // Reduce weight for downvoted
    }

    weightedSum += report.occupancy_percent * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 50;
  return Math.round(weightedSum / totalWeight);
}

// Calculate trend based on recent vs older reports
function calculateTrend(
  reports: Array<{ occupancy_percent: number; created_at: string }>
): number {
  if (reports.length < 2) return 0;

  // Sort by time (newest first)
  const sorted = [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Compare recent reports (last 10 min) with older reports
  const now = Date.now();
  const recentCutoff = now - 10 * 60 * 1000; // 10 minutes

  const recentReports = sorted.filter(
    (r) => new Date(r.created_at).getTime() > recentCutoff
  );
  const olderReports = sorted.filter(
    (r) => new Date(r.created_at).getTime() <= recentCutoff
  );

  if (recentReports.length === 0 || olderReports.length === 0) return 0;

  const recentAvg =
    recentReports.reduce((sum, r) => sum + r.occupancy_percent, 0) /
    recentReports.length;
  const olderAvg =
    olderReports.reduce((sum, r) => sum + r.occupancy_percent, 0) /
    olderReports.length;

  const diff = recentAvg - olderAvg;

  if (diff > 10) return 1; // Filling up
  if (diff < -10) return -1; // Emptying
  return 0; // Stable
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Accept both POST and GET (for cron triggers)
    const body: UpdateRequest =
      req.method === "POST" ? await req.json() : {};
    const { lot_id, force = false } = body;

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

    // Get lots to update
    let lotsQuery = supabase.from("lots").select("id, name, total_spaces");
    if (lot_id) {
      lotsQuery = lotsQuery.eq("id", lot_id);
    }

    const { data: lots, error: lotsError } = await lotsQuery;

    if (lotsError) {
      throw new Error(`Failed to fetch lots: ${lotsError.message}`);
    }

    if (!lots || lots.length === 0) {
      return new Response(
        JSON.stringify({
          error: lot_id ? `Lot not found: ${lot_id}` : "No lots found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result: UpdateResult = {
      updated_lots: [],
      total_updated: 0,
      skipped: 0,
      errors: [],
    };

    const now = new Date();
    const expiryTime = now.toISOString();

    // Process each lot
    for (const lot of lots) {
      try {
        // Check if we need to update (skip if recently updated unless forced)
        if (!force) {
          const { data: currentStatus } = await supabase
            .from("lot_status")
            .select("updated_at")
            .eq("lot_id", lot.id)
            .single();

          if (currentStatus) {
            const lastUpdate = new Date(currentStatus.updated_at);
            const minutesSinceUpdate =
              (now.getTime() - lastUpdate.getTime()) / 1000 / 60;

            // Skip if updated within the last 2 minutes
            if (minutesSinceUpdate < 2) {
              result.skipped++;
              continue;
            }
          }
        }

        // Get active reports for this lot (not expired)
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select(
            `
            id,
            occupancy_percent,
            occupancy_status,
            report_type,
            created_at,
            upvotes,
            downvotes,
            users!inner (reporter_level)
          `
          )
          .eq("lot_id", lot.id)
          .eq("report_type", "occupancy")
          .gt("expires_at", expiryTime)
          .order("created_at", { ascending: false })
          .limit(50);

        if (reportsError) {
          result.errors.push(`Error fetching reports for ${lot.id}: ${reportsError.message}`);
          continue;
        }

        // Check for closure reports
        const { data: closureReports } = await supabase
          .from("reports")
          .select("id, description, created_at")
          .eq("lot_id", lot.id)
          .eq("report_type", "closed")
          .gt("expires_at", expiryTime)
          .order("created_at", { ascending: false })
          .limit(5);

        const isClosed = closureReports && closureReports.length >= 2; // Need multiple reports to close

        // Transform reports for processing
        const processedReports = (reports || [])
          .filter((r) => r.occupancy_percent !== null)
          .map((r) => ({
            occupancy_percent: r.occupancy_percent,
            created_at: r.created_at,
            reporter_level: (r.users as { reporter_level?: string })?.reporter_level,
            upvotes: r.upvotes,
            downvotes: r.downvotes,
          }));

        // Calculate new status values
        const occupancyPercent = calculateWeightedOccupancy(processedReports);
        const status = isClosed ? "full" : percentToStatus(occupancyPercent);
        const trend = calculateTrend(processedReports);

        // Calculate most recent report age
        const mostRecentAge =
          processedReports.length > 0
            ? (now.getTime() - new Date(processedReports[0].created_at).getTime()) /
              1000 /
              60
            : 999;

        const confidence = calculateConfidence(processedReports.length, mostRecentAge);

        // Calculate estimated available spaces
        const estimatedSpaces = Math.round(
          lot.total_spaces * (1 - occupancyPercent / 100)
        );

        // Upsert lot status
        const { error: upsertError } = await supabase.from("lot_status").upsert(
          {
            lot_id: lot.id,
            status,
            occupancy_percent: occupancyPercent,
            estimated_spaces: estimatedSpaces,
            confidence,
            trend,
            report_count: processedReports.length,
            last_report_at:
              processedReports.length > 0 ? processedReports[0].created_at : null,
            is_closed: isClosed,
            closure_reason: isClosed
              ? closureReports?.[0]?.description || "Reported closed by users"
              : null,
            updated_at: now.toISOString(),
          },
          { onConflict: "lot_id" }
        );

        if (upsertError) {
          result.errors.push(`Error updating ${lot.id}: ${upsertError.message}`);
          continue;
        }

        // Add to results
        result.updated_lots.push({
          lot_id: lot.id,
          status,
          occupancy_percent: occupancyPercent,
          confidence,
          trend,
          report_count: processedReports.length,
          is_closed: isClosed,
        });
        result.total_updated++;
      } catch (err) {
        result.errors.push(
          `Error processing ${lot.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // Clean up expired reports (optional maintenance task)
    // Only run this occasionally to avoid performance issues
    if (Math.random() < 0.1) {
      // 10% chance on each run
      await supabase.from("reports").delete().lt("expires_at", expiryTime);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in update-lot-status:", error);

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
