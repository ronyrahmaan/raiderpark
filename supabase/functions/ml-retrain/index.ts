/**
 * Supabase Edge Function: ml-retrain
 *
 * Automatic ML Model Retraining
 * - Runs weekly via pg_cron or external scheduler
 * - Collects training data from reports
 * - Updates model weights in database
 * - No Python required - pure TypeScript training
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL_VERSION = "1.1.0";

// ============================================================
// TYPES
// ============================================================

interface TrainingData {
  lot_id: string;
  hour: number;
  day_of_week: number;
  month: number;
  is_weekend: boolean;
  occupancy_percent: number;
  has_event: boolean;
  event_type: string | null;
}

interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: TreeNode | number;
  rightChild: TreeNode | number;
}

interface TrainedModel {
  trees: TreeNode[];
  learningRate: number;
  baseScore: number;
  featureImportance: Record<string, number>;
}

interface TrainingMetrics {
  totalSamples: number;
  trainingSamples: number;
  validationSamples: number;
  mae: number;
  rmse: number;
  accuracy_within_10: number;
  accuracy_within_20: number;
  trainedAt: string;
}

// ============================================================
// DATA COLLECTION
// ============================================================

async function collectTrainingData(
  supabase: ReturnType<typeof createClient>,
  daysBack: number = 30
): Promise<TrainingData[]> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Get reports with occupancy data
  const { data: reports, error } = await supabase
    .from("reports")
    .select("lot_id, occupancy_percent, created_at")
    .not("occupancy_percent", "is", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error || !reports) {
    console.error("Failed to fetch reports:", error);
    return [];
  }

  // Get events for the same period
  const { data: events } = await supabase
    .from("events")
    .select("starts_at, ends_at, event_type, affected_lots")
    .gte("ends_at", since.toISOString());

  // Transform to training data
  const trainingData: TrainingData[] = reports.map((report) => {
    const date = new Date(report.created_at);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const month = date.getMonth() + 1;

    // Check if there was an event at this time for this lot
    const activeEvent = events?.find((e) => {
      const start = new Date(e.starts_at);
      const end = new Date(e.ends_at);
      const isActive = date >= start && date <= end;
      const affectsLot =
        !e.affected_lots || e.affected_lots.includes(report.lot_id);
      return isActive && affectsLot;
    });

    return {
      lot_id: report.lot_id,
      hour,
      day_of_week: dayOfWeek,
      month,
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      occupancy_percent: report.occupancy_percent,
      has_event: !!activeEvent,
      event_type: activeEvent?.event_type || null,
    };
  });

  return trainingData;
}

// ============================================================
// FEATURE EXTRACTION
// ============================================================

function extractFeatures(data: TrainingData): number[] {
  return [
    data.hour,
    data.day_of_week,
    data.month,
    data.is_weekend ? 1 : 0,
    data.has_event ? 1 : 0,
    data.event_type === "football" ? 1 : 0,
    data.event_type === "basketball" ? 1 : 0,
    data.event_type === "graduation" ? 1 : 0,
    // Hour cyclical
    Math.sin((2 * Math.PI * data.hour) / 24),
    Math.cos((2 * Math.PI * data.hour) / 24),
    // Day cyclical
    Math.sin((2 * Math.PI * data.day_of_week) / 7),
    Math.cos((2 * Math.PI * data.day_of_week) / 7),
  ];
}

const FEATURE_NAMES = [
  "hour",
  "day_of_week",
  "month",
  "is_weekend",
  "has_event",
  "is_football",
  "is_basketball",
  "is_graduation",
  "hour_sin",
  "hour_cos",
  "day_sin",
  "day_cos",
];

// ============================================================
// SIMPLE GRADIENT BOOSTING TRAINER
// ============================================================

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length;
}

function findBestSplit(
  X: number[][],
  residuals: number[],
  featureIndex: number
): { threshold: number; gain: number } {
  const values = X.map((row) => row[featureIndex]);
  const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

  let bestThreshold = uniqueValues[0];
  let bestGain = -Infinity;

  for (let i = 0; i < uniqueValues.length - 1; i++) {
    const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    for (let j = 0; j < X.length; j++) {
      if (X[j][featureIndex] <= threshold) {
        leftIndices.push(j);
      } else {
        rightIndices.push(j);
      }
    }

    if (leftIndices.length === 0 || rightIndices.length === 0) continue;

    const leftResiduals = leftIndices.map((i) => residuals[i]);
    const rightResiduals = rightIndices.map((i) => residuals[i]);

    // Variance reduction
    const totalVar = variance(residuals);
    const leftVar = variance(leftResiduals);
    const rightVar = variance(rightResiduals);

    const gain =
      totalVar -
      (leftIndices.length / X.length) * leftVar -
      (rightIndices.length / X.length) * rightVar;

    if (gain > bestGain) {
      bestGain = gain;
      bestThreshold = threshold;
    }
  }

  return { threshold: bestThreshold, gain: bestGain };
}

function buildTree(
  X: number[][],
  residuals: number[],
  depth: number = 0,
  maxDepth: number = 4
): TreeNode | number {
  // Base case: max depth or too few samples
  if (depth >= maxDepth || X.length < 10) {
    return mean(residuals);
  }

  // Find best split across all features
  let bestFeature = 0;
  let bestThreshold = 0;
  let bestGain = -Infinity;

  for (let f = 0; f < X[0].length; f++) {
    const { threshold, gain } = findBestSplit(X, residuals, f);
    if (gain > bestGain) {
      bestGain = gain;
      bestFeature = f;
      bestThreshold = threshold;
    }
  }

  // If no good split found, return leaf
  if (bestGain <= 0) {
    return mean(residuals);
  }

  // Split data
  const leftX: number[][] = [];
  const leftR: number[] = [];
  const rightX: number[][] = [];
  const rightR: number[] = [];

  for (let i = 0; i < X.length; i++) {
    if (X[i][bestFeature] <= bestThreshold) {
      leftX.push(X[i]);
      leftR.push(residuals[i]);
    } else {
      rightX.push(X[i]);
      rightR.push(residuals[i]);
    }
  }

  return {
    featureIndex: bestFeature,
    threshold: bestThreshold,
    leftChild: buildTree(leftX, leftR, depth + 1, maxDepth),
    rightChild: buildTree(rightX, rightR, depth + 1, maxDepth),
  };
}

function predictTree(node: TreeNode | number, features: number[]): number {
  if (typeof node === "number") return node;

  if (features[node.featureIndex] <= node.threshold) {
    return predictTree(node.leftChild, features);
  } else {
    return predictTree(node.rightChild, features);
  }
}

function trainGradientBoosting(
  X: number[][],
  y: number[],
  numTrees: number = 10,
  learningRate: number = 0.1,
  maxDepth: number = 4
): TrainedModel {
  const baseScore = mean(y);
  const trees: TreeNode[] = [];

  // Initialize predictions
  let predictions = new Array(y.length).fill(baseScore);

  for (let t = 0; t < numTrees; t++) {
    // Calculate residuals
    const residuals = y.map((actual, i) => actual - predictions[i]);

    // Build tree on residuals
    const tree = buildTree(X, residuals, 0, maxDepth);

    if (typeof tree === "number") {
      // Tree is just a leaf, not useful
      continue;
    }

    trees.push(tree);

    // Update predictions
    for (let i = 0; i < X.length; i++) {
      predictions[i] += learningRate * predictTree(tree, X[i]);
    }
  }

  // Calculate feature importance (simple: count splits)
  const featureImportance: Record<string, number> = {};
  FEATURE_NAMES.forEach((name) => (featureImportance[name] = 0));

  function countSplits(node: TreeNode | number) {
    if (typeof node === "number") return;
    featureImportance[FEATURE_NAMES[node.featureIndex]]++;
    countSplits(node.leftChild);
    countSplits(node.rightChild);
  }

  trees.forEach(countSplits);

  // Normalize importance
  const total = Object.values(featureImportance).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(featureImportance).forEach((k) => {
      featureImportance[k] = Math.round((featureImportance[k] / total) * 100);
    });
  }

  return {
    trees,
    learningRate,
    baseScore,
    featureImportance,
  };
}

// ============================================================
// MODEL EVALUATION
// ============================================================

function evaluateModel(
  model: TrainedModel,
  X: number[][],
  y: number[]
): TrainingMetrics {
  const predictions = X.map((features) => {
    let pred = model.baseScore;
    for (const tree of model.trees) {
      pred += model.learningRate * predictTree(tree, features);
    }
    return Math.max(0, Math.min(100, pred));
  });

  // Calculate metrics
  const errors = y.map((actual, i) => Math.abs(actual - predictions[i]));
  const squaredErrors = y.map((actual, i) => (actual - predictions[i]) ** 2);

  const mae = mean(errors);
  const rmse = Math.sqrt(mean(squaredErrors));
  const within10 = errors.filter((e) => e <= 10).length / errors.length;
  const within20 = errors.filter((e) => e <= 20).length / errors.length;

  return {
    totalSamples: y.length,
    trainingSamples: Math.floor(y.length * 0.8),
    validationSamples: Math.ceil(y.length * 0.2),
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    accuracy_within_10: Math.round(within10 * 100),
    accuracy_within_20: Math.round(within20 * 100),
    trainedAt: new Date().toISOString(),
  };
}

// ============================================================
// SAVE MODEL
// ============================================================

async function saveModel(
  supabase: ReturnType<typeof createClient>,
  model: TrainedModel,
  metrics: TrainingMetrics,
  lotId?: string
): Promise<boolean> {
  try {
    // Deactivate previous models
    await supabase
      .from("ml_models")
      .update({ is_active: false })
      .eq("model_type", "gradient_boosting")
      .eq("is_active", true);

    // Insert new model
    const { error } = await supabase.from("ml_models").insert({
      model_type: "gradient_boosting",
      version: MODEL_VERSION,
      lot_id: lotId || null,
      model_weights: {
        version: MODEL_VERSION,
        trees: model.trees,
        learningRate: model.learningRate,
        baseScore: model.baseScore,
        featureImportance: model.featureImportance,
      },
      feature_names: FEATURE_NAMES,
      training_metrics: metrics,
      is_active: true,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to save model:", error);
    return false;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    console.log("[ML Retrain] Starting automatic model retraining...");

    // Step 1: Collect training data
    console.log("[ML Retrain] Collecting training data...");
    const trainingData = await collectTrainingData(supabase, 30);

    if (trainingData.length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Not enough training data. Need 50+ samples, got ${trainingData.length}`,
          samples: trainingData.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[ML Retrain] Collected ${trainingData.length} samples`);

    // Step 2: Prepare features and labels
    const X = trainingData.map(extractFeatures);
    const y = trainingData.map((d) => d.occupancy_percent);

    // Step 3: Split into train/validation
    const splitIdx = Math.floor(X.length * 0.8);
    const X_train = X.slice(0, splitIdx);
    const y_train = y.slice(0, splitIdx);
    const X_val = X.slice(splitIdx);
    const y_val = y.slice(splitIdx);

    // Step 4: Train model
    console.log("[ML Retrain] Training gradient boosting model...");
    const model = trainGradientBoosting(X_train, y_train, 10, 0.1, 4);

    console.log(`[ML Retrain] Trained ${model.trees.length} trees`);

    // Step 5: Evaluate
    console.log("[ML Retrain] Evaluating model...");
    const metrics = evaluateModel(model, X_val, y_val);

    console.log(`[ML Retrain] MAE: ${metrics.mae}, Accuracy@10: ${metrics.accuracy_within_10}%`);

    // Step 6: Save model
    console.log("[ML Retrain] Saving model to database...");
    const saved = await saveModel(supabase, model, metrics);

    // Step 7: Update lot training stats
    const lotStats = new Map<string, { count: number; avgOcc: number }>();
    trainingData.forEach((d) => {
      const existing = lotStats.get(d.lot_id) || { count: 0, avgOcc: 0 };
      existing.count++;
      existing.avgOcc =
        (existing.avgOcc * (existing.count - 1) + d.occupancy_percent) /
        existing.count;
      lotStats.set(d.lot_id, existing);
    });

    for (const [lotId, stats] of lotStats) {
      await supabase
        .from("lots")
        .update({
          ml_training_stats: {
            total_reports: stats.count,
            avg_occupancy: Math.round(stats.avgOcc),
            peak_hour: 10, // Would calculate from data
            last_trained: new Date().toISOString(),
          },
        })
        .eq("id", lotId);
    }

    return new Response(
      JSON.stringify({
        success: saved,
        model_version: MODEL_VERSION,
        training_samples: trainingData.length,
        metrics,
        feature_importance: model.featureImportance,
        message: saved
          ? "Model trained and saved successfully"
          : "Training completed but save failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ML Retrain] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Training failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
