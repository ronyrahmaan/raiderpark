// ============================================================
// RAIDER PARK DATABASE TYPES
// Auto-generate with: npx supabase gen types typescript --local > src/types/database.ts
// ============================================================

// Permit types - matches database enum 'permit_type'
export type PermitType =
  | 'commuter_west'
  | 'commuter_north'
  | 'commuter_satellite'
  | 'commuter_icc'
  | 'evening_commuter'
  | 'satellite'
  | 'residence_z1'
  | 'residence_z2'
  | 'residence_z3'
  | 'residence_z4'
  | 'residence_z5'
  | 'residence_z6'
  | 'residence_z7'
  | 'faculty_staff'
  | 'garage_flint'
  | 'garage_raider'
  | 'visitor'
  | 'none';

// Campus areas - matches database enum 'lot_area'
export type LotArea =
  | 'commuter_west'
  | 'commuter_north'
  | 'satellite'
  | 'residence'
  | 'garage'
  | 'metered'
  | 'faculty';

// Occupancy levels - matches database enum 'occupancy_status'
export type OccupancyStatus = 'open' | 'busy' | 'filling' | 'full' | 'closed';

// Confidence levels - matches database enum 'confidence_level'
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';

// Trend direction for occupancy changes
export type Trend = 'rising' | 'stable' | 'falling';

// Event types - matches database enum 'event_type'
export type EventType =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'concert'
  | 'graduation'
  | 'university'
  | 'icing'
  | 'construction'
  | 'other';

// Report types - matches database enum 'report_type'
export type ReportType = 'parked' | 'left' | 'status_report' | 'full_report' | 'enforcement' | 'hazard';

// Reporter levels - matches database enum 'reporter_level'
export type ReporterLevel =
  | 'newbie'
  | 'rookie'
  | 'regular'
  | 'veteran'
  | 'legend'
  | 'mvp'
  | 'hall_of_fame';

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export interface NotificationPreferences {
  departure_reminders: boolean;
  lot_filling: boolean;
  spot_opening: boolean;
  event_closures: boolean;
  tower_icing: boolean;
  time_limit_warnings: boolean;
  weekly_summary: boolean;
}

// ============================================================
// SCHEDULE
// ============================================================

export interface ClassTime {
  start: string; // HH:MM format
  end: string;
  building?: string;
}

export interface DaySchedule {
  classes: ClassTime[];
}

export interface Schedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

// ============================================================
// CORE ENTITIES
// ============================================================

export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  permit_type: PermitType;
  residence_zone: string | null;
  notification_preferences: NotificationPreferences;
  schedule: Schedule | null;
  location_enabled: boolean;
  push_token: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface Lot {
  id: string; // e.g., 'C11', 'C4', 'S1'
  name: string;
  short_name: string | null;
  area: LotArea;
  center: {
    lat: number;
    lng: number;
  };
  geofence: Array<{ lat: number; lng: number }> | null;
  capacity: number | null;
  accessible_spots: number;
  ev_charging: boolean;
  time_limit_minutes: number | null;
  is_icing_zone: boolean;
  walk_times: Record<string, number>; // { "library": 6, "rawls": 8 }
  notes: string[];
  common_violations: string[];
  created_at: string;
  updated_at: string;
}

export interface LotStatus {
  lot_id: string;
  occupancy_percent: number;
  status: OccupancyStatus;
  confidence: ConfidenceLevel;
  trend: Trend;
  report_count_1h: number;
  geofence_events_1h: number;
  last_report_at: string | null;
  last_report_by: string | null;
  is_manually_set: boolean;
  manual_note: string | null;
  updated_at: string;
}

export interface LotWithStatus extends Lot {
  lot_id: string; // Alias for id for compatibility
  lot_name: string; // Alias for name for compatibility
  occupancy_percent: number;
  status: OccupancyStatus;
  confidence: ConfidenceLevel;
  trend: Trend | null;
  report_count_1h: number;
  last_report_at: string | null;
  last_report_time?: string | null;
  status_updated_at: string;
  is_valid_now?: boolean;
  valid_after?: string | null;
  valid_permits?: PermitType[];
}

export interface PermitRule {
  id: string;
  lot_id: string;
  permit_type: PermitType;
  valid_from: string; // TIME format HH:MM
  valid_until: string;
  valid_days: number[]; // 0=Sun, 1=Mon, etc.
  is_free: boolean;
  notes: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string | null;
  lot_id: string;
  report_type: ReportType;
  occupancy_status: OccupancyStatus | null;
  occupancy_percent: number | null;
  note: string | null;
  location: { lat: number; lng: number } | null;
  is_geofence_triggered: boolean;
  accuracy_score: number | null;
  created_at: string;
}

export type EventSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export interface ParkingEvent {
  id: string;
  name: string;
  event_type: EventType;
  description: string | null;
  starts_at: string;
  ends_at: string;
  affected_lot_ids: string[];
  impact_level: number; // 1-5
  venue: string | null;
  expected_attendance: number | null;
  arrival_recommendation: string | null; // INTERVAL as string
  alternative_lots: string[] | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotPrediction {
  id: string;
  lot_id: string;
  predicted_for: string; // TIMESTAMPTZ
  predicted_status: OccupancyStatus;
  predicted_percent: number;
  confidence: ConfidenceLevel;
  confidence_lower: number | null;
  confidence_upper: number | null;
  model_version: string | null;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  // Database fields
  total_reports: number;
  accurate_reports: number;
  accuracy_rate: number;
  consecutive_days: number;
  last_report_date: string | null;
  points: number;
  achievements: string[];
  reports_this_week: number;
  reports_this_month: number;
  updated_at: string;
  // UI-compatible fields (computed or derived)
  total_trips: number;
  report_count: number;
  accuracy_score: number;
  streak_days: number;
  current_streak: number;
  longest_streak: number;
  level: ReporterLevel;
  badges: string[];
  lot_usage: Record<string, number>;
  time_saved_minutes: number;
  referral_code: string | null;
  referral_count: number;
  referred_by: string | null;
}

export interface ParkingTimer {
  id: string;
  user_id: string;
  lot_id: string;
  start_time: string;
  limit_minutes: number;
  expires_at: string;
  is_active: boolean;
  reminders_sent: number[];
  created_at: string;
}

export interface EnforcementHotspot {
  id: string;
  lot_id: string;
  location_description: string;
  violation_type: string;
  fine_amount: number | null;
  report_count: number;
  last_reported_at: string;
  tips: string[] | null;
  created_at: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ValidLotForPermit {
  lot_id: string;
  lot_name: string;
  area: LotArea;
  is_free: boolean;
}

export interface LotWithStatusForPermit {
  lot_id: string;
  lot_name: string;
  short_name: string | null;
  area: LotArea;
  center: { lat: number; lng: number };
  occupancy_percent: number;
  status: OccupancyStatus;
  confidence: ConfidenceLevel;
  trend?: Trend | null;
  is_valid_now: boolean;
  valid_after: string | null;
  valid_permits: PermitType[];
  walk_times: Record<string, number>;
  last_report_time?: string | null;
}

// ML Model storage
export interface MLModel {
  id: string;
  model_type: string;
  version: string;
  model_weights: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// SUPABASE DATABASE SCHEMA TYPE
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_active_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      lots: {
        Row: Lot;
        Insert: Omit<Lot, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Lot, 'id'>>;
      };
      lot_status: {
        Row: LotStatus;
        Insert: Omit<LotStatus, 'updated_at'>;
        Update: Partial<Omit<LotStatus, 'lot_id'>>;
      };
      permit_rules: {
        Row: PermitRule;
        Insert: Omit<PermitRule, 'id' | 'created_at'>;
        Update: Partial<Omit<PermitRule, 'id'>>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, 'id' | 'created_at' | 'accuracy_score'>;
        Update: Partial<Omit<Report, 'id'>>;
      };
      events: {
        Row: ParkingEvent;
        Insert: Omit<ParkingEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ParkingEvent, 'id'>>;
      };
      lot_predictions: {
        Row: LotPrediction;
        Insert: Omit<LotPrediction, 'id' | 'created_at'>;
        Update: Partial<Omit<LotPrediction, 'id'>>;
      };
      user_stats: {
        Row: UserStats;
        Insert: Omit<UserStats, 'updated_at'>;
        Update: Partial<Omit<UserStats, 'user_id'>>;
      };
      parking_timers: {
        Row: ParkingTimer;
        Insert: Omit<ParkingTimer, 'id' | 'created_at'>;
        Update: Partial<Omit<ParkingTimer, 'id'>>;
      };
      enforcement_hotspots: {
        Row: EnforcementHotspot;
        Insert: Omit<EnforcementHotspot, 'id' | 'created_at'>;
        Update: Partial<Omit<EnforcementHotspot, 'id'>>;
      };
      ml_models: {
        Row: MLModel;
        Insert: Omit<MLModel, 'id' | 'created_at'>;
        Update: Partial<Omit<MLModel, 'id'>>;
      };
    };
    Views: {
      lots_with_status: {
        Row: LotWithStatus;
      };
      active_events: {
        Row: ParkingEvent;
      };
      reporter_leaderboard: {
        Row: {
          id: string;
          display_name: string | null;
          report_count: number;
          accuracy_score: number;
          level: ReporterLevel;
          streak_days: number;
          badges: string[];
        };
      };
    };
    Functions: {
      is_permit_valid: {
        Args: {
          p_lot_id: string;
          p_permit_type: PermitType;
          p_check_time?: string;
        };
        Returns: boolean;
      };
      get_valid_lots: {
        Args: {
          p_permit_type: PermitType;
          p_check_time?: string;
        };
        Returns: ValidLotForPermit[];
      };
      get_lots_with_status: {
        Args: {
          p_permit_type: PermitType;
        };
        Returns: LotWithStatusForPermit[];
      };
    };
  };
}
