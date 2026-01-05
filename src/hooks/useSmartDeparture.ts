// ============================================================
// SMART DEPARTURE HOOK
// React hook for intelligent departure recommendations
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  generateSmartDeparture,
  toCardFormat,
  SmartDepartureRecommendation,
  DepartureOptions,
} from '@/services/smartDeparture';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface UseSmartDepartureOptions {
  /** Auto-refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
  /** Commute time override in minutes */
  commuteMinutes?: number;
  /** Preferred lot ID */
  preferredLotId?: string;
  /** Avoid icing zone lots */
  avoidIcingZones?: boolean;
  /** Enable/disable auto-refresh */
  autoRefresh?: boolean;
}

interface UseSmartDepartureResult {
  /** Full recommendation data */
  recommendation: SmartDepartureRecommendation | null;
  /** Card-formatted data (for DepartureCard component) */
  cardData: ReturnType<typeof toCardFormat> | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Manually refresh recommendation */
  refresh: () => Promise<void>;
  /** Last refresh timestamp */
  lastRefreshed: Date | null;
  /** Time until recommendation expires (auto-refresh countdown) */
  refreshCountdown: number | null;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useSmartDeparture(
  options: UseSmartDepartureOptions = {}
): UseSmartDepartureResult {
  const {
    refreshInterval = 60000, // 1 minute default
    commuteMinutes,
    preferredLotId,
    avoidIcingZones = false,
    autoRefresh = true,
  } = options;

  // State
  const [recommendation, setRecommendation] = useState<SmartDepartureRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);

  // Get user data from auth store (appUser has schedule and permit_type)
  const { appUser } = useAuthStore();

  // Build departure options
  const departureOptions: DepartureOptions = useMemo(
    () => ({
      commuteMinutes,
      preferredLotId,
      avoidIcingZones,
    }),
    [commuteMinutes, preferredLotId, avoidIcingZones]
  );

  // Fetch recommendation
  const fetchRecommendation = useCallback(async () => {
    if (!appUser) {
      setRecommendation(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await generateSmartDeparture(
        appUser.schedule || null,
        appUser.permit_type || 'commuter_west',
        departureOptions
      );

      setRecommendation(result);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Smart departure error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recommendation');
    } finally {
      setIsLoading(false);
    }
  }, [appUser, departureOptions]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchRecommendation();
  }, [fetchRecommendation]);

  // Initial fetch
  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchRecommendation();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchRecommendation]);

  // Countdown timer
  useEffect(() => {
    if (!lastRefreshed || !autoRefresh || refreshInterval <= 0) {
      setRefreshCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - lastRefreshed.getTime();
      const remaining = Math.max(0, Math.ceil((refreshInterval - elapsed) / 1000));
      setRefreshCountdown(remaining);
    };

    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);

    return () => clearInterval(timerId);
  }, [lastRefreshed, autoRefresh, refreshInterval]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchRecommendation();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [fetchRecommendation]);

  // ============================================================
  // SUPABASE REALTIME SUBSCRIPTION
  // Auto-refresh when lot_status table changes (user reports, etc.)
  // ============================================================
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Subscribe to lot_status changes
    const channel = supabase
      .channel('lot_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'lot_status',
        },
        (payload) => {
          console.log('[SmartDeparture] Real-time update received:', payload.eventType);
          // Refresh recommendation when any lot status changes
          fetchRecommendation();
        }
      )
      .subscribe((status) => {
        console.log('[SmartDeparture] Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      // Cleanup subscription on unmount
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [fetchRecommendation]);

  // Convert to card format
  const cardData = useMemo(() => {
    if (!recommendation) return null;
    return toCardFormat(recommendation);
  }, [recommendation]);

  return {
    recommendation,
    cardData,
    isLoading,
    error,
    refresh,
    lastRefreshed,
    refreshCountdown,
  };
}

// ============================================================
// SIMPLIFIED HOOK FOR DEPARTURE CARD
// ============================================================

/**
 * Simplified hook that returns data formatted for the DepartureCard component
 */
export function useDepartureCard(options?: UseSmartDepartureOptions) {
  const { cardData, isLoading, error, refresh } = useSmartDeparture(options);
  return { recommendation: cardData, isLoading, error, refresh };
}

// ============================================================
// UTILITY HOOKS
// ============================================================

/**
 * Hook to get just the next class info
 */
export function useNextClass() {
  const { recommendation } = useSmartDeparture({ autoRefresh: false });

  return useMemo(() => {
    if (!recommendation?.firstClass) return null;

    return {
      time: recommendation.firstClass.time,
      building: recommendation.firstClass.buildingName,
      minutesUntil: recommendation.firstClass.minutesUntil,
      leaveBy: recommendation.leaveByTimeFormatted,
    };
  }, [recommendation]);
}

/**
 * Hook to check if user should leave now
 */
export function useShouldLeaveNow(bufferMinutes: number = 5) {
  const { recommendation } = useSmartDeparture({ refreshInterval: 30000 });

  return useMemo(() => {
    if (!recommendation) return { shouldLeave: false, urgency: 'none' as const };

    const now = new Date();
    const leaveBy = recommendation.leaveByTime;
    const minutesUntilLeave = (leaveBy.getTime() - now.getTime()) / 60000;

    if (minutesUntilLeave <= 0) {
      return { shouldLeave: true, urgency: 'critical' as const, minutesLate: Math.abs(minutesUntilLeave) };
    }
    if (minutesUntilLeave <= bufferMinutes) {
      return { shouldLeave: true, urgency: 'high' as const, minutesRemaining: minutesUntilLeave };
    }
    if (minutesUntilLeave <= bufferMinutes * 2) {
      return { shouldLeave: false, urgency: 'medium' as const, minutesRemaining: minutesUntilLeave };
    }

    return { shouldLeave: false, urgency: 'low' as const, minutesRemaining: minutesUntilLeave };
  }, [recommendation, bufferMinutes]);
}

export default useSmartDeparture;
