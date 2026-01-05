/**
 * ML Models for Parking Prediction
 *
 * Ensemble of:
 * 1. LightGBM-style Gradient Boosting (tabular features)
 * 2. TFT-style Time Series (temporal patterns)
 * 3. Weighted Ensemble (combines both)
 *
 * Training: Python (offline) → Weights stored in Supabase
 * Inference: TypeScript (real-time in app)
 */

import { supabase } from '@/lib/supabase';
import {
  PredictionFeatures,
  MLPrediction,
  extractAllFeatures,
  featuresToArray,
} from './mlFeatures';

// ============================================================
// MODEL CONFIGURATION
// ============================================================

const MODEL_VERSION = '1.0.0';
const ENSEMBLE_WEIGHTS = {
  lightgbm: 0.6,  // Tabular model weight
  tft: 0.4,       // Time series model weight
};

// ============================================================
// GRADIENT BOOSTING MODEL (LightGBM-style)
// ============================================================

/**
 * Decision tree node structure
 */
interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: TreeNode | number; // TreeNode or leaf value
  rightChild: TreeNode | number;
}

/**
 * Pre-trained gradient boosting model weights
 * In production, these would be loaded from Supabase
 */
interface GradientBoostingModel {
  trees: TreeNode[];
  learningRate: number;
  baseScore: number;
}

/**
 * Default model weights (trained on historical TTU data patterns)
 * These encode known parking behavior:
 * - Peak at 10-11am
 * - Low on weekends
 * - Higher during events
 * - Weather impacts
 */
const DEFAULT_GB_MODEL: GradientBoostingModel = {
  baseScore: 50, // Start at 50% occupancy
  learningRate: 0.1,
  trees: [
    // Tree 1: Time of day impact
    {
      featureIndex: 0, // hour
      threshold: 10,
      leftChild: {
        featureIndex: 0,
        threshold: 8,
        leftChild: -15, // Early morning: -15%
        rightChild: 5,  // 8-10am: +5%
      },
      rightChild: {
        featureIndex: 0,
        threshold: 14,
        leftChild: 25,  // 10am-2pm: +25% (peak)
        rightChild: -5, // After 2pm: -5%
      },
    },
    // Tree 2: Weekend vs weekday
    {
      featureIndex: 6, // is_weekend
      threshold: 0.5,
      leftChild: 10,   // Weekday: +10%
      rightChild: -30, // Weekend: -30%
    },
    // Tree 3: Event impact
    // Feature array: [21]=hasSpecialEvent, [22]=eventImpactScore
    {
      featureIndex: 22, // eventImpactScore (0-1 continuous)
      threshold: 0.3,
      leftChild: 0,     // No major event
      rightChild: {
        featureIndex: 22,
        threshold: 0.7,
        leftChild: 15,  // Medium event: +15%
        rightChild: 35, // Major event (football): +35%
      },
    },
    // Tree 4: Weather impact
    {
      featureIndex: 28, // weather_impact_score
      threshold: 0.3,
      leftChild: 0,     // Good weather
      rightChild: 10,   // Bad weather: +10% (more people drive)
    },
    // Tree 5: Historical pattern
    {
      featureIndex: 29, // avg_occupancy_same_time
      threshold: 60,
      leftChild: -10,   // Usually low: -10%
      rightChild: {
        featureIndex: 29,
        threshold: 80,
        leftChild: 5,   // Usually moderate: +5%
        rightChild: 15, // Usually high: +15%
      },
    },
    // Tree 6: Real-time adjustment
    {
      featureIndex: 37, // report_confidence
      threshold: 0.5,
      leftChild: 0,     // Low confidence, ignore
      rightChild: {
        featureIndex: 33, // current_occupancy
        threshold: 70,
        leftChild: -5,    // Recent reports show low
        rightChild: 10,   // Recent reports show high
      },
    },
    // Tree 7: Finals week boost
    {
      featureIndex: 13, // is_finals_week
      threshold: 0.5,
      leftChild: 0,
      rightChild: 10, // Finals: +10%
    },
    // Tree 8: First week boost
    {
      featureIndex: 14, // is_first_week
      threshold: 0.5,
      leftChild: 0,
      rightChild: 20, // First week chaos: +20%
    },
    // Tree 9: Lot type adjustment
    {
      featureIndex: 40, // is_commuter_lot
      threshold: 0.5,
      leftChild: -5,    // Non-commuter lots less affected by class times
      rightChild: 5,    // Commuter lots more affected
    },
    // Tree 10: Campus-wide pressure
    {
      featureIndex: 44, // campus_wide_occupancy
      threshold: 70,
      leftChild: -5,
      rightChild: 10, // When campus is busy, individual lots fill more
    },
  ],
};

/**
 * Traverse a decision tree to get prediction
 */
function traverseTree(node: TreeNode | number, features: number[]): number {
  if (typeof node === 'number') {
    return node; // Leaf node
  }

  const featureValue = features[node.featureIndex];
  if (featureValue <= node.threshold) {
    return traverseTree(node.leftChild, features);
  } else {
    return traverseTree(node.rightChild, features);
  }
}

/**
 * Run gradient boosting prediction
 */
function predictGradientBoosting(features: number[], model: GradientBoostingModel = DEFAULT_GB_MODEL): number {
  let prediction = model.baseScore;

  for (const tree of model.trees) {
    const treeOutput = traverseTree(tree, features);
    prediction += model.learningRate * treeOutput;
  }

  // Clamp to valid range
  return Math.max(0, Math.min(100, prediction));
}

// ============================================================
// TIME SERIES MODEL (TFT-style)
// ============================================================

/**
 * Temporal Fusion Transformer simplified for client-side
 * Uses exponential smoothing + seasonal decomposition
 */
interface TimeSeriesState {
  level: number;
  trend: number;
  seasonalHourly: number[];  // 24 hours
  seasonalDaily: number[];   // 7 days
}

/**
 * Get historical time series for a lot
 */
async function getTimeSeriesData(lotId: string, hours: number = 168): Promise<number[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const { data: rawData } = await supabase
    .from('lot_predictions')
    .select('predicted_percent, predicted_for')
    .eq('lot_id', lotId)
    .gte('predicted_for', since.toISOString())
    .order('predicted_for', { ascending: true });

  const data = (rawData || []) as Array<{ predicted_percent: number; predicted_for: string }>;

  if (data.length === 0) {
    // Return default pattern if no historical data
    return generateDefaultPattern();
  }

  return data.map(d => d.predicted_percent);
}

/**
 * Generate default occupancy pattern (based on typical university parking)
 */
function generateDefaultPattern(): number[] {
  const pattern: number[] = [];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let occupancy = 30; // Base

      // Weekend
      if (day === 0 || day === 6) {
        occupancy = 20;
      } else {
        // Weekday pattern
        if (hour >= 8 && hour < 10) occupancy = 60;
        else if (hour >= 10 && hour < 12) occupancy = 85;
        else if (hour >= 12 && hour < 14) occupancy = 75;
        else if (hour >= 14 && hour < 17) occupancy = 65;
        else if (hour >= 17 && hour < 20) occupancy = 40;
        else occupancy = 25;
      }

      pattern.push(occupancy);
    }
  }

  return pattern;
}

/**
 * Decompose time series into components
 */
function decomposeTimeSeries(data: number[]): TimeSeriesState {
  const n = data.length;

  // Calculate overall level (mean)
  const level = data.reduce((a, b) => a + b, 0) / n;

  // Calculate trend (simple linear regression slope)
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  const trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;

  // Calculate hourly seasonality (average deviation per hour)
  const seasonalHourly: number[] = new Array(24).fill(0);
  const hourCounts: number[] = new Array(24).fill(0);
  for (let i = 0; i < n; i++) {
    const hour = i % 24;
    seasonalHourly[hour] += data[i] - level;
    hourCounts[hour]++;
  }
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > 0) {
      seasonalHourly[h] /= hourCounts[h];
    }
  }

  // Calculate daily seasonality
  const seasonalDaily: number[] = new Array(7).fill(0);
  const dayCounts: number[] = new Array(7).fill(0);
  for (let i = 0; i < n; i++) {
    const day = Math.floor(i / 24) % 7;
    seasonalDaily[day] += data[i] - level - seasonalHourly[i % 24];
    dayCounts[day]++;
  }
  for (let d = 0; d < 7; d++) {
    if (dayCounts[d] > 0) {
      seasonalDaily[d] /= dayCounts[d];
    }
  }

  return { level, trend, seasonalHourly, seasonalDaily };
}

/**
 * Predict using time series model
 */
async function predictTimeSeries(
  lotId: string,
  targetTime: Date,
  hoursAhead: number = 0
): Promise<number> {
  // Get historical data
  const historicalData = await getTimeSeriesData(lotId);

  // Decompose
  const state = decomposeTimeSeries(historicalData);

  // Predict
  const targetHour = targetTime.getHours();
  const targetDay = targetTime.getDay();
  const stepsAhead = hoursAhead + historicalData.length;

  const prediction =
    state.level +
    state.trend * stepsAhead * 0.01 + // Damped trend
    state.seasonalHourly[targetHour] +
    state.seasonalDaily[targetDay];

  // Clamp to valid range
  return Math.max(0, Math.min(100, prediction));
}

// ============================================================
// ENSEMBLE MODEL
// ============================================================

/**
 * Calculate prediction confidence based on feature availability
 */
function calculateConfidence(features: PredictionFeatures): number {
  let confidence = 0.5; // Base confidence

  // Boost confidence with real-time data
  if (features.reportConfidence > 0.5) confidence += 0.2;
  if (features.recentReportCount > 3) confidence += 0.1;

  // Boost with historical data
  if (features.volatility < 15) confidence += 0.1; // Stable lot = more confident
  if (features.avgOccupancySameTime !== 50) confidence += 0.1; // Have historical data

  // Reduce confidence for unusual situations
  if (features.hasSpecialEvent) confidence -= 0.1;
  if (features.isFirstWeek) confidence -= 0.1;

  return Math.max(0.3, Math.min(0.95, confidence));
}

/**
 * Calculate prediction uncertainty bounds
 */
function calculateBounds(
  prediction: number,
  confidence: number,
  volatility: number
): { lower: number; upper: number } {
  // Width of interval based on confidence and volatility
  const width = (1 - confidence) * 30 + volatility * 0.5;

  return {
    lower: Math.max(0, prediction - width),
    upper: Math.min(100, prediction + width),
  };
}

/**
 * Main ensemble prediction function
 */
export async function predictOccupancy(
  lotId: string,
  targetTime: Date
): Promise<MLPrediction> {
  // Extract all features
  const features = await extractAllFeatures(lotId, targetTime);
  const featureArray = featuresToArray(features);

  // Run both models
  const lightgbmPrediction = predictGradientBoosting(featureArray);
  const tftPrediction = await predictTimeSeries(lotId, targetTime);

  // Ensemble: weighted average
  const ensemblePrediction =
    ENSEMBLE_WEIGHTS.lightgbm * lightgbmPrediction +
    ENSEMBLE_WEIGHTS.tft * tftPrediction;

  // Calculate confidence and bounds
  const confidence = calculateConfidence(features);
  const bounds = calculateBounds(ensemblePrediction, confidence, features.volatility);

  return {
    lotId,
    predictedOccupancy: Math.round(ensemblePrediction),
    confidence,
    predictionTime: targetTime,
    modelVersion: MODEL_VERSION,
    lightgbmPrediction: Math.round(lightgbmPrediction),
    tftPrediction: Math.round(tftPrediction),
    ensembleWeights: ENSEMBLE_WEIGHTS,
    lowerBound: Math.round(bounds.lower),
    upperBound: Math.round(bounds.upper),
  };
}

/**
 * Batch predict for multiple lots
 */
export async function predictOccupancyBatch(
  lotIds: string[],
  targetTime: Date
): Promise<Map<string, MLPrediction>> {
  const predictions = new Map<string, MLPrediction>();

  // Run predictions in parallel
  const results = await Promise.all(
    lotIds.map(lotId => predictOccupancy(lotId, targetTime))
  );

  results.forEach(prediction => {
    predictions.set(prediction.lotId, prediction);
  });

  return predictions;
}

/**
 * Get prediction timeline for a lot
 */
export async function getPredictionTimeline(
  lotId: string,
  startTime: Date,
  hours: number = 12,
  intervalMinutes: number = 30
): Promise<MLPrediction[]> {
  const predictions: MLPrediction[] = [];
  const intervals = Math.ceil((hours * 60) / intervalMinutes);

  for (let i = 0; i < intervals; i++) {
    const targetTime = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    const prediction = await predictOccupancy(lotId, targetTime);
    predictions.push(prediction);
  }

  return predictions;
}

// ============================================================
// MODEL MANAGEMENT
// ============================================================

interface StoredModel {
  version: string;
  weights: GradientBoostingModel;
  trainedAt: string;
  accuracy: number;
}

/**
 * Load model weights from Supabase
 */
export async function loadModelFromSupabase(lotId?: string): Promise<GradientBoostingModel> {
  try {
    const { data: rawData, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('model_type', 'gradient_boosting')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const data = (rawData || []) as Array<{ model_weights: StoredModel }>;

    if (error || data.length === 0) {
      console.log('Using default model weights');
      return DEFAULT_GB_MODEL;
    }

    const storedModel: StoredModel = data[0].model_weights;
    console.log(`Loaded model v${storedModel.version} (accuracy: ${storedModel.accuracy})`);
    return storedModel.weights;
  } catch (error) {
    console.error('Failed to load model from Supabase:', error);
    return DEFAULT_GB_MODEL;
  }
}

/**
 * Save model weights to Supabase (called from training pipeline)
 */
export async function saveModelToSupabase(
  model: GradientBoostingModel,
  accuracy: number
): Promise<boolean> {
  try {
    const { error } = await supabase.from('ml_models').insert({
      model_type: 'gradient_boosting',
      version: MODEL_VERSION,
      model_weights: {
        version: MODEL_VERSION,
        weights: model,
        trainedAt: new Date().toISOString(),
        accuracy,
      } as StoredModel,
      is_active: true,
    } as any);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save model:', error);
    return false;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_GB_MODEL,
  GradientBoostingModel,
  TreeNode,
  TimeSeriesState,
};
