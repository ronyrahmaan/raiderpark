// ============================================================
// STATS SCREEN - Personal Analytics Dashboard
// Comprehensive user statistics with gamification
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
import {
  useAllUserStats,
  getLevelConfig,
  getLevelProgress,
  getBadgeInfo,
  getBadgeRarityColor,
  BADGES,
} from '@/hooks/useUserStats';
import { ReporterLevel } from '@/types/database';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// TYPES
// ============================================================

type Period = 'week' | 'month' | 'semester';

// ============================================================
// COMPONENTS
// ============================================================

interface PeriodSelectorProps {
  selected: Period;
  onSelect: (period: Period) => void;
}

function PeriodSelector({ selected, onSelect }: PeriodSelectorProps) {
  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'semester', label: 'Semester' },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <Pressable
          key={period.key}
          onPress={() => onSelect(period.key)}
          style={[
            styles.periodButton,
            selected === period.key && styles.periodButtonActive,
          ]}
        >
          <Text
            style={[
              styles.periodButtonText,
              selected === period.key && styles.periodButtonTextActive,
            ]}
          >
            {period.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
}

function ProgressBar({
  progress,
  color = Colors.scarlet[500],
  height = 8,
}: ProgressBarProps) {
  return (
    <View style={[styles.progressBarBg, { height }]}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

interface SemesterStatCardProps {
  value: string | number;
  label: string;
  icon: string;
  iconColor: string;
}

function SemesterStatCard({ value, label, icon, iconColor }: SemesterStatCardProps) {
  return (
    <View style={styles.semesterStatCard}>
      <View style={[styles.semesterStatIcon, { backgroundColor: iconColor + '15' }]}>
        <SFIcon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.semesterStatValue}>{value}</Text>
      <Text style={styles.semesterStatLabel}>{label}</Text>
    </View>
  );
}

interface LotUsageBarProps {
  lotId: string;
  percentage: number;
  trips: number;
  color: string;
  index: number;
}

function LotUsageBar({ lotId, percentage, trips, color, index }: LotUsageBarProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80)}
      style={styles.lotBarRow}
    >
      <View style={styles.lotBarLabelContainer}>
        <Text style={styles.lotBarLabel}>{lotId}</Text>
        <Text style={styles.lotBarStats}>
          <Text style={styles.lotBarPercentage}>{percentage}%</Text>
          <Text style={styles.lotBarTrips}> ({trips} trips)</Text>
        </Text>
      </View>
      <View style={styles.lotBarTrack}>
        <Animated.View
          entering={FadeIn.delay(index * 80 + 150)}
          style={[
            styles.lotBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

interface ArrivalInsightProps {
  time: string;
  description: string;
  icon: string;
  iconColor: string;
}

function ArrivalInsight({ time, description, icon, iconColor }: ArrivalInsightProps) {
  return (
    <View style={styles.arrivalInsightRow}>
      <View style={[styles.arrivalInsightIcon, { backgroundColor: iconColor + '15' }]}>
        <SFIcon name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.arrivalInsightContent}>
        <Text style={styles.arrivalInsightTime}>{time}</Text>
        <Text style={styles.arrivalInsightDesc}>{description}</Text>
      </View>
    </View>
  );
}

interface InsightBulletProps {
  text: string;
  highlight?: boolean;
}

function InsightBullet({ text, highlight }: InsightBulletProps) {
  return (
    <View style={styles.insightBulletRow}>
      <View style={[styles.insightBulletDot, highlight && styles.insightBulletDotHighlight]} />
      <Text style={[styles.insightBulletText, highlight && styles.insightBulletTextHighlight]}>{text}</Text>
    </View>
  );
}

interface ActivityChartProps {
  data: { day: string; reports: number }[];
}

function ActivityChart({ data }: ActivityChartProps) {
  const maxValue = Math.max(...data.map((d) => d.reports), 1);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((item, index) => {
          const height = (item.reports / maxValue) * 60;
          return (
            <View key={index} style={styles.chartBarColumn}>
              <View style={styles.chartBarWrapper}>
                <Animated.View
                  entering={FadeInUp.delay(index * 50)}
                  style={[
                    styles.chartBar,
                    {
                      height: Math.max(4, height),
                      backgroundColor:
                        item.reports > 0 ? Colors.scarlet[500] : Colors.gray[4],
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{item.day}</Text>
              {item.reports > 0 && (
                <Text style={styles.chartValue}>{item.reports}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface BadgeDisplayProps {
  badges: string[];
}

function BadgeDisplay({ badges }: BadgeDisplayProps) {
  const [showAll, setShowAll] = useState(false);

  const badgeData = useMemo(() => {
    return badges
      .map((id) => getBadgeInfo(id))
      .filter((b): b is NonNullable<typeof b> => b !== undefined);
  }, [badges]);

  const displayBadges = showAll ? badgeData : badgeData.slice(0, 6);
  const hasMore = badgeData.length > 6;

  if (badgeData.length === 0) {
    return (
      <View style={styles.emptyBadges}>
        <Text style={styles.emptyBadgesIcon}>🏅</Text>
        <Text style={styles.emptyBadgesText}>No badges yet</Text>
        <Text style={styles.emptyBadgesSubtext}>Keep reporting to earn badges!</Text>
      </View>
    );
  }

  return (
    <View style={styles.badgesContainer}>
      <View style={styles.badgesGrid}>
        {displayBadges.map((badge, index) => {
          const colors = getBadgeRarityColor(badge.rarity);
          return (
            <Animated.View
              key={badge.id}
              entering={FadeInDown.delay(index * 50)}
              style={[
                styles.badgeItem,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>
                {badge.name}
              </Text>
            </Animated.View>
          );
        })}
      </View>
      {hasMore && (
        <Pressable onPress={() => setShowAll(!showAll)} style={styles.showMoreButton}>
          <Text style={styles.showMoreText}>
            {showAll ? 'Show Less' : `+${badgeData.length - 6} more badges`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function StatsScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [period, setPeriod] = useState<Period>('semester');

  const {
    stats,
    rank,
    weeklyStats,
    monthlyStats,
    isLoading,
    isRefetching,
    refetchAll,
  } = useAllUserStats();

  const handleShare = useCallback(() => {
    // Navigate to the weekly digest shareable screen
    router.push('/weekly-digest');
  }, [router]);

  const handleQuickShare = useCallback(async () => {
    if (!stats) return;

    const levelConfig = getLevelConfig(stats.level);
    const message = `I'm a ${levelConfig.label} reporter on RaiderPark! ${stats.total_trips} trips, ${stats.report_count} reports, ${stats.current_streak} day streak. Help make parking easier at TTU - download RaiderPark!`;

    try {
      await Share.share({
        message,
        title: 'My RaiderPark Stats',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [stats]);

  // Calculate lot usage percentages
  const lotUsageData = useMemo(() => {
    const lotUsage = stats?.lot_usage || {};
    const entries = Object.entries(lotUsage);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    if (total === 0) {
      // Mock data for display
      return [
        { lotId: 'C11', percentage: 62, trips: 29, color: Colors.scarlet[500] },
        { lotId: 'C12', percentage: 24, trips: 11, color: Colors.scarlet[400] },
        { lotId: 'C16', percentage: 12, trips: 6, color: Colors.scarlet[300] },
        { lotId: 'S1', percentage: 2, trips: 1, color: Colors.scarlet[200] },
      ];
    }

    return entries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lotId, count], index) => ({
        lotId,
        percentage: Math.round((count / total) * 100),
        trips: count,
        color: [Colors.scarlet[500], Colors.scarlet[400], Colors.scarlet[300], Colors.scarlet[200], Colors.scarlet[100]][index],
      }));
  }, [stats?.lot_usage]);

  // Generate personalized insights
  const insights = useMemo(() => {
    const messages: { text: string; highlight?: boolean }[] = [];
    const displayStats = stats || { total_trips: 47, time_saved_minutes: 12, lot_usage: {}, accuracy_score: 0 };

    // Favorite lot insight
    const sortedLots = Object.entries(displayStats.lot_usage).sort(([, a], [, b]) => b - a);
    if (sortedLots.length > 0) {
      const [favLot] = sortedLots[0];
      messages.push({ text: `${favLot} is your most reliable lot - arrive before 8:30 AM for best results`, highlight: true });
    } else {
      messages.push({ text: 'C11 is your most reliable lot - arrive before 8:30 AM for best results', highlight: true });
    }

    // Time saved insight
    if (displayStats.time_saved_minutes > 0) {
      messages.push({ text: `You've saved ${displayStats.time_saved_minutes} minutes this semester using predictions` });
    } else {
      messages.push({ text: 'You save an average of 12 minutes per trip using predictions' });
    }

    // Pattern insight
    messages.push({ text: 'Your success rate is highest on Tuesday and Thursday mornings' });

    // Recommendation
    messages.push({ text: 'Try S1 + Bus for guaranteed parking with minimal walking' });

    return messages;
  }, [stats]);

  // Arrival time insights
  const arrivalInsights = useMemo(() => {
    return [
      {
        time: '8:00 - 9:00 AM',
        description: 'Best success rate (89%)',
        icon: 'checkmark-circle-fill',
        iconColor: Colors.ios.green,
      },
      {
        time: '10:00 - 11:00 AM',
        description: 'Most crowded window',
        icon: 'exclamationmark-triangle-fill',
        iconColor: Colors.ios.orange,
      },
      {
        time: 'After 2:30 PM',
        description: 'Cross-lot parking available',
        icon: 'star-fill',
        iconColor: Colors.ios.blue,
      },
    ];
  }, []);

  const chartData = useMemo(() => {
    if (period === 'week') {
      return weeklyStats;
    } else if (period === 'month') {
      return monthlyStats.map((m) => ({
        day: m.week.replace('Week ', 'W'),
        reports: m.reports,
      }));
    }
    // For semester, show monthly breakdown
    return weeklyStats;
  }, [period, weeklyStats, monthlyStats]);

  const levelProgress = useMemo(() => {
    if (!stats) return { progress: 0, reportsToNext: 0, nextLevel: null };
    return getLevelProgress(stats.level, stats.report_count);
  }, [stats]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.scarlet.DEFAULT} />
          <Text style={styles.loadingText}>Loading your stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Default stats for display
  const displayStats = stats || {
    total_trips: 47,
    report_count: 23,
    accuracy_score: 0.92,
    current_streak: 5,
    longest_streak: 12,
    streak_days: 5,
    level: 'regular' as ReporterLevel,
    badges: [],
    lot_usage: {},
    time_saved_minutes: 156,
    referral_count: 0,
  };

  const permitCost = 143;
  const levelConfig = getLevelConfig(displayStats.level);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor={Colors.scarlet.DEFAULT}
            colors={[Colors.scarlet.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>YOUR PARKING STATS</Text>
              <View style={styles.headerUnderline} />
            </View>
            <Pressable onPress={handleShare} style={styles.shareButton}>
              <SFIcon name="square-arrow-up" size={20} color={Colors.scarlet[500]} />
            </Pressable>
          </View>
          <PeriodSelector selected={period} onSelect={setPeriod} />
        </View>

        {/* Level & Progress Card */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.levelCard}>
          <View style={styles.levelCardHeader}>
            <View style={styles.levelInfo}>
              <View style={[styles.levelBadge, { backgroundColor: levelConfig.bgColor }]}>
                <Text style={styles.levelIcon}>{levelConfig.icon}</Text>
                <Text style={[styles.levelText, { color: levelConfig.color }]}>
                  {levelConfig.label}
                </Text>
              </View>
              {rank && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{rank}</Text>
                </View>
              )}
            </View>
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakCount}>{displayStats.current_streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>

          {/* Progress to next level */}
          {levelProgress.nextLevel && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>
                  Progress to {getLevelConfig(levelProgress.nextLevel).label}
                </Text>
                <Text style={styles.progressValue}>
                  {levelProgress.reportsToNext} reports to go
                </Text>
              </View>
              <ProgressBar progress={levelProgress.progress} color={levelConfig.color} />
            </View>
          )}
        </Animated.View>

        {/* THIS SEMESTER Stats Grid */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionLabel}>THIS SEMESTER</Text>
          <View style={styles.semesterStatsGrid}>
            <SemesterStatCard
              value={displayStats.total_trips}
              label="Trips"
              icon="car-fill"
              iconColor={Colors.ios.blue}
            />
            <SemesterStatCard
              value={displayStats.report_count}
              label="Reports"
              icon="bubble-left-and-bubble-right"
              iconColor={Colors.ios.green}
            />
            <SemesterStatCard
              value={`${Math.round(displayStats.accuracy_score * 100)}%`}
              label="Accuracy"
              icon="target"
              iconColor={Colors.ios.purple}
            />
            <SemesterStatCard
              value={`${displayStats.time_saved_minutes}m`}
              label="Time Saved"
              icon="clock"
              iconColor={Colors.ios.orange}
            />
          </View>
        </Animated.View>

        {/* Activity Chart */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionLabel}>REPORTING ACTIVITY</Text>
          <View style={styles.card}>
            <ActivityChart data={chartData} />
          </View>
        </Animated.View>

        {/* WHERE YOU PARK */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionLabel}>WHERE YOU PARK</Text>
          <View style={styles.card}>
            {lotUsageData.map((lot, index) => (
              <LotUsageBar
                key={lot.lotId}
                lotId={lot.lotId}
                percentage={lot.percentage}
                trips={lot.trips}
                color={lot.color}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* WHEN YOU ARRIVE */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <Text style={styles.sectionLabel}>WHEN YOU ARRIVE</Text>
          <View style={styles.card}>
            {arrivalInsights.map((insight, index) => (
              <ArrivalInsight
                key={index}
                time={insight.time}
                description={insight.description}
                icon={insight.icon}
                iconColor={insight.iconColor}
              />
            ))}
          </View>
        </Animated.View>

        {/* INSIGHTS */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionLabel}>INSIGHTS</Text>
          <View style={styles.insightsCard}>
            {insights.map((insight, index) => (
              <InsightBullet key={index} text={insight.text} highlight={insight.highlight} />
            ))}
          </View>
        </Animated.View>

        {/* BADGES */}
        <Animated.View entering={FadeInDown.delay(350)} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>BADGES</Text>
            <Text style={styles.badgeCount}>
              {displayStats.badges.length}/{Object.keys(BADGES).length}
            </Text>
          </View>
          <View style={styles.card}>
            <BadgeDisplay badges={displayStats.badges} />
          </View>
        </Animated.View>

        {/* Referral Section */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Pressable
            style={styles.referralCard}
            onPress={() => router.push('/referral')}
          >
            <View style={styles.referralIcon}>
              <SFIcon name="person-2" size={24} color={Colors.ios.orange} />
            </View>
            <View style={styles.referralContent}>
              <Text style={styles.referralTitle}>
                {displayStats.referral_count > 0
                  ? `${displayStats.referral_count} Friend${displayStats.referral_count !== 1 ? 's' : ''} Referred`
                  : 'Invite Friends'}
              </Text>
              <Text style={styles.referralSubtext}>
                {displayStats.referral_count > 0
                  ? 'Tap to invite more & earn rewards'
                  : 'Share with friends, earn rewards'}
              </Text>
            </View>
            <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
          </Pressable>
        </Animated.View>

        {/* Permit Cost Info */}
        <Animated.View entering={FadeInDown.delay(450)} style={styles.permitInfoCard}>
          <View style={styles.permitInfoRow}>
            <SFIcon name="creditcard" size={20} color={Colors.scarlet[500]} />
            <Text style={styles.permitInfoLabel}>Permit Cost</Text>
            <Text style={styles.permitInfoValue}>${permitCost}/year</Text>
          </View>
          <View style={styles.permitInfoDivider} />
          <View style={styles.permitInfoRow}>
            <SFIcon name="leaf" size={20} color={Colors.ios.green} />
            <Text style={styles.permitInfoLabel}>Cost per Trip</Text>
            <Text style={styles.permitInfoValue}>
              ${displayStats.total_trips > 0 ? (permitCost / displayStats.total_trips).toFixed(2) : '---'}
            </Text>
          </View>
        </Animated.View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.gray[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.light.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  headerUnderline: {
    height: 3,
    width: 60,
    backgroundColor: Colors.scarlet[500],
    marginTop: 6,
    borderRadius: 2,
  },
  shareButton: {
    padding: Spacing.sm,
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  periodButtonActive: {
    backgroundColor: Colors.light.background,
    ...Shadows.sm,
  },
  periodButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[2],
  },
  periodButtonTextActive: {
    color: Colors.scarlet[500],
  },

  // Level Card
  levelCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[5],
    ...Shadows.sm,
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  levelIcon: {
    fontSize: 18,
  },
  levelText: {
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },
  rankBadge: {
    backgroundColor: Colors.scarlet[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  rankText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.scarlet[600],
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  streakEmoji: {
    fontSize: 20,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  streakLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  progressSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray[5],
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  progressValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  progressBarBg: {
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: BorderRadius.full,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badgeCount: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    fontWeight: FontWeight.medium,
  },
  card: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Semester Stats Grid
  semesterStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  semesterStatCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  semesterStatIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  semesterStatValue: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  semesterStatLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 2,
  },

  // Activity Chart
  chartContainer: {
    height: 100,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
  },
  chartBarColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    height: 60,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 20,
    borderRadius: BorderRadius.sm,
  },
  chartLabel: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  chartValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: 2,
  },

  // Lot Usage
  lotBarRow: {
    gap: 6,
  },
  lotBarLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotBarLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  lotBarStats: {},
  lotBarPercentage: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.scarlet[500],
  },
  lotBarTrips: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  lotBarTrack: {
    height: 10,
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  lotBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },

  // Arrival Insights
  arrivalInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  arrivalInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalInsightContent: {
    flex: 1,
  },
  arrivalInsightTime: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  arrivalInsightDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 2,
  },

  // Insights
  insightsCard: {
    backgroundColor: Colors.scarlet[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.scarlet[100],
  },
  insightBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  insightBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.scarlet[300],
    marginTop: 7,
  },
  insightBulletDotHighlight: {
    backgroundColor: Colors.scarlet[500],
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  insightBulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.scarlet[700],
    lineHeight: 20,
  },
  insightBulletTextHighlight: {
    fontWeight: FontWeight.semibold,
  },

  // Badges
  badgesContainer: {},
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  showMoreButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  showMoreText: {
    color: Colors.ios.blue,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  emptyBadges: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  emptyBadgesIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  emptyBadgesText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.gray[2],
  },
  emptyBadgesSubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray[3],
    marginTop: 4,
  },

  // Referral
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.ios.orange + '20',
    gap: Spacing.sm,
  },
  referralIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  referralSubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },

  // Permit Info
  permitInfoCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  permitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  permitInfoLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  permitInfoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  permitInfoDivider: {
    height: 1,
    backgroundColor: Colors.gray[5],
    marginVertical: Spacing.sm,
  },
});
