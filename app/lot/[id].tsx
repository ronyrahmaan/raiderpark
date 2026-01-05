import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SFIcon } from '@/components/ui/SFIcon';
import { useParkingStore } from '@/stores/parkingStore';
import { useAuthStore } from '@/stores/authStore';
import { getLotById, subscribeToLot } from '@/services/lots';
import { getPredictionTimeline, PredictionTimelineEntry } from '@/services/predictions';
import {
  Colors,
  Shadows,
  BorderRadius,
  Spacing,
  FontSize,
  FontWeight,
  Typography,
} from '@/constants/theme';
import { LotWithStatus, OccupancyStatus } from '@/types/database';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

// Status color mapping
const STATUS_COLORS: Record<OccupancyStatus, string> = {
  open: Colors.status.open,
  busy: Colors.status.busy,
  filling: Colors.status.filling,
  full: Colors.status.full,
  closed: Colors.status.closed,
};

const STATUS_LABELS: Record<OccupancyStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  filling: 'Filling Up',
  full: 'Full',
  closed: 'Closed',
};

// Trend icons
const TrendIcon = ({ trend }: { trend: string | null }) => {
  switch (trend) {
    case 'rising':
      return <SFIcon name="trending-up" size={16} color={Colors.status.filling} />;
    case 'falling':
      return <SFIcon name="trending-down" size={16} color={Colors.status.open} />;
    default:
      return <SFIcon name="minus" size={16} color={Colors.gray[1]} />;
  }
};

export default function LotDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appUser } = useAuthStore();

  const [lot, setLot] = useState<LotWithStatus | null>(null);
  const [predictions, setPredictions] = useState<PredictionTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch lot data
  const fetchLotData = useCallback(async () => {
    if (!id) return;

    try {
      const lotData = await getLotById(id);
      setLot(lotData);

      // Fetch predictions for today
      const today = new Date();
      const timeline = await getPredictionTimeline(id, today);
      setPredictions(timeline);
    } catch (error) {
      console.error('Error fetching lot data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchLotData();
  }, [fetchLotData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToLot(id, (status) => {
      setLot((prev) =>
        prev
          ? {
              ...prev,
              ...status,
            }
          : null
      );
    });

    return () => unsubscribe();
  }, [id]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLotData();
  }, [fetchLotData]);

  // Navigate to map app
  const handleNavigate = () => {
    if (!lot?.center) return;

    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${lot.center.lat},${lot.center.lng}`;
    const label = encodeURIComponent(lot.name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  // Navigate to report screen with lot pre-selected
  const handleReport = () => {
    router.push('/report');
  };

  if (!lot && !isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.notFoundContainer}>
          <SFIcon name="alert" size={48} color={Colors.gray[1]} />
          <Text style={styles.notFoundText}>Lot not found</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SFIcon name="chevron-left" size={24} color={Colors.scarlet.DEFAULT} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {lot?.id ?? 'Loading...'}
          </Text>
          {lot?.name && (
            <Text style={styles.headerSubtitle}>{lot.name}</Text>
          )}
        </View>
        {lot && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[lot.status] + '20' },
            ]}
          >
            <Text
              style={[styles.statusBadgeText, { color: STATUS_COLORS[lot.status] }]}
            >
              {STATUS_LABELS[lot.status]}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.scarlet.DEFAULT}
          />
        }
      >
        {lot && (
          <>
            {/* Occupancy Card */}
            <View style={styles.sectionContainer}>
              <View style={[styles.card, Shadows.md]}>
                {/* Occupancy Header */}
                <View style={styles.occupancyHeader}>
                  <View>
                    <Text style={styles.occupancyLabel}>
                      Current Occupancy
                    </Text>
                    <View style={styles.occupancyRow}>
                      <Text style={styles.occupancyPercent}>
                        {lot.occupancy_percent}%
                      </Text>
                      <View style={styles.trendContainer}>
                        <TrendIcon trend={lot.trend} />
                        <Text style={styles.trendText}>
                          {lot.trend ?? 'Stable'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.lotIdBadge,
                      { backgroundColor: STATUS_COLORS[lot.status] + '15' },
                    ]}
                  >
                    <Text
                      style={[styles.lotIdText, { color: STATUS_COLORS[lot.status] }]}
                    >
                      {lot.id}
                    </Text>
                  </View>
                </View>

                {/* Occupancy Bar */}
                <View style={styles.occupancyBarContainer}>
                  <View style={styles.occupancyBarBackground}>
                    <View
                      style={[
                        styles.occupancyBarFill,
                        {
                          width: `${lot.occupancy_percent}%`,
                          backgroundColor: STATUS_COLORS[lot.status],
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.occupancyBarLabels}>
                    <Text style={styles.occupancyBarLabel}>0%</Text>
                    <Text style={styles.occupancyBarLabel}>100%</Text>
                  </View>
                </View>

                {/* Confidence & Last Report */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <SFIcon name="clock" size={14} color={Colors.gray[1]} />
                    <Text style={styles.metaText}>
                      {lot.last_report_at
                        ? `Updated ${format(new Date(lot.last_report_at), 'h:mm a')}`
                        : 'No recent reports'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <SFIcon name="bolt" size={14} color={Colors.ios.blue} />
                    <Text style={styles.metaText}>
                      {lot.confidence} confidence
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Historical Chart Placeholder */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>HISTORICAL TRENDS</Text>
              <View style={[styles.card, Shadows.md]}>
                <View style={styles.chartPlaceholder}>
                  <SFIcon name="chart" size={32} color={Colors.gray[2]} />
                  <Text style={styles.chartPlaceholderText}>
                    Chart coming soon
                  </Text>
                  <Text style={styles.chartPlaceholderSubtext}>
                    Historical occupancy data will appear here
                  </Text>
                </View>
              </View>
            </View>

            {/* Predictions Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>TODAY'S PREDICTIONS</Text>
              <View style={[styles.card, Shadows.md]}>
                {predictions.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.predictionsScroll}
                  >
                    {predictions.slice(0, 8).map((pred, index) => (
                      <View key={index} style={styles.predictionItem}>
                        <Text style={styles.predictionTime}>
                          {format(pred.time, 'h a')}
                        </Text>
                        <View
                          style={[
                            styles.predictionBadge,
                            { backgroundColor: STATUS_COLORS[pred.status] + '15' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.predictionPercent,
                              { color: STATUS_COLORS[pred.status] },
                            ]}
                          >
                            {pred.occupancy}%
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.predictionStatus,
                            { color: STATUS_COLORS[pred.status] },
                          ]}
                        >
                          {pred.status}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noPredictions}>
                    <SFIcon name="clock" size={24} color={Colors.gray[2]} />
                    <Text style={styles.noPredictionsText}>
                      No predictions available
                    </Text>
                    <Text style={styles.noPredictionsSubtext}>
                      Check back later for AI-powered forecasts
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Walk Times */}
            {lot.walk_times && Object.keys(lot.walk_times).length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>WALK TIMES</Text>
                <View style={[styles.card, Shadows.md]}>
                  <View style={styles.walkTimesGrid}>
                    {Object.entries(lot.walk_times).map(([building, mins]) => (
                      <View key={building} style={styles.walkTimeItem}>
                        <Text style={styles.walkTimeBuilding}>
                          {building.replace(/_/g, ' ')}
                        </Text>
                        <Text style={styles.walkTimeMins}>
                          {mins} min
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Lot Info */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>LOT INFORMATION</Text>
              <View style={[styles.card, Shadows.md]}>
                <View style={styles.lotInfoGrid}>
                  {lot.capacity && (
                    <View style={styles.lotInfoItem}>
                      <View style={[styles.lotInfoIcon, styles.lotInfoIconBlue]}>
                        <SFIcon name="pin" size={16} color={Colors.ios.blue} />
                      </View>
                      <View>
                        <Text style={styles.lotInfoLabel}>Capacity</Text>
                        <Text style={styles.lotInfoValue}>
                          {lot.capacity} spots
                        </Text>
                      </View>
                    </View>
                  )}
                  {lot.accessible_spots > 0 && (
                    <View style={styles.lotInfoItem}>
                      <View style={[styles.lotInfoIcon, styles.lotInfoIconBlue]}>
                        <Text style={styles.adaText}>ADA</Text>
                      </View>
                      <View>
                        <Text style={styles.lotInfoLabel}>Accessible</Text>
                        <Text style={styles.lotInfoValue}>
                          {lot.accessible_spots} spots
                        </Text>
                      </View>
                    </View>
                  )}
                  {lot.ev_charging && (
                    <View style={styles.lotInfoItem}>
                      <View style={[styles.lotInfoIcon, styles.lotInfoIconGreen]}>
                        <SFIcon name="bolt" size={16} color={Colors.ios.green} />
                      </View>
                      <View>
                        <Text style={styles.lotInfoLabel}>EV Charging</Text>
                        <Text style={styles.lotInfoValue}>Available</Text>
                      </View>
                    </View>
                  )}
                  {lot.time_limit_minutes && (
                    <View style={styles.lotInfoItem}>
                      <View style={[styles.lotInfoIcon, styles.lotInfoIconOrange]}>
                        <SFIcon name="clock" size={16} color={Colors.ios.orange} />
                      </View>
                      <View>
                        <Text style={styles.lotInfoLabel}>Time Limit</Text>
                        <Text style={styles.lotInfoValue}>
                          {lot.time_limit_minutes} min
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Notes */}
                {lot.notes && lot.notes.length > 0 && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    {lot.notes.map((note, index) => (
                      <Text key={index} style={styles.noteText}>
                        - {note}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReport}
            >
              <SFIcon name="flag" size={20} color={Colors.gray[1]} />
              <Text style={styles.reportButtonText}>Report Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navigateButton, Shadows.md]}
              onPress={handleNavigate}
            >
              <SFIcon name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    color: Colors.gray[1],
    marginTop: Spacing.md,
    fontSize: FontSize.lg,
  },
  goBackButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.lg,
  },
  goBackButtonText: {
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
    backgroundColor: Colors.light.background,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontWeight: FontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  sectionContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  occupancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  occupancyLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.xs,
  },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupancyPercent: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  trendContainer: {
    marginLeft: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginLeft: Spacing.xs,
    textTransform: 'capitalize',
  },
  lotIdBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotIdText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  occupancyBarContainer: {
    marginBottom: Spacing.md,
  },
  occupancyBarBackground: {
    height: 16,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  occupancyBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  occupancyBarLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[6],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginLeft: Spacing.xs,
    textTransform: 'capitalize',
  },
  chartPlaceholder: {
    height: 160,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    color: Colors.gray[3],
    marginTop: Spacing.sm,
  },
  chartPlaceholderSubtext: {
    fontSize: FontSize.xs,
    color: Colors.gray[4],
    marginTop: Spacing.xs,
  },
  predictionsScroll: {
    paddingRight: Spacing.md,
  },
  predictionItem: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 60,
  },
  predictionTime: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  predictionBadge: {
    width: 40,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionPercent: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  predictionStatus: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    textTransform: 'capitalize',
  },
  noPredictions: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  noPredictionsText: {
    color: Colors.gray[3],
    marginTop: Spacing.sm,
  },
  noPredictionsSubtext: {
    fontSize: FontSize.xs,
    color: Colors.gray[4],
    marginTop: Spacing.xs,
  },
  walkTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  walkTimeItem: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  walkTimeBuilding: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    textTransform: 'capitalize',
  },
  walkTimeMins: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  lotInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  lotInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  lotInfoIconBlue: {
    backgroundColor: '#EBF5FF',
  },
  lotInfoIconGreen: {
    backgroundColor: '#ECFDF5',
  },
  lotInfoIconOrange: {
    backgroundColor: '#FFF7ED',
  },
  adaText: {
    fontSize: FontSize.xs,
  },
  lotInfoLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },
  lotInfoValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  notesContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[6],
  },
  notesLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reportButton: {
    flex: 1,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonText: {
    color: Colors.light.text,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  navigateButton: {
    flex: 1,
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateButtonText: {
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
});
