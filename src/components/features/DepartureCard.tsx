// ============================================================
// DEPARTURE CARD COMPONENT
// Premium "Leave by X" recommendation for RaiderPark
// ============================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  ColoredShadows,
} from '@/constants/theme';
import { Schedule } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

interface DepartureRecommendation {
  leaveByTime: string; // e.g., "8:17 AM"
  arrivalTime: string; // e.g., "8:45 AM"
  targetLot: string; // e.g., "C11"
  targetLotName: string; // e.g., "Rec Center"
  predictedOccupancy: number; // e.g., 68
  confidence: number; // 0-1
  alternativeLots: Array<{
    id: string;
    name: string;
    predictedOccupancy: number;
  }>;
  firstClass?: {
    time: string;
    building?: string;
    minutesUntil?: number; // Minutes until class starts
  };
}

interface DepartureCardProps {
  recommendation: DepartureRecommendation | null;
  onPress?: () => void;
  onSetReminder?: () => void;
  onSeeAlternatives?: () => void;
  isLoading?: boolean;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getOccupancyColor(percent: number): string {
  if (percent >= 95) return Colors.status.full;
  if (percent >= 80) return Colors.status.filling;
  if (percent >= 60) return Colors.status.busy;
  return Colors.status.open;
}

function getOccupancyLabel(percent: number): string {
  if (percent >= 95) return 'Full';
  if (percent >= 80) return 'Filling';
  if (percent >= 60) return 'Busy';
  return 'Open';
}

function formatConfidence(confidence: number): string {
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.65) return 'Medium';
  return 'Low';
}

// ============================================================
// DEPARTURE CARD COMPONENT
// ============================================================

export function DepartureCard({
  recommendation,
  onPress,
  onSetReminder,
  onSeeAlternatives,
  isLoading = false,
}: DepartureCardProps) {
  const occupancyColor = useMemo(
    () =>
      recommendation
        ? getOccupancyColor(recommendation.predictedOccupancy)
        : Colors.status.open,
    [recommendation?.predictedOccupancy]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.loadingCard]}>
          <View style={styles.loadingPulse} />
          <Text style={styles.loadingText}>Calculating best departure time...</Text>
        </View>
      </View>
    );
  }

  // No recommendation available
  if (!recommendation) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.emptyCard]}>
          <SFIcon name="clock" size={24} color={Colors.gray[2]} />
          <Text style={styles.emptyTitle}>No Schedule Set</Text>
          <Text style={styles.emptySubtitle}>
            Add your class schedule to get personalized departure recommendations
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, ColoredShadows.scarlet]}
      >
        <LinearGradient
          colors={[Colors.scarlet[500], Colors.scarlet[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <SFIcon name="car" size={20} color={Colors.scarlet[500]} />
              </View>
              <Text style={styles.headerLabel}>Smart Departure</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <SFIcon name="bolt" size={12} color="#FFFFFF" />
              <Text style={styles.confidenceText}>
                {formatConfidence(recommendation.confidence)} confidence
              </Text>
            </View>
          </View>

          {/* Class Countdown Banner */}
          {recommendation.firstClass?.minutesUntil && (
            <View style={styles.countdownBanner}>
              <SFIcon name="clock" size={14} color="#FFFFFF" />
              <Text style={styles.countdownText}>
                YOUR NEXT CLASS: {recommendation.firstClass.time}
                {recommendation.firstClass.building ? ` at ${recommendation.firstClass.building}` : ''}
              </Text>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownBadgeText}>
                  in {recommendation.firstClass.minutesUntil} min
                </Text>
              </View>
            </View>
          )}

          {/* Main Recommendation */}
          <View style={styles.mainContent}>
            <View style={styles.leaveBySection}>
              <Text style={styles.leaveByLabel}>Leave by</Text>
              <Text style={styles.leaveByTime}>{recommendation.leaveByTime}</Text>
              {recommendation.firstClass && !recommendation.firstClass.minutesUntil && (
                <Text style={styles.firstClassText}>
                  For your {recommendation.firstClass.time} class
                  {recommendation.firstClass.building
                    ? ` at ${recommendation.firstClass.building}`
                    : ''}
                </Text>
              )}
            </View>

            {/* Target Lot */}
            <View style={styles.targetLotSection}>
              <View style={styles.targetLotHeader}>
                <SFIcon name="pin" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.targetLotLabel}>Best lot</Text>
              </View>
              <View style={styles.targetLotInfo}>
                <Text style={styles.targetLotId}>{recommendation.targetLot}</Text>
                <View
                  style={[
                    styles.occupancyBadge,
                    { backgroundColor: occupancyColor + '30' },
                  ]}
                >
                  <Text style={[styles.occupancyText, { color: '#FFFFFF' }]}>
                    ~{recommendation.predictedOccupancy}%
                  </Text>
                </View>
              </View>
              <Text style={styles.targetLotName}>{recommendation.targetLotName}</Text>
            </View>
          </View>

          {/* Alternatives */}
          {recommendation.alternativeLots.length > 0 && (
            <View style={styles.alternativesSection}>
              <Text style={styles.alternativesLabel}>Alternatives:</Text>
              <View style={styles.alternativesList}>
                {recommendation.alternativeLots.slice(0, 2).map((alt) => (
                  <View key={alt.id} style={styles.alternativeItem}>
                    <Text style={styles.alternativeId}>{alt.id}</Text>
                    <Text style={styles.alternativeOccupancy}>
                      ~{alt.predictedOccupancy}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSetReminder}
              activeOpacity={0.8}
            >
              <SFIcon name="bell" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Set Reminder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSeeAlternatives}
              activeOpacity={0.8}
            >
              <SFIcon name="chart" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Alternatives</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Tap for more options</Text>
            <SFIcon name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================
// HELPER FUNCTION: Generate Mock Recommendation
// ============================================================

export function generateDepartureRecommendation(
  schedule: Schedule | null,
  permitType: string
): DepartureRecommendation | null {
  if (!schedule) return null;

  // Get current day
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()] as keyof Schedule;
  const todaySchedule = schedule[today];

  if (!todaySchedule?.classes || todaySchedule.classes.length === 0) {
    return null;
  }

  // Get next class
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const nextClass = todaySchedule.classes.find((cls) => {
    const [hours, minutes] = cls.start.split(':').map(Number);
    return hours * 60 + minutes > currentTime;
  });

  if (!nextClass) return null;

  // Parse class time
  const [classHours, classMinutes] = nextClass.start.split(':').map(Number);
  const classTimeMinutes = classHours * 60 + classMinutes;

  // Calculate leave time (class time - commute - buffer)
  const commuteMinutes = 15; // Average commute
  const parkingBuffer = 10; // Time to find parking and walk
  const leaveTimeMinutes = classTimeMinutes - commuteMinutes - parkingBuffer;

  const leaveHours = Math.floor(leaveTimeMinutes / 60);
  const leaveMins = leaveTimeMinutes % 60;
  const leaveByTime = formatTime12h(leaveHours, leaveMins);

  // Format arrival time
  const arrivalTimeMinutes = classTimeMinutes - 5; // 5 min before class
  const arrivalHours = Math.floor(arrivalTimeMinutes / 60);
  const arrivalMins = arrivalTimeMinutes % 60;
  const arrivalTime = formatTime12h(arrivalHours, arrivalMins);

  // Determine target lot based on permit
  const lotMap: Record<string, { id: string; name: string }> = {
    commuter_west: { id: 'C11', name: 'Rec Center' },
    commuter_north: { id: 'C4', name: 'Rawls Lot' },
    commuter_satellite: { id: 'S1', name: 'Satellite' },
  };

  const targetLot = lotMap[permitType] || { id: 'C11', name: 'Recreation Center' };

  // Generate predicted occupancy based on time
  const hour = leaveHours;
  let predictedOccupancy = 45;
  if (hour >= 8 && hour < 10) predictedOccupancy = 65;
  if (hour >= 10 && hour < 12) predictedOccupancy = 85;
  if (hour >= 12 && hour < 14) predictedOccupancy = 75;

  // Calculate minutes until class
  const minutesUntilClass = classTimeMinutes - currentTime;

  return {
    leaveByTime,
    arrivalTime,
    targetLot: targetLot.id,
    targetLotName: targetLot.name,
    predictedOccupancy,
    confidence: 0.82,
    alternativeLots: [
      { id: 'C14', name: 'West 14', predictedOccupancy: predictedOccupancy - 15 },
      { id: 'C16', name: 'West 16', predictedOccupancy: predictedOccupancy - 25 },
    ],
    firstClass: {
      time: formatTime12h(classHours, classMinutes),
      building: nextClass.building,
      minutesUntil: minutesUntilClass > 0 ? minutesUntilClass : undefined,
    },
  };
}

function formatTime12h(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  loadingCard: {
    backgroundColor: Colors.gray[5],
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  loadingPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[4],
    marginBottom: Spacing.md,
  },
  loadingText: {
    color: Colors.gray[2],
    fontSize: FontSize.sm,
  },
  emptyCard: {
    backgroundColor: Colors.gray[6],
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.gray[5],
    borderStyle: 'dashed',
  },
  emptyTitle: {
    color: Colors.gray[1],
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.gray[2],
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 250,
  },
  gradientBackground: {
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerLabel: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    marginLeft: Spacing.xs,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  leaveBySection: {
    flex: 1,
  },
  leaveByLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  leaveByTime: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: FontWeight.bold,
    letterSpacing: -1,
  },
  firstClassText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  targetLotSection: {
    alignItems: 'flex-end',
  },
  targetLotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  targetLotLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  targetLotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetLotId: {
    color: '#FFFFFF',
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.sm,
  },
  occupancyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  occupancyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  targetLotName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  alternativesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  alternativesLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    marginRight: Spacing.md,
  },
  alternativesList: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  alternativeId: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
    marginRight: Spacing.xs,
  },
  alternativeOccupancy: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
  },
  // Countdown Banner Styles
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countdownBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  // Action Buttons Styles
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});

export default DepartureCard;
