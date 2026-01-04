/**
 * Lots Hooks
 * React Query hooks for parking lot data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as lotsService from '@/services/lots';
import { OccupancyStatus } from '@/types/database';

// Query Keys
export const lotKeys = {
  all: ['lots'] as const,
  lists: () => [...lotKeys.all, 'list'] as const,
  list: (filters: string) => [...lotKeys.lists(), { filters }] as const,
  forPermit: (permitType: string) => [...lotKeys.all, 'forPermit', permitType] as const,
  details: () => [...lotKeys.all, 'detail'] as const,
  detail: (id: string) => [...lotKeys.details(), id] as const,
};

/**
 * Hook to get all lots with current status
 */
export function useAllLots() {
  return useQuery({
    queryKey: lotKeys.lists(),
    queryFn: lotsService.getAllLotsWithStatus,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Hook to get lots valid for user's permit type
 */
export function useLotsForPermit() {
  const { appUser } = useAuthStore();
  const permitType = appUser?.permit_type ?? 'none';

  return useQuery({
    queryKey: lotKeys.forPermit(permitType),
    queryFn: () => lotsService.getLotsForPermit(permitType),
    enabled: permitType !== 'none',
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

/**
 * Hook to get single lot details
 */
export function useLot(lotId: string) {
  return useQuery({
    queryKey: lotKeys.detail(lotId),
    queryFn: () => lotsService.getLotById(lotId),
    enabled: !!lotId,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to get full lot details with related data
 */
export function useLotDetails(lotId: string) {
  return useQuery({
    queryKey: [...lotKeys.detail(lotId), 'full'],
    queryFn: () => lotsService.getLotDetails(lotId),
    enabled: !!lotId,
  });
}

/**
 * Hook to submit a parking report
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      lotId: string;
      status: OccupancyStatus;
      occupancyEstimate?: number;
      note?: string;
    }) => lotsService.submitReport(params),
    onSuccess: (_, variables) => {
      // Invalidate lot queries to refresh data
      queryClient.invalidateQueries({ queryKey: lotKeys.all });
      queryClient.invalidateQueries({ queryKey: lotKeys.detail(variables.lotId) });
    },
  });
}

/**
 * Hook to report "I just parked"
 */
export function useReportParked() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lotId, location }: { lotId: string; location?: { lat: number; lng: number } }) =>
      lotsService.reportParked(lotId, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lotKeys.all });
    },
  });
}

/**
 * Hook to report "I left"
 */
export function useReportLeft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lotId, location }: { lotId: string; location?: { lat: number; lng: number } }) =>
      lotsService.reportLeft(lotId, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lotKeys.all });
    },
  });
}

/**
 * Hook to subscribe to real-time lot status updates
 */
export function useLotStatusSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = lotsService.subscribeToLotStatus((lotId, status) => {
      // Update cache with new status
      queryClient.invalidateQueries({ queryKey: lotKeys.all });
      queryClient.invalidateQueries({ queryKey: lotKeys.detail(lotId) });
    });

    return () => unsubscribe();
  }, [queryClient]);
}

/**
 * Hook to get recent reports for a lot
 */
export function useRecentReports(lotId: string, limit = 10) {
  return useQuery({
    queryKey: [...lotKeys.detail(lotId), 'reports', limit],
    queryFn: () => lotsService.getRecentReports(lotId, limit),
    enabled: !!lotId,
    staleTime: 1000 * 60, // 1 minute
  });
}
