/**
 * Predictions Service
 * ML-powered parking predictions from database
 */

import { supabase } from '@/lib/supabase';
import { PermitType, LotPrediction, LotWithStatusForPermit } from '@/types/database';
import { addMinutes, startOfDay, endOfDay, addHours } from 'date-fns';

// Re-export the type for convenience
export type { LotPrediction };

// ============================================================
// PREDICTION QUERIES
// ============================================================

/**
 * Get predictions for a specific lot and date
 */
export async function getLotPredictions(
  lotId: string,
  date: Date
): Promise<LotPrediction[]> {
  const dayStart = startOfDay(date).toISOString();
  const dayEnd = endOfDay(date).toISOString();

  const { data, error } = await supabase
    .from('lot_predictions')
    .select('*')
    .eq('lot_id', lotId)
    .gte('predicted_for', dayStart)
    .lte('predicted_for', dayEnd)
    .order('predicted_for', { ascending: true });

  if (error) throw new Error(`Failed to fetch predictions: ${error.message}`);
  return data ?? [];
}

/**
 * Get prediction for a specific lot at a specific time
 * Finds the nearest prediction within 30 minutes of the target time
 */
export async function getPredictionAt(
  lotId: string,
  dateTime: Date
): Promise<LotPrediction | null> {
  // Get predictions around the target time (±1 hour window)
  const startTime = addHours(dateTime, -1).toISOString();
  const endTime = addHours(dateTime, 1).toISOString();

  const { data: rawData, error } = await supabase
    .from('lot_predictions')
    .select('*')
    .eq('lot_id', lotId)
    .gte('predicted_for', startTime)
    .lte('predicted_for', endTime)
    .order('predicted_for', { ascending: true });

  if (error) {
    console.error('Error fetching prediction:', error);
    return null;
  }

  const data = (rawData || []) as LotPrediction[];

  if (data.length === 0) return null;

  // Find the closest prediction to target time
  const targetTime = dateTime.getTime();
  let closest = data[0];
  let minDiff = Math.abs(new Date(closest.predicted_for).getTime() - targetTime);

  for (const pred of data) {
    const diff = Math.abs(new Date(pred.predicted_for).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = pred;
    }
  }

  return closest;
}

/**
 * Get predictions for multiple lots at a specific time
 */
export async function getPredictionsForLots(
  lotIds: string[],
  dateTime: Date
): Promise<Map<string, LotPrediction>> {
  const startTime = addHours(dateTime, -1).toISOString();
  const endTime = addHours(dateTime, 1).toISOString();

  const { data: rawData, error } = await supabase
    .from('lot_predictions')
    .select('*')
    .in('lot_id', lotIds)
    .gte('predicted_for', startTime)
    .lte('predicted_for', endTime);

  if (error) throw new Error(`Failed to fetch predictions: ${error.message}`);

  const data = (rawData || []) as LotPrediction[];

  // For each lot, find the closest prediction to target time
  const predictionMap = new Map<string, LotPrediction>();
  const targetTime = dateTime.getTime();

  lotIds.forEach(lotId => {
    const lotPredictions = data.filter(p => p.lot_id === lotId);
    if (lotPredictions.length === 0) return;

    let closest = lotPredictions[0];
    let minDiff = Math.abs(new Date(closest.predicted_for).getTime() - targetTime);

    for (const pred of lotPredictions) {
      const diff = Math.abs(new Date(pred.predicted_for).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pred;
      }
    }

    predictionMap.set(lotId, closest);
  });

  return predictionMap;
}

// ============================================================
// DEPARTURE TIME RECOMMENDATIONS
// ============================================================

export interface DepartureRecommendation {
  recommendedDepartureTime: Date;
  arrivalTime: Date;
  predictedOccupancy: number;
  chanceOfSpot: number; // 0-100
  confidence: number; // 0-1
  alternativeLots: Array<{
    lotId: string;
    predictedOccupancy: number;
    chanceOfSpot: number;
  }>;
}

/**
 * Get recommended departure time to find parking at a specific lot
 * before a target arrival time
 */
export async function getRecommendedDepartureTime(
  lotId: string,
  targetArrivalTime: Date,
  travelTimeMinutes: number = 15
): Promise<DepartureRecommendation> {
  // Get predictions for the target date
  const predictions = await getLotPredictions(lotId, targetArrivalTime);

  if (predictions.length === 0) {
    // No predictions available - return a conservative recommendation
    return {
      recommendedDepartureTime: addMinutes(targetArrivalTime, -(travelTimeMinutes + 30)),
      arrivalTime: addMinutes(targetArrivalTime, -30),
      predictedOccupancy: 70,
      chanceOfSpot: 60,
      confidence: 0.3,
      alternativeLots: [],
    };
  }

  // Find the best arrival time (before target) with lowest occupancy
  const targetTimestamp = targetArrivalTime.getTime();
  const candidatePredictions = predictions.filter(
    p => new Date(p.predicted_for).getTime() <= targetTimestamp
  );

  if (candidatePredictions.length === 0) {
    // Use first prediction if none before target
    candidatePredictions.push(predictions[0]);
  }

  // Find the optimal arrival time
  let bestPrediction = candidatePredictions[0];
  let bestChance = calculateChanceOfSpot(bestPrediction.predicted_percent);

  for (const pred of candidatePredictions) {
    const chance = calculateChanceOfSpot(pred.predicted_percent);
    const predTime = new Date(pred.predicted_for).getTime();
    const bestTime = new Date(bestPrediction.predicted_for).getTime();

    if (chance > bestChance || (chance === bestChance && predTime > bestTime)) {
      bestPrediction = pred;
      bestChance = chance;
    }
  }

  // Calculate departure time
  const arrivalTime = new Date(bestPrediction.predicted_for);
  const departureTime = addMinutes(arrivalTime, -travelTimeMinutes);

  // Map confidence string to number
  const confidenceMap: Record<string, number> = {
    'low': 0.3,
    'medium': 0.6,
    'high': 0.8,
    'verified': 0.95,
  };

  return {
    recommendedDepartureTime: departureTime,
    arrivalTime,
    predictedOccupancy: bestPrediction.predicted_percent,
    chanceOfSpot: bestChance,
    confidence: confidenceMap[bestPrediction.confidence] ?? 0.5,
    alternativeLots: [], // Would be populated from other lot predictions
  };
}

/**
 * Calculate chance of finding a spot based on occupancy
 */
export function calculateChanceOfSpot(occupancyPercent: number): number {
  if (occupancyPercent >= 98) return 5;
  if (occupancyPercent >= 95) return 15;
  if (occupancyPercent >= 90) return 30;
  if (occupancyPercent >= 85) return 50;
  if (occupancyPercent >= 75) return 70;
  if (occupancyPercent >= 60) return 85;
  return 95;
}

// ============================================================
// PREDICTION TIMELINE
// ============================================================

export interface PredictionTimelineEntry {
  time: Date;
  occupancy: number;
  status: 'open' | 'busy' | 'filling' | 'full';
  chanceOfSpot: number;
  confidence: string;
}

/**
 * Get a timeline of predictions for a lot on a specific day
 */
export async function getPredictionTimeline(
  lotId: string,
  date: Date
): Promise<PredictionTimelineEntry[]> {
  const predictions = await getLotPredictions(lotId, date);

  return predictions.map(pred => ({
    time: new Date(pred.predicted_for),
    occupancy: pred.predicted_percent,
    status: getStatusFromOccupancy(pred.predicted_percent),
    chanceOfSpot: calculateChanceOfSpot(pred.predicted_percent),
    confidence: pred.confidence,
  }));
}

function getStatusFromOccupancy(occupancy: number): 'open' | 'busy' | 'filling' | 'full' {
  if (occupancy >= 95) return 'full';
  if (occupancy >= 80) return 'filling';
  if (occupancy >= 60) return 'busy';
  return 'open';
}

// ============================================================
// BEST LOT FINDER
// ============================================================

export interface BestLotRecommendation {
  lotId: string;
  lotName: string;
  predictedOccupancy: number;
  chanceOfSpot: number;
  walkTimeMinutes: number;
  score: number; // Combined score (chance * walkTimeWeight)
}

/**
 * Find the best lot to park at a specific time, considering
 * occupancy predictions and walk times to destination
 */
export async function findBestLot(
  permitType: PermitType,
  arrivalTime: Date,
  destinationBuilding: string
): Promise<BestLotRecommendation[]> {
  // Get valid lots for permit
  const { data: lotsRaw } = await supabase.rpc('get_lots_with_status', {
    p_permit_type: permitType,
  } as any);

  const lotsData = (lotsRaw || []) as LotWithStatusForPermit[];

  if (lotsData.length === 0) {
    return [];
  }

  const lotIds = lotsData.map((l) => l.lot_id);
  const predictions = await getPredictionsForLots(lotIds, arrivalTime);

  const recommendations: BestLotRecommendation[] = lotsData.map((lot) => {
    const prediction = predictions.get(lot.lot_id);
    const occupancy = prediction?.predicted_percent ?? lot.occupancy_percent ?? 50;
    const walkTime = lot.walk_times?.[destinationBuilding] ?? 10;
    const chanceOfSpot = calculateChanceOfSpot(occupancy);

    // Score: prioritize chance of spot, then minimize walk time
    const score = chanceOfSpot * 0.7 + (1 - walkTime / 20) * 0.3 * 100;

    return {
      lotId: lot.lot_id,
      lotName: lot.lot_name,
      predictedOccupancy: occupancy,
      chanceOfSpot,
      walkTimeMinutes: walkTime,
      score,
    };
  });

  // Sort by score (highest first)
  return recommendations.sort((a, b) => b.score - a.score);
}
