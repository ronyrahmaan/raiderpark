/**
 * ML Predictions Hooks
 * React Query hooks for ML-powered parking predictions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMLPrediction,
  getMLPredictionTimeline,
  getMLPredictionsForLots,
  getMLDepartureRecommendation,
  findBestLotML,
  clearPredictionCache,
  MLPredictionResponse,
  DepartureRecommendation,
} from '@/services/mlPredictions';
import { PermitType } from '@/types/database';

// ============================================================
// QUERY KEYS
// ============================================================

export const mlPredictionKeys = {
  all: ['ml-predictions'] as const,
  prediction: (lotId: string, time: string) =>
    [...mlPredictionKeys.all, 'single', lotId, time] as const,
  timeline: (lotId: string, startTime: string, hours: number) =>
    [...mlPredictionKeys.all, 'timeline', lotId, startTime, hours] as const,
  multiple: (lotIds: string[], time: string) =>
    [...mlPredictionKeys.all, 'multiple', lotIds.join(','), time] as const,
  departure: (permitType: string, targetTime: string, destination?: string) =>
    [...mlPredictionKeys.all, 'departure', permitType, targetTime, destination || 'any'] as const,
  bestLot: (permitType: string, arrivalTime: string, destination?: string) =>
    [...mlPredictionKeys.all, 'best-lot', permitType, arrivalTime, destination || 'any'] as const,
};

// ============================================================
// SINGLE PREDICTION HOOK
// ============================================================

/**
 * Get ML prediction for a specific lot and time
 */
export function useMLPrediction(
  lotId: string,
  targetTime: Date = new Date(),
  options?: { enabled?: boolean }
) {
  const timeKey = targetTime.toISOString().slice(0, 16); // Round to minute

  return useQuery({
    queryKey: mlPredictionKeys.prediction(lotId, timeKey),
    queryFn: () => getMLPrediction(lotId, targetTime),
    enabled: !!lotId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes cache
  });
}

// ============================================================
// TIMELINE HOOK
// ============================================================

/**
 * Get prediction timeline for a lot
 */
export function useMLPredictionTimeline(
  lotId: string,
  startTime: Date = new Date(),
  hours: number = 4,
  options?: { enabled?: boolean }
) {
  const timeKey = startTime.toISOString().slice(0, 16);

  return useQuery({
    queryKey: mlPredictionKeys.timeline(lotId, timeKey, hours),
    queryFn: () => getMLPredictionTimeline(lotId, startTime, hours),
    enabled: !!lotId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ============================================================
// MULTIPLE LOTS HOOK
// ============================================================

/**
 * Get predictions for multiple lots
 */
export function useMLPredictionsForLots(
  lotIds: string[],
  targetTime: Date = new Date(),
  options?: { enabled?: boolean }
) {
  const timeKey = targetTime.toISOString().slice(0, 16);

  return useQuery({
    queryKey: mlPredictionKeys.multiple(lotIds, timeKey),
    queryFn: () => getMLPredictionsForLots(lotIds, targetTime),
    enabled: lotIds.length > 0 && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    select: (data) => {
      // Convert Map to array for easier use
      return Array.from(data.values());
    },
  });
}

// ============================================================
// DEPARTURE RECOMMENDATION HOOK
// ============================================================

/**
 * Get departure time recommendation
 */
export function useMLDepartureRecommendation(
  permitType: PermitType,
  targetArrivalTime: Date,
  travelTimeMinutes: number = 15,
  destinationBuilding?: string,
  options?: { enabled?: boolean }
) {
  const timeKey = targetArrivalTime.toISOString().slice(0, 16);

  return useQuery({
    queryKey: mlPredictionKeys.departure(permitType, timeKey, destinationBuilding),
    queryFn: () =>
      getMLDepartureRecommendation(
        permitType,
        targetArrivalTime,
        travelTimeMinutes,
        destinationBuilding
      ),
    enabled: permitType !== 'none' && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ============================================================
// BEST LOT HOOK
// ============================================================

/**
 * Find the best lot to park
 */
export function useMLBestLot(
  permitType: PermitType,
  arrivalTime: Date,
  destinationBuilding?: string,
  options?: { enabled?: boolean }
) {
  const timeKey = arrivalTime.toISOString().slice(0, 16);

  return useQuery({
    queryKey: mlPredictionKeys.bestLot(permitType, timeKey, destinationBuilding),
    queryFn: () => findBestLotML(permitType, arrivalTime, destinationBuilding),
    enabled: permitType !== 'none' && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ============================================================
// CACHE INVALIDATION
// ============================================================

/**
 * Hook to invalidate prediction cache
 */
export function useInvalidatePredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lotId?: string) => {
      // Clear local cache
      clearPredictionCache(lotId);

      // Invalidate React Query cache
      if (lotId) {
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === 'ml-predictions' &&
              key.includes(lotId)
            );
          },
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: mlPredictionKeys.all,
        });
      }
    },
  });
}

// ============================================================
// REAL-TIME UPDATES
// ============================================================

/**
 * Hook for real-time prediction updates (call after submitting a report)
 */
export function useRefreshPredictionsAfterReport() {
  const invalidate = useInvalidatePredictions();

  return async (lotId: string) => {
    // Wait a bit for the server to process the report
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Invalidate predictions for this lot
    await invalidate.mutateAsync(lotId);
  };
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get current prediction status for a lot
 */
export function useLotPredictionStatus(lotId: string) {
  const { data, isLoading, error } = useMLPrediction(lotId);

  if (isLoading) {
    return {
      status: 'loading' as const,
      occupancy: null,
      confidence: null,
      chanceOfSpot: null,
    };
  }

  if (error || !data) {
    return {
      status: 'error' as const,
      occupancy: null,
      confidence: null,
      chanceOfSpot: null,
    };
  }

  return {
    status: data.status,
    occupancy: data.predictedOccupancy,
    confidence: data.confidence,
    confidenceLevel: data.confidenceLevel,
    chanceOfSpot: data.chanceOfSpot,
    bounds: {
      lower: data.lowerBound,
      upper: data.upperBound,
    },
    factors: data.factors,
    source: data.source,
  };
}

/**
 * Get smart departure recommendation for next class
 */
export function useSmartDeparture(
  permitType: PermitType,
  nextClassTime: Date | null,
  destinationBuilding?: string
) {
  const { data, isLoading, error } = useMLDepartureRecommendation(
    permitType,
    nextClassTime || new Date(),
    15, // Default travel time
    destinationBuilding,
    { enabled: !!nextClassTime }
  );

  if (!nextClassTime) {
    return { hasRecommendation: false };
  }

  if (isLoading) {
    return { hasRecommendation: false, isLoading: true };
  }

  if (error || !data) {
    return { hasRecommendation: false, error };
  }

  return {
    hasRecommendation: true,
    departureTime: data.recommendedDepartureTime,
    arrivalTime: data.arrivalTime,
    targetLot: data.targetLot,
    alternatives: data.alternatives,
    confidence: data.confidence,
    factors: data.factors,
  };
}
