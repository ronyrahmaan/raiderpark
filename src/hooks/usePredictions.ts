/**
 * Predictions Hooks
 * React Query hooks for ML predictions
 */

import { useQuery } from '@tanstack/react-query';
import * as predictionsService from '@/services/predictions';
import { PermitType } from '@/types/database';

// Query Keys
export const predictionKeys = {
  all: ['predictions'] as const,
  forLot: (lotId: string, date: string) => [...predictionKeys.all, 'lot', lotId, date] as const,
  timeline: (lotId: string, date: string) => [...predictionKeys.all, 'timeline', lotId, date] as const,
  departure: (lotId: string, targetTime: string) => [...predictionKeys.all, 'departure', lotId, targetTime] as const,
  bestLot: (permitType: string, arrivalTime: string, destination: string) =>
    [...predictionKeys.all, 'bestLot', permitType, arrivalTime, destination] as const,
};

/**
 * Hook to get predictions for a specific lot and date
 */
export function useLotPredictions(lotId: string, date: Date) {
  const dateStr = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: predictionKeys.forLot(lotId, dateStr),
    queryFn: () => predictionsService.getLotPredictions(lotId, date),
    enabled: !!lotId,
    staleTime: 1000 * 60 * 15, // 15 minutes (predictions don't change often)
  });
}

/**
 * Hook to get prediction timeline for a lot
 */
export function usePredictionTimeline(lotId: string, date: Date) {
  const dateStr = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: predictionKeys.timeline(lotId, dateStr),
    queryFn: () => predictionsService.getPredictionTimeline(lotId, date),
    enabled: !!lotId,
    staleTime: 1000 * 60 * 15,
  });
}

/**
 * Hook to get recommended departure time
 */
export function useDepartureRecommendation(
  lotId: string,
  targetArrivalTime: Date,
  travelTimeMinutes: number = 15
) {
  const targetStr = targetArrivalTime.toISOString();

  return useQuery({
    queryKey: predictionKeys.departure(lotId, targetStr),
    queryFn: () =>
      predictionsService.getRecommendedDepartureTime(lotId, targetArrivalTime, travelTimeMinutes),
    enabled: !!lotId && !!targetArrivalTime,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to find the best lot for parking
 */
export function useBestLot(
  permitType: PermitType,
  arrivalTime: Date,
  destinationBuilding: string
) {
  const arrivalStr = arrivalTime.toISOString();

  return useQuery({
    queryKey: predictionKeys.bestLot(permitType, arrivalStr, destinationBuilding),
    queryFn: () =>
      predictionsService.findBestLot(permitType, arrivalTime, destinationBuilding),
    enabled: permitType !== 'none' && !!destinationBuilding,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get prediction at a specific time
 */
export function usePredictionAt(lotId: string, dateTime: Date) {
  return useQuery({
    queryKey: [...predictionKeys.forLot(lotId, dateTime.toISOString()), 'at'],
    queryFn: () => predictionsService.getPredictionAt(lotId, dateTime),
    enabled: !!lotId && !!dateTime,
    staleTime: 1000 * 60 * 5,
  });
}
