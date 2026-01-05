// ============================================================
// GEOFENCE DETECTION UTILITY
// Detects which parking lot the user is currently in
// Uses center coordinates + radius for simple geofence detection
// ============================================================

import { LOTS, LOTS_ARRAY } from '@/constants/lots';
import { Lot } from '@/types/database';

// Default radius in meters for lot detection
// Most parking lots are roughly 50-100m in diameter
const DEFAULT_LOT_RADIUS_METERS = 75;

// Earth's radius in meters
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Result of geofence detection
 */
export interface GeofenceResult {
  /** Whether user is inside any parking lot */
  isInLot: boolean;
  /** The detected lot (if any) */
  lot: Lot | null;
  /** Lot ID for quick access */
  lotId: string | null;
  /** Lot name for display */
  lotName: string | null;
  /** Distance to the lot center in meters */
  distanceMeters: number | null;
  /** All nearby lots sorted by distance */
  nearbyLots: Array<{
    lot: Lot;
    distanceMeters: number;
  }>;
}

/**
 * Detect which parking lot the user is currently in
 * @param userLat User's current latitude
 * @param userLng User's current longitude
 * @param radiusMeters Radius to consider "inside" a lot (default: 75m)
 * @returns GeofenceResult with detected lot info
 */
export function detectCurrentLot(
  userLat: number,
  userLng: number,
  radiusMeters: number = DEFAULT_LOT_RADIUS_METERS
): GeofenceResult {
  // Calculate distance to each lot
  const lotsWithDistance = LOTS_ARRAY.map((lot) => ({
    lot,
    distanceMeters: calculateDistance(
      userLat,
      userLng,
      lot.center.lat,
      lot.center.lng
    ),
  })).sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Get lots within the radius (user is "in" the lot)
  const lotsInRange = lotsWithDistance.filter(
    (item) => item.distanceMeters <= radiusMeters
  );

  // Get nearby lots (within 500m for suggestions)
  const nearbyLots = lotsWithDistance.filter(
    (item) => item.distanceMeters <= 500
  );

  if (lotsInRange.length > 0) {
    // User is in a lot - return the closest one
    const closest = lotsInRange[0];
    return {
      isInLot: true,
      lot: closest.lot,
      lotId: closest.lot.id,
      lotName: closest.lot.name,
      distanceMeters: closest.distanceMeters,
      nearbyLots,
    };
  }

  // User is not in any lot
  return {
    isInLot: false,
    lot: null,
    lotId: null,
    lotName: null,
    distanceMeters: null,
    nearbyLots,
  };
}

/**
 * Get the closest parking lot to the user
 * @param userLat User's current latitude
 * @param userLng User's current longitude
 * @returns The closest lot and distance
 */
export function getClosestLot(
  userLat: number,
  userLng: number
): { lot: Lot; distanceMeters: number } | null {
  if (LOTS_ARRAY.length === 0) return null;

  let closest: { lot: Lot; distanceMeters: number } | null = null;

  for (const lot of LOTS_ARRAY) {
    const distance = calculateDistance(
      userLat,
      userLng,
      lot.center.lat,
      lot.center.lng
    );

    if (!closest || distance < closest.distanceMeters) {
      closest = { lot, distanceMeters: distance };
    }
  }

  return closest;
}

/**
 * Check if user is within a specific lot
 * @param userLat User's current latitude
 * @param userLng User's current longitude
 * @param lotId Lot ID to check
 * @param radiusMeters Radius to consider "inside" (default: 75m)
 */
export function isInLot(
  userLat: number,
  userLng: number,
  lotId: string,
  radiusMeters: number = DEFAULT_LOT_RADIUS_METERS
): boolean {
  const lot = LOTS[lotId];
  if (!lot) return false;

  const distance = calculateDistance(
    userLat,
    userLng,
    lot.center.lat,
    lot.center.lng
  );

  return distance <= radiusMeters;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 100) {
    return `${Math.round(meters)}m`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 10) * 10}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Get walk time estimate from distance (average walking speed ~1.4 m/s)
 */
export function estimateWalkTime(distanceMeters: number): number {
  const walkingSpeedMPS = 1.4; // meters per second
  return Math.ceil(distanceMeters / walkingSpeedMPS / 60); // minutes
}
