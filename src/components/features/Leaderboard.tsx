/**
 * Leaderboard Component
 * Display top reporters with stats, levels, and badges
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { ReporterLevel } from '@/types/database';
import {
  Colors,
  Shadows,
  BorderRadius,
  Spacing,
  FontSize,
  FontWeight,
} from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================

interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  report_count: number;
  accuracy_score: number;
  level: ReporterLevel;
  streak_days: number;
  badges: string[];
}

interface LeaderboardProps {
  limit?: number;
  style?: ViewStyle;
}

// ============================================================
// LEVEL CONFIGURATION
// ============================================================

// ReporterLevel: 'newbie' | 'rookie' | 'regular' | 'veteran' | 'legend' | 'mvp' | 'hall_of_fame'
const LEVEL_CONFIG: Record<
  ReporterLevel,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  newbie: {
    label: 'Newbie',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: '🌱',
  },
  rookie: {
    label: 'Rookie',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: '🌿',
  },
  regular: {
    label: 'Regular',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: '⭐',
  },
  veteran: {
    label: 'Veteran',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: '🏆',
  },
  legend: {
    label: 'Legend',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: '👑',
  },
  mvp: {
    label: 'MVP',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: '🔥',
  },
  hall_of_fame: {
    label: 'Hall of Fame',
    color: '#CC0000',
    bgColor: '#FFE4E4',
    icon: '🎖️',
  },
};

// ============================================================
// LEADERBOARD SERVICE
// ============================================================

async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('reporter_leaderboard')
    .select('*')
    .order('report_count', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  return data ?? [];
}

// ============================================================
// HOOKS
// ============================================================

function useLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => getLeaderboard(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

interface LevelBadgeProps {
  level: ReporterLevel;
  size?: 'sm' | 'md' | 'lg';
}

function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const config = LEVEL_CONFIG[level];

  const getBadgeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return styles.levelBadgeSm;
      case 'lg':
        return styles.levelBadgeLg;
      default:
        return styles.levelBadgeMd;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'sm':
        return styles.levelBadgeTextSm;
      case 'lg':
        return styles.levelBadgeTextLg;
      default:
        return styles.levelBadgeTextMd;
    }
  };

  return (
    <View
      style={[
        styles.levelBadgeBase,
        getBadgeStyle(),
        { backgroundColor: config.bgColor },
      ]}
    >
      <Text style={styles.levelBadgeIcon}>{config.icon}</Text>
      <Text style={[getTextStyle(), { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

interface RankBadgeProps {
  rank: number;
}

function RankBadge({ rank }: RankBadgeProps) {
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return { bg: '#FFD700', text: '#000' }; // Gold
      case 2:
        return { bg: '#C0C0C0', text: '#000' }; // Silver
      case 3:
        return { bg: '#CD7F32', text: '#FFF' }; // Bronze
      default:
        return { bg: '#E5E7EB', text: '#374151' };
    }
  };

  const rankStyle = getRankStyle();

  return (
    <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
      <Text style={[styles.rankBadgeText, { color: rankStyle.text }]}>
        {rank}
      </Text>
    </View>
  );
}

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}

function LeaderboardItem({ entry, rank, isCurrentUser }: LeaderboardItemProps) {
  const displayName = entry.display_name || 'Anonymous Raider';
  const accuracyPercent = Math.round(entry.accuracy_score * 100);

  const getAccuracyColor = () => {
    if (accuracyPercent >= 80) return '#10B981';
    if (accuracyPercent >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <Card
      variant={isCurrentUser ? 'scarlet' : 'elevated'}
      padding="md"
      style={[styles.leaderboardItem, isCurrentUser && styles.leaderboardItemCurrentUser]}
    >
      <View style={styles.leaderboardItemRow}>
        {/* Rank Badge */}
        <RankBadge rank={rank} />

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text
              style={[
                styles.userName,
                isCurrentUser && styles.userNameCurrentUser,
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {isCurrentUser && (
              <Text style={styles.youLabel}>(You)</Text>
            )}
          </View>

          {/* Level Badge */}
          <View style={styles.levelBadgeContainer}>
            <LevelBadge level={entry.level} size="sm" />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.reportCount}>{entry.report_count}</Text>
            <Text style={styles.reportLabel}>reports</Text>
          </View>

          <View style={styles.statRow}>
            <View
              style={[
                styles.accuracyDot,
                { backgroundColor: getAccuracyColor() },
              ]}
            />
            <Text style={styles.accuracyText}>{accuracyPercent}%</Text>
          </View>

          {entry.streak_days > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{entry.streak_days}d</Text>
            </View>
          )}
        </View>
      </View>

      {/* Badges Row */}
      {entry.badges.length > 0 && (
        <View style={styles.badgesRow}>
          {entry.badges.slice(0, 5).map((badge, index) => (
            <View key={index} style={styles.badgeItem}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
          {entry.badges.length > 5 && (
            <View style={styles.badgeItem}>
              <Text style={styles.badgeText}>+{entry.badges.length - 5}</Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function Leaderboard({ limit = 20, style }: LeaderboardProps) {
  const { user } = useAuthStore();
  const { data: leaderboard, isLoading, error, refetch, isRefetching } = useLeaderboard(limit);

  // Find current user's rank
  const currentUserRank = leaderboard?.findIndex((entry) => entry.id === user?.id) ?? -1;
  const currentUserEntry = currentUserRank >= 0 ? leaderboard?.[currentUserRank] : null;

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, style]}>
        <ActivityIndicator size="large" color={Colors.scarlet.DEFAULT} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, style]}>
        <Text style={styles.errorText}>Failed to load leaderboard</Text>
        <Text style={styles.errorSubtext}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <View style={[styles.centerContainer, style]}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyText}>No reporters yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSubtitle}>
          Top reporters making parking easier for everyone
        </Text>
      </View>

      {/* Current User's Rank (if not in top) */}
      {currentUserEntry && currentUserRank >= limit && (
        <View style={styles.currentUserSection}>
          <Text style={styles.currentUserLabel}>Your Ranking</Text>
          <LeaderboardItem
            entry={currentUserEntry}
            rank={currentUserRank + 1}
            isCurrentUser={true}
          />
        </View>
      )}

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <LeaderboardItem
            entry={item}
            rank={index + 1}
            isCurrentUser={item.id === user?.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.scarlet.DEFAULT}
            colors={[Colors.scarlet.DEFAULT]}
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>Updated every 5 minutes</Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================================
// COMPACT LEADERBOARD (for dashboard widgets)
// ============================================================

interface CompactLeaderboardProps {
  limit?: number;
  onSeeAll?: () => void;
}

export function CompactLeaderboard({
  limit = 5,
  onSeeAll,
}: CompactLeaderboardProps) {
  const { user } = useAuthStore();
  const { data: leaderboard, isLoading } = useLeaderboard(limit);

  if (isLoading) {
    return (
      <Card style={styles.compactCard}>
        <View style={styles.compactLoading}>
          <ActivityIndicator size="small" color={Colors.scarlet.DEFAULT} />
        </View>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  return (
    <Card style={styles.compactCard}>
      <View style={styles.compactHeader}>
        <Text style={styles.compactTitle}>Top Reporters</Text>
        {onSeeAll && (
          <Text style={styles.seeAllText} onPress={onSeeAll}>
            See All
          </Text>
        )}
      </View>

      {leaderboard.slice(0, limit).map((entry, index) => (
        <View
          key={entry.id}
          style={[
            styles.compactItem,
            index < leaderboard.length - 1 && styles.compactItemBorder,
          ]}
        >
          <RankBadge rank={index + 1} />
          <Text
            style={[
              styles.compactName,
              entry.id === user?.id && styles.compactNameCurrentUser,
            ]}
            numberOfLines={1}
          >
            {entry.display_name || 'Anonymous'}
            {entry.id === user?.id && ' (You)'}
          </Text>
          <Text style={styles.compactCount}>{entry.report_count}</Text>
        </View>
      ))}
    </Card>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.gray[1],
  },
  errorText: {
    color: Colors.ios.red,
    textAlign: 'center',
  },
  errorSubtext: {
    color: Colors.gray[1],
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  emptyIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.gray[1],
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  headerSubtitle: {
    color: Colors.gray[1],
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  currentUserSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  currentUserLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  leaderboardItem: {
    marginBottom: Spacing.md,
  },
  leaderboardItemCurrentUser: {
    borderWidth: 2,
    borderColor: Colors.scarlet[500],
  },
  leaderboardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  userNameCurrentUser: {
    color: Colors.scarlet[700],
  },
  youLabel: {
    marginLeft: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.scarlet[500],
    fontWeight: FontWeight.medium,
  },
  levelBadgeContainer: {
    marginTop: Spacing.xs,
  },
  levelBadgeBase: {
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  levelBadgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  levelBadgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  levelBadgeLg: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  levelBadgeIcon: {
    marginRight: Spacing.xs,
  },
  levelBadgeTextSm: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  levelBadgeTextMd: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  levelBadgeTextLg: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportCount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  reportLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginLeft: Spacing.xs,
  },
  accuracyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  accuracyText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  streakIcon: {
    fontSize: FontSize.xs,
  },
  streakText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginLeft: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  badgeItem: {
    backgroundColor: Colors.gray[6],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },
  // Compact styles
  compactCard: {
    padding: Spacing.md,
  },
  compactLoading: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  compactTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  seeAllText: {
    color: Colors.scarlet[500],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  compactItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  compactName: {
    flex: 1,
    marginLeft: Spacing.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  compactNameCurrentUser: {
    color: Colors.scarlet[600],
  },
  compactCount: {
    color: Colors.gray[1],
    fontSize: FontSize.sm,
  },
});

export default Leaderboard;
