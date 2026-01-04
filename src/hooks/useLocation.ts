/**
 * Location Hook
 * Handle device location for parking detection
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface UseLocationResult {
  location: LocationData | null;
  error: string | null;
  isLoading: boolean;
  permissionStatus: Location.PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationData | null>;
  startWatching: () => void;
  stopWatching: () => void;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    };
    checkPermission();
  }, []);

  // Request location permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(foregroundStatus);

      if (foregroundStatus !== 'granted') {
        setError('Location permission denied');
        return false;
      }

      // Request background permission for iOS
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied');
        }
      }

      return true;
    } catch (e) {
      setError('Failed to request location permission');
      return false;
    }
  }, []);

  // Get current location once
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = permissionStatus === 'granted' || await requestPermission();
      if (!hasPermission) {
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setLocation(locationData);
      return locationData;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to get location';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, requestPermission]);

  // Start watching location
  const startWatching = useCallback(async () => {
    if (subscription) return;

    try {
      const hasPermission = permissionStatus === 'granted' || await requestPermission();
      if (!hasPermission) return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Or when moved 50 meters
        },
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        }
      );

      setSubscription(sub);
    } catch (e) {
      setError('Failed to start location watching');
    }
  }, [permissionStatus, requestPermission, subscription]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
  }, [subscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [subscription]);

  return {
    location,
    error,
    isLoading,
    permissionStatus,
    requestPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
  };
}

/**
 * Check if a location is within a specific lot's geofence
 */
export function isLocationInLot(
  location: LocationData,
  lotCenter: { lat: number; lng: number },
  radiusMeters: number = 100
): boolean {
  const distance = getDistanceMeters(
    location.latitude,
    location.longitude,
    lotCenter.lat,
    lotCenter.lng
  );
  return distance <= radiusMeters;
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
export function getDistanceMeters(
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

/**
 * Find the nearest lot to a location
 */
export function findNearestLot(
  location: LocationData,
  lots: Array<{ id: string; center: { lat: number; lng: number } }>
): { lotId: string; distance: number } | null {
  if (lots.length === 0) return null;

  let nearest = lots[0];
  let minDistance = getDistanceMeters(
    location.latitude,
    location.longitude,
    nearest.center.lat,
    nearest.center.lng
  );

  for (const lot of lots.slice(1)) {
    const distance = getDistanceMeters(
      location.latitude,
      location.longitude,
      lot.center.lat,
      lot.center.lng
    );
    if (distance < minDistance) {
      nearest = lot;
      minDistance = distance;
    }
  }

  return { lotId: nearest.id, distance: minDistance };
}
