/**
 * ML Feature Engineering Service
 * Extracts and transforms features for parking prediction models
 *
 * Models: LightGBM (tabular) + TFT (time series) → Ensemble
 */

import { supabase } from '@/lib/supabase';

// ============================================================
// FEATURE TYPES
// ============================================================

export interface PredictionFeatures {
  // Time Features
  hour: number;                    // 0-23
  minute: number;                  // 0-59
  dayOfWeek: number;              // 0-6 (Sunday = 0)
  dayOfMonth: number;             // 1-31
  weekOfYear: number;             // 1-52
  month: number;                  // 1-12
  isWeekend: boolean;

  // Time Cyclical (for neural networks)
  hourSin: number;                // sin(2π * hour/24)
  hourCos: number;                // cos(2π * hour/24)
  dayOfWeekSin: number;           // sin(2π * dayOfWeek/7)
  dayOfWeekCos: number;           // cos(2π * dayOfWeek/7)

  // Academic Calendar
  isClassDay: boolean;
  isFinalsWeek: boolean;
  isFirstWeek: boolean;
  isSpringBreak: boolean;
  isSummerSession: boolean;
  daysIntoSemester: number;       // 0-120 roughly

  // Event Features
  hasFootballGame: boolean;
  hasBasketballGame: boolean;
  hasConcert: boolean;
  hasGraduation: boolean;
  hasSpecialEvent: boolean;
  eventImpactScore: number;       // 0-1 scale
  hoursUntilEvent: number | null;

  // Weather Features (from API)
  temperature: number;            // Fahrenheit
  precipitationProbability: number; // 0-1
  isRaining: boolean;
  windSpeed: number;              // mph
  weatherImpactScore: number;     // 0-1 (bad weather = higher)

  // Historical Features
  avgOccupancySameTime: number;   // Rolling average same hour/day
  avgOccupancyLastWeek: number;   // Same time last week
  trendDirection: number;         // -1 (decreasing), 0 (stable), 1 (increasing)
  volatility: number;             // Standard deviation of recent values

  // Real-time Features
  currentOccupancy: number | null;
  recentReportCount: number;      // Reports in last 30 min
  recentReportAvg: number | null; // Average of recent reports
  minutesSinceLastReport: number | null;
  reportConfidence: number;       // 0-1 based on report freshness/count

  // Lot-specific Features
  lotId: string;
  lotCapacity: number;
  lotPopularity: number;          // Historical average occupancy
  lotType: 'commuter' | 'residence' | 'garage' | 'satellite';
  hasTimeLimit: boolean;
  timeLimitMinutes: number | null;

  // Cross-lot Features
  nearbyLotsAvgOccupancy: number;
  campusWideOccupancy: number;
}

export interface MLPrediction {
  lotId: string;
  predictedOccupancy: number;     // 0-100
  confidence: number;             // 0-1
  predictionTime: Date;
  modelVersion: string;

  // Component predictions
  lightgbmPrediction: number;
  tftPrediction: number;
  ensembleWeights: { lightgbm: number; tft: number };

  // Uncertainty bounds
  lowerBound: number;             // 10th percentile
  upperBound: number;             // 90th percentile
}

// ============================================================
// TIME FEATURE EXTRACTION
// ============================================================

/**
 * Extract time-based features from a Date
 */
export function extractTimeFeatures(date: Date): Pick<PredictionFeatures,
  'hour' | 'minute' | 'dayOfWeek' | 'dayOfMonth' | 'weekOfYear' | 'month' |
  'isWeekend' | 'hourSin' | 'hourCos' | 'dayOfWeekSin' | 'dayOfWeekCos'
> {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;

  // Calculate week of year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekOfYear = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

  // Cyclical encoding for time features
  const hourSin = Math.sin(2 * Math.PI * hour / 24);
  const hourCos = Math.cos(2 * Math.PI * hour / 24);
  const dayOfWeekSin = Math.sin(2 * Math.PI * dayOfWeek / 7);
  const dayOfWeekCos = Math.cos(2 * Math.PI * dayOfWeek / 7);

  return {
    hour,
    minute,
    dayOfWeek,
    dayOfMonth,
    weekOfYear,
    month,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    hourSin,
    hourCos,
    dayOfWeekSin,
    dayOfWeekCos,
  };
}

// ============================================================
// ACADEMIC CALENDAR FEATURES
// ============================================================

interface SemesterDates {
  fallStart: Date;
  fallEnd: Date;
  springStart: Date;
  springEnd: Date;
  summerStart: Date;
  summerEnd: Date;
  finalsWeeks: Array<{ start: Date; end: Date }>;
  springBreak: { start: Date; end: Date };
}

// TTU Academic Calendar 2025-2026 (with fallback for 2026-2027)
// Dynamically determines correct semester based on current date
function getAcademicCalendar(date: Date): SemesterDates {
  const year = date.getFullYear();
  const month = date.getMonth();

  // If we're in Aug-Dec, use current year fall semester
  // If we're in Jan-Jul, use previous year as fall year
  const fallYear = month >= 7 ? year : year - 1;
  const springYear = fallYear + 1;

  return {
    // Fall semester: late August to mid-December
    fallStart: new Date(`${fallYear}-08-26`),
    fallEnd: new Date(`${fallYear}-12-13`),
    // Spring semester: mid-January to early May
    springStart: new Date(`${springYear}-01-13`),
    springEnd: new Date(`${springYear}-05-09`),
    // Summer: June to early August
    summerStart: new Date(`${springYear}-06-02`),
    summerEnd: new Date(`${springYear}-08-08`),
    // Finals weeks
    finalsWeeks: [
      { start: new Date(`${fallYear}-12-09`), end: new Date(`${fallYear}-12-13`) },
      { start: new Date(`${springYear}-05-05`), end: new Date(`${springYear}-05-09`) },
    ],
    // Spring break: typically mid-March
    springBreak: { start: new Date(`${springYear}-03-10`), end: new Date(`${springYear}-03-14`) },
  };
}

// Default calendar for current year
const ACADEMIC_CALENDAR: SemesterDates = getAcademicCalendar(new Date());

/**
 * Extract academic calendar features
 */
export function extractAcademicFeatures(date: Date): Pick<PredictionFeatures,
  'isClassDay' | 'isFinalsWeek' | 'isFirstWeek' | 'isSpringBreak' | 'isSummerSession' | 'daysIntoSemester'
> {
  // Get calendar for the specific date being predicted
  const calendar = getAcademicCalendar(date);

  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Check finals week
  const isFinalsWeek = calendar.finalsWeeks.some(
    fw => date >= fw.start && date <= fw.end
  );

  // Check spring break
  const isSpringBreak = date >= calendar.springBreak.start &&
                        date <= calendar.springBreak.end;

  // Determine current semester and days into it
  let isClassDay = !isWeekend;
  let isSummerSession = false;
  let daysIntoSemester = 0;
  let isFirstWeek = false;

  if (date >= calendar.fallStart && date <= calendar.fallEnd) {
    daysIntoSemester = Math.floor((date.getTime() - calendar.fallStart.getTime()) / (24 * 60 * 60 * 1000));
    isFirstWeek = daysIntoSemester < 7;
  } else if (date >= calendar.springStart && date <= calendar.springEnd) {
    daysIntoSemester = Math.floor((date.getTime() - calendar.springStart.getTime()) / (24 * 60 * 60 * 1000));
    isFirstWeek = daysIntoSemester < 7;
  } else if (date >= calendar.summerStart && date <= calendar.summerEnd) {
    isSummerSession = true;
    daysIntoSemester = Math.floor((date.getTime() - calendar.summerStart.getTime()) / (24 * 60 * 60 * 1000));
    isFirstWeek = daysIntoSemester < 7;
  } else {
    isClassDay = false; // Between semesters
  }

  // Spring break and finals affect class day status differently
  if (isSpringBreak) isClassDay = false;

  return {
    isClassDay,
    isFinalsWeek,
    isFirstWeek,
    isSpringBreak,
    isSummerSession,
    daysIntoSemester,
  };
}

// ============================================================
// EVENT FEATURES
// ============================================================

interface EventInfo {
  type: 'football' | 'basketball' | 'concert' | 'graduation' | 'other';
  startTime: Date;
  impactScore: number; // 0-1
  affectedLots: string[];
}

/**
 * Get events affecting parking on a given date
 */
async function getEventsForDate(date: Date): Promise<EventInfo[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', startOfDay.toISOString())
    .lte('starts_at', endOfDay.toISOString());

  if (error || !data) return [];

  return (data as any[]).map(event => ({
    type: categorizeEventType(event.title || event.name, event.event_type),
    startTime: new Date(event.starts_at),
    impactScore: calculateEventImpact(event),
    affectedLots: event.affected_lots || event.affected_lot_ids || [],
  }));
}

function categorizeEventType(title: string, eventType: string): EventInfo['type'] {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('football') || eventType === 'football') return 'football';
  if (titleLower.includes('basketball') || eventType === 'basketball') return 'basketball';
  if (titleLower.includes('concert') || titleLower.includes('music')) return 'concert';
  if (titleLower.includes('graduation') || titleLower.includes('commencement')) return 'graduation';
  return 'other';
}

function calculateEventImpact(event: any): number {
  // Football games have highest impact
  if (event.event_type === 'football') return 1.0;
  if (event.event_type === 'basketball') return 0.7;
  if (event.event_type === 'graduation') return 0.8;
  if (event.event_type === 'concert') return 0.6;
  // Default based on expected attendance
  if (event.expected_attendance > 10000) return 0.9;
  if (event.expected_attendance > 5000) return 0.7;
  if (event.expected_attendance > 1000) return 0.5;
  return 0.3;
}

/**
 * Extract event features for prediction
 */
export async function extractEventFeatures(date: Date, lotId: string): Promise<Pick<PredictionFeatures,
  'hasFootballGame' | 'hasBasketballGame' | 'hasConcert' | 'hasGraduation' |
  'hasSpecialEvent' | 'eventImpactScore' | 'hoursUntilEvent'
>> {
  const events = await getEventsForDate(date);
  const relevantEvents = events.filter(e =>
    e.affectedLots.length === 0 || e.affectedLots.includes(lotId)
  );

  const hasFootballGame = relevantEvents.some(e => e.type === 'football');
  const hasBasketballGame = relevantEvents.some(e => e.type === 'basketball');
  const hasConcert = relevantEvents.some(e => e.type === 'concert');
  const hasGraduation = relevantEvents.some(e => e.type === 'graduation');
  const hasSpecialEvent = relevantEvents.length > 0;

  // Calculate max impact score
  const eventImpactScore = relevantEvents.length > 0
    ? Math.max(...relevantEvents.map(e => e.impactScore))
    : 0;

  // Hours until nearest event
  const futureEvents = relevantEvents.filter(e => e.startTime > date);
  const hoursUntilEvent = futureEvents.length > 0
    ? (futureEvents[0].startTime.getTime() - date.getTime()) / (1000 * 60 * 60)
    : null;

  return {
    hasFootballGame,
    hasBasketballGame,
    hasConcert,
    hasGraduation,
    hasSpecialEvent,
    eventImpactScore,
    hoursUntilEvent,
  };
}

// ============================================================
// WEATHER FEATURES
// ============================================================

interface WeatherData {
  temperature: number;
  precipitationProbability: number;
  isRaining: boolean;
  windSpeed: number;
}

/**
 * Get weather data for Lubbock, TX
 * Uses Open-Meteo API (free, no key required)
 */
async function getWeatherData(date: Date): Promise<WeatherData> {
  try {
    // Lubbock, TX coordinates
    const lat = 33.5779;
    const lon = -101.8552;

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,rain,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago`
    );

    if (!response.ok) throw new Error('Weather API failed');

    const data = await response.json();
    const hourIndex = date.getHours();

    return {
      temperature: data.hourly.temperature_2m[hourIndex] || 70,
      precipitationProbability: (data.hourly.precipitation_probability[hourIndex] || 0) / 100,
      isRaining: (data.hourly.rain[hourIndex] || 0) > 0,
      windSpeed: data.hourly.wind_speed_10m[hourIndex] || 10,
    };
  } catch (error) {
    // Default values if API fails
    return {
      temperature: 70,
      precipitationProbability: 0,
      isRaining: false,
      windSpeed: 10,
    };
  }
}

/**
 * Extract weather features
 */
export async function extractWeatherFeatures(date: Date): Promise<Pick<PredictionFeatures,
  'temperature' | 'precipitationProbability' | 'isRaining' | 'windSpeed' | 'weatherImpactScore'
>> {
  const weather = await getWeatherData(date);

  // Calculate weather impact score
  // Bad weather = people drive more = more parking demand
  let weatherImpactScore = 0;

  // Rain increases parking demand
  if (weather.isRaining) weatherImpactScore += 0.4;
  else if (weather.precipitationProbability > 0.5) weatherImpactScore += 0.2;

  // Extreme temperatures increase demand
  if (weather.temperature < 40 || weather.temperature > 95) weatherImpactScore += 0.3;
  else if (weather.temperature < 50 || weather.temperature > 85) weatherImpactScore += 0.1;

  // High wind (Lubbock is windy!)
  if (weather.windSpeed > 30) weatherImpactScore += 0.2;
  else if (weather.windSpeed > 20) weatherImpactScore += 0.1;

  return {
    ...weather,
    weatherImpactScore: Math.min(weatherImpactScore, 1),
  };
}

// ============================================================
// HISTORICAL FEATURES
// ============================================================

/**
 * Extract historical pattern features from database
 */
export async function extractHistoricalFeatures(
  lotId: string,
  date: Date
): Promise<Pick<PredictionFeatures,
  'avgOccupancySameTime' | 'avgOccupancyLastWeek' | 'trendDirection' | 'volatility'
>> {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();

  // Get historical data for same hour and day of week
  const { data: historicalDataRaw } = await supabase
    .from('reports')
    .select('occupancy_percent, created_at')
    .eq('lot_id', lotId)
    .not('occupancy_percent', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .order('created_at', { ascending: false });

  const historicalData = (historicalDataRaw || []) as Array<{ occupancy_percent: number; created_at: string }>;

  if (historicalData.length === 0) {
    return {
      avgOccupancySameTime: 50,
      avgOccupancyLastWeek: 50,
      trendDirection: 0,
      volatility: 20,
    };
  }

  // Filter for same hour (±1 hour) and day of week
  const sameTimeData = historicalData.filter(r => {
    const reportDate = new Date(r.created_at);
    const reportHour = reportDate.getHours();
    const reportDay = reportDate.getDay();
    return Math.abs(reportHour - hour) <= 1 && reportDay === dayOfWeek;
  });

  // Calculate average for same time
  const avgOccupancySameTime = sameTimeData.length > 0
    ? sameTimeData.reduce((sum, r) => sum + (r.occupancy_percent || 50), 0) / sameTimeData.length
    : 50;

  // Get data from exactly one week ago
  const oneWeekAgo = new Date(date);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const lastWeekData = historicalData.filter(r => {
    const reportDate = new Date(r.created_at);
    return Math.abs(reportDate.getTime() - oneWeekAgo.getTime()) < 2 * 60 * 60 * 1000; // Within 2 hours
  });

  const avgOccupancyLastWeek = lastWeekData.length > 0
    ? lastWeekData.reduce((sum, r) => sum + (r.occupancy_percent || 50), 0) / lastWeekData.length
    : avgOccupancySameTime;

  // Calculate trend (recent vs older)
  const recentData = historicalData.slice(0, Math.min(10, historicalData.length));
  const olderData = historicalData.slice(-Math.min(10, historicalData.length));
  const recentAvg = recentData.reduce((sum, r) => sum + (r.occupancy_percent || 50), 0) / recentData.length;
  const olderAvg = olderData.reduce((sum, r) => sum + (r.occupancy_percent || 50), 0) / olderData.length;
  const trendDirection = recentAvg > olderAvg + 5 ? 1 : recentAvg < olderAvg - 5 ? -1 : 0;

  // Calculate volatility (standard deviation)
  const mean = historicalData.reduce((sum, r) => sum + (r.occupancy_percent || 50), 0) / historicalData.length;
  const variance = historicalData.reduce((sum, r) => {
    const diff = (r.occupancy_percent || 50) - mean;
    return sum + diff * diff;
  }, 0) / historicalData.length;
  const volatility = Math.sqrt(variance);

  return {
    avgOccupancySameTime,
    avgOccupancyLastWeek,
    trendDirection,
    volatility,
  };
}

// ============================================================
// REAL-TIME FEATURES
// ============================================================

/**
 * Extract real-time features from recent reports
 */
export async function extractRealtimeFeatures(lotId: string): Promise<Pick<PredictionFeatures,
  'currentOccupancy' | 'recentReportCount' | 'recentReportAvg' | 'minutesSinceLastReport' | 'reportConfidence'
>> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Get recent reports
  const { data: recentReportsRaw } = await supabase
    .from('reports')
    .select('occupancy_percent, created_at, accuracy_score')
    .eq('lot_id', lotId)
    .not('occupancy_percent', 'is', null)
    .gte('created_at', thirtyMinutesAgo.toISOString())
    .order('created_at', { ascending: false });

  const recentReports = (recentReportsRaw || []) as Array<{ occupancy_percent: number; created_at: string; accuracy_score: number | null }>;

  if (recentReports.length === 0) {
    // Try to get the most recent report (even if older)
    const { data: lastReportRaw } = await supabase
      .from('reports')
      .select('occupancy_percent, created_at')
      .eq('lot_id', lotId)
      .not('occupancy_percent', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    const lastReport = (lastReportRaw || []) as Array<{ occupancy_percent: number; created_at: string }>;

    if (lastReport && lastReport.length > 0) {
      const minutesSince = (Date.now() - new Date(lastReport[0].created_at).getTime()) / (1000 * 60);
      return {
        currentOccupancy: lastReport[0].occupancy_percent,
        recentReportCount: 0,
        recentReportAvg: null,
        minutesSinceLastReport: minutesSince,
        reportConfidence: Math.max(0, 1 - minutesSince / 120), // Decay over 2 hours
      };
    }

    return {
      currentOccupancy: null,
      recentReportCount: 0,
      recentReportAvg: null,
      minutesSinceLastReport: null,
      reportConfidence: 0,
    };
  }

  // Calculate metrics from recent reports
  const recentReportCount = recentReports.length;
  const recentReportAvg = recentReports.reduce((sum, r) => sum + (r.occupancy_percent || 50), 0) / recentReportCount;
  const latestReport = recentReports[0];
  const minutesSinceLastReport = (Date.now() - new Date(latestReport.created_at).getTime()) / (1000 * 60);

  // Weight most recent report highest
  const currentOccupancy = latestReport.occupancy_percent;

  // Calculate confidence based on report count, recency, and accuracy scores
  const recencyFactor = Math.max(0, 1 - minutesSinceLastReport / 30);
  const countFactor = Math.min(1, recentReportCount / 5);
  const avgAccuracy = recentReports.reduce((sum, r) => sum + (r.accuracy_score || 0.7), 0) / recentReportCount;
  const reportConfidence = (recencyFactor * 0.4 + countFactor * 0.3 + avgAccuracy * 0.3);

  return {
    currentOccupancy,
    recentReportCount,
    recentReportAvg,
    minutesSinceLastReport,
    reportConfidence,
  };
}

// ============================================================
// LOT-SPECIFIC FEATURES
// ============================================================

/**
 * Extract lot-specific features
 */
export async function extractLotFeatures(lotId: string): Promise<Pick<PredictionFeatures,
  'lotId' | 'lotCapacity' | 'lotPopularity' | 'lotType' | 'hasTimeLimit' | 'timeLimitMinutes'
>> {
  const { data: lotRaw } = await supabase
    .from('lots')
    .select('*')
    .eq('id', lotId)
    .single();

  const lot = lotRaw as { name?: string; capacity?: number; occupancy_percent?: number; time_limit_minutes?: number | null } | null;

  if (!lot) {
    return {
      lotId,
      lotCapacity: 200,
      lotPopularity: 0.5,
      lotType: 'commuter',
      hasTimeLimit: false,
      timeLimitMinutes: null,
    };
  }

  // Determine lot type
  let lotType: PredictionFeatures['lotType'] = 'commuter';
  if (lotId.startsWith('R') || lot.name?.includes('Residence')) lotType = 'residence';
  else if (lotId.startsWith('G') || lot.name?.includes('Garage')) lotType = 'garage';
  else if (lotId === 'S1') lotType = 'satellite';

  return {
    lotId,
    lotCapacity: lot.capacity || 200,
    lotPopularity: (lot.occupancy_percent || 50) / 100,
    lotType,
    hasTimeLimit: lot.time_limit_minutes != null,
    timeLimitMinutes: lot.time_limit_minutes ?? null,
  };
}

// ============================================================
// CROSS-LOT FEATURES
// ============================================================

/**
 * Extract features about nearby lots and campus-wide occupancy
 */
export async function extractCrossLotFeatures(lotId: string): Promise<Pick<PredictionFeatures,
  'nearbyLotsAvgOccupancy' | 'campusWideOccupancy'
>> {
  // Get current occupancy for all lots
  const { data: allLotsRaw } = await supabase
    .from('lots')
    .select('id, occupancy_percent, center');

  const allLots = (allLotsRaw || []) as Array<{ id: string; occupancy_percent?: number; center?: unknown }>;

  if (allLots.length === 0) {
    return {
      nearbyLotsAvgOccupancy: 50,
      campusWideOccupancy: 50,
    };
  }

  // Calculate campus-wide average
  const campusWideOccupancy = allLots.reduce((sum, l) => sum + (l.occupancy_percent || 50), 0) / allLots.length;

  // Find nearby lots (simplified - just use lots with similar IDs)
  const nearbyLots = allLots.filter(l => {
    if (l.id === lotId) return false;
    // Consider lots with similar prefix as "nearby"
    const prefix = lotId.charAt(0);
    return l.id.startsWith(prefix);
  });

  const nearbyLotsAvgOccupancy = nearbyLots.length > 0
    ? nearbyLots.reduce((sum, l) => sum + (l.occupancy_percent || 50), 0) / nearbyLots.length
    : campusWideOccupancy;

  return {
    nearbyLotsAvgOccupancy,
    campusWideOccupancy,
  };
}

// ============================================================
// MAIN FEATURE EXTRACTION
// ============================================================

/**
 * Extract all features for ML prediction
 */
export async function extractAllFeatures(
  lotId: string,
  predictionTime: Date
): Promise<PredictionFeatures> {
  // Extract all feature groups in parallel for performance
  const [
    timeFeatures,
    academicFeatures,
    eventFeatures,
    weatherFeatures,
    historicalFeatures,
    realtimeFeatures,
    lotFeatures,
    crossLotFeatures,
  ] = await Promise.all([
    Promise.resolve(extractTimeFeatures(predictionTime)),
    Promise.resolve(extractAcademicFeatures(predictionTime)),
    extractEventFeatures(predictionTime, lotId),
    extractWeatherFeatures(predictionTime),
    extractHistoricalFeatures(lotId, predictionTime),
    extractRealtimeFeatures(lotId),
    extractLotFeatures(lotId),
    extractCrossLotFeatures(lotId),
  ]);

  return {
    ...timeFeatures,
    ...academicFeatures,
    ...eventFeatures,
    ...weatherFeatures,
    ...historicalFeatures,
    ...realtimeFeatures,
    ...lotFeatures,
    ...crossLotFeatures,
  };
}

/**
 * Convert features to array format for ML model input
 */
export function featuresToArray(features: PredictionFeatures): number[] {
  return [
    // Time features (12)
    features.hour,
    features.minute,
    features.dayOfWeek,
    features.dayOfMonth,
    features.weekOfYear,
    features.month,
    features.isWeekend ? 1 : 0,
    features.hourSin,
    features.hourCos,
    features.dayOfWeekSin,
    features.dayOfWeekCos,
    features.daysIntoSemester,

    // Academic features (5)
    features.isClassDay ? 1 : 0,
    features.isFinalsWeek ? 1 : 0,
    features.isFirstWeek ? 1 : 0,
    features.isSpringBreak ? 1 : 0,
    features.isSummerSession ? 1 : 0,

    // Event features (7)
    features.hasFootballGame ? 1 : 0,
    features.hasBasketballGame ? 1 : 0,
    features.hasConcert ? 1 : 0,
    features.hasGraduation ? 1 : 0,
    features.hasSpecialEvent ? 1 : 0,
    features.eventImpactScore,
    features.hoursUntilEvent ?? -1,

    // Weather features (5)
    features.temperature,
    features.precipitationProbability,
    features.isRaining ? 1 : 0,
    features.windSpeed,
    features.weatherImpactScore,

    // Historical features (4)
    features.avgOccupancySameTime,
    features.avgOccupancyLastWeek,
    features.trendDirection,
    features.volatility,

    // Real-time features (5)
    features.currentOccupancy ?? -1,
    features.recentReportCount,
    features.recentReportAvg ?? -1,
    features.minutesSinceLastReport ?? -1,
    features.reportConfidence,

    // Lot features (5)
    features.lotCapacity,
    features.lotPopularity,
    features.lotType === 'commuter' ? 1 : 0,
    features.lotType === 'residence' ? 1 : 0,
    features.lotType === 'garage' ? 1 : 0,

    // Cross-lot features (2)
    features.nearbyLotsAvgOccupancy,
    features.campusWideOccupancy,
  ];
}

/**
 * Get feature names (for model interpretability)
 */
export function getFeatureNames(): string[] {
  return [
    'hour', 'minute', 'day_of_week', 'day_of_month', 'week_of_year', 'month',
    'is_weekend', 'hour_sin', 'hour_cos', 'day_of_week_sin', 'day_of_week_cos',
    'days_into_semester',
    'is_class_day', 'is_finals_week', 'is_first_week', 'is_spring_break', 'is_summer_session',
    'has_football_game', 'has_basketball_game', 'has_concert', 'has_graduation',
    'has_special_event', 'event_impact_score', 'hours_until_event',
    'temperature', 'precipitation_probability', 'is_raining', 'wind_speed', 'weather_impact_score',
    'avg_occupancy_same_time', 'avg_occupancy_last_week', 'trend_direction', 'volatility',
    'current_occupancy', 'recent_report_count', 'recent_report_avg',
    'minutes_since_last_report', 'report_confidence',
    'lot_capacity', 'lot_popularity', 'is_commuter_lot', 'is_residence_lot', 'is_garage_lot',
    'nearby_lots_avg_occupancy', 'campus_wide_occupancy',
  ];
}
