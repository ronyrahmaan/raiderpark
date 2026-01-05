import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { SlideInUp, SlideOutUp, FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
import { useParkingStore } from '@/stores/parkingStore';
import { getPermitInfo } from '@/constants/permits';
import { DepartureCard } from '@/components/features/DepartureCard';
import { useDepartureCard } from '@/hooks/useSmartDeparture';
import { QuickReportModal } from '@/components/features/QuickReportModal';
import { QuickReportPrompt } from '@/components/features/QuickReportPrompt';
import { FindSpotFAB } from '@/components/features/FindSpotFAB';
import { NearbySpotsFinder, NearbySpotsFinderRef } from '@/components/features/NearbySpots';
import { useGeofenceDetection } from '@/hooks/useGeofenceDetection';
import { useQuickReportDetection } from '@/hooks/useQuickReportDetection';
import { LOTS } from '@/constants/lots';
import { LotWithStatusForPermit, ParkingEvent } from '@/types/database';
import { NearbySpotResult } from '@/types/nearbySpots';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
  FontWeight,
  FontSize,
} from '@/constants/theme';

// ============================================================
// DEMO DATA - Shown when no real data exists
// ============================================================
// Trend type for lot occupancy
type TrendType = 'rising' | 'stable' | 'falling';

interface DemoLot extends LotWithStatusForPermit {
  trend?: TrendType;
}

const DEMO_LOTS: DemoLot[] = [
  {
    lot_id: 'C11',
    lot_name: 'United Supermarkets Arena',
    short_name: 'Arena Lot',
    area: 'commuter_west',
    center: { lat: 33.5905, lng: -101.8785 },
    status: 'busy',
    occupancy_percent: 72,
    confidence: 'high',
    is_valid_now: true,
    valid_after: null,
    valid_permits: ['commuter_west'],
    walk_times: { library: 8, sub: 6 },
    last_report_time: new Date(Date.now() - 5 * 60000).toISOString(),
    trend: 'rising',
  },
  {
    lot_id: 'C14',
    lot_name: 'West Commuter 14',
    short_name: 'West 14',
    area: 'commuter_west',
    center: { lat: 33.5845, lng: -101.8820 },
    status: 'open',
    occupancy_percent: 45,
    confidence: 'high',
    is_valid_now: true,
    valid_after: null,
    valid_permits: ['commuter_west'],
    walk_times: { library: 10, sub: 8 },
    last_report_time: new Date(Date.now() - 12 * 60000).toISOString(),
    trend: 'stable',
  },
  {
    lot_id: 'C16',
    lot_name: 'West Commuter 16',
    short_name: 'West 16',
    area: 'commuter_west',
    center: { lat: 33.5835, lng: -101.8850 },
    status: 'open',
    occupancy_percent: 38,
    confidence: 'medium',
    is_valid_now: true,
    valid_after: null,
    valid_permits: ['commuter_west'],
    walk_times: { library: 12, sub: 10 },
    last_report_time: new Date(Date.now() - 8 * 60000).toISOString(),
    trend: 'falling',
  },
  {
    lot_id: 'C12',
    lot_name: 'Jones AT&T Stadium',
    short_name: 'Stadium Lot',
    area: 'commuter_west',
    center: { lat: 33.5920, lng: -101.8730 },
    status: 'filling',
    occupancy_percent: 85,
    confidence: 'high',
    is_valid_now: true,
    valid_after: null,
    valid_permits: ['commuter_west'],
    walk_times: { library: 15, sub: 12 },
    last_report_time: new Date(Date.now() - 3 * 60000).toISOString(),
    trend: 'rising',
  },
  {
    lot_id: 'C1',
    lot_name: 'North Commuter 1',
    short_name: 'North 1',
    area: 'commuter_north',
    center: { lat: 33.5880, lng: -101.8700 },
    status: 'full',
    occupancy_percent: 98,
    confidence: 'high',
    is_valid_now: false,
    valid_after: '2:30 PM',
    valid_permits: ['commuter_north'],
    walk_times: { library: 5, sub: 3 },
    last_report_time: new Date(Date.now() - 2 * 60000).toISOString(),
    trend: 'stable',
  },
  {
    lot_id: 'R18',
    lot_name: 'Residence Hall 18',
    short_name: 'Res 18',
    area: 'residence',
    center: { lat: 33.5860, lng: -101.8750 },
    status: 'open',
    occupancy_percent: 52,
    confidence: 'medium',
    is_valid_now: true,
    valid_after: null,
    valid_permits: ['residence_z1'],
    walk_times: { library: 7, sub: 5 },
    last_report_time: new Date(Date.now() - 15 * 60000).toISOString(),
    trend: 'falling',
  },
];

const DEMO_EVENTS: ParkingEvent[] = [
  {
    id: 'demo-1',
    name: 'Basketball Game vs. Baylor',
    event_type: 'basketball',
    starts_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 3600000).toISOString(),
    affected_lot_ids: ['C11', 'C12'],
    impact_level: 4,
    venue: 'United Supermarkets Arena',
    expected_attendance: 15000,
    arrival_recommendation: '1 hour',
    alternative_lots: ['C14', 'C16'],
    source: 'manual',
    source_url: null,
    description: 'Home game at United Supermarkets Arena',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// DYNAMIC DEMO RECOMMENDATION
// Generates realistic demo data based on current time and
// authentic TTU parking patterns
// ============================================================

// Authentic TTU buildings with real names
const TTU_BUILDINGS = [
  { id: 'holden_hall', name: 'Holden Hall', shortName: 'HOLDEN' },
  { id: 'rawls', name: 'Rawls College of Business', shortName: 'Rawls' },
  { id: 'library', name: 'University Library', shortName: 'Library' },
  { id: 'sub', name: 'Student Union Building', shortName: 'SUB' },
  { id: 'electrical_eng', name: 'Electrical Engineering', shortName: 'EE' },
  { id: 'mass_comm', name: 'Mass Communications', shortName: 'MCOM' },
  { id: 'chemistry', name: 'Chemistry Building', shortName: 'CHEM' },
  { id: 'computer_science', name: 'Computer Science', shortName: 'CS' },
];

// Authentic TTU lot data
const TTU_LOTS = [
  { id: 'C14', name: 'West 14', walkTime: 7, baseOccupancy: 55 },
  { id: 'C16', name: 'West 16', walkTime: 9, baseOccupancy: 45 },
  { id: 'C11', name: 'Rec Center', walkTime: 6, baseOccupancy: 70 },
  { id: 'C12', name: 'Arena', walkTime: 5, baseOccupancy: 65 },
  { id: 'C4', name: 'Rawls Lot', walkTime: 3, baseOccupancy: 75 },
  { id: 'C1', name: 'Stadium', walkTime: 5, baseOccupancy: 60 },
];

function generateDynamicDemoRecommendation() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const dayOfWeek = now.getDay();

  // Weekend - show a demo of what Monday would look like
  // This demonstrates the feature even when user isn't going to campus
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Simulate a typical Monday 9 AM class scenario
    return {
      leaveByTime: '8:17 AM',
      arrivalTime: '8:45 AM',
      targetLot: 'C14',
      targetLotName: 'West 14',
      predictedOccupancy: 58,
      confidence: 0.85,
      alternativeLots: [
        { id: 'C16', name: 'West 16', predictedOccupancy: 42 },
        { id: 'C11', name: 'Rec Center', predictedOccupancy: 65 },
      ],
      firstClass: {
        time: '9:00 AM',
        building: 'Holden Hall',
        minutesUntil: 43, // Demo shows ~43 min until class
      },
    };
  }

  // Calculate next "class time" (realistic schedule)
  // Common TTU class start times: 8:00, 9:00, 9:30, 10:30, 11:00, 12:00, 12:30, 1:30, 2:00, 3:00, 3:30
  const classStartTimes = [8, 9, 9.5, 10.5, 11, 12, 12.5, 13.5, 14, 15, 15.5, 16.5, 17];
  const currentTimeDecimal = currentHour + currentMinutes / 60;

  // Find next class time
  let nextClassHour = classStartTimes.find(t => t > currentTimeDecimal + 0.5) || classStartTimes[0];
  let nextClassIsToday = nextClassHour > currentTimeDecimal;

  // If no more classes today, show "No more classes" state
  if (!nextClassIsToday || currentHour >= 18) {
    return {
      leaveByTime: 'Done for today',
      arrivalTime: 'Tomorrow',
      targetLot: 'C14',
      targetLotName: 'West 14',
      predictedOccupancy: 25,
      confidence: 0.85,
      alternativeLots: [],
      firstClass: undefined,
    };
  }

  // Calculate realistic occupancy based on time of day (authentic TTU pattern)
  // Source: "Midday hours between 10 a.m. and 2 p.m. are typically the most congested"
  let timeMultiplier = 1.0;
  if (currentHour >= 7 && currentHour < 9) {
    timeMultiplier = 0.6 + (currentHour - 7) * 0.15; // 60-90%
  } else if (currentHour >= 9 && currentHour < 10) {
    timeMultiplier = 0.9 + (currentMinutes / 60) * 0.1; // 90-100%
  } else if (currentHour >= 10 && currentHour < 14) {
    timeMultiplier = 1.0; // Peak: 100%
  } else if (currentHour >= 14 && currentHour < 17.5) {
    timeMultiplier = 1.0 - ((currentHour - 14) * 0.15); // Declining
  } else {
    timeMultiplier = 0.3; // Evening: low
  }

  // Sort lots by adjusted occupancy
  const lotsWithOccupancy = TTU_LOTS.map(lot => ({
    ...lot,
    predictedOccupancy: Math.round(Math.min(98, lot.baseOccupancy * timeMultiplier + (Math.random() * 10 - 5))),
  })).sort((a, b) => a.predictedOccupancy - b.predictedOccupancy);

  const bestLot = lotsWithOccupancy[0];
  const alternatives = lotsWithOccupancy.slice(1, 3);

  // Calculate times
  const nextClassMinutes = Math.floor(nextClassHour) * 60 + (nextClassHour % 1) * 60;
  const commuteMinutes = 10; // Average Lubbock commute
  const parkingBuffer = bestLot.predictedOccupancy > 75 ? 12 : 5;
  const walkMinutes = bestLot.walkTime;
  const bufferMinutes = 5;

  const totalNeeded = commuteMinutes + parkingBuffer + walkMinutes + bufferMinutes;
  const leaveByMinutes = nextClassMinutes - totalNeeded;
  const arrivalMinutes = nextClassMinutes - walkMinutes - bufferMinutes;

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const minutesUntilClass = nextClassMinutes - (currentHour * 60 + currentMinutes);

  // Pick a random building for demo
  const building = TTU_BUILDINGS[Math.floor(currentHour % TTU_BUILDINGS.length)];

  // Calculate confidence based on data freshness and occupancy
  let confidence = 0.85;
  if (bestLot.predictedOccupancy > 85) confidence = 0.6;
  if (bestLot.predictedOccupancy > 92) confidence = 0.4;

  return {
    leaveByTime: formatTime(leaveByMinutes),
    arrivalTime: formatTime(arrivalMinutes),
    targetLot: bestLot.id,
    targetLotName: bestLot.name,
    predictedOccupancy: bestLot.predictedOccupancy,
    confidence,
    alternativeLots: alternatives.map(lot => ({
      id: lot.id,
      name: lot.name,
      predictedOccupancy: lot.predictedOccupancy,
    })),
    firstClass: {
      time: formatTime(nextClassMinutes),
      building: building.shortName,
      minutesUntil: Math.max(0, minutesUntilClass),
    },
  };
}

// Note: generateDynamicDemoRecommendation() is called inside component with useMemo

// Status color mapping with safe accessors
const STATUS_COLORS: Record<string, string> = {
  open: Colors.status.open,
  busy: Colors.status.busy,
  filling: Colors.status.filling,
  full: Colors.status.full,
  closed: Colors.status.closed,
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  busy: 'Busy',
  filling: 'Filling',
  full: 'Full',
  closed: 'Closed',
};

// Safe getters to prevent undefined rendering
const getStatusColor = (status: string | undefined | null): string => {
  return STATUS_COLORS[status || 'open'] || Colors.status.open;
};

const getStatusLabel = (status: string | undefined | null): string => {
  return STATUS_LABELS[status || 'open'] || 'Open';
};

export default function HomeScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const {
    lotsForPermit,
    activeEvents,
    isLoading,
    fetchLotsForPermit,
    fetchEvents,
    subscribeToLotUpdates,
  } = useParkingStore();

  // Geofence detection for smart "I Just Parked"
  const {
    isDetecting,
    isInLot,
    detectedLotId,
    detectedLotName,
    detectLot,
    reset: resetGeofence,
  } = useGeofenceDetection();

  // Smart prompt detection (shows when user likely just parked)
  const {
    shouldPrompt: shouldShowQuickPrompt,
    detectedLot: promptDetectedLot,
    dismissPrompt,
    markReported: markPromptReported,
  } = useQuickReportDetection();

  // Quick Report Modal state
  const [showQuickReport, setShowQuickReport] = useState(false);
  const [reportStreak, setReportStreak] = useState(3); // TODO: Get from user stats
  const [totalReports, setTotalReports] = useState(12); // TODO: Get from user stats

  // Nearby Spots Finder ref
  const nearbyFinderRef = useRef<NearbySpotsFinderRef>(null);

  const permitInfo = appUser ? getPermitInfo(appUser.permit_type) : null;

  // Use demo data when no real data exists
  const displayLots = lotsForPermit.length > 0 ? lotsForPermit : DEMO_LOTS;
  const displayEvents = activeEvents.length > 0 ? activeEvents : DEMO_EVENTS;
  const isUsingDemoData = lotsForPermit.length === 0;

  // Generate smart departure recommendation using ML-powered service
  const {
    recommendation: smartDepartureRecommendation,
    isLoading: isDepartureLoading,
    refresh: refreshDeparture,
  } = useDepartureCard();

  // Generate dynamic demo recommendation (updates on refresh)
  const dynamicDemoRecommendation = useMemo(() => {
    return generateDynamicDemoRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // Regenerate when data refreshes

  // Use smart recommendation or fall back to dynamic demo
  const departureRecommendation = smartDepartureRecommendation ?? dynamicDemoRecommendation;

  // Fetch data on mount
  useEffect(() => {
    if (appUser?.permit_type) {
      fetchLotsForPermit(appUser.permit_type);
      fetchEvents();
    }
  }, [appUser?.permit_type]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToLotUpdates();
    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(async () => {
    if (appUser?.permit_type) {
      await Promise.all([
        fetchLotsForPermit(appUser.permit_type),
        fetchEvents(),
        refreshDeparture(),
      ]);
    }
  }, [appUser?.permit_type, refreshDeparture]);

  // Smart "I Just Parked" handler with geofence detection
  const handleJustParked = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Detect which lot the user is in
    const result = await detectLot();

    if (result?.isInLot && result.lotId) {
      // User is in a parking lot - show quick report modal
      setShowQuickReport(true);
    } else {
      // Not in a lot or couldn't detect - go to full report screen
      router.push('/report');
    }
  }, [detectLot, router]);

  // Handle quick report modal close
  const handleQuickReportClose = useCallback(() => {
    setShowQuickReport(false);
    resetGeofence();
  }, [resetGeofence]);

  // Handle quick report success
  const handleQuickReportSuccess = useCallback(() => {
    // Update local stats (in a real app, this would sync with backend)
    setTotalReports(prev => prev + 1);
    // Could also trigger a confetti animation or celebration here
  }, []);

  // Navigate to full report screen (from QuickReportModal "change lot" action)
  const handleChangeLot = useCallback(() => {
    router.push('/report');
  }, [router]);

  // Handle Find Nearby Spot FAB press
  const handleFindSpotPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    nearbyFinderRef.current?.open();
  }, []);

  // Handle spot selection from finder
  const handleSpotPress = useCallback((spot: NearbySpotResult) => {
    // Close finder and navigate to lot details
    nearbyFinderRef.current?.close();
    router.push(`/lot/${spot.lot.lot_id}`);
  }, [router]);

  // Smart "It's Full!" handler - quick report when in a detected lot
  const [isReportingFull, setIsReportingFull] = useState(false);
  const [showFullReportSuccess, setShowFullReportSuccess] = useState(false);

  const handleItsFull = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsReportingFull(true);

    // Detect which lot the user is in
    const result = await detectLot();

    if (result?.isInLot && result.lotId) {
      // User is in a parking lot - auto-submit full report
      try {
        const { submitReport } = await import('@/services/lots');
        await submitReport({
          lotId: result.lotId,
          occupancyStatus: 'full',
          occupancyPercent: 100,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowFullReportSuccess(true);
        setTotalReports(prev => prev + 1);

        // Auto-hide success after 2 seconds
        setTimeout(() => {
          setShowFullReportSuccess(false);
          resetGeofence();
        }, 2000);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Fall back to report screen on error
        router.push('/report?status=full');
      }
    } else {
      // Not in a lot or couldn't detect - go to full report screen
      router.push('/report?status=full');
    }

    setIsReportingFull(false);
  }, [detectLot, router, resetGeofence]);

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get user's first name
  const getFirstName = () => {
    if (appUser?.display_name) {
      return appUser.display_name.split(' ')[0];
    }
    return 'Raider';
  };

  // Get next class building for walk time display
  const getNextClassBuilding = useMemo(() => {
    if (!appUser?.schedule) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()] as keyof typeof appUser.schedule;
    const todaySchedule = appUser.schedule[today];
    if (!todaySchedule?.classes || todaySchedule.classes.length === 0) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const nextClass = todaySchedule.classes.find((cls) => {
      const [hours, minutes] = cls.start.split(':').map(Number);
      return hours * 60 + minutes > currentTime;
    });
    return nextClass?.building?.toLowerCase() || null;
  }, [appUser?.schedule]);

  // Get walk time from lot to next class
  const getWalkTime = (lotId: string): number | null => {
    if (!getNextClassBuilding) return null;
    const lotData = LOTS[lotId];
    if (!lotData?.walk_times) return null;
    return lotData.walk_times[getNextClassBuilding] || null;
  };

  // Check if cross-lot parking is active (after 2:30 PM)
  const isCrossLotActive = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours > 14 || (hours === 14 && minutes >= 30);
  }, []);

  // Predict spot opening based on occupancy and time
  const getSpotPrediction = (occupancyPercent: number): string | null => {
    const now = new Date();
    const hour = now.getHours();

    // During peak hours (8-11am), spots are unlikely to open
    if (hour >= 8 && hour < 11 && occupancyPercent > 80) {
      return null;
    }

    // After peak, spots may open
    if (occupancyPercent >= 90) {
      return 'Spots likely in ~20 min';
    } else if (occupancyPercent >= 75) {
      return 'Spots likely in ~10 min';
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isDepartureLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.scarlet.DEFAULT}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting} numberOfLines={1}>
                {getGreeting()}, {getFirstName()}
              </Text>
              <View style={styles.permitRow}>
                <Text style={styles.permitText} numberOfLines={1}>
                  {permitInfo?.name ?? 'Commuter West'} Parking
                </Text>
                {isUsingDemoData && (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>DEMO</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/notifications')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <SFIcon name="bell" size={20} color={Colors.gray[1]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/settings/profile')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <SFIcon name="person-circle" size={20} color={Colors.gray[1]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Smart Departure Recommendation - ML-Powered Premium Feature */}
        <DepartureCard
          recommendation={departureRecommendation}
          onPress={() => router.push('/prediction')}
          onSetReminder={() => {/* TODO: Open reminder modal */}}
          onSeeAlternatives={() => router.push('/prediction')}
          isLoading={isLoading || isDepartureLoading}
        />

        {/* Cross-Lot Permit Banner (after 2:30 PM) */}
        {isCrossLotActive && appUser?.permit_type?.includes('commuter') && (
          <View style={styles.crossLotBanner}>
            <View style={styles.crossLotIcon}>
              <SFIcon name="navigate" size={16} color={Colors.ios.green} />
            </View>
            <View style={styles.crossLotContent}>
              <Text style={styles.crossLotTitle}>Cross-Lot Parking Active</Text>
              <Text style={styles.crossLotSubtitle}>
                Commuter West can now park in Commuter North lots
              </Text>
            </View>
          </View>
        )}

        {/* Game Day Banner - Contextual Variation */}
        {displayEvents.some(e => e.event_type === 'basketball' || e.event_type === 'football') && (
          <View style={styles.gameDayBanner}>
            <View style={styles.gameDayIcon}>
              <SFIcon name="trophy" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.gameDayContent}>
              <Text style={styles.gameDayTitle}>GAME DAY!</Text>
              <Text style={styles.gameDaySubtitle}>
                Expect heavy traffic near C11 & C12. Park early or use S1 shuttle.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.gameDayButton}
              onPress={() => router.push('/bus')}
            >
              <Text style={styles.gameDayButtonText}>S1 Shuttle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Alerts Section */}
        {displayEvents.length > 0 && (
          <View style={styles.alertsSection}>
            <View style={styles.alertsSectionHeader}>
              <Text style={styles.alertsSectionTitle}>Active Alerts</Text>
              {displayEvents.length > 1 && (
                <TouchableOpacity onPress={() => router.push('/events')}>
                  <Text style={styles.viewAllText}>
                    View All ({displayEvents.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {displayEvents.slice(0, 2).map((event, index) => (
              <TouchableOpacity
                key={event.id || index}
                style={styles.eventAlertButton}
                onPress={() => router.push('/events')}
              >
                <View style={styles.eventAlertIcon}>
                  <SFIcon name="alert" size={20} color={Colors.ios.orange} />
                </View>
                <View style={styles.eventAlertContent}>
                  <Text style={styles.eventAlertTitle}>{event.name}</Text>
                  <Text style={styles.eventAlertSubtitle}>
                    {event.affected_lot_ids.length} lots affected
                  </Text>
                </View>
                <SFIcon name="chevron-right" size={20} color={Colors.ios.orange} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Your Lots Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Your Lots Right Now
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Lot Cards */}
          <View style={styles.lotCardsContainer}>
            {displayLots.slice(0, 6).map((lot) => {
              const statusColor = getStatusColor(lot.status);
              const statusLabel = getStatusLabel(lot.status);
              const occupancy = lot.occupancy_percent ?? 0;
              const lotName = lot.short_name || lot.lot_name || 'Unknown Lot';
              const trend = (lot as DemoLot).trend;

              return (
                <TouchableOpacity
                  key={lot.lot_id}
                  style={styles.lotCard}
                  onPress={() => router.push(`/lot/${lot.lot_id}`)}
                >
                  <View style={styles.lotCardHeader}>
                    <Text style={styles.lotId}>{lot.lot_id || 'N/A'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.lotName}>{lotName}</Text>
                  <View style={styles.occupancyRow}>
                    <View style={styles.occupancyBarBackground}>
                      <View
                        style={[
                          styles.occupancyBarFill,
                          { width: `${occupancy}%`, backgroundColor: statusColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.occupancyText}>{occupancy}%</Text>
                    {trend ? (
                      <View style={styles.trendIndicator}>
                        {trend === 'rising' && <SFIcon name="trending-up" size={14} color={Colors.ios.red} />}
                        {trend === 'falling' && <SFIcon name="trending-down" size={14} color={Colors.ios.green} />}
                        {trend === 'stable' && <SFIcon name="minus" size={14} color={Colors.gray[2]} />}
                      </View>
                    ) : null}
                  </View>
                  {getWalkTime(lot.lot_id) != null ? (
                    <View style={styles.walkTimeRow}>
                      <SFIcon name="walk" size={12} color={Colors.ios.blue} />
                      <Text style={styles.walkTimeText}>{getWalkTime(lot.lot_id)} min walk to class</Text>
                    </View>
                  ) : null}
                  {(lot.status === 'filling' || lot.status === 'full') && getSpotPrediction(occupancy) ? (
                    <View style={styles.spotPredictionRow}>
                      <SFIcon name="clock" size={12} color={Colors.ios.green} />
                      <Text style={styles.spotPredictionText}>{getSpotPrediction(occupancy)}</Text>
                    </View>
                  ) : null}
                  {!lot.is_valid_now && lot.valid_after ? (
                    <View style={styles.validAfterRow}>
                      <SFIcon name="clock-outline" size={12} color={Colors.gray[1]} />
                      <Text style={styles.validAfterText}>Valid after {lot.valid_after}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionCard, isDetecting && styles.quickActionCardActive]}
              onPress={handleJustParked}
              disabled={isDetecting}
            >
              <View style={styles.quickActionIconScarlet}>
                {isDetecting ? (
                  <ActivityIndicator size="small" color={Colors.scarlet.DEFAULT} />
                ) : (
                  <SFIcon name="pin-fill" size={24} color={Colors.scarlet.DEFAULT} />
                )}
              </View>
              <Text style={styles.quickActionText}>
                {isDetecting ? 'Detecting...' : 'I Just Parked'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, isReportingFull && styles.quickActionCardFullActive]}
              onPress={handleItsFull}
              disabled={isReportingFull || isDetecting}
            >
              <View style={styles.quickActionIconRed}>
                {isReportingFull ? (
                  <ActivityIndicator size="small" color={Colors.status.full} />
                ) : (
                  <SFIcon name="alert" size={24} color={Colors.status.full} />
                )}
              </View>
              <Text style={styles.quickActionText}>
                {isReportingFull ? 'Reporting...' : "It's Full!"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/events')}
            >
              <View style={styles.quickActionIconBlue}>
                <SFIcon name="calendar" size={24} color={Colors.ios.blue} />
              </View>
              <Text style={styles.quickActionText}>
                Events
              </Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Quick Actions Row */}
          <View style={[styles.quickActionsRow, { marginTop: Spacing.sm + 4 }]}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/bus')}
            >
              <View style={styles.quickActionIconGreen}>
                <SFIcon name="bus" size={24} color={Colors.ios.green} />
              </View>
              <Text style={styles.quickActionText}>
                Bus Info
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/settings/schedule')}
            >
              <View style={styles.quickActionIconPurple}>
                <SFIcon name="clock" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.quickActionText}>
                Schedule
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tip of the Day */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>
            Pro Tip
          </Text>
          <Text style={styles.tipText}>
            After 2:30 PM, Commuter West permits can park in Commuter North lots
            too. More options, less circling!
          </Text>
        </View>
      </ScrollView>

      {/* Quick Report Modal - Triggered by geofence detection */}
      <QuickReportModal
        visible={showQuickReport}
        detectedLotId={detectedLotId || ''}
        detectedLotName={detectedLotName || ''}
        onClose={handleQuickReportClose}
        onSuccess={handleQuickReportSuccess}
        onChangeLot={handleChangeLot}
        currentStreak={reportStreak}
        totalReports={totalReports}
      />

      {/* Smart Quick Report Prompt - Shows when user likely just parked */}
      {shouldShowQuickPrompt && promptDetectedLot && !showQuickReport && (
        <QuickReportPrompt
          lotId={promptDetectedLot.lotId}
          lotName={promptDetectedLot.lotName}
          onDismiss={dismissPrompt}
          onReported={(status) => {
            markPromptReported();
            setTotalReports(prev => prev + 1);
          }}
        />
      )}

      {/* "It's Full!" Success Toast */}
      {showFullReportSuccess && (
        <Animated.View
          entering={SlideInUp.springify().damping(15)}
          exiting={SlideOutUp.springify()}
          style={styles.fullReportToast}
        >
          <View style={styles.fullReportToastContent}>
            <View style={styles.fullReportToastIcon}>
              <SFIcon name="alert" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.fullReportToastText}>
              <Text style={styles.fullReportToastTitle}>
                {detectedLotId} marked as Full!
              </Text>
              <Text style={styles.fullReportToastSubtitle}>
                Thanks for helping fellow Raiders
              </Text>
            </View>
            <View style={styles.fullReportToastPoints}>
              <SFIcon name="star" size={14} color={Colors.ios.orange} />
              <Text style={styles.fullReportToastPointsText}>+10</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Find Nearby Spot FAB */}
      <FindSpotFAB
        onPress={handleFindSpotPress}
        variant="pill"
        position="bottomRight"
        label="Find Spot"
        style={{ bottom: 100 }} // Above tab bar
      />

      {/* Nearby Spots Finder Bottom Sheet */}
      <NearbySpotsFinder
        ref={nearbyFinderRef}
        onSpotPress={handleSpotPress}
        onClose={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  permitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  permitText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
  },
  demoBadge: {
    backgroundColor: Colors.ios.orange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  demoBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },

  // Cross-Lot Banner
  crossLotBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#ECFDF5', // green-50
    borderWidth: 1,
    borderColor: '#A7F3D0', // green-200
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  crossLotIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: '#D1FAE5', // green-100
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  crossLotContent: {
    flex: 1,
  },
  crossLotTitle: {
    color: '#065F46', // green-800
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },
  crossLotSubtitle: {
    color: '#059669', // green-600
    fontSize: FontSize.xs,
  },

  // Game Day Banner
  gameDayBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameDayIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  gameDayContent: {
    flex: 1,
  },
  gameDayTitle: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
    letterSpacing: 1,
  },
  gameDaySubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  gameDayButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  gameDayButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },

  // Alerts Section
  alertsSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  alertsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  alertsSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    textTransform: 'uppercase',
  },
  viewAllText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.ios.orange,
  },
  eventAlertButton: {
    backgroundColor: '#FFFBEB', // amber-50
    borderWidth: 1,
    borderColor: '#FDE68A', // amber-200
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  eventAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEF3C7', // amber-100
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  eventAlertContent: {
    flex: 1,
  },
  eventAlertTitle: {
    color: '#92400E', // amber-800
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  eventAlertSubtitle: {
    color: '#D97706', // amber-600
    fontSize: FontSize.sm,
  },

  // Section
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm + 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm + 4,
  },
  seeAllText: {
    color: Colors.scarlet[500],
    fontWeight: FontWeight.medium,
    fontSize: FontSize.md,
  },

  // Lot Cards
  lotCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm + 4,
  },
  lotCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flex: 1,
    minWidth: '45%',
    ...Shadows.sm,
  },
  lotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  lotId: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  lotName: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupancyBarBackground: {
    height: 8,
    flex: 1,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[5],
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  occupancyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
    marginLeft: Spacing.sm,
  },
  trendIndicator: {
    marginLeft: Spacing.xs,
  },
  walkTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  walkTimeText: {
    fontSize: FontSize.xs,
    color: Colors.ios.blue,
    marginLeft: Spacing.xs,
  },
  spotPredictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  spotPredictionText: {
    fontSize: FontSize.xs,
    color: Colors.ios.green,
    marginLeft: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  validAfterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  validAfterText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginLeft: Spacing.xs,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    ...Shadows.sm,
  },
  quickActionCardActive: {
    backgroundColor: Colors.scarlet[50],
    borderWidth: 2,
    borderColor: Colors.scarlet[200],
  },
  quickActionCardFullActive: {
    backgroundColor: '#FEF2F2', // red-50
    borderWidth: 2,
    borderColor: '#FECACA', // red-200
  },
  quickActionIconScarlet: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionIconRed: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEF2F2', // red-50
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionIconBlue: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EFF6FF', // blue-50
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionIconGreen: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: '#ECFDF5', // green-50
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionIconPurple: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F5F3FF', // purple-50
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },

  // Tip Card
  tipCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  tipTitle: {
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.lg,
    marginBottom: Spacing.xs,
  },
  tipText: {
    color: Colors.scarlet[100],
    fontSize: FontSize.md,
  },

  // Full Report Success Toast
  fullReportToast: {
    position: 'absolute',
    top: 60,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 1000,
  },
  fullReportToastContent: {
    backgroundColor: Colors.status.full,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.lg,
  },
  fullReportToastIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  fullReportToastText: {
    flex: 1,
  },
  fullReportToastTitle: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  fullReportToastSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
  },
  fullReportToastPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  fullReportToastPointsText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
    marginLeft: 4,
  },
});
