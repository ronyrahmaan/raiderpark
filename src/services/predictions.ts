/**
 * Predictions Service
 * ML-powered parking predictions
 */

import { supabase } from '@/lib/supabase';
import { LotPrediction, PermitType } from '@/types/database';
import { format, addMinutes, setHours, setMinutes, parseISO } from 'date-fns';

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
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('lot_predictions')
    .select('*')
    .eq('lot_id', lotId)
    .eq('prediction_date', dateStr)
    .order('prediction_time', { ascending: true });

  if (error) throw new Error(`Failed to fetch predictions: ${error.message}`);
  return data ?? [];
}

/**
 * Get prediction for a specific lot at a specific time
 */
export async function getPredictionAt(
  lotId: string,
  dateTime: Date
): Promise<LotPrediction | null> {
  const dateStr = format(dateTime, 'yyyy-MM-dd');
  const timeStr = format(dateTime, 'HH:mm:00');

  const { data, error } = await supabase
    .from('lot_predictions')
    .select('*')
    .eq('lot_id', lotId)
    .eq('prediction_date', dateStr)
    .eq('prediction_time', timeStr)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch prediction: ${error.message}`);
  }
  return data;
}

/**
 * Get predictions for multiple lots at a specific time
 */
export async function getPredictionsForLots(
  lotIds: string[],
  dateTime: Date
): Promise<Map<string, LotPrediction>> {
  const dateStr = format(dateTime, 'yyyy-MM-dd');
  const timeStr = format(dateTime, 'HH:mm:00');

  const { data, error } = await supabase
    .from('lot_predictions')
    .select('*')
    .in('lot_id', lotIds)
    .eq('prediction_date', dateStr)
    .eq('prediction_time', timeStr);

  if (error) throw new Error(`Failed to fetch predictions: ${error.message}`);

  const predictionMap = new Map<string, LotPrediction>();
  data?.forEach(pred => predictionMap.set(pred.lot_id, pred));
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
  const targetTimeStr = format(targetArrivalTime, 'HH:mm:00');
  const candidatePredictions = predictions.filter(
    p => p.prediction_time <= targetTimeStr
  );

  // Find the optimal arrival time
  let bestPrediction = candidatePredictions[0];
  let bestChance = calculateChanceOfSpot(bestPrediction.predicted_occupancy);

  for (const pred of candidatePredictions) {
    const chance = calculateChanceOfSpot(pred.predicted_occupancy);
    if (chance > bestChance ||
        (chance === bestChance && pred.prediction_time > bestPrediction.prediction_time)) {
      bestPrediction = pred;
      bestChance = chance;
    }
  }

  // Calculate departure time
  const arrivalTime = parseTimeToDate(bestPrediction.prediction_time, targetArrivalTime);
  const departureTime = addMinutes(arrivalTime, -travelTimeMinutes);

  return {
    recommendedDepartureTime: departureTime,
    arrivalTime,
    predictedOccupancy: bestPrediction.predicted_occupancy,
    chanceOfSpot: bestChance,
    confidence: bestPrediction.confidence,
    alternativeLots: [], // Would be populated from other lot predictions
  };
}

/**
 * Calculate chance of finding a spot based on occupancy
 */
function calculateChanceOfSpot(occupancyPercent: number): number {
  if (occupancyPercent >= 98) return 5;
  if (occupancyPercent >= 95) return 15;
  if (occupancyPercent >= 90) return 30;
  if (occupancyPercent >= 85) return 50;
  if (occupancyPercent >= 75) return 70;
  if (occupancyPercent >= 60) return 85;
  return 95;
}

/**
 * Parse time string (HH:mm:ss) to Date object on a specific date
 */
function parseTimeToDate(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let date = new Date(referenceDate);
  date = setHours(date, hours);
  date = setMinutes(date, minutes);
  return date;
}

// ============================================================
// PREDICTION TIMELINE
// ============================================================

export interface PredictionTimelineEntry {
  time: Date;
  occupancy: number;
  status: 'open' | 'busy' | 'filling' | 'full';
  chanceOfSpot: number;
  confidence: number;
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
    time: parseTimeToDate(pred.prediction_time, date),
    occupancy: pred.predicted_occupancy,
    status: getStatusFromOccupancy(pred.predicted_occupancy),
    chanceOfSpot: calculateChanceOfSpot(pred.predicted_occupancy),
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
  const { data: lotsData } = await supabase.rpc('get_lots_with_status', {
    p_permit_type: permitType,
  });

  if (!lotsData || lotsData.length === 0) {
    return [];
  }

  const lotIds = lotsData.map(l => l.lot_id);
  const predictions = await getPredictionsForLots(lotIds, arrivalTime);

  const recommendations: BestLotRecommendation[] = lotsData.map(lot => {
    const prediction = predictions.get(lot.lot_id);
    const occupancy = prediction?.predicted_occupancy ?? lot.occupancy_percent;
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
