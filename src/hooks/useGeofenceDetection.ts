// ============================================================
// GEOFENCE DETECTION HOOK
// Detects which parking lot the user is currently in
// Used for smart "I Just Parked" quick reporting
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useLocation, LocationData } from './useLocation';
import { detectCurrentLot, GeofenceResult } from '@/utils/geofence';
import { Lot } from '@/types/database';

export interface GeofenceDetectionState {
  /** Whether currently detecting location */
  isDetecting: boolean;
  /** Whether user is inside a parking lot */
  isInLot: boolean;
  /** The detected lot (if any) */
  detectedLot: Lot | null;
  /** Lot ID for quick access */
  detectedLotId: string | null;
  /** Lot name for display */
  detectedLotName: string | null;
  /** Distance to lot center in meters */
  distanceMeters: number | null;
  /** All nearby lots for fallback selection */
  nearbyLots: Array<{ lot: Lot; distanceMeters: number }>;
  /** Error message if detection failed */
  error: string | null;
  /** Whether location permission is granted */
  hasLocationPermission: boolean;
}

export interface UseGeofenceDetectionResult extends GeofenceDetectionState {
  /** Trigger one-time lot detection */
  detectLot: () => Promise<GeofenceResult | null>;
  /** Request location permission */
  requestPermission: () => Promise<boolean>;
  /** Clear detection state */
  reset: () => void;
}

/**
 * Hook for detecting which parking lot the user is currently in
 *
 * @example
 * ```tsx
 * const {
 *   isDetecting,
 *   isInLot,
 *   detectedLot,
 *   detectLot,
 *   nearbyLots
 * } = useGeofenceDetection();
 *
 * const handleJustParked = async () => {
 *   const result = await detectLot();
 *   if (result?.isInLot) {
 *     // Show QuickReportModal with detected lot
 *     setShowQuickReport(true);
 *   } else {
 *     // Navigate to full report screen
 *     router.push('/report');
 *   }
 * };
 * ```
 */
export function useGeofenceDetection(): UseGeofenceDetectionResult {
  const {
    getCurrentLocation,
    requestPermission: requestLocationPermission,
    permissionStatus,
  } = useLocation();

  const [state, setState] = useState<GeofenceDetectionState>({
    isDetecting: false,
    isInLot: false,
    detectedLot: null,
    detectedLotId: null,
    detectedLotName: null,
    distanceMeters: null,
    nearbyLots: [],
    error: null,
    hasLocationPermission: permissionStatus === 'granted',
  });

  // Update permission status when it changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      hasLocationPermission: permissionStatus === 'granted',
    }));
  }, [permissionStatus]);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestLocationPermission();
    setState(prev => ({
      ...prev,
      hasLocationPermission: granted,
    }));
    return granted;
  }, [requestLocationPermission]);

  /**
   * Detect which lot the user is currently in
   */
  const detectLot = useCallback(async (): Promise<GeofenceResult | null> => {
    setState(prev => ({
      ...prev,
      isDetecting: true,
      error: null,
    }));

    try {
      // Get current location
      const location = await getCurrentLocation();

      if (!location) {
        setState(prev => ({
          ...prev,
          isDetecting: false,
          error: 'Could not get your location. Please enable location services.',
        }));
        return null;
      }

      // Detect lot using geofence utility
      const result = detectCurrentLot(location.latitude, location.longitude);

      // Provide haptic feedback based on result
      if (result.isInLot) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Update state with result
      setState(prev => ({
        ...prev,
        isDetecting: false,
        isInLot: result.isInLot,
        detectedLot: result.lot,
        detectedLotId: result.lotId,
        detectedLotName: result.lotName,
        distanceMeters: result.distanceMeters,
        nearbyLots: result.nearbyLots,
        error: null,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to detect your location';

      setState(prev => ({
        ...prev,
        isDetecting: false,
        error: errorMessage,
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return null;
    }
  }, [getCurrentLocation]);

  /**
   * Reset detection state
   */
  const reset = useCallback(() => {
    setState({
      isDetecting: false,
      isInLot: false,
      detectedLot: null,
      detectedLotId: null,
      detectedLotName: null,
      distanceMeters: null,
      nearbyLots: [],
      error: null,
      hasLocationPermission: permissionStatus === 'granted',
    });
  }, [permissionStatus]);

  return {
    ...state,
    detectLot,
    requestPermission,
    reset,
  };
}

export default useGeofenceDetection;
