/**
 * Nearby Spots Type Definitions
 * Types for the Find Nearby Spot feature with proximity-based scoring
 */

import { LotWithStatusForPermit, OccupancyStatus, ConfidenceLevel, Schedule } from './database';

// ============================================================
// SCORING WEIGHTS
// ============================================================

export interface ScoringWeights {
  availability: number;  // Weight for ML prediction (chance of spot)
  proximity: number;     // Weight for distance from user
  walkTime: number;      // Weight for walk time to destination
  convenience: number;   // Weight for special conditions
}

export type UrgencyLevel = 'critical' | 'moderate' | 'relaxed';

// ============================================================
// DISTANCE & TIME CALCULATIONS
// ============================================================

export interface DistanceInfo {
  meters: number;
  formatted: string;        // "350m" or "1.2km"
}

export interface DriveTimeInfo {
  minutes: number;
  formatted: string;        // "3 min drive"
}

export interface WalkTimeInfo {
  minutes: number | null;
  toBuilding: string | null;
  formatted: string | null; // "8 min walk"
}

// ============================================================
// PREDICTION DATA
// ============================================================

export interface ArrivalPrediction {
  arrivalTime: Date;
  occupancyAtArrival: number;    // 0-100 predicted percent
  chanceOfSpot: number;          // 0-100 probability
  confidence: ConfidenceLevel;
  status: OccupancyStatus;
}

// ============================================================
// FLAGS & METADATA
// ============================================================

export interface SpotFlags {
  isIcingZone: boolean;
  hasTimeLimit: boolean;
  timeLimitMinutes: number | null;
  isRecommended: boolean;
  isCurrentLocation: boolean;    // User is already at this lot
  requiresShuttle: boolean;      // S1 satellite lot
  reason: string;                // "Best availability nearby"
}

// ============================================================
// SCORE BREAKDOWN (for debugging/display)
// ============================================================

export interface ScoreBreakdown {
  availabilityScore: number;     // 0-100
  proximityScore: number;        // 0-100
  walkTimeScore: number;         // 0-100
  convenienceScore: number;      // 0-100
  penaltyApplied: number;        // Total penalty deducted
  rawScore: number;              // Before normalization
  finalScore: number;            // 0-100 final score
}

// ============================================================
// MAIN RESULT TYPE
// ============================================================

export interface NearbySpotResult {
  lot: LotWithStatusForPermit;
  score: number;              // 0-100 final weighted score
  rank: number;               // 1-based ranking

  distance: DistanceInfo;
  driveTime: DriveTimeInfo;
  prediction: ArrivalPrediction;
  walkTime: WalkTimeInfo;
  flags: SpotFlags;

  // Optional detailed breakdown (for debugging)
  breakdown?: ScoreBreakdown;
}

// ============================================================
// FINDER OPTIONS
// ============================================================

export type FinderMode = 'now' | 'planned' | 'nearby';

export interface FinderOptions {
  mode: FinderMode;
  userLocation: {
    latitude: number;
    longitude: number;
  };
  destinationBuilding?: string;   // Building code (e.g., 'rawls', 'library')
  plannedArrivalTime?: Date;      // For 'planned' mode
  urgencyMinutes?: number;        // Minutes until class starts
  includeShuttleLots?: boolean;   // Include S1 with shuttle time
  maxResults?: number;            // Limit results (default 5)
}

// ============================================================
// STALENESS TRACKING
// ============================================================

export type DataFreshness = 'fresh' | 'stale' | 'very_stale';

export interface FreshnessInfo {
  status: DataFreshness;
  lastUpdated: Date;
  ageSeconds: number;
  formatted: string;              // "Updated 30 sec ago"
}

// ============================================================
// FINDER RESULT
// ============================================================

export interface FinderResult {
  spots: NearbySpotResult[];
  recommended: NearbySpotResult | null;
  alternatives: NearbySpotResult[];
  freshness: FreshnessInfo;

  // Metadata
  searchedAt: Date;
  mode: FinderMode;
  destination: string | null;
  totalLotsSearched: number;
  lotsFilteredOut: number;        // Invalid permit, closed, etc.
}

// ============================================================
// UI STATE
// ============================================================

export type FinderViewState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'no_location'
  | 'no_permit'
  | 'all_full';

export interface FinderUIState {
  viewState: FinderViewState;
  errorMessage?: string;
  isRefreshing: boolean;
  selectedMode: FinderMode;
  showDetails: boolean;
}

// ============================================================
// BUILDING DEFINITIONS
// ============================================================

export interface Building {
  id: string;
  name: string;
  shortName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Common TTU buildings for destination picker
export const CAMPUS_BUILDINGS: Building[] = [
  { id: 'sub', name: 'Student Union Building', shortName: 'SUB', coordinates: { latitude: 33.5842, longitude: -101.8745 } },
  { id: 'library', name: 'University Library', shortName: 'Library', coordinates: { latitude: 33.5851, longitude: -101.8767 } },
  { id: 'rawls', name: 'Rawls College of Business', shortName: 'Rawls', coordinates: { latitude: 33.5867, longitude: -101.8723 } },
  { id: 'holden', name: 'Holden Hall', shortName: 'Holden', coordinates: { latitude: 33.5834, longitude: -101.8756 } },
  { id: 'english', name: 'English/Philosophy', shortName: 'ENGL', coordinates: { latitude: 33.5839, longitude: -101.8749 } },
  { id: 'mass_comm', name: 'Mass Communications', shortName: 'MCOM', coordinates: { latitude: 33.5829, longitude: -101.8789 } },
  { id: 'chemistry', name: 'Chemistry Building', shortName: 'CHEM', coordinates: { latitude: 33.5855, longitude: -101.8778 } },
  { id: 'engineering', name: 'Engineering Center', shortName: 'ENG', coordinates: { latitude: 33.5845, longitude: -101.8812 } },
  { id: 'rec', name: 'Student Recreation Center', shortName: 'Rec', coordinates: { latitude: 33.5878, longitude: -101.8745 } },
  { id: 'arena', name: 'United Supermarkets Arena', shortName: 'Arena', coordinates: { latitude: 33.5912, longitude: -101.8723 } },
];

// ============================================================
// HELPER TYPE GUARDS
// ============================================================

export function isValidFinderMode(mode: string): mode is FinderMode {
  return mode === 'now' || mode === 'planned' || mode === 'nearby';
}

export function isValidUrgencyLevel(level: string): level is UrgencyLevel {
  return level === 'critical' || level === 'moderate' || level === 'relaxed';
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_WEIGHTS: ScoringWeights = {
  availability: 0.45,
  proximity: 0.25,
  walkTime: 0.20,
  convenience: 0.10,
};

export const URGENCY_WEIGHTS: Record<UrgencyLevel, ScoringWeights> = {
  critical: {
    availability: 0.55,
    proximity: 0.30,
    walkTime: 0.10,
    convenience: 0.05,
  },
  moderate: {
    availability: 0.45,
    proximity: 0.25,
    walkTime: 0.20,
    convenience: 0.10,
  },
  relaxed: {
    availability: 0.35,
    proximity: 0.20,
    walkTime: 0.35,
    convenience: 0.10,
  },
};

// Campus average driving speed (km/h) - accounting for parking lot navigation
export const CAMPUS_DRIVE_SPEED_KMH = 20;

// Extra time buffer for finding spot within lot (minutes)
export const PARKING_BUFFER_MINUTES = 2;

// Shuttle wait + ride time for S1 (minutes)
export const SHUTTLE_TIME_MINUTES = 13;

// Distance decay constant (calibrated for TTU campus ~866m half-life)
export const DISTANCE_DECAY_K = 0.0008;

// Penalty percentages
export const PENALTIES = {
  icingZone: 0.15,       // 15% penalty for icing zones
  timeLimit: 0.20,       // 20% penalty for time-limited lots
  invalidPermit: 0.30,   // 30% penalty (shouldn't happen if filtered)
  currentLocation: 0.10, // 10% penalty if user already there
};

// Freshness thresholds (seconds)
export const FRESHNESS_THRESHOLDS = {
  fresh: 5 * 60,         // < 5 minutes
  stale: 30 * 60,        // < 30 minutes
  // > 30 minutes = very_stale
};
