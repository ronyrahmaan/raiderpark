/**
 * Nearby Spots Service
 *
 * Core algorithm for finding the best nearby parking spots based on:
 * - ML predictions at estimated arrival time
 * - Distance from user (exponential decay)
 * - Walk time to destination building
 * - Convenience factors (icing zones, time limits)
 *
 * Uses dynamic weights based on urgency level.
 */

import { supabase } from '@/lib/supabase';
import { LotWithStatusForPermit, PermitType, Schedule, OccupancyStatus, ConfidenceLevel } from '@/types/database';
import { getMLPredictionsForLots, getMLPrediction } from './mlPredictions';
import { calculateDistance, formatDistance } from '@/utils/geofence';
import {
  NearbySpotResult,
  FinderOptions,
  FinderResult,
  ScoringWeights,
  UrgencyLevel,
  ScoreBreakdown,
  ArrivalPrediction,
  FreshnessInfo,
  DataFreshness,
  URGENCY_WEIGHTS,
  DEFAULT_WEIGHTS,
  CAMPUS_DRIVE_SPEED_KMH,
  PARKING_BUFFER_MINUTES,
  SHUTTLE_TIME_MINUTES,
  DISTANCE_DECAY_K,
  PENALTIES,
  FRESHNESS_THRESHOLDS,
  CAMPUS_BUILDINGS,
} from '@/types/nearbySpots';

// ============================================================
// SCORING CALCULATIONS
// ============================================================

/**
 * Get dynamic weights based on urgency (minutes until class)
 */
export function getWeightsForUrgency(urgencyMinutes: number): ScoringWeights {
  if (urgencyMinutes < 10) {
    return URGENCY_WEIGHTS.critical;
  } else if (urgencyMinutes < 30) {
    return URGENCY_WEIGHTS.moderate;
  } else {
    return URGENCY_WEIGHTS.relaxed;
  }
}

/**
 * Calculate proximity score using exponential decay
 * Smoother than linear, half-life ~866m for TTU campus
 */
export function calculateProximityScore(distanceMeters: number): number {
  // Exponential decay: score = e^(-k * distance) * 0.95 + 0.05
  // This gives range [0.05, 1.0] - never quite zero even for far lots
  const score = Math.exp(-DISTANCE_DECAY_K * distanceMeters) * 0.95 + 0.05;
  return Math.round(score * 100); // Return as 0-100
}

/**
 * Calculate drive time estimate
 * Campus avg 20 km/h + parking buffer
 */
export function calculateDriveTime(distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  const driveMinutes = (distanceKm / CAMPUS_DRIVE_SPEED_KMH) * 60;
  return Math.ceil(driveMinutes + PARKING_BUFFER_MINUTES);
}

/**
 * Calculate walk time score (higher = better = shorter walk)
 * Normalized to 0-100 where 0 min = 100, 20+ min = 0
 */
export function calculateWalkTimeScore(walkTimeMinutes: number | null): number {
  if (walkTimeMinutes === null) return 50; // Default middle score if unknown

  const maxWalkTime = 20; // 20 minutes = worst score
  const score = Math.max(0, 100 - (walkTimeMinutes / maxWalkTime) * 100);
  return Math.round(score);
}

/**
 * Calculate convenience score with penalties
 */
export function calculateConvenienceScore(
  isIcingZone: boolean,
  hasTimeLimit: boolean,
  isCurrentLocation: boolean,
  permitValid: boolean
): { score: number; penaltyApplied: number } {
  let score = 100;
  let penaltyApplied = 0;

  if (isIcingZone) {
    const penalty = PENALTIES.icingZone * 100;
    score -= penalty;
    penaltyApplied += penalty;
  }

  if (hasTimeLimit) {
    const penalty = PENALTIES.timeLimit * 100;
    score -= penalty;
    penaltyApplied += penalty;
  }

  if (isCurrentLocation) {
    const penalty = PENALTIES.currentLocation * 100;
    score -= penalty;
    penaltyApplied += penalty;
  }

  if (!permitValid) {
    const penalty = PENALTIES.invalidPermit * 100;
    score -= penalty;
    penaltyApplied += penalty;
  }

  return {
    score: Math.max(0, score),
    penaltyApplied,
  };
}

/**
 * Calculate availability score from ML prediction
 * Maps chance of spot (0-100) directly to score
 */
export function calculateAvailabilityScore(chanceOfSpot: number): number {
  return chanceOfSpot;
}

/**
 * Calculate final weighted score
 */
export function calculateFinalScore(
  availabilityScore: number,
  proximityScore: number,
  walkTimeScore: number,
  convenienceScore: number,
  weights: ScoringWeights
): number {
  const weighted =
    availabilityScore * weights.availability +
    proximityScore * weights.proximity +
    walkTimeScore * weights.walkTime +
    convenienceScore * weights.convenience;

  return Math.round(weighted);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Format drive time for display
 */
function formatDriveTime(minutes: number): string {
  if (minutes < 1) return '<1 min drive';
  return `${minutes} min drive`;
}

/**
 * Format walk time for display
 */
function formatWalkTime(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 1) return '<1 min walk';
  return `${minutes} min walk`;
}

/**
 * Get status from occupancy percent
 */
function getStatusFromOccupancy(occupancy: number): OccupancyStatus {
  if (occupancy >= 95) return 'full';
  if (occupancy >= 80) return 'filling';
  if (occupancy >= 60) return 'busy';
  return 'open';
}

/**
 * Calculate chance of spot from predicted occupancy
 */
function getChanceOfSpot(occupancy: number): number {
  if (occupancy >= 98) return 5;
  if (occupancy >= 95) return 15;
  if (occupancy >= 90) return 30;
  if (occupancy >= 85) return 50;
  if (occupancy >= 75) return 70;
  if (occupancy >= 60) return 85;
  return 95;
}

/**
 * Get freshness info for data age
 */
function getFreshnessInfo(lastUpdated: Date): FreshnessInfo {
  const ageSeconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);

  let status: DataFreshness;
  if (ageSeconds < FRESHNESS_THRESHOLDS.fresh) {
    status = 'fresh';
  } else if (ageSeconds < FRESHNESS_THRESHOLDS.stale) {
    status = 'stale';
  } else {
    status = 'very_stale';
  }

  let formatted: string;
  if (ageSeconds < 60) {
    formatted = 'Updated just now';
  } else if (ageSeconds < 120) {
    formatted = 'Updated 1 min ago';
  } else if (ageSeconds < 3600) {
    formatted = `Updated ${Math.floor(ageSeconds / 60)} min ago`;
  } else {
    formatted = `Updated ${Math.floor(ageSeconds / 3600)}h ago`;
  }

  return { status, lastUpdated, ageSeconds, formatted };
}

/**
 * Get walk time from lot to building
 */
function getWalkTimeToBuilding(
  lot: LotWithStatusForPermit,
  buildingId: string | undefined
): number | null {
  if (!buildingId || !lot.walk_times) return null;
  return lot.walk_times[buildingId] ?? null;
}

/**
 * Get default destination building from schedule
 */
export function getDefaultDestination(schedule: Schedule | null): string {
  if (!schedule) return 'sub'; // Default to Student Union

  // Get current day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const daySchedule = schedule[today as keyof Schedule];

  if (!daySchedule?.classes?.length) return 'sub';

  // Get current time
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Find next class
  for (const cls of daySchedule.classes) {
    if (cls.start > currentTime && cls.building) {
      return cls.building.toLowerCase();
    }
  }

  // No upcoming class today
  return 'sub';
}

/**
 * Generate recommendation reason based on scores
 */
function getRecommendationReason(
  result: NearbySpotResult,
  isTop: boolean
): string {
  if (isTop) {
    if (result.prediction.chanceOfSpot >= 90) {
      return 'Best availability nearby';
    } else if (result.distance.meters < 300) {
      return 'Closest lot with spots';
    } else if (result.walkTime.minutes && result.walkTime.minutes <= 5) {
      return 'Quick walk to class';
    } else {
      return 'Best overall choice';
    }
  }

  // Alternative reasons
  if (result.prediction.chanceOfSpot >= 85) {
    return 'Good availability';
  } else if (result.distance.meters < 200) {
    return 'Very close by';
  } else if (result.flags.requiresShuttle) {
    return 'Free shuttle to campus';
  }

  return '';
}

// ============================================================
// 7-LEVEL TIE BREAKING
// ============================================================

interface TieBreakingContext {
  prediction: ArrivalPrediction;
  lastReportTime: Date | null;
  lot: LotWithStatusForPermit;
}

/**
 * Compare two results for tie-breaking (when scores within ±5)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
function compareTieBreaker(
  a: NearbySpotResult,
  b: NearbySpotResult,
  aContext: TieBreakingContext,
  bContext: TieBreakingContext
): number {
  // 1. Prediction confidence (higher = better)
  const confidenceOrder = { low: 0, medium: 1, high: 2, verified: 3 };
  const confDiff = confidenceOrder[b.prediction.confidence] - confidenceOrder[a.prediction.confidence];
  if (confDiff !== 0) return confDiff;

  // 2. Data recency (fresher = better)
  const aRecency = aContext.lastReportTime?.getTime() ?? 0;
  const bRecency = bContext.lastReportTime?.getTime() ?? 0;
  if (aRecency !== bRecency) return bRecency - aRecency;

  // 3. Lot volatility (lower occupancy variance = more predictable)
  // Simplified: lots with higher confidence are less volatile
  if (a.prediction.confidence !== b.prediction.confidence) {
    return confidenceOrder[b.prediction.confidence] - confidenceOrder[a.prediction.confidence];
  }

  // 4. Historical success rate (using current occupancy as proxy)
  const aOccupancy = a.lot.occupancy_percent;
  const bOccupancy = b.lot.occupancy_percent;
  if (aOccupancy !== bOccupancy) return aOccupancy - bOccupancy;

  // 5. Amenity score (EV charging as bonus)
  const aAmenity = (a.lot as any).ev_charging ? 1 : 0;
  const bAmenity = (b.lot as any).ev_charging ? 1 : 0;
  if (aAmenity !== bAmenity) return bAmenity - aAmenity;

  // 6. Time limit (no limit preferred)
  const aLimit = a.flags.hasTimeLimit ? 1 : 0;
  const bLimit = b.flags.hasTimeLimit ? 1 : 0;
  if (aLimit !== bLimit) return aLimit - bLimit;

  // 7. Alphabetical (deterministic fallback)
  return a.lot.lot_id.localeCompare(b.lot.lot_id);
}

// ============================================================
// MAIN FINDER FUNCTION
// ============================================================

/**
 * Find nearby spots with full scoring
 */
export async function findNearbySpots(
  options: FinderOptions
): Promise<FinderResult> {
  const {
    userLocation,
    destinationBuilding,
    plannedArrivalTime,
    urgencyMinutes = 30,
    includeShuttleLots = true,
    maxResults = 5,
    mode = 'now',
  } = options;

  const searchedAt = new Date();

  // 1. Get valid lots for user's permit
  const { data: lotsDataRaw, error: lotsError } = await supabase.rpc('get_lots_with_status', {
    p_permit_type: 'commuter_west', // This will be overridden by actual permit
  } as any);

  if (lotsError || !lotsDataRaw) {
    return {
      spots: [],
      recommended: null,
      alternatives: [],
      freshness: getFreshnessInfo(searchedAt),
      searchedAt,
      mode,
      destination: destinationBuilding ?? null,
      totalLotsSearched: 0,
      lotsFilteredOut: 0,
    };
  }

  const lotsData = lotsDataRaw as LotWithStatusForPermit[];

  // 2. Filter lots (exclude shuttles if not wanted, closed lots)
  let filteredLots = lotsData.filter(lot => {
    // Exclude closed lots
    if (lot.status === 'closed') return false;

    // Handle shuttle lots
    if (lot.lot_id === 'S1' && !includeShuttleLots) return false;

    // Check permit validity (lot should have is_valid_now from the RPC)
    if (!lot.is_valid_now) return false;

    return true;
  });

  const lotsFilteredOut = lotsData.length - filteredLots.length;

  // 3. Calculate distances and drive times
  const lotsWithDistance = filteredLots.map(lot => {
    const distanceMeters = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      lot.center.lat,
      lot.center.lng
    );

    let driveTimeMinutes = calculateDriveTime(distanceMeters);

    // Add shuttle time for S1
    if (lot.lot_id === 'S1') {
      driveTimeMinutes += SHUTTLE_TIME_MINUTES;
    }

    return {
      lot,
      distanceMeters,
      driveTimeMinutes,
    };
  });

  // 4. Get arrival times and batch fetch ML predictions
  const targetTime = plannedArrivalTime ?? new Date();
  const arrivalTimes = new Map<string, Date>();

  lotsWithDistance.forEach(item => {
    const arrivalTime = mode === 'planned' && plannedArrivalTime
      ? plannedArrivalTime
      : new Date(Date.now() + item.driveTimeMinutes * 60 * 1000);
    arrivalTimes.set(item.lot.lot_id, arrivalTime);
  });

  // Get predictions for all lots
  const lotIds = lotsWithDistance.map(item => item.lot.lot_id);
  const predictions = await getMLPredictionsForLots(lotIds, targetTime);

  // 5. Get scoring weights based on urgency
  const weights = getWeightsForUrgency(urgencyMinutes);

  // 6. Score each lot
  const scoredResults: Array<{
    result: NearbySpotResult;
    context: TieBreakingContext;
  }> = [];

  for (const item of lotsWithDistance) {
    const { lot, distanceMeters, driveTimeMinutes } = item;
    const prediction = predictions.get(lot.lot_id);

    if (!prediction) continue;

    // Get walk time to destination
    const walkTimeMinutes = getWalkTimeToBuilding(lot, destinationBuilding);

    // Check special conditions
    const isIcingZone = (lot as any).is_icing_zone ?? false;
    const hasTimeLimit = (lot as any).time_limit_minutes !== null;
    const timeLimitMinutes = (lot as any).time_limit_minutes ?? null;
    const isCurrentLocation = distanceMeters < 50; // Within 50m = already here

    // Calculate component scores
    const availabilityScore = calculateAvailabilityScore(prediction.chanceOfSpot);
    const proximityScore = calculateProximityScore(distanceMeters);
    const walkTimeScore = calculateWalkTimeScore(walkTimeMinutes);
    const { score: convenienceScore, penaltyApplied } = calculateConvenienceScore(
      isIcingZone,
      hasTimeLimit,
      isCurrentLocation,
      lot.is_valid_now
    );

    // Calculate final score
    const finalScore = calculateFinalScore(
      availabilityScore,
      proximityScore,
      walkTimeScore,
      convenienceScore,
      weights
    );

    // Build arrival prediction
    const arrivalPrediction: ArrivalPrediction = {
      arrivalTime: arrivalTimes.get(lot.lot_id) ?? new Date(),
      occupancyAtArrival: prediction.predictedOccupancy,
      chanceOfSpot: prediction.chanceOfSpot,
      confidence: prediction.confidenceLevel,
      status: prediction.status,
    };

    // Build result
    const result: NearbySpotResult = {
      lot,
      score: finalScore,
      rank: 0, // Will be set after sorting
      distance: {
        meters: distanceMeters,
        formatted: formatDistance(distanceMeters),
      },
      driveTime: {
        minutes: driveTimeMinutes,
        formatted: formatDriveTime(driveTimeMinutes),
      },
      prediction: arrivalPrediction,
      walkTime: {
        minutes: walkTimeMinutes,
        toBuilding: destinationBuilding ?? null,
        formatted: formatWalkTime(walkTimeMinutes),
      },
      flags: {
        isIcingZone,
        hasTimeLimit,
        timeLimitMinutes,
        isRecommended: false, // Will be set later
        isCurrentLocation,
        requiresShuttle: lot.lot_id === 'S1',
        reason: '',
      },
      breakdown: {
        availabilityScore,
        proximityScore,
        walkTimeScore,
        convenienceScore,
        penaltyApplied,
        rawScore: finalScore,
        finalScore,
      },
    };

    const lastReportTime = lot.last_report_time ? new Date(lot.last_report_time) : null;

    scoredResults.push({
      result,
      context: {
        prediction: arrivalPrediction,
        lastReportTime,
        lot,
      },
    });
  }

  // 7. Sort by score, with tie-breaking
  scoredResults.sort((a, b) => {
    const scoreDiff = b.result.score - a.result.score;

    // If scores are within ±5, use tie-breaking
    if (Math.abs(scoreDiff) <= 5) {
      return compareTieBreaker(a.result, b.result, a.context, b.context);
    }

    return scoreDiff;
  });

  // 8. Assign ranks and extract results
  const results = scoredResults.slice(0, maxResults).map((item, index) => {
    const result = item.result;
    result.rank = index + 1;
    result.flags.isRecommended = index === 0;
    result.flags.reason = getRecommendationReason(result, index === 0);
    return result;
  });

  // 9. Build final result
  const recommended = results.length > 0 ? results[0] : null;
  const alternatives = results.slice(1);

  // Determine freshness from most recent data
  const lastUpdates = scoredResults
    .map(r => r.context.lastReportTime?.getTime() ?? 0)
    .filter(t => t > 0);
  const mostRecent = lastUpdates.length > 0
    ? new Date(Math.max(...lastUpdates))
    : searchedAt;

  return {
    spots: results,
    recommended,
    alternatives,
    freshness: getFreshnessInfo(mostRecent),
    searchedAt,
    mode,
    destination: destinationBuilding ?? null,
    totalLotsSearched: lotsData.length,
    lotsFilteredOut,
  };
}

/**
 * Find nearby spots for a specific permit type
 */
export async function findNearbySpotsForPermit(
  permitType: PermitType,
  userLocation: { latitude: number; longitude: number },
  destinationBuilding?: string,
  schedule?: Schedule | null
): Promise<FinderResult> {
  // Get default destination from schedule if not provided
  const destination = destinationBuilding ?? getDefaultDestination(schedule ?? null);

  // Calculate urgency from schedule
  let urgencyMinutes = 30; // Default moderate urgency
  if (schedule) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const daySchedule = schedule[today as keyof Schedule];

    if (daySchedule?.classes?.length) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const cls of daySchedule.classes) {
        const [hours, minutes] = cls.start.split(':').map(Number);
        const classMinutes = hours * 60 + minutes;
        const diff = classMinutes - currentMinutes;

        if (diff > 0) {
          urgencyMinutes = diff;
          break;
        }
      }
    }
  }

  // Get valid lots for permit
  const { data: lotsDataRaw, error: lotsError } = await supabase.rpc('get_lots_with_status', {
    p_permit_type: permitType,
  } as any);

  if (lotsError || !lotsDataRaw) {
    return {
      spots: [],
      recommended: null,
      alternatives: [],
      freshness: getFreshnessInfo(new Date()),
      searchedAt: new Date(),
      mode: 'now',
      destination,
      totalLotsSearched: 0,
      lotsFilteredOut: 0,
    };
  }

  // Use full finder with options
  return findNearbySpots({
    mode: 'now',
    userLocation,
    destinationBuilding: destination,
    urgencyMinutes,
    includeShuttleLots: true,
    maxResults: 5,
  });
}

// ============================================================
// EDGE CASE HANDLERS
// ============================================================

/**
 * Handle case when all lots are full (>90%)
 * Returns lots trending down or suggests alternatives
 */
export async function handleAllLotsFull(
  lots: NearbySpotResult[]
): Promise<{
  trendingDown: NearbySpotResult[];
  suggestion: string;
}> {
  // Filter lots with falling trend
  const trendingDown = lots.filter(
    lot => lot.lot.trend === 'falling'
  );

  let suggestion: string;
  if (trendingDown.length > 0) {
    suggestion = `${trendingDown[0].lot.lot_name} is emptying - try there first`;
  } else {
    // Check if S1 is available
    const s1 = lots.find(l => l.lot.lot_id === 'S1');
    if (s1 && s1.prediction.chanceOfSpot > 50) {
      suggestion = 'Park at S1 and take the free shuttle';
    } else {
      suggestion = 'All lots are full - consider waiting 15-20 minutes';
    }
  }

  return { trendingDown, suggestion };
}

/**
 * Quick finder for "nearest" mode (pure distance sort)
 */
export async function findNearestLots(
  userLocation: { latitude: number; longitude: number },
  permitType: PermitType,
  maxResults = 5
): Promise<NearbySpotResult[]> {
  const result = await findNearbySpots({
    mode: 'nearby',
    userLocation,
    maxResults,
  });

  // Re-sort by distance only
  return result.spots.sort((a, b) => a.distance.meters - b.distance.meters);
}
