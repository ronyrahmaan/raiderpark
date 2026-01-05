/**
 * Reports Hooks
 * React Query hooks for parking reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as reportsService from '@/services/reports';
import { Report, ReportType, OccupancyStatus } from '@/types/database';

// Query Keys
export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  recent: (lotId?: string) => [...reportKeys.lists(), 'recent', lotId] as const,
  userReports: (userId?: string) => [...reportKeys.lists(), 'user', userId] as const,
  filtered: (filters: reportsService.ReportFilters) => [...reportKeys.lists(), 'filtered', filters] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
  count: (userId?: string) => [...reportKeys.all, 'count', userId] as const,
};

/**
 * Hook to get recent reports (optionally filtered by lot)
 */
export function useRecentReports(lotId?: string, limit = 20) {
  return useQuery({
    queryKey: reportKeys.recent(lotId),
    queryFn: () => reportsService.getRecentReports(lotId, limit),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Hook to get current user's reports
 */
export function useUserReports(limit = 50) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: reportKeys.userReports(user?.id),
    queryFn: () => reportsService.getUserReports(user?.id, limit),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get reports with flexible filters
 */
export function useFilteredReports(
  filters: reportsService.ReportFilters,
  limit = 50
) {
  return useQuery({
    queryKey: reportKeys.filtered(filters),
    queryFn: () => reportsService.getReportsWithFilters(filters, limit),
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get a single report by ID
 */
export function useReport(reportId: string) {
  return useQuery({
    queryKey: reportKeys.detail(reportId),
    queryFn: () => reportsService.getReportById(reportId),
    enabled: !!reportId,
  });
}

/**
 * Hook to get user's report count
 */
export function useUserReportCount() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: reportKeys.count(user?.id),
    queryFn: () => reportsService.getUserReportCount(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to submit a general report
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: reportsService.SubmitReportParams) =>
      reportsService.submitReport(params),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      // Also invalidate lot queries since reports affect lot status
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

/**
 * Hook to submit a "I just parked" report
 */
export function useSubmitParkedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lotId,
      location,
    }: {
      lotId: string;
      location?: { lat: number; lng: number };
    }) => reportsService.submitParkedReport(lotId, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

/**
 * Hook to submit a "I left" report
 */
export function useSubmitLeftReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lotId,
      location,
    }: {
      lotId: string;
      location?: { lat: number; lng: number };
    }) => reportsService.submitLeftReport(lotId, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

/**
 * Hook to submit a status report
 */
export function useSubmitStatusReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      lotId: string;
      status: OccupancyStatus;
      occupancyEstimate?: number;
      note?: string;
      location?: { lat: number; lng: number };
    }) => reportsService.submitStatusReport(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

/**
 * Hook to submit a "lot is full" report
 */
export function useSubmitFullReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lotId,
      note,
      location,
    }: {
      lotId: string;
      note?: string;
      location?: { lat: number; lng: number };
    }) => reportsService.submitFullReport(lotId, note, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

/**
 * Hook to subscribe to real-time report updates
 */
export function useReportSubscription(lotId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = reportsService.subscribeToReports((report, action) => {
      // Invalidate report queries on any change
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      // Also invalidate lot queries since reports affect lot status
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    }, lotId);

    return () => unsubscribe();
  }, [queryClient, lotId]);
}

/**
 * Combined hook for reports with loading and error states
 * Provides a convenient interface for components
 */
export function useReports(lotId?: string) {
  const recentReportsQuery = useRecentReports(lotId);
  const userReportsQuery = useUserReports();
  const reportCountQuery = useUserReportCount();
  const submitReportMutation = useSubmitReport();
  const submitParkedMutation = useSubmitParkedReport();
  const submitLeftMutation = useSubmitLeftReport();
  const submitStatusMutation = useSubmitStatusReport();
  const submitFullMutation = useSubmitFullReport();

  return {
    // Data
    recentReports: recentReportsQuery.data ?? [],
    userReports: userReportsQuery.data ?? [],
    reportCount: reportCountQuery.data ?? 0,

    // Loading states
    isLoadingRecent: recentReportsQuery.isLoading,
    isLoadingUserReports: userReportsQuery.isLoading,
    isLoadingCount: reportCountQuery.isLoading,
    isSubmitting:
      submitReportMutation.isPending ||
      submitParkedMutation.isPending ||
      submitLeftMutation.isPending ||
      submitStatusMutation.isPending ||
      submitFullMutation.isPending,

    // Error states
    recentError: recentReportsQuery.error,
    userReportsError: userReportsQuery.error,
    submitError:
      submitReportMutation.error ||
      submitParkedMutation.error ||
      submitLeftMutation.error ||
      submitStatusMutation.error ||
      submitFullMutation.error,

    // Submit functions
    submitReport: submitReportMutation.mutateAsync,
    submitParked: submitParkedMutation.mutateAsync,
    submitLeft: submitLeftMutation.mutateAsync,
    submitStatus: submitStatusMutation.mutateAsync,
    submitFull: submitFullMutation.mutateAsync,

    // Refetch functions
    refetchRecent: recentReportsQuery.refetch,
    refetchUserReports: userReportsQuery.refetch,
  };
}
