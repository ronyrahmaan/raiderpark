// ============================================================
// INTERACTIVE MAP SCREEN
// Feature 3: Visual lot status with spatial context
// ============================================================

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

// Check if we're in Expo Go (no native modules for maps available)
// react-native-maps requires a development build, not Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
import { SFIcon } from '@/components/ui/SFIcon';
import { useParkingStore } from '@/stores/parkingStore';
import { useAuthStore } from '@/stores/authStore';
import { LOTS } from '@/constants/lots';
import { MiniFindSpotFAB } from '@/components/features/FindSpotFAB';
import { NearbySpotsFinder, NearbySpotsFinderRef } from '@/components/features/NearbySpots';
import { NearbySpotResult } from '@/types/nearbySpots';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';
import { LotWithStatusForPermit, LotWithStatus } from '@/types/database';

// Union type for lots from either source
type DisplayLot = LotWithStatus | LotWithStatusForPermit;

const { width, height } = Dimensions.get('window');

// TTU Campus center coordinates
interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const TTU_CENTER: MapRegion = {
  latitude: 33.5843,
  longitude: -101.8783,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

// Status colors for markers
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

// Filter options
type FilterOption = 'my_lots' | 'all_lots' | 'bus_stops';

// Maps are only available in development builds, not Expo Go
const isMapAvailable = !isExpoGo;

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const nearbyFinderRef = useRef<NearbySpotsFinderRef>(null);
  const [selectedLot, setSelectedLot] = useState<LotWithStatusForPermit | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('my_lots');
  const [isMapReady, setIsMapReady] = useState(false);

  const { appUser } = useAuthStore();
  const { lots, lotsForPermit, fetchLots, fetchLotsForPermit, isLoading } = useParkingStore();

  useEffect(() => {
    fetchLots();
    if (appUser?.permit_type) {
      fetchLotsForPermit(appUser.permit_type);
    }
  }, [appUser?.permit_type]);

  // Get displayed lots based on filter
  const displayedLots = activeFilter === 'my_lots' ? lotsForPermit : lots;

  // Get marker color based on occupancy
  const getMarkerColor = (lot: DisplayLot): string => {
    return STATUS_COLORS[lot.status] || STATUS_COLORS.open;
  };

  // Handle lot marker press
  const handleLotPress = useCallback((lot: DisplayLot) => {
    // Cast to LotWithStatusForPermit for selectedLot state
    const lotForDisplay: LotWithStatusForPermit = {
      ...lot,
      is_valid_now: lot.is_valid_now ?? true,
      valid_after: lot.valid_after ?? null,
      valid_permits: lot.valid_permits ?? [],
    };
    setSelectedLot(lotForDisplay);
    bottomSheetRef.current?.snapToIndex(1);

    // Animate to selected lot
    const lotData = LOTS[lot.lot_id];
    if (lotData?.center && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lotData.center.lat,
        longitude: lotData.center.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, []);

  // Center map on user location
  const handleCenterOnUser = useCallback(() => {
    mapRef.current?.animateToRegion(TTU_CENTER, 500);
  }, []);

  // Open navigation to lot
  const handleNavigate = useCallback((lot: DisplayLot) => {
    const lotData = LOTS[lot.lot_id];
    if (!lotData?.center) return;

    const { lat, lng } = lotData.center;
    const label = encodeURIComponent(lot.lot_name || lot.lot_id);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });

    if (url) Linking.openURL(url);
  }, []);

  // Report lot status
  const handleReport = useCallback((lot: DisplayLot, status: 'full' | 'open') => {
    router.push(`/report?lot=${lot.lot_id}&status=${status}`);
  }, [router]);

  // Handle Find Nearby Spot FAB press
  const handleFindSpotPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    nearbyFinderRef.current?.open();
  }, []);

  // Handle spot selection from finder
  const handleSpotPress = useCallback((spot: NearbySpotResult) => {
    nearbyFinderRef.current?.close();
    router.push(`/lot/${spot.lot.lot_id}`);
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Lot Grid View - Full map requires development build */}
      <View style={styles.fallbackContainer}>
          {/* Fallback Header */}
          <View style={styles.fallbackHeader}>
            <Text style={styles.fallbackTitle}>Campus Lots</Text>
            <Text style={styles.fallbackSubtitle}>
              Full map requires development build
            </Text>
          </View>

          {/* Lot Cards Grid */}
          <ScrollView
            style={styles.fallbackScroll}
            contentContainerStyle={styles.fallbackContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fallbackGrid}>
              {displayedLots.map((lot) => (
                <TouchableOpacity
                  key={lot.lot_id}
                  style={[
                    styles.fallbackLotCard,
                    { borderLeftColor: getMarkerColor(lot) },
                  ]}
                  onPress={() => handleLotPress(lot)}
                >
                  <View style={styles.fallbackLotHeader}>
                    <Text style={styles.fallbackLotId}>{lot.lot_id}</Text>
                    <View
                      style={[
                        styles.fallbackStatusDot,
                        { backgroundColor: getMarkerColor(lot) },
                      ]}
                    />
                  </View>
                  <Text style={styles.fallbackLotName} numberOfLines={1}>
                    {lot.short_name || lot.lot_name}
                  </Text>
                  <View style={styles.fallbackOccupancyBar}>
                    <View
                      style={[
                        styles.fallbackOccupancyFill,
                        {
                          width: `${lot.occupancy_percent}%`,
                          backgroundColor: getMarkerColor(lot),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.fallbackOccupancyText}>
                    {lot.occupancy_percent}% full
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.scarlet.DEFAULT} />
        </View>
      )}

      {/* Map Controls */}
      <SafeAreaView style={styles.controlsContainer} edges={['top']} pointerEvents="box-none">
        {/* Top Row */}
        <View style={styles.topControlsRow} pointerEvents="box-none">
          <Text style={styles.mapTitle}>Campus Map</Text>
          <TouchableOpacity style={styles.locationButton} onPress={handleCenterOnUser}>
            <SFIcon name="navigate" size={20} color={Colors.ios.blue} />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'my_lots' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('my_lots')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'my_lots' && styles.filterTabTextActive,
              ]}
            >
              Your Lots
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'all_lots' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('all_lots')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'all_lots' && styles.filterTabTextActive,
              ]}
            >
              All Lots
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>STATUS</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.status.open }]} />
            <Text style={styles.legendText}>Open</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.status.busy }]} />
            <Text style={styles.legendText}>Busy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.status.filling }]} />
            <Text style={styles.legendText}>Filling</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.status.full }]} />
            <Text style={styles.legendText}>Full</Text>
          </View>
        </View>
      </View>

      {/* Bottom Sheet - Lot Details */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={['12%', '55%', '90%']}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <BottomSheetScrollView style={styles.bottomSheetContent}>
          {selectedLot ? (
            <LotDetailSheet
              lot={selectedLot}
              onNavigate={() => handleNavigate(selectedLot)}
              onReportFull={() => handleReport(selectedLot, 'full')}
              onReportOpen={() => handleReport(selectedLot, 'open')}
            />
          ) : (
            <View style={styles.sheetPlaceholder}>
              <SFIcon name="chevron-up" size={20} color={Colors.gray[2]} />
              <Text style={styles.sheetTitle}>Nearby Lots</Text>
              <Text style={styles.sheetSubtitle}>
                Tap a lot marker to see details
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Find Nearby Spot FAB - Circular on Map */}
      <MiniFindSpotFAB
        onPress={handleFindSpotPress}
        style={{ bottom: 160, right: Spacing.md }}
      />

      {/* Nearby Spots Finder Bottom Sheet */}
      <NearbySpotsFinder
        ref={nearbyFinderRef}
        onSpotPress={handleSpotPress}
        onClose={() => {}}
      />
    </View>
  );
}

// ============================================================
// LOT DETAIL SHEET COMPONENT
// ============================================================

interface LotDetailSheetProps {
  lot: LotWithStatusForPermit;
  onNavigate: () => void;
  onReportFull: () => void;
  onReportOpen: () => void;
}

function LotDetailSheet({ lot, onNavigate, onReportFull, onReportOpen }: LotDetailSheetProps) {
  const lotData = LOTS[lot.lot_id];
  const statusColor = STATUS_COLORS[lot.status] || STATUS_COLORS.open;

  // Mock hourly pattern data - in production, this would come from the backend
  const hourlyPattern = useMemo(() => {
    const now = new Date().getHours();
    // Generate realistic pattern based on lot type
    const basePattern = [25, 35, 55, 75, 90, 95, 92, 85, 70, 55, 40, 30, 25];
    const hours = ['7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm'];
    return hours.map((hour, index) => ({
      hour,
      occupancy: basePattern[index] + Math.floor(Math.random() * 10) - 5,
      isCurrent: now === 7 + index,
    }));
  }, []);

  // Get confidence based on mock report count
  const reportCount = Math.floor(Math.random() * 30) + 5;
  const confidenceLevel = reportCount > 20 ? 'High' : reportCount > 10 ? 'Medium' : 'Low';

  // Get known issues for the lot
  const knownIssues = useMemo(() => {
    const issues: string[] = [];
    if (lotData?.time_limit_minutes) {
      issues.push(`${lotData.time_limit_minutes / 60} hour parking limit enforced`);
    }
    if (lotData?.is_icing_zone) {
      issues.push('May close during tower icing conditions');
    }
    if (lot.lot_id === 'C11') {
      issues.push('Often closed for events at United Supermarkets Arena');
      issues.push('High turnover at 10am and 2pm (between classes)');
    }
    if (lot.lot_id === 'C12') {
      issues.push('Closes for basketball games and concerts');
    }
    return issues;
  }, [lotData, lot.lot_id]);

  return (
    <View style={styles.detailContainer}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <View style={styles.detailHeaderLeft}>
          <Text style={styles.detailLotId}>{lot.lot_id}</Text>
          <Text style={styles.detailLotName}>{lot.lot_name}</Text>
        </View>
        <View style={[styles.detailStatusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.detailStatusText, { color: statusColor }]}>
            {STATUS_LABELS[lot.status]?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Occupancy Section with Confidence */}
      <View style={styles.occupancySection}>
        <View style={styles.occupancyHeader}>
          <Text style={styles.occupancyLabel}>Current Occupancy</Text>
          <Text style={[styles.occupancyPercent, { color: statusColor }]}>
            {lot.occupancy_percent}%
          </Text>
        </View>
        <View style={styles.occupancyBarBg}>
          <View
            style={[
              styles.occupancyBarFill,
              { width: `${lot.occupancy_percent}%`, backgroundColor: statusColor },
            ]}
          />
        </View>
        <View style={styles.confidenceRow}>
          <View style={styles.confidenceBadge}>
            <SFIcon name="person" size={12} color={Colors.ios.blue} />
            <Text style={styles.confidenceText}>
              {confidenceLevel} ({reportCount} reports/hr)
            </Text>
          </View>
          {lot.last_report_time && (
            <Text style={styles.lastReportText}>
              Last: {formatTimeAgo(lot.last_report_time)}
            </Text>
          )}
        </View>
      </View>

      {/* TODAY'S PATTERN Chart */}
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>TODAY'S PATTERN</Text>
        <View style={styles.patternChart}>
          <View style={styles.patternLabels}>
            <Text style={styles.patternLabel}>100%</Text>
            <Text style={styles.patternLabel}>50%</Text>
            <Text style={styles.patternLabel}>0%</Text>
          </View>
          <View style={styles.patternBars}>
            {hourlyPattern.map((data, index) => (
              <View key={index} style={styles.patternBarContainer}>
                <View style={styles.patternBarBg}>
                  <View
                    style={[
                      styles.patternBarFill,
                      {
                        height: `${data.occupancy}%`,
                        backgroundColor: data.isCurrent
                          ? Colors.scarlet[500]
                          : data.occupancy > 80
                          ? Colors.status.full
                          : data.occupancy > 60
                          ? Colors.status.filling
                          : Colors.status.open,
                      },
                    ]}
                  />
                </View>
                {data.isCurrent && (
                  <View style={styles.currentIndicator}>
                    <Text style={styles.currentIndicatorText}>▲</Text>
                    <Text style={styles.currentIndicatorLabel}>NOW</Text>
                  </View>
                )}
                {index % 2 === 0 && (
                  <Text style={styles.patternHourLabel}>{data.hour}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Details Section */}
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>DETAILS</Text>
        <View style={styles.detailsList}>
          {lot.valid_permits && lot.valid_permits.length > 0 && (
            <View style={styles.detailRow}>
              <SFIcon name="car" size={16} color={Colors.gray[1]} />
              <Text style={styles.detailRowText}>
                Valid: {lot.valid_permits.join(', ')}
              </Text>
            </View>
          )}
          {/* Walk Times inline */}
          {lotData?.walk_times && Object.keys(lotData.walk_times).length > 0 && (
            <View style={styles.detailRow}>
              <SFIcon name="pin" size={16} color={Colors.gray[1]} />
              <Text style={styles.detailRowText}>
                Walk: {Object.entries(lotData.walk_times)
                  .slice(0, 3)
                  .map(([b, m]) => `${b} ${m}min`)
                  .join(', ')}
              </Text>
            </View>
          )}
          {lotData?.time_limit_minutes && (
            <View style={styles.detailRow}>
              <SFIcon name="clock" size={16} color={Colors.ios.orange} />
              <Text style={[styles.detailRowText, { color: Colors.ios.orange }]}>
                {lotData.time_limit_minutes / 60} hour time limit
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Known Issues Section */}
      {knownIssues.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>⚠️ KNOWN ISSUES</Text>
          <View style={styles.issuesList}>
            {knownIssues.map((issue, index) => (
              <View key={index} style={styles.issueRow}>
                <Text style={styles.issueBullet}>•</Text>
                <Text style={styles.issueText}>{issue}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.reportFullButton]}
          onPress={onReportFull}
        >
          <Text style={styles.reportFullText}>🔴 Report Full</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.reportOpenButton]}
          onPress={onReportOpen}
        >
          <Text style={styles.reportOpenText}>🟢 Report Open</Text>
        </TouchableOpacity>
      </View>

      {/* Navigate Button */}
      <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
        <SFIcon name="navigate" size={20} color="#FFFFFF" />
        <Text style={styles.navigateButtonText}>📍 Navigate to {lot.lot_id}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Map Controls
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  mapTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  locationButton: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: 4,
    ...Shadows.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  filterTabActive: {
    backgroundColor: Colors.scarlet[500],
  },
  filterTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Markers
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minWidth: 50,
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  markerPercent: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.xs,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // Legend
  legendContainer: {
    position: 'absolute',
    bottom: 140,
    left: Spacing.md,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  legendTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },

  // Bottom Sheet
  bottomSheetBackground: {
    backgroundColor: Colors.light.background,
  },
  bottomSheetHandle: {
    backgroundColor: Colors.gray[3],
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sheetPlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: Spacing.sm,
  },
  sheetSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: Spacing.xs,
  },

  // Lot Detail Sheet
  detailContainer: {
    paddingBottom: Spacing.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailHeaderLeft: {
    flex: 1,
  },
  detailLotId: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  detailLotName: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginTop: 2,
  },
  detailStatusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  detailStatusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // Occupancy
  occupancySection: {
    marginBottom: Spacing.lg,
  },
  occupancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  occupancyLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  occupancyPercent: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  occupancyBarBg: {
    height: 12,
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  lastReportText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.blue + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    fontSize: FontSize.xs,
    color: Colors.ios.blue,
    marginLeft: Spacing.xs,
    fontWeight: FontWeight.medium,
  },

  // Pattern Chart
  patternChart: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    height: 140,
  },
  patternLabels: {
    width: 35,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  patternLabel: {
    fontSize: 9,
    color: Colors.gray[2],
    textAlign: 'right',
  },
  patternBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: Spacing.sm,
    paddingBottom: 20,
  },
  patternBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  patternBarBg: {
    width: 12,
    height: '100%',
    backgroundColor: Colors.gray[5],
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  patternBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  patternHourLabel: {
    fontSize: 8,
    color: Colors.gray[2],
    marginTop: 4,
    position: 'absolute',
    bottom: 0,
  },
  currentIndicator: {
    position: 'absolute',
    bottom: -2,
    alignItems: 'center',
  },
  currentIndicatorText: {
    fontSize: 8,
    color: Colors.scarlet[500],
  },
  currentIndicatorLabel: {
    fontSize: 7,
    color: Colors.scarlet[500],
    fontWeight: FontWeight.bold,
  },

  // Known Issues
  issuesList: {
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  issueRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  issueBullet: {
    color: Colors.ios.orange,
    fontSize: FontSize.sm,
    marginRight: Spacing.sm,
    fontWeight: FontWeight.bold,
  },
  issueText: {
    color: Colors.ios.orange,
    fontSize: FontSize.sm,
    flex: 1,
  },

  // Sections
  detailSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  walkTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  walkTimeChip: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  walkTimeBuilding: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    textTransform: 'capitalize',
  },
  walkTimeValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  detailsList: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRowText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
  },
  reportFullButton: {
    backgroundColor: Colors.status.full + '10',
    borderColor: Colors.status.full,
  },
  reportFullText: {
    color: Colors.status.full,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  reportOpenButton: {
    backgroundColor: Colors.status.open + '10',
    borderColor: Colors.status.open,
  },
  reportOpenText: {
    color: Colors.status.open,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  navigateButton: {
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.lg,
  },

  // Fallback UI Styles (for Expo Go)
  fallbackContainer: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  fallbackHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  fallbackTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  fallbackSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: Spacing.xs,
  },
  fallbackScroll: {
    flex: 1,
  },
  fallbackContent: {
    padding: Spacing.md,
    paddingBottom: 200,
  },
  fallbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  fallbackLotCard: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  fallbackLotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  fallbackLotId: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  fallbackStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fallbackLotName: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  fallbackOccupancyBar: {
    height: 6,
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  fallbackOccupancyFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  fallbackOccupancyText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },
});
