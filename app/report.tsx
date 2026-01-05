import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { useParkingStore } from '@/stores/parkingStore';
import { useAuthStore } from '@/stores/authStore';
import { submitReportWithRetry, subscribeToQueueStatus, QueueStatus } from '@/services/reportQueue';
import { Colors, Shadows, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { OccupancyStatus } from '@/types/database';

// Mock recent reports for social proof
const RECENT_REPORTS = [
  { id: '1', user: 'Raider_Jake', lot: 'C11', status: 'full' as OccupancyStatus, time: '2 min ago' },
  { id: '2', user: 'TTU_Sarah', lot: 'C1', status: 'busy' as OccupancyStatus, time: '5 min ago' },
  { id: '3', user: 'RedRaider22', lot: 'C16', status: 'open' as OccupancyStatus, time: '8 min ago' },
];

// Status options with their display properties
const STATUS_OPTIONS: {
  value: OccupancyStatus;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: 'open',
    label: 'Open',
    description: 'Plenty of spots available',
    color: Colors.status.open,
  },
  {
    value: 'busy',
    label: 'Busy',
    description: 'Some spots, may need to search',
    color: Colors.status.busy,
  },
  {
    value: 'filling',
    label: 'Filling',
    description: 'Few spots left, filling fast',
    color: Colors.status.filling,
  },
  {
    value: 'full',
    label: 'Full',
    description: 'No spots available',
    color: Colors.status.full,
  },
];

// Occupancy slider steps
const OCCUPANCY_STEPS = [0, 25, 50, 75, 85, 95, 100];

// Helper function to get status color
function getStatusColor(status: OccupancyStatus): string {
  switch (status) {
    case 'open': return Colors.status.open;
    case 'busy': return Colors.status.busy;
    case 'filling': return Colors.status.filling;
    case 'full': return Colors.status.full;
    default: return Colors.gray[2];
  }
}

export default function ReportScreen() {
  const router = useRouter();
  const { status: preselectedStatus } = useLocalSearchParams<{ status?: string }>();
  const { appUser } = useAuthStore();
  const { lotsForPermit, fetchLotsForPermit } = useParkingStore();

  // Form state
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OccupancyStatus | null>(
    preselectedStatus === 'full' ? 'full' : null
  );
  const [occupancyEstimate, setOccupancyEstimate] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showLotPicker, setShowLotPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    queued: boolean;
    error?: string;
  } | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  // Subscribe to queue status
  useEffect(() => {
    const unsubscribe = subscribeToQueueStatus((status, count) => {
      setQueueStatus(status);
      setPendingCount(count);
    });
    return () => unsubscribe();
  }, []);

  // Fetch lots on mount
  useEffect(() => {
    if (appUser?.permit_type) {
      fetchLotsForPermit(appUser.permit_type);
    }
  }, [appUser?.permit_type]);

  // Pre-select occupancy when status is pre-selected
  useEffect(() => {
    if (preselectedStatus === 'full') {
      setOccupancyEstimate(100);
    }
  }, [preselectedStatus]);

  // Get selected lot details
  const selectedLot = lotsForPermit.find((lot) => lot.lot_id === selectedLotId);

  // Handle status selection
  const handleStatusSelect = useCallback((status: OccupancyStatus) => {
    Haptics.selectionAsync();
    setSelectedStatus(status);

    // Auto-set occupancy estimate based on status
    switch (status) {
      case 'open':
        setOccupancyEstimate(25);
        break;
      case 'busy':
        setOccupancyEstimate(50);
        break;
      case 'filling':
        setOccupancyEstimate(85);
        break;
      case 'full':
        setOccupancyEstimate(100);
        break;
    }
  }, []);

  // Handle occupancy slider change
  const handleOccupancyChange = useCallback((value: number) => {
    Haptics.selectionAsync();
    setOccupancyEstimate(value);
  }, []);

  // Handle submit with offline support
  const handleSubmit = async () => {
    if (!selectedLotId || !selectedStatus) {
      Alert.alert('Missing Information', 'Please select a lot and status.');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await submitReportWithRetry({
        lotId: selectedLotId,
        occupancyStatus: selectedStatus,
        occupancyPercent: occupancyEstimate ?? undefined,
        note: notes || undefined,
      });

      if (result.success) {
        // Direct success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSubmitted(true);
        setSubmitResult({ queued: false });
      } else if (result.queued) {
        // Queued for later - still show success but with note
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setIsSubmitted(true);
        setSubmitResult({ queued: true, error: result.error });
      } else {
        // Unexpected error
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.error || 'Failed to submit report.');
      }

      // For "found parking" reports, don't auto-navigate - let user choose to share
      // For "full" reports, navigate back after a brief delay
      if (result.success || result.queued) {
        if (selectedStatus === 'full' || selectedStatus === 'filling') {
          setTimeout(() => {
            router.back();
          }, 2000);
        }
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Submission Failed',
        `${errorMessage}\n\nYour report has been saved and will sync automatically when connection is restored.`,
        [
          { text: 'OK' },
          { text: 'Retry Now', onPress: handleSubmit },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid
  const isFormValid = selectedLotId && selectedStatus;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SFIcon name="chevron-left" size={24} color={Colors.scarlet.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Report Parking Status
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sync Status Banner */}
        {(queueStatus === 'offline' || queueStatus === 'syncing') && pendingCount > 0 && (
          <Animated.View entering={FadeIn} style={styles.syncBanner}>
            <SFIcon
              name={queueStatus === 'syncing' ? 'arrow-triangle-2-circlepath' : 'wifi-slash'}
              size={16}
              color={queueStatus === 'syncing' ? Colors.ios.blue : Colors.ios.orange}
            />
            <Text style={[
              styles.syncBannerText,
              { color: queueStatus === 'syncing' ? Colors.ios.blue : Colors.ios.orange }
            ]}>
              {queueStatus === 'syncing'
                ? `Syncing ${pendingCount} pending report${pendingCount > 1 ? 's' : ''}...`
                : `${pendingCount} report${pendingCount > 1 ? 's' : ''} waiting to sync`}
            </Text>
          </Animated.View>
        )}

        {/* Success State */}
        {isSubmitted ? (
          <Animated.View entering={ZoomIn.springify()} style={styles.successContainer}>
            <Animated.View
              entering={ZoomIn.delay(100).springify()}
              style={[
                styles.successIconContainer,
                submitResult?.queued && styles.successIconContainerQueued,
              ]}
            >
              <SFIcon
                name={submitResult?.queued ? 'clock' : 'checkmark'}
                size={48}
                color={submitResult?.queued ? Colors.ios.orange : Colors.ios.green}
              />
            </Animated.View>
            <Animated.Text entering={FadeInUp.delay(200)} style={styles.successTitle}>
              {submitResult?.queued ? 'Report Saved!' : 'Thanks for Reporting!'}
            </Animated.Text>
            <Animated.Text entering={FadeInUp.delay(300)} style={styles.successText}>
              {submitResult?.queued
                ? 'Will sync automatically when back online.'
                : 'Your report helps fellow Raiders find parking faster.'}
            </Animated.Text>

            {/* Queued indicator */}
            {submitResult?.queued && (
              <Animated.View entering={FadeInUp.delay(350)} style={styles.queuedIndicator}>
                <SFIcon name="wifi-slash" size={14} color={Colors.ios.orange} />
                <Text style={styles.queuedIndicatorText}>Offline - Will retry automatically</Text>
              </Animated.View>
            )}

            {/* Points Earned Animation */}
            <Animated.View entering={FadeInUp.delay(400)} style={styles.pointsEarnedContainer}>
              <View style={styles.pointsBadge}>
                <SFIcon name="star" size={18} color={Colors.ios.orange} />
                <Text style={styles.pointsText}>+10 points earned</Text>
              </View>
            </Animated.View>

            {/* Streak Info */}
            <Animated.View entering={FadeInUp.delay(500)} style={styles.streakContainer}>
              <SFIcon name="flame" size={20} color={Colors.scarlet.DEFAULT} />
              <Text style={styles.streakText}>5 day streak! Keep it up!</Text>
            </Animated.View>

            {/* Share buttons for "found parking" reports */}
            {(selectedStatus === 'open' || selectedStatus === 'busy') && (
              <Animated.View entering={FadeInUp.delay(600)} style={styles.shareActionsContainer}>
                <Text style={styles.sharePromptText}>Found a spot? Share your win!</Text>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => {
                    router.push({
                      pathname: '/share',
                      params: {
                        lotId: selectedLotId || 'C11',
                        lotStatus: selectedStatus,
                        foundTime: new Date().toISOString(),
                        searchTimeMinutes: '3',
                        savedMinutes: '12',
                      },
                    });
                  }}
                >
                  <Text style={styles.shareButtonIcon}>🎉</Text>
                  <Text style={styles.shareButtonText}>Share Your Find</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipShareButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.skipShareButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Done button for "full" reports */}
            {(selectedStatus === 'full' || selectedStatus === 'filling') && (
              <Animated.View entering={FadeInUp.delay(600)} style={styles.shareActionsContainer}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        ) : (
          <>
            {/* Lot Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>
                SELECT LOT
              </Text>
              <TouchableOpacity
                style={[styles.lotPickerButton, Shadows.md]}
                onPress={() => setShowLotPicker(!showLotPicker)}
              >
                <View>
                  {selectedLot ? (
                    <>
                      <Text style={styles.selectedLotId}>
                        {selectedLot.lot_id}
                      </Text>
                      <Text style={styles.selectedLotName}>
                        {selectedLot.short_name ?? selectedLot.lot_name}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.lotPickerPlaceholder}>
                      Tap to select a lot...
                    </Text>
                  )}
                </View>
                <SFIcon
                  name="chevron-down"
                  size={20}
                  color={Colors.gray[1]}
                  style={{
                    transform: [{ rotate: showLotPicker ? '180deg' : '0deg' }],
                  }}
                />
              </TouchableOpacity>

              {/* Lot Picker Dropdown */}
              {showLotPicker && (
                <View style={[styles.lotPickerDropdown, Shadows.md]}>
                  {lotsForPermit.map((lot, index) => (
                    <TouchableOpacity
                      key={lot.lot_id}
                      style={[
                        styles.lotPickerItem,
                        index < lotsForPermit.length - 1 && styles.lotPickerItemBorder,
                        selectedLotId === lot.lot_id && styles.lotPickerItemSelected,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedLotId(lot.lot_id);
                        setShowLotPicker(false);
                      }}
                    >
                      <View>
                        <Text
                          style={[
                            styles.lotPickerItemTitle,
                            selectedLotId === lot.lot_id && styles.lotPickerItemTitleSelected,
                          ]}
                        >
                          {lot.lot_id} - {lot.short_name ?? lot.lot_name}
                        </Text>
                        <Text style={styles.lotPickerItemSubtitle}>
                          Currently {lot.occupancy_percent}% full
                        </Text>
                      </View>
                      {selectedLotId === lot.lot_id && (
                        <SFIcon name="checkmark" size={20} color={Colors.scarlet.DEFAULT} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Status Selection */}
            <View style={styles.statusSectionContainer}>
              <Text style={styles.sectionLabel}>
                CURRENT STATUS
              </Text>
              <View style={styles.statusOptionsGrid}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      selectedStatus === option.value && styles.statusOptionSelected,
                      {
                        backgroundColor:
                          selectedStatus === option.value
                            ? option.color + '15'
                            : Colors.light.background,
                      },
                      Shadows.sm,
                    ]}
                    onPress={() => handleStatusSelect(option.value)}
                  >
                    <View style={styles.statusOptionHeader}>
                      <View
                        style={[styles.statusDot, { backgroundColor: option.color }]}
                      />
                      <Text
                        style={[
                          styles.statusLabel,
                          selectedStatus === option.value && styles.statusLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    <Text style={styles.statusDescription}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Occupancy Estimate Slider */}
            <View style={styles.statusSectionContainer}>
              <Text style={styles.sectionLabel}>
                OCCUPANCY ESTIMATE (OPTIONAL)
              </Text>
              <View style={[styles.occupancyCard, Shadows.md]}>
                <Text style={styles.occupancyValue}>
                  {occupancyEstimate ?? '--'}%
                </Text>
                <View style={styles.occupancyStepsRow}>
                  {OCCUPANCY_STEPS.map((step) => (
                    <TouchableOpacity
                      key={step}
                      style={[
                        styles.occupancyStep,
                        occupancyEstimate === step && styles.occupancyStepSelected,
                      ]}
                      onPress={() => handleOccupancyChange(step)}
                    >
                      <Text
                        style={[
                          styles.occupancyStepText,
                          occupancyEstimate === step && styles.occupancyStepTextSelected,
                        ]}
                      >
                        {step}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.occupancyLabelsRow}>
                  <Text style={styles.occupancyLabel}>Empty</Text>
                  <Text style={styles.occupancyLabel}>Full</Text>
                </View>
              </View>
            </View>

            {/* Additional Notes */}
            <View style={styles.statusSectionContainer}>
              <Text style={styles.sectionLabel}>
                ADDITIONAL INFO (OPTIONAL)
              </Text>
              <View style={[styles.notesCard, Shadows.md]}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="e.g., Only found spot in back row near greenhouse"
                  placeholderTextColor={Colors.gray[3]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.notesCharCount}>
                  {notes.length}/200
                </Text>
              </View>
            </View>

            {/* Reporter Stats Section */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionLabel}>🏆 YOUR STATS</Text>
              <View style={[styles.statsCard, Shadows.md]}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>47</Text>
                    <Text style={styles.statLabel}>Reports</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>94%</Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Colors.ios.green }]}>Top 5%</Text>
                    <Text style={styles.statLabel}>Rank</Text>
                  </View>
                </View>

                {/* Reporter Level */}
                <View style={styles.levelContainer}>
                  <View style={styles.levelHeader}>
                    <Text style={styles.levelLabel}>Reporter Level</Text>
                    <Text style={styles.levelBadge}>🥇 Veteran</Text>
                  </View>
                  <View style={styles.levelProgressBg}>
                    <View style={[styles.levelProgressFill, { width: '47%' }]} />
                  </View>
                  <View style={styles.levelLabels}>
                    <Text style={styles.levelMilestone}>47 / 100 to 💎 Legend</Text>
                  </View>
                </View>

                {/* Level Tiers */}
                <View style={styles.levelTiers}>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierIcon}>🥉</Text>
                    <Text style={styles.tierLabel}>Rookie</Text>
                    <Text style={styles.tierRange}>0-10</Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierIcon}>🥈</Text>
                    <Text style={styles.tierLabel}>Regular</Text>
                    <Text style={styles.tierRange}>11-50</Text>
                  </View>
                  <View style={[styles.tierItem, styles.tierItemActive]}>
                    <Text style={styles.tierIcon}>🥇</Text>
                    <Text style={[styles.tierLabel, styles.tierLabelActive]}>Veteran</Text>
                    <Text style={styles.tierRange}>51-200</Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierIcon}>💎</Text>
                    <Text style={styles.tierLabel}>Legend</Text>
                    <Text style={styles.tierRange}>201-500</Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierIcon}>👑</Text>
                    <Text style={styles.tierLabel}>MVP</Text>
                    <Text style={styles.tierRange}>501+</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recent Reports - Social Proof */}
            <Animated.View entering={FadeInUp.delay(200)} style={styles.recentReportsSection}>
              <View style={styles.recentReportsHeader}>
                <SFIcon name="clock" size={16} color={Colors.gray[1]} />
                <Text style={styles.recentReportsTitle}>Recent Reports</Text>
              </View>
              {RECENT_REPORTS.map((report, index) => (
                <Animated.View
                  key={report.id}
                  entering={FadeInUp.delay(300 + index * 100)}
                  style={styles.recentReportItem}
                >
                  <View style={styles.recentReportUser}>
                    <View style={styles.recentReportAvatar}>
                      <SFIcon name="person" size={14} color={Colors.gray[2]} />
                    </View>
                    <Text style={styles.recentReportUsername}>{report.user}</Text>
                  </View>
                  <View style={styles.recentReportContent}>
                    <Text style={styles.recentReportLot}>{report.lot}</Text>
                    <View style={[
                      styles.recentReportStatusBadge,
                      { backgroundColor: getStatusColor(report.status) + '20' }
                    ]}>
                      <View style={[
                        styles.recentReportStatusDot,
                        { backgroundColor: getStatusColor(report.status) }
                      ]} />
                      <Text style={[
                        styles.recentReportStatusText,
                        { color: getStatusColor(report.status) }
                      ]}>
                        {report.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recentReportTime}>{report.time}</Text>
                </Animated.View>
              ))}
            </Animated.View>

            {/* Pro Tip */}
            <Animated.View entering={FadeInUp.delay(600)} style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <SFIcon name="info" size={18} color={Colors.ios.blue} />
                <Text style={styles.infoTitle}>
                  Accurate Reports Earn Points
                </Text>
              </View>
              <Text style={styles.infoText}>
                Your reports help train our AI to give better predictions.
                The more accurate your reports, the higher your reporter score!
              </Text>
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* Submit Button */}
      {!isSubmitted && (
        <View style={styles.submitContainer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isFormValid ? styles.submitButtonActive : styles.submitButtonDisabled,
                isFormValid && Shadows.md,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SFIcon name="arrow-up" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    Submit Report
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
    backgroundColor: Colors.light.background,
  },
  headerBackButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  successText: {
    color: Colors.gray[1],
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statusSectionContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  lotPickerButton: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLotId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  selectedLotName: {
    color: Colors.gray[1],
  },
  lotPickerPlaceholder: {
    color: Colors.gray[3],
    fontSize: FontSize.lg,
  },
  lotPickerDropdown: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  lotPickerItem: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lotPickerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[6],
  },
  lotPickerItemSelected: {
    backgroundColor: Colors.scarlet[50],
  },
  lotPickerItemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  lotPickerItemTitleSelected: {
    color: Colors.scarlet[500],
  },
  lotPickerItemSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  statusOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    minWidth: '45%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    borderColor: Colors.scarlet[500],
  },
  statusOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  statusLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
  },
  statusLabelSelected: {
    color: Colors.light.text,
  },
  statusDescription: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  occupancyCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  occupancyValue: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  occupancyStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupancyStep: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[6],
  },
  occupancyStepSelected: {
    backgroundColor: Colors.scarlet[500],
  },
  occupancyStepText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
  },
  occupancyStepTextSelected: {
    color: Colors.light.background,
  },
  occupancyLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  occupancyLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
  },

  // Notes Input
  notesCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  notesInput: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    minHeight: 80,
    padding: 0,
  },
  notesCharCount: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
    textAlign: 'right',
    marginTop: Spacing.sm,
  },

  infoBox: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    color: '#1E40AF',
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  infoText: {
    color: '#2563EB',
    fontSize: FontSize.sm,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  submitButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonActive: {
    backgroundColor: Colors.scarlet[500],
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[3],
  },
  submitButtonText: {
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.lg,
    marginLeft: Spacing.sm,
  },

  // Reporter Stats Styles
  statsSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  statsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray[5],
  },

  // Level Progress
  levelContainer: {
    marginBottom: Spacing.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  levelLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  levelBadge: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.scarlet[500],
  },
  levelProgressBg: {
    height: 8,
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.full,
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
  },
  levelMilestone: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },

  // Level Tiers
  levelTiers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  tierItem: {
    alignItems: 'center',
    flex: 1,
    opacity: 0.5,
  },
  tierItemActive: {
    opacity: 1,
  },
  tierIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tierLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },
  tierLabelActive: {
    color: Colors.scarlet[500],
    fontWeight: FontWeight.semibold,
  },
  tierRange: {
    fontSize: 9,
    color: Colors.gray[3],
  },

  // Success State Enhancements
  pointsEarnedContainer: {
    marginTop: Spacing.lg,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.orange + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  pointsText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
    marginLeft: Spacing.sm,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  streakText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.scarlet.DEFAULT,
    marginLeft: Spacing.sm,
  },

  // Recent Reports Section
  recentReportsSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  recentReportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  recentReportsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginLeft: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentReportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  recentReportUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentReportAvatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[5],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  recentReportUsername: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  recentReportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  recentReportLot: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginRight: Spacing.sm,
  },
  recentReportStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  recentReportStatusDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    marginRight: 4,
  },
  recentReportStatusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: 'capitalize',
  },
  recentReportTime: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    width: 60,
    textAlign: 'right',
  },

  // Info Box Enhancement
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  // Share Actions in Success State
  shareActionsContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  sharePromptText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginBottom: Spacing.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  shareButtonIcon: {
    fontSize: 20,
  },
  shareButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  skipShareButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  skipShareButtonText: {
    color: Colors.gray[2],
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  doneButton: {
    backgroundColor: Colors.gray[5],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
  },
  doneButtonText: {
    color: Colors.light.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Sync Status Banner
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ios.orange + '15',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  syncBannerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },

  // Queued Success State
  successIconContainerQueued: {
    backgroundColor: Colors.ios.orange + '20',
  },
  queuedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.orange + '15',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  queuedIndicatorText: {
    fontSize: FontSize.sm,
    color: Colors.ios.orange,
    fontWeight: FontWeight.medium,
  },
});
