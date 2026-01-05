/**
 * Nearby Spots Hook
 *
 * React Query hook for finding nearby parking spots.
 * Integrates with location services, ML predictions, and user preferences.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from './useLocation';
import { useAuthStore } from '@/stores/authStore';
import {
  findNearbySpots,
  findNearbySpotsForPermit,
  getDefaultDestination,
  handleAllLotsFull,
} from '@/services/nearbySpots';
import {
  FinderResult,
  FinderOptions,
  FinderMode,
  NearbySpotResult,
  FinderUIState,
  FinderViewState,
  CAMPUS_BUILDINGS,
} from '@/types/nearbySpots';

// ============================================================
// QUERY KEYS
// ============================================================

export const nearbySpotsKeys = {
  all: ['nearbySpots'] as const,
  finder: (mode: FinderMode, destination?: string) =>
    [...nearbySpotsKeys.all, 'finder', mode, destination] as const,
  forLocation: (lat: number, lng: number) =>
    [...nearbySpotsKeys.all, 'location', lat.toFixed(4), lng.toFixed(4)] as const,
};

// ============================================================
// MAIN HOOK
// ============================================================

export interface UseNearbySpotsOptions {
  /** Auto-fetch when location is available */
  autoFetch?: boolean;
  /** Mode: 'now', 'planned', or 'nearby' */
  mode?: FinderMode;
  /** Destination building for walk time calculation */
  destinationBuilding?: string;
  /** Planned arrival time (for 'planned' mode) */
  plannedArrivalTime?: Date;
  /** Refetch interval in ms (0 to disable) */
  refetchInterval?: number;
}

export interface UseNearbySpotsResult {
  // Data
  result: FinderResult | null;
  recommended: NearbySpotResult | null;
  alternatives: NearbySpotResult[];
  allSpots: NearbySpotResult[];

  // State
  isLoading: boolean;
  isRefetching: boolean;
  isFetched: boolean;
  error: Error | null;
  viewState: FinderViewState;

  // Location
  hasLocation: boolean;
  locationError: string | null;

  // All Full Handler
  allLotsFull: boolean;
  trendingDownLots: NearbySpotResult[];
  fullSuggestion: string | null;

  // Actions
  refetch: () => Promise<void>;
  setMode: (mode: FinderMode) => void;
  setDestination: (building: string) => void;
  getLocation: () => Promise<boolean>;
}

export function useNearbySpots(
  options: UseNearbySpotsOptions = {}
): UseNearbySpotsResult {
  const {
    autoFetch = true,
    mode: initialMode = 'now',
    destinationBuilding: initialDestination,
    plannedArrivalTime,
    refetchInterval = 30000, // 30 seconds default
  } = options;

  // State
  const [mode, setMode] = useState<FinderMode>(initialMode);
  const [destination, setDestinationState] = useState<string | undefined>(initialDestination);
  const [allFullData, setAllFullData] = useState<{
    trendingDown: NearbySpotResult[];
    suggestion: string;
  } | null>(null);

  // Hooks
  const queryClient = useQueryClient();
  const { appUser } = useAuthStore();
  const {
    location,
    error: locationError,
    isLoading: locationLoading,
    permissionStatus,
    getCurrentLocation,
    requestPermission,
  } = useLocation();

  // Derived state
  const hasLocation = !!location;
  const hasPermit = !!appUser?.permit_type && appUser.permit_type !== 'none';
  const permitType = appUser?.permit_type ?? 'none';
  const schedule = appUser?.schedule ?? null;

  // Default destination from schedule if not set
  useEffect(() => {
    if (!destination && schedule) {
      const defaultDest = getDefaultDestination(schedule);
      setDestinationState(defaultDest);
    }
  }, [schedule, destination]);

  // Build finder options
  const finderOptions: FinderOptions | null = location ? {
    mode,
    userLocation: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    destinationBuilding: destination,
    plannedArrivalTime,
    urgencyMinutes: calculateUrgency(schedule),
    includeShuttleLots: true,
    maxResults: 5,
  } : null;

  // Query
  const query = useQuery({
    queryKey: nearbySpotsKeys.finder(mode, destination),
    queryFn: async () => {
      if (!finderOptions) {
        throw new Error('Location not available');
      }
      return findNearbySpots(finderOptions);
    },
    enabled: autoFetch && hasLocation && hasPermit,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (cacheTime renamed to gcTime in v5)
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Check for "all lots full" scenario
  useEffect(() => {
    if (query.data?.spots) {
      const allFull = query.data.spots.every(
        spot => spot.prediction.occupancyAtArrival >= 90
      );

      if (allFull && query.data.spots.length > 0) {
        handleAllLotsFull(query.data.spots).then(setAllFullData);
      } else {
        setAllFullData(null);
      }
    }
  }, [query.data?.spots]);

  // Determine view state
  const getViewState = (): FinderViewState => {
    if (query.isLoading || locationLoading) return 'loading';
    if (query.error) return 'error';
    if (!hasLocation && permissionStatus !== 'granted') return 'no_location';
    if (!hasPermit) return 'no_permit';
    if (allFullData) return 'all_full';
    if (query.data && query.data.spots.length > 0) return 'success';
    return 'idle';
  };

  // Actions
  const refetch = useCallback(async () => {
    // Get fresh location first
    await getCurrentLocation();
    // Then refetch query
    await query.refetch();
  }, [getCurrentLocation, query]);

  const setDestination = useCallback((building: string) => {
    setDestinationState(building);
    // Invalidate query to refetch with new destination
    queryClient.invalidateQueries({ queryKey: nearbySpotsKeys.all });
  }, [queryClient]);

  const getLocationAction = useCallback(async (): Promise<boolean> => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }
    const loc = await getCurrentLocation();
    return !!loc;
  }, [permissionStatus, requestPermission, getCurrentLocation]);

  return {
    // Data
    result: query.data ?? null,
    recommended: query.data?.recommended ?? null,
    alternatives: query.data?.alternatives ?? [],
    allSpots: query.data?.spots ?? [],

    // State
    isLoading: query.isLoading || locationLoading,
    isRefetching: query.isRefetching,
    isFetched: query.isFetched,
    error: query.error ?? null,
    viewState: getViewState(),

    // Location
    hasLocation,
    locationError,

    // All Full Handler
    allLotsFull: !!allFullData,
    trendingDownLots: allFullData?.trendingDown ?? [],
    fullSuggestion: allFullData?.suggestion ?? null,

    // Actions
    refetch,
    setMode,
    setDestination,
    getLocation: getLocationAction,
  };
}

// ============================================================
// SPECIALIZED HOOKS
// ============================================================

/**
 * Simple hook for quick nearby spot lookup
 * Uses current location and permit automatically
 */
export function useQuickNearbySpots() {
  return useNearbySpots({
    autoFetch: true,
    mode: 'now',
    refetchInterval: 30000,
  });
}

/**
 * Hook for planned arrival mode
 */
export function usePlannedNearbySpots(arrivalTime: Date, destination?: string) {
  return useNearbySpots({
    autoFetch: true,
    mode: 'planned',
    plannedArrivalTime: arrivalTime,
    destinationBuilding: destination,
    refetchInterval: 60000, // Slower refresh for planned
  });
}

/**
 * Hook for pure distance-based lookup
 */
export function useNearestSpots() {
  return useNearbySpots({
    autoFetch: true,
    mode: 'nearby',
    refetchInterval: 15000, // Faster refresh for distance
  });
}

// ============================================================
// UTILITY HOOKS
// ============================================================

/**
 * Hook to get available destination buildings
 */
export function useCampusBuildings() {
  return {
    buildings: CAMPUS_BUILDINGS,
    getBuilding: (id: string) => CAMPUS_BUILDINGS.find(b => b.id === id),
    getBuildingName: (id: string) => CAMPUS_BUILDINGS.find(b => b.id === id)?.name ?? id,
  };
}

/**
 * Hook for finder UI state management
 */
export function useFinderUIState() {
  const [state, setState] = useState<FinderUIState>({
    viewState: 'idle',
    isRefreshing: false,
    selectedMode: 'now',
    showDetails: false,
  });

  const setViewState = useCallback((viewState: FinderViewState) => {
    setState(prev => ({ ...prev, viewState }));
  }, []);

  const setRefreshing = useCallback((isRefreshing: boolean) => {
    setState(prev => ({ ...prev, isRefreshing }));
  }, []);

  const setMode = useCallback((selectedMode: FinderMode) => {
    setState(prev => ({ ...prev, selectedMode }));
  }, []);

  const toggleDetails = useCallback(() => {
    setState(prev => ({ ...prev, showDetails: !prev.showDetails }));
  }, []);

  const setError = useCallback((errorMessage?: string) => {
    setState(prev => ({
      ...prev,
      viewState: errorMessage ? 'error' : prev.viewState,
      errorMessage,
    }));
  }, []);

  return {
    state,
    setViewState,
    setRefreshing,
    setMode,
    toggleDetails,
    setError,
  };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Calculate urgency in minutes from schedule
 */
function calculateUrgency(schedule: any): number {
  if (!schedule) return 30; // Default moderate

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const daySchedule = schedule[today];

  if (!daySchedule?.classes?.length) return 60; // No class today, relaxed

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const cls of daySchedule.classes) {
    const [hours, minutes] = cls.start.split(':').map(Number);
    const classMinutes = hours * 60 + minutes;
    const diff = classMinutes - currentMinutes;

    if (diff > 0) {
      return diff; // Minutes until next class
    }
  }

  return 120; // All classes done, very relaxed
}

/**
 * Prefetch nearby spots for common scenarios
 */
export function usePrefetchNearbySpots() {
  const queryClient = useQueryClient();
  const { location } = useLocation();
  const { appUser } = useAuthStore();

  const prefetch = useCallback(async () => {
    if (!location || !appUser?.permit_type) return;

    // Prefetch for 'now' mode
    await queryClient.prefetchQuery({
      queryKey: nearbySpotsKeys.finder('now', undefined),
      queryFn: () => findNearbySpots({
        mode: 'now',
        userLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        maxResults: 5,
      }),
      staleTime: 5 * 60 * 1000,
    });
  }, [location, appUser, queryClient]);

  return prefetch;
}
