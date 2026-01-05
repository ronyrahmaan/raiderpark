// ============================================================
// PREDICTIVE ARRIVAL ENGINE SCREEN
// ML-powered parking prediction with arrival time table
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';
import { LOTS } from '@/constants/lots';

// ============================================================
// TYPES
// ============================================================

interface ArrivalPrediction {
  time: string;
  timeLabel: string; // "8:00 AM"
  occupancyPercent: number;
  chanceOfSpot: number;
  status: 'high' | 'medium' | 'low' | 'very_low';
}

interface AlternativeLot {
  id: string;
  name: string;
  chanceOfSpot: number;
  walkTimeDiff: number; // +2 min, +5 min
  status: 'high' | 'medium' | 'low';
}

interface PredictionData {
  date: string;
  dayOfWeek: string;
  classTime: string;
  classBuilding: string;
  preferredLot: string;
  preferredLotName: string;
  recommendedDeparture: string;
  confidence: number;
  confidenceLabel: string;
  similarDaysCount: number;
  arrivalPredictions: ArrivalPrediction[];
  alternativeLots: AlternativeLot[];
}

// ============================================================
// MOCK DATA GENERATOR
// ============================================================

function getMockPredictionData(): PredictionData {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    date: `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    dayOfWeek: dayNames[now.getDay()],
    classTime: '9:30 AM',
    classBuilding: 'Rawls College of Business',
    preferredLot: 'C11',
    preferredLotName: 'Rec Center',
    recommendedDeparture: '8:17 AM',
    confidence: 0.87,
    confidenceLabel: 'HIGH',
    similarDaysCount: 47,
    arrivalPredictions: [
      { time: '8:00', timeLabel: '8:00 AM', occupancyPercent: 35, chanceOfSpot: 92, status: 'high' },
      { time: '8:15', timeLabel: '8:15 AM', occupancyPercent: 48, chanceOfSpot: 85, status: 'high' },
      { time: '8:30', timeLabel: '8:30 AM', occupancyPercent: 62, chanceOfSpot: 71, status: 'medium' },
      { time: '8:45', timeLabel: '8:45 AM', occupancyPercent: 78, chanceOfSpot: 52, status: 'medium' },
      { time: '9:00', timeLabel: '9:00 AM', occupancyPercent: 89, chanceOfSpot: 23, status: 'low' },
      { time: '9:15', timeLabel: '9:15 AM', occupancyPercent: 97, chanceOfSpot: 5, status: 'very_low' },
    ],
    alternativeLots: [
      { id: 'C12', name: 'West 12', chanceOfSpot: 78, walkTimeDiff: 2, status: 'medium' },
      { id: 'C14', name: 'West 14', chanceOfSpot: 85, walkTimeDiff: 5, status: 'high' },
      { id: 'S1', name: 'Satellite', chanceOfSpot: 95, walkTimeDiff: 12, status: 'high' },
    ],
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getChanceColor(status: string): string {
  switch (status) {
    case 'high':
      return Colors.status.open;
    case 'medium':
      return Colors.status.busy;
    case 'low':
      return Colors.status.filling;
    case 'very_low':
      return Colors.status.full;
    default:
      return Colors.gray[3];
  }
}

function getChanceLabel(status: string): string {
  switch (status) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
      return 'LOW';
    case 'very_low':
      return 'VERY LOW';
    default:
      return 'UNKNOWN';
  }
}

function getStatusBarWidth(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ContextSection({ data }: { data: PredictionData }) {
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.contextSection}>
      <View style={styles.contextRow}>
        <View style={styles.contextItem}>
          <SFIcon name="calendar" size={16} color={Colors.gray[2]} />
          <Text style={styles.contextLabel}>Today</Text>
          <Text style={styles.contextValue}>{data.dayOfWeek}</Text>
        </View>
        <View style={styles.contextDivider} />
        <View style={styles.contextItem}>
          <SFIcon name="clock" size={16} color={Colors.gray[2]} />
          <Text style={styles.contextLabel}>Class Time</Text>
          <Text style={styles.contextValue}>{data.classTime}</Text>
        </View>
        <View style={styles.contextDivider} />
        <View style={styles.contextItem}>
          <SFIcon name="pin" size={16} color={Colors.gray[2]} />
          <Text style={styles.contextLabel}>Preferred Lot</Text>
          <Text style={styles.contextValue}>{data.preferredLot}</Text>
        </View>
      </View>
      <View style={styles.buildingRow}>
        <SFIcon name="building" size={14} color={Colors.gray[3]} />
        <Text style={styles.buildingText}>{data.classBuilding}</Text>
      </View>
    </Animated.View>
  );
}

function RecommendationCard({ data }: { data: PredictionData }) {
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.recommendationCard}>
      <LinearGradient
        colors={[Colors.scarlet[500], Colors.scarlet[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.recommendationGradient}
      >
        <View style={styles.recommendationHeader}>
          <View style={styles.recommendationIcon}>
            <SFIcon name="car" size={24} color={Colors.scarlet[500]} />
          </View>
          <Text style={styles.recommendationTitle}>Recommended Departure</Text>
        </View>

        <Text style={styles.departureTime}>{data.recommendedDeparture}</Text>

        <View style={styles.targetRow}>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Target Lot</Text>
            <Text style={styles.targetValue}>{data.preferredLot}</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Arrive by</Text>
            <Text style={styles.targetValue}>9:15 AM</Text>
          </View>
        </View>

        <View style={styles.confidenceRow}>
          <SFIcon name="chart" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.confidenceText}>
            {data.confidenceLabel} confidence based on {data.similarDaysCount} similar days
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function ArrivalTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, styles.tableColArrival]}>ARRIVAL</Text>
      <Text style={[styles.tableHeaderText, styles.tableColStatus]}>LOT STATUS</Text>
      <Text style={[styles.tableHeaderText, styles.tableColChance]}>CHANCE OF SPOT</Text>
    </View>
  );
}

function ArrivalTableRow({ prediction, index }: { prediction: ArrivalPrediction; index: number }) {
  const color = getChanceColor(prediction.status);
  const isRecommended = index === 1; // 8:15 AM is recommended in mock data

  return (
    <Animated.View
      entering={FadeInDown.delay(300 + index * 50).duration(300)}
      style={[styles.tableRow, isRecommended && styles.tableRowRecommended]}
    >
      <View style={[styles.tableColArrival, styles.tableCell]}>
        <Text style={[styles.arrivalTime, isRecommended && styles.arrivalTimeRecommended]}>
          {prediction.timeLabel}
        </Text>
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <SFIcon name="star-fill" size={10} color={Colors.scarlet[500]} />
          </View>
        )}
      </View>

      <View style={[styles.tableColStatus, styles.tableCell]}>
        <View style={styles.statusBarContainer}>
          <View
            style={[
              styles.statusBarFill,
              {
                width: `${getStatusBarWidth(prediction.occupancyPercent)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles.occupancyText}>{prediction.occupancyPercent}% full</Text>
      </View>

      <View style={[styles.tableColChance, styles.tableCell]}>
        <View style={[styles.chanceBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.chancePercent, { color }]}>{prediction.chanceOfSpot}%</Text>
        </View>
        <Text style={[styles.chanceLabel, { color }]}>{getChanceLabel(prediction.status)}</Text>
      </View>
    </Animated.View>
  );
}

function ArrivalTable({ predictions }: { predictions: ArrivalPrediction[] }) {
  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.tableContainer}>
      <View style={styles.tableTitleRow}>
        <SFIcon name="clock" size={18} color={Colors.gray[1]} />
        <Text style={styles.tableTitle}>Arrival Time Analysis</Text>
      </View>
      <View style={styles.tableCard}>
        <ArrivalTableHeader />
        {predictions.map((prediction, index) => (
          <ArrivalTableRow key={prediction.time} prediction={prediction} index={index} />
        ))}
      </View>
    </Animated.View>
  );
}

function AlternativeLotCard({ lot, index }: { lot: AlternativeLot; index: number }) {
  const color = getChanceColor(lot.status);
  const lotData = LOTS[lot.id];

  return (
    <Animated.View entering={FadeInDown.delay(500 + index * 100).duration(300)}>
      <TouchableOpacity
        style={styles.altLotCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/lot/${lot.id}`)}
      >
        <View style={styles.altLotHeader}>
          <View style={styles.altLotInfo}>
            <Text style={styles.altLotId}>{lot.id}</Text>
            <Text style={styles.altLotName}>{lotData?.short_name || lot.name}</Text>
          </View>
          <View style={[styles.altLotChance, { backgroundColor: color + '20' }]}>
            <Text style={[styles.altLotChanceText, { color }]}>{lot.chanceOfSpot}%</Text>
          </View>
        </View>
        <View style={styles.altLotFooter}>
          <SFIcon name="walk" size={14} color={Colors.gray[3]} />
          <Text style={styles.altLotWalkTime}>+{lot.walkTimeDiff} min walk</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AlternativesSection({ alternatives }: { alternatives: AlternativeLot[] }) {
  return (
    <View style={styles.alternativesSection}>
      <View style={styles.alternativesHeader}>
        <SFIcon name="arrow-right" size={18} color={Colors.gray[1]} />
        <Text style={styles.alternativesTitle}>If {LOTS['C11']?.short_name || 'Rec Center'} is Full</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.alternativesList}
      >
        {alternatives.map((lot, index) => (
          <AlternativeLotCard key={lot.id} lot={lot} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}

function SetReminderButton({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.reminderButtonContainer}>
      <TouchableOpacity
        style={styles.reminderButton}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <SFIcon name="bell" size={20} color="#FFFFFF" />
        <Text style={styles.reminderButtonText}>Set Departure Reminder</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PredictionScreen() {
  const [data] = useState<PredictionData>(getMockPredictionData());

  const handleSetReminder = () => {
    Alert.alert(
      'Reminder Set',
      `We'll remind you to leave at ${data.recommendedDeparture} for your ${data.classTime} class.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SFIcon name="chevron-left" size={24} color={Colors.gray[1]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parking Prediction</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Context Section */}
        <ContextSection data={data} />

        {/* Recommendation Card */}
        <RecommendationCard data={data} />

        {/* Arrival Time Table */}
        <ArrivalTable predictions={data.arrivalPredictions} />

        {/* How It Works */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <SFIcon name="info" size={18} color={Colors.scarlet[500]} />
            <Text style={styles.infoTitle}>How Predictions Work</Text>
          </View>
          <Text style={styles.infoText}>
            Our ML model analyzes historical patterns, class schedules, weather, and events
            to predict lot occupancy. Predictions improve as more Raiders contribute reports.
          </Text>
          <View style={styles.infoFeatures}>
            <View style={styles.infoFeature}>
              <SFIcon name="clock" size={14} color={Colors.gray[2]} />
              <Text style={styles.infoFeatureText}>Time of day</Text>
            </View>
            <View style={styles.infoFeature}>
              <SFIcon name="calendar" size={14} color={Colors.gray[2]} />
              <Text style={styles.infoFeatureText}>Day patterns</Text>
            </View>
            <View style={styles.infoFeature}>
              <SFIcon name="cloud" size={14} color={Colors.gray[2]} />
              <Text style={styles.infoFeatureText}>Weather</Text>
            </View>
            <View style={styles.infoFeature}>
              <SFIcon name="ticket" size={14} color={Colors.gray[2]} />
              <Text style={styles.infoFeatureText}>Events</Text>
            </View>
          </View>
        </Animated.View>

        {/* Alternatives Section */}
        <AlternativesSection alternatives={data.alternativeLots} />

        {/* Set Reminder Button */}
        <SetReminderButton onPress={handleSetReminder} />

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },

  // Context Section
  contextSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextItem: {
    flex: 1,
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
    marginTop: Spacing.xs,
  },
  contextValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginTop: 2,
  },
  contextDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray[5],
  },
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  buildingText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginLeft: Spacing.xs,
  },

  // Recommendation Card
  recommendationCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  recommendationGradient: {
    padding: Spacing.lg,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recommendationTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
  departureTime: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: Spacing.md,
  },
  targetRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  targetItem: {
    marginRight: Spacing.xl,
  },
  targetLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  targetValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  confidenceText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: Spacing.xs,
  },

  // Table
  tableContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tableTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginLeft: Spacing.xs,
  },
  tableCard: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.gray[6],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  tableHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[3],
    letterSpacing: 0.5,
  },
  tableColArrival: {
    width: 90,
  },
  tableColStatus: {
    flex: 1,
  },
  tableColChance: {
    width: 100,
    alignItems: 'flex-end',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  tableRowRecommended: {
    backgroundColor: Colors.scarlet[50] + '50',
  },
  tableCell: {
    justifyContent: 'center',
  },
  arrivalTime: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
  },
  arrivalTimeRecommended: {
    color: Colors.scarlet[600],
    fontWeight: FontWeight.semibold,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -4,
    right: 10,
  },
  statusBarContainer: {
    height: 8,
    backgroundColor: Colors.gray[5],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  occupancyText: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
  },
  chanceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
  },
  chancePercent: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  chanceLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
  },

  // Info Card
  infoCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.scarlet[100],
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginLeft: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  infoFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  infoFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[6],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  infoFeatureText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginLeft: Spacing.xs,
  },

  // Alternatives Section
  alternativesSection: {
    marginBottom: Spacing.lg,
  },
  alternativesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alternativesTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginLeft: Spacing.xs,
  },
  alternativesList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  altLotCard: {
    width: 140,
    padding: Spacing.md,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  altLotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  altLotInfo: {},
  altLotId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.gray[1],
  },
  altLotName: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
    marginTop: 2,
  },
  altLotChance: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  altLotChanceText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  altLotFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  altLotWalkTime: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
    marginLeft: Spacing.xs,
  },

  // Reminder Button
  reminderButtonContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  reminderButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },

  bottomPadding: {
    height: Spacing.xxl,
  },
});
