/**
 * Permits Hooks
 * React Query hooks for permit type data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import * as permitsService from '@/services/permits';
import { PermitType } from '@/services/permits';

// Query Keys
export const permitKeys = {
  all: ['permits'] as const,
  types: () => [...permitKeys.all, 'types'] as const,
  type: (id: string) => [...permitKeys.types(), id] as const,
  categories: () => [...permitKeys.all, 'categories'] as const,
  byCategory: () => [...permitKeys.all, 'byCategory'] as const,
  rules: (permitType: string) => [...permitKeys.all, 'rules', permitType] as const,
  validLots: (permitType: string) => [...permitKeys.all, 'validLots', permitType] as const,
};

/**
 * Hook to fetch all active permit types
 */
export function usePermitTypes() {
  return useQuery({
    queryKey: permitKeys.types(),
    queryFn: permitsService.fetchAllPermitTypes,
    staleTime: 1000 * 60 * 60, // 1 hour (permit types rarely change)
    gcTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
}

/**
 * Hook to fetch a single permit type by ID
 */
export function usePermitType(permitId: string) {
  return useQuery({
    queryKey: permitKeys.type(permitId),
    queryFn: () => permitsService.fetchPermitTypeById(permitId),
    enabled: !!permitId,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook to fetch permits grouped by category
 */
export function usePermitsByCategory() {
  return useQuery({
    queryKey: permitKeys.byCategory(),
    queryFn: permitsService.fetchPermitsByCategory,
    staleTime: 1000 * 60 * 60,
    select: (data) => {
      // Convert Map to array for easier rendering
      const result: { category: string; permits: PermitType[] }[] = [];
      data.forEach((permits, category) => {
        result.push({ category, permits });
      });
      // Sort categories
      const order = ['commuter', 'residence', 'garage', 'other'];
      result.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
      return result;
    },
  });
}

/**
 * Hook to fetch permit categories (from database view)
 */
export function usePermitCategories() {
  return useQuery({
    queryKey: permitKeys.categories(),
    queryFn: permitsService.fetchPermitCategories,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook to fetch permit rules for a specific permit type
 */
export function usePermitRules(permitType: string) {
  return useQuery({
    queryKey: permitKeys.rules(permitType),
    queryFn: () => permitsService.fetchPermitRules(permitType),
    enabled: !!permitType,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook to fetch valid lots for a permit type
 */
export function useValidLotsForPermit(permitType: string) {
  return useQuery({
    queryKey: permitKeys.validLots(permitType),
    queryFn: () => permitsService.fetchValidLotsForPermit(permitType),
    enabled: !!permitType && permitType !== 'none',
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook to get the current user's permit type details
 */
export function useCurrentUserPermit() {
  const { appUser } = useAuthStore();
  const permitType = appUser?.permit_type ?? 'none';

  return useQuery({
    queryKey: permitKeys.type(permitType),
    queryFn: () => permitsService.fetchPermitTypeById(permitType),
    enabled: !!permitType && permitType !== 'none',
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook to update user's permit type
 */
export function useUpdatePermitType() {
  const queryClient = useQueryClient();
  const { updatePermitType } = useAuthStore();

  return useMutation({
    mutationFn: async (permitType: string) => {
      // Validate permit exists first
      const permit = await permitsService.fetchPermitTypeById(permitType);
      if (!permit && permitType !== 'none') {
        throw new Error('Invalid permit type');
      }
      // Update in database via authStore
      await updatePermitType(permitType as any);
      return permit;
    },
    onSuccess: (_, permitType) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: permitKeys.type(permitType) });
      queryClient.invalidateQueries({ queryKey: ['lots', 'forPermit'] });
    },
  });
}

/**
 * Hook to check parking rules for current time
 */
export function useParkingRules() {
  const now = new Date();

  return {
    isParkingFree: permitsService.isParkingFree(now),
    isCrossLotAllowed: permitsService.isCrossLotAllowed(now),
    nextFreeTime: getNextFreeTime(now),
    nextCrossLotTime: getNextCrossLotTime(now),
  };
}

// Helper functions for time calculations
function getNextFreeTime(now: Date): Date | null {
  const dayOfWeek = now.getDay();

  // If weekend, already free
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return null;
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const freeTimeMinutes = 17 * 60 + 30; // 5:30 PM

  // If already past 5:30 PM, return null
  if (currentMinutes >= freeTimeMinutes) {
    return null;
  }

  // Return today at 5:30 PM
  const nextFree = new Date(now);
  nextFree.setHours(17, 30, 0, 0);
  return nextFree;
}

function getNextCrossLotTime(now: Date): Date | null {
  const dayOfWeek = now.getDay();

  // If weekend, already allowed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return null;
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const crossLotMinutes = 14 * 60 + 30; // 2:30 PM

  // If already past 2:30 PM, return null
  if (currentMinutes >= crossLotMinutes) {
    return null;
  }

  // Return today at 2:30 PM
  const nextCrossLot = new Date(now);
  nextCrossLot.setHours(14, 30, 0, 0);
  return nextCrossLot;
}
