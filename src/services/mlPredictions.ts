/**
 * ML Predictions Service
 *
 * Client-side interface to ML prediction system:
 * - Calls ml-predict Edge Function for server-side predictions
 * - Falls back to local ensemble model if server unavailable
 * - Caches predictions for performance
 *
 * Ensemble: LightGBM (tabular) + TFT (time series)
 */

import { supabase } from '@/lib/supabase';
import { predictOccupancy, predictOccupancyBatch } from './mlModels';
import { MLPrediction } from './mlFeatures';

// ============================================================
// TYPES
// ============================================================

export interface MLPredictionResponse {
  lotId: string;
  lotName: string;
  targetTime: Date;
  predictedOccupancy: number;
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high' | 'verified';
  lowerBound: number;
  upperBound: number;
  status: 'open' | 'busy' | 'filling' | 'full';
  chanceOfSpot: number;

  // Model components
  components: {
    lightgbm: number;
    tft: number;
    weights: { lightgbm: number; tft: number };
  };

  // Contributing factors
  factors: {
    time: number;      // Time of day impact
    event: number;     // Event impact
    weather: number;   // Weather impact
    historical: number; // Historical pattern
    realtime: number;  // Real-time reports
  };

  // Metadata
  modelVersion: string;
  source: 'server' | 'local';
  generatedAt: Date;
}

export interface DepartureRecommendation {
  recommendedDepartureTime: Date;
  arrivalTime: Date;
  targetLot: {
    id: string;
    name: string;
    predictedOccupancy: number;
    chanceOfSpot: number;
  };
  alternatives: Array<{
    id: string;
    name: string;
    predictedOccupancy: number;
    chanceOfSpot: number;
  }>;
  confidence: number;
  factors: MLPredictionResponse['factors'];
}

// ============================================================
// PREDICTION CACHE
// ============================================================

interface CacheEntry {
  prediction: MLPredictionResponse;
  expiresAt: number;
}

const predictionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(lotId: string, targetTime: Date): string {
  // Round to nearest 15 minutes for cache key
  const roundedTime = new Date(targetTime);
  roundedTime.setMinutes(Math.floor(roundedTime.getMinutes() / 15) * 15, 0, 0);
  return `${lotId}-${roundedTime.toISOString()}`;
}

function getCached(lotId: string, targetTime: Date): MLPredictionResponse | null {
  const key = getCacheKey(lotId, targetTime);
  const entry = predictionCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.prediction;
  }
  predictionCache.delete(key);
  return null;
}

function setCache(prediction: MLPredictionResponse): void {
  const key = getCacheKey(prediction.lotId, prediction.targetTime);
  predictionCache.set(key, {
    prediction,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// ============================================================
// SERVER-SIDE PREDICTION (Edge Function)
// ============================================================

async function predictFromServer(
  lotId: string,
  targetTime: Date,
  hoursAhead: number = 1
): Promise<MLPredictionResponse[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ml-predict', {
      body: {
        lot_id: lotId,
        target_time: targetTime.toISOString(),
        hours_ahead: hoursAhead,
        include_features: false,
      },
    });

    if (error) {
      console.warn('ML Edge Function error:', error);
      return null;
    }

    // Transform server response to our format
    return data.predictions.map((p: any) => ({
      lotId: p.lot_id,
      lotName: data.lot_name,
      targetTime: new Date(p.target_time),
      predictedOccupancy: p.predicted_occupancy,
      confidence: p.confidence,
      confidenceLevel: p.confidence_level,
      lowerBound: p.lower_bound,
      upperBound: p.upper_bound,
      status: p.status,
      chanceOfSpot: p.chance_of_spot,
      components: {
        lightgbm: p.model_components.lightgbm,
        tft: p.model_components.tft,
        weights: p.model_components.ensemble_weights,
      },
      factors: {
        time: p.factors.time_factor,
        event: p.factors.event_factor,
        weather: p.factors.weather_factor,
        historical: p.factors.historical_factor,
        realtime: p.factors.realtime_factor,
      },
      modelVersion: data.model_version,
      source: 'server' as const,
      generatedAt: new Date(data.generated_at),
    }));
  } catch (error) {
    console.warn('Failed to call ML Edge Function:', error);
    return null;
  }
}

// ============================================================
// LOCAL PREDICTION (Fallback)
// ============================================================

async function predictLocally(
  lotId: string,
  targetTime: Date
): Promise<MLPredictionResponse> {
  // Use local ML models
  const mlPrediction = await predictOccupancy(lotId, targetTime);

  // Get lot name
  const { data: lotRaw } = await supabase
    .from('lots')
    .select('name')
    .eq('id', lotId)
    .single();

  const lot = lotRaw as { name?: string } | null;

  return {
    lotId,
    lotName: lot?.name || lotId,
    targetTime,
    predictedOccupancy: mlPrediction.predictedOccupancy,
    confidence: mlPrediction.confidence,
    confidenceLevel: getConfidenceLevel(mlPrediction.confidence),
    lowerBound: mlPrediction.lowerBound,
    upperBound: mlPrediction.upperBound,
    status: getStatus(mlPrediction.predictedOccupancy),
    chanceOfSpot: getChanceOfSpot(mlPrediction.predictedOccupancy),
    components: {
      lightgbm: mlPrediction.lightgbmPrediction,
      tft: mlPrediction.tftPrediction,
      weights: mlPrediction.ensembleWeights,
    },
    factors: {
      time: 0,
      event: 0,
      weather: 0,
      historical: 0,
      realtime: 0,
    },
    modelVersion: mlPrediction.modelVersion,
    source: 'local',
    generatedAt: new Date(),
  };
}

function getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' | 'verified' {
  if (confidence >= 0.85) return 'verified';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

function getStatus(occupancy: number): 'open' | 'busy' | 'filling' | 'full' {
  if (occupancy >= 95) return 'full';
  if (occupancy >= 80) return 'filling';
  if (occupancy >= 60) return 'busy';
  return 'open';
}

function getChanceOfSpot(occupancy: number): number {
  if (occupancy >= 98) return 5;
  if (occupancy >= 95) return 15;
  if (occupancy >= 90) return 30;
  if (occupancy >= 85) return 50;
  if (occupancy >= 75) return 70;
  if (occupancy >= 60) return 85;
  return 95;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get ML prediction for a specific lot and time
 * Uses server-side prediction if available, falls back to local
 */
export async function getMLPrediction(
  lotId: string,
  targetTime: Date = new Date()
): Promise<MLPredictionResponse> {
  // Check cache first
  const cached = getCached(lotId, targetTime);
  if (cached) {
    return cached;
  }

  // Try server-side prediction
  const serverPredictions = await predictFromServer(lotId, targetTime, 1);
  if (serverPredictions && serverPredictions.length > 0) {
    const prediction = serverPredictions[0];
    setCache(prediction);
    return prediction;
  }

  // Fall back to local prediction
  const localPrediction = await predictLocally(lotId, targetTime);
  setCache(localPrediction);
  return localPrediction;
}

/**
 * Get prediction timeline for a lot
 */
export async function getMLPredictionTimeline(
  lotId: string,
  startTime: Date = new Date(),
  hours: number = 4
): Promise<MLPredictionResponse[]> {
  // Try server-side prediction (returns full timeline)
  const serverPredictions = await predictFromServer(lotId, startTime, hours);
  if (serverPredictions && serverPredictions.length > 0) {
    serverPredictions.forEach(setCache);
    return serverPredictions;
  }

  // Fall back to local predictions
  const predictions: MLPredictionResponse[] = [];
  const intervals = hours * 2; // 30-minute intervals

  for (let i = 0; i <= intervals; i++) {
    const targetTime = new Date(startTime.getTime() + i * 30 * 60 * 1000);
    const prediction = await predictLocally(lotId, targetTime);
    predictions.push(prediction);
    setCache(prediction);
  }

  return predictions;
}

/**
 * Get predictions for multiple lots at a specific time
 */
export async function getMLPredictionsForLots(
  lotIds: string[],
  targetTime: Date = new Date()
): Promise<Map<string, MLPredictionResponse>> {
  const results = new Map<string, MLPredictionResponse>();

  // Try to get from cache first
  const uncachedLotIds: string[] = [];
  for (const lotId of lotIds) {
    const cached = getCached(lotId, targetTime);
    if (cached) {
      results.set(lotId, cached);
    } else {
      uncachedLotIds.push(lotId);
    }
  }

  // Fetch uncached predictions in parallel
  if (uncachedLotIds.length > 0) {
    const predictions = await Promise.all(
      uncachedLotIds.map(lotId => getMLPrediction(lotId, targetTime))
    );
    predictions.forEach(p => {
      results.set(p.lotId, p);
    });
  }

  return results;
}

/**
 * Get departure recommendation for a target arrival time
 */
export async function getMLDepartureRecommendation(
  permitType: string,
  targetArrivalTime: Date,
  travelTimeMinutes: number = 15,
  destinationBuilding?: string
): Promise<DepartureRecommendation> {
  // Get valid lots for permit
  const { data: validLotsRaw } = await supabase.rpc('get_lots_with_status', {
    p_permit_type: permitType,
  } as any);

  const validLots = (validLotsRaw || []) as Array<{ lot_id: string; walk_times?: Record<string, number> }>;

  if (validLots.length === 0) {
    throw new Error('No valid lots for permit type');
  }

  const lotIds = validLots.map((l) => l.lot_id);

  // Get predictions for all valid lots
  const predictions = await getMLPredictionsForLots(lotIds, targetArrivalTime);

  // Score each lot
  const scoredLots = validLots.map((lot) => {
    const prediction = predictions.get(lot.lot_id);
    if (!prediction) return null;

    // Get walk time to destination
    const walkTime = destinationBuilding
      ? (lot.walk_times?.[destinationBuilding] ?? 10)
      : 10;

    // Score: 70% chance of spot + 30% walk time
    const score = prediction.chanceOfSpot * 0.7 + (1 - walkTime / 20) * 0.3 * 100;

    return {
      lot,
      prediction,
      walkTime,
      score,
    };
  }).filter(Boolean).sort((a: any, b: any) => b.score - a.score);

  if (scoredLots.length === 0) {
    throw new Error('No predictions available');
  }

  const best = scoredLots[0]!;
  const alternatives = scoredLots.slice(1, 3);

  // Calculate departure time
  const arrivalTime = new Date(targetArrivalTime);
  const departureTime = new Date(arrivalTime.getTime() - travelTimeMinutes * 60 * 1000);

  return {
    recommendedDepartureTime: departureTime,
    arrivalTime,
    targetLot: {
      id: best.prediction.lotId,
      name: best.prediction.lotName,
      predictedOccupancy: best.prediction.predictedOccupancy,
      chanceOfSpot: best.prediction.chanceOfSpot,
    },
    alternatives: alternatives.map((alt: any) => ({
      id: alt.prediction.lotId,
      name: alt.prediction.lotName,
      predictedOccupancy: alt.prediction.predictedOccupancy,
      chanceOfSpot: alt.prediction.chanceOfSpot,
    })),
    confidence: best.prediction.confidence,
    factors: best.prediction.factors,
  };
}

/**
 * Find the best lot to park at a specific time
 */
export async function findBestLotML(
  permitType: string,
  arrivalTime: Date,
  destinationBuilding?: string
): Promise<Array<{
  lotId: string;
  lotName: string;
  predictedOccupancy: number;
  chanceOfSpot: number;
  walkTimeMinutes: number;
  score: number;
}>> {
  const recommendation = await getMLDepartureRecommendation(
    permitType,
    arrivalTime,
    0,
    destinationBuilding
  );

  return [
    {
      lotId: recommendation.targetLot.id,
      lotName: recommendation.targetLot.name,
      predictedOccupancy: recommendation.targetLot.predictedOccupancy,
      chanceOfSpot: recommendation.targetLot.chanceOfSpot,
      walkTimeMinutes: 10, // Default
      score: 100,
    },
    ...recommendation.alternatives.map((alt, idx) => ({
      lotId: alt.id,
      lotName: alt.name,
      predictedOccupancy: alt.predictedOccupancy,
      chanceOfSpot: alt.chanceOfSpot,
      walkTimeMinutes: 10,
      score: 90 - idx * 10,
    })),
  ];
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

/**
 * Clear prediction cache (useful after new reports)
 */
export function clearPredictionCache(lotId?: string): void {
  if (lotId) {
    // Clear cache for specific lot
    for (const [key] of predictionCache) {
      if (key.startsWith(lotId)) {
        predictionCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    predictionCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getPredictionCacheStats(): {
  size: number;
  hitRate: number;
} {
  return {
    size: predictionCache.size,
    hitRate: 0, // Would need hit/miss tracking
  };
}
