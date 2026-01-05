/**
 * Quick Report Detection Hook
 * Detects when to prompt user for a parking report based on:
 * 1. App returning to foreground after being backgrounded
 * 2. Time of day (peak parking hours)
 * 3. User hasn't reported recently
 * 4. Device location (if available) near a lot
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuthStore } from '@/stores/authStore';
import { useParkingStore } from '@/stores/parkingStore';

// Constants
const STORAGE_KEY = '@raiderpark/last_report_prompt';
const MIN_BACKGROUND_TIME = 5 * 60 * 1000; // 5 minutes in background to trigger
const MIN_TIME_BETWEEN_PROMPTS = 60 * 60 * 1000; // 1 hour between prompts
const PEAK_HOURS_START = 7; // 7 AM
const PEAK_HOURS_END = 18; // 6 PM
const LOT_PROXIMITY_METERS = 200; // Within 200m of a lot

interface DetectedLot {
  lotId: string;
  lotName: string;
  distance: number;
}

interface QuickReportState {
  shouldPrompt: boolean;
  detectedLot: DetectedLot | null;
  dismissPrompt: () => void;
  markReported: () => void;
}

export function useQuickReportDetection(): QuickReportState {
  const { appUser } = useAuthStore();
  const { lotsForPermit } = useParkingStore();

  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [detectedLot, setDetectedLot] = useState<DetectedLot | null>(null);

  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);
  const lastPromptTime = useRef<number>(0);

  // Load last prompt time from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored) {
        lastPromptTime.current = parseInt(stored, 10);
      }
    });
  }, []);

  // Check if it's peak parking hours
  const isPeakHours = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= PEAK_HOURS_START && hour <= PEAK_HOURS_END;
  }, []);

  // Check if enough time has passed since last prompt
  const canPrompt = useCallback(() => {
    const now = Date.now();
    return now - lastPromptTime.current > MIN_TIME_BETWEEN_PROMPTS;
  }, []);

  // Find the nearest lot to user's location
  const findNearestLot = useCallback(async (): Promise<DetectedLot | null> => {
    try {
      // Check location permission
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Find nearest lot from user's valid lots
      let nearestLot: DetectedLot | null = null;
      let minDistance = Infinity;

      for (const lot of lotsForPermit) {
        // Skip if lot doesn't have center coordinates
        if (!lot.center) continue;

        // Calculate distance (simple Haversine approximation)
        const lotLat = typeof lot.center === 'object' ? (lot.center as any).lat : 0;
        const lotLng = typeof lot.center === 'object' ? (lot.center as any).lng : 0;

        if (!lotLat || !lotLng) continue;

        const distance = calculateDistance(latitude, longitude, lotLat, lotLng);

        if (distance < minDistance && distance <= LOT_PROXIMITY_METERS) {
          minDistance = distance;
          nearestLot = {
            lotId: lot.lot_id,
            lotName: lot.lot_name || lot.lot_id,
            distance,
          };
        }
      }

      return nearestLot;
    } catch (error) {
      console.warn('Error detecting location:', error);
      return null;
    }
  }, [lotsForPermit]);

  // Check conditions and show prompt if appropriate
  const checkAndPrompt = useCallback(async () => {
    // Skip if not logged in or no permit
    if (!appUser || appUser.permit_type === 'none') return;

    // Skip if not peak hours
    if (!isPeakHours()) return;

    // Skip if recently prompted
    if (!canPrompt()) return;

    // Try to detect nearby lot
    const nearbyLot = await findNearestLot();

    if (nearbyLot) {
      setDetectedLot(nearbyLot);
      setShouldPrompt(true);
      lastPromptTime.current = Date.now();
      AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  }, [appUser, isPeakHours, canPrompt, findNearestLot]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Track when app goes to background
      if (
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        backgroundedAt.current = Date.now();
      }

      // Check when app returns to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Check if was backgrounded long enough (user was likely driving/parking)
        if (
          backgroundedAt.current &&
          Date.now() - backgroundedAt.current >= MIN_BACKGROUND_TIME
        ) {
          checkAndPrompt();
        }
        backgroundedAt.current = null;
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndPrompt]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    setShouldPrompt(false);
    setDetectedLot(null);
  }, []);

  // Mark as reported (dismisses and updates last report time)
  const markReported = useCallback(() => {
    setShouldPrompt(false);
    setDetectedLot(null);
    lastPromptTime.current = Date.now();
    AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  return {
    shouldPrompt,
    detectedLot,
    dismissPrompt,
    markReported,
  };
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
