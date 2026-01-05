/**
 * User Stats Hooks
 * React Query hooks for user statistics and gamification
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { UserStats, ReporterLevel } from '@/types/database';

// Query Keys
export const userStatsKeys = {
  all: ['userStats'] as const,
  detail: (userId?: string) => [...userStatsKeys.all, userId] as const,
  rank: (userId?: string) => [...userStatsKeys.all, 'rank', userId] as const,
  weeklyStats: (userId?: string) => [...userStatsKeys.all, 'weekly', userId] as const,
  monthlyStats: (userId?: string) => [...userStatsKeys.all, 'monthly', userId] as const,
};

// ============================================================
// LEVEL CONFIGURATION
// ============================================================

export interface LevelConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  minReports: number;
  nextLevel: ReporterLevel | null;
}

// ReporterLevel: 'newbie' | 'rookie' | 'regular' | 'veteran' | 'legend' | 'mvp' | 'hall_of_fame'
export const LEVEL_CONFIG: Record<ReporterLevel, LevelConfig> = {
  newbie: {
    label: 'Newbie',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: '🌱',
    minReports: 0,
    nextLevel: 'rookie',
  },
  rookie: {
    label: 'Rookie',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: '🌿',
    minReports: 5,
    nextLevel: 'regular',
  },
  regular: {
    label: 'Regular',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: '⭐',
    minReports: 25,
    nextLevel: 'veteran',
  },
  veteran: {
    label: 'Veteran',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: '🏆',
    minReports: 75,
    nextLevel: 'legend',
  },
  legend: {
    label: 'Legend',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: '👑',
    minReports: 200,
    nextLevel: 'mvp',
  },
  mvp: {
    label: 'MVP',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: '🔥',
    minReports: 500,
    nextLevel: 'hall_of_fame',
  },
  hall_of_fame: {
    label: 'Hall of Fame',
    color: '#CC0000',
    bgColor: '#FFE4E4',
    icon: '🎖️',
    minReports: 1000,
    nextLevel: null,
  },
};

// ============================================================
// BADGE DEFINITIONS
// ============================================================

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const BADGES: Record<string, BadgeInfo> = {
  first_report: {
    id: 'first_report',
    name: 'First Steps',
    description: 'Submit your first parking report',
    icon: '👣',
    rarity: 'common',
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Report before 8 AM',
    icon: '🐦',
    rarity: 'uncommon',
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Report after 10 PM',
    icon: '🦉',
    rarity: 'uncommon',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day reporting streak',
    icon: '🔥',
    rarity: 'rare',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Month Master',
    description: '30-day reporting streak',
    icon: '💪',
    rarity: 'epic',
  },
  accuracy_90: {
    id: 'accuracy_90',
    name: 'Sharp Eye',
    description: 'Maintain 90%+ accuracy',
    icon: '👁️',
    rarity: 'rare',
  },
  lot_explorer: {
    id: 'lot_explorer',
    name: 'Lot Explorer',
    description: 'Report from 5 different lots',
    icon: '🗺️',
    rarity: 'uncommon',
  },
  event_reporter: {
    id: 'event_reporter',
    name: 'Event Reporter',
    description: 'Report during a campus event',
    icon: '🎉',
    rarity: 'rare',
  },
  century: {
    id: 'century',
    name: 'Century Club',
    description: 'Submit 100 reports',
    icon: '💯',
    rarity: 'epic',
  },
  founding_member: {
    id: 'founding_member',
    name: 'Founding Member',
    description: 'Joined during beta',
    icon: '🏛️',
    rarity: 'legendary',
  },
  helper: {
    id: 'helper',
    name: 'Community Helper',
    description: 'Refer 5 friends',
    icon: '🤝',
    rarity: 'rare',
  },
  perfect_week: {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: '100% accuracy for a week',
    icon: '✨',
    rarity: 'epic',
  },
  // Referral badges
  bronze_recruiter: {
    id: 'bronze_recruiter',
    name: 'Bronze Recruiter',
    description: 'Refer 5 friends who joined',
    icon: '🥉',
    rarity: 'uncommon',
  },
  silver_recruiter: {
    id: 'silver_recruiter',
    name: 'Silver Recruiter',
    description: 'Refer 15 friends who joined',
    icon: '🥈',
    rarity: 'rare',
  },
  gold_recruiter: {
    id: 'gold_recruiter',
    name: 'Gold Recruiter',
    description: 'Refer 30 friends who joined',
    icon: '🥇',
    rarity: 'epic',
  },
  diamond_recruiter: {
    id: 'diamond_recruiter',
    name: 'Diamond Recruiter',
    description: 'Refer 50+ friends who joined',
    icon: '💎',
    rarity: 'legendary',
  },
  viral_star: {
    id: 'viral_star',
    name: 'Viral Star',
    description: 'Top 10 referrer of the month',
    icon: '⭐',
    rarity: 'legendary',
  },
};

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

async function getUserStats(userId?: string): Promise<UserStats | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // Return default stats if not found
    if (error.code === 'PGRST116') {
      return {
        user_id: userId,
        // Database fields
        total_reports: 0,
        accurate_reports: 0,
        accuracy_rate: 0,
        consecutive_days: 0,
        last_report_date: null,
        points: 0,
        achievements: [],
        reports_this_week: 0,
        reports_this_month: 0,
        updated_at: new Date().toISOString(),
        // UI-compatible fields
        total_trips: 0,
        report_count: 0,
        accuracy_score: 0,
        streak_days: 0,
        current_streak: 0,
        longest_streak: 0,
        level: 'newbie' as const,
        badges: [],
        lot_usage: {},
        time_saved_minutes: 0,
        referral_code: null,
        referral_count: 0,
        referred_by: null,
      } as UserStats;
    }
    throw new Error(`Failed to fetch user stats: ${error.message}`);
  }

  return data;
}

async function getUserRank(userId?: string): Promise<number | null> {
  if (!userId) return null;

  // Try RPC first, but fallback to manual calculation
  // since RPC may not be defined in types
  try {
    const { data, error } = await (supabase.rpc as CallableFunction)(
      'get_user_rank',
      { p_user_id: userId }
    );

    if (!error && typeof data === 'number') {
      return data;
    }
  } catch {
    // RPC not available, use fallback
  }

  // Fallback: manually calculate rank
  const { data: leaderboard } = await supabase
    .from('reporter_leaderboard')
    .select('id')
    .order('report_count', { ascending: false });

  if (!leaderboard) return null;
  const entries = leaderboard as Array<{ id: string }>;
  const rank = entries.findIndex((entry) => entry.id === userId);
  return rank >= 0 ? rank + 1 : null;
}

interface WeeklyStatsResult {
  day: string;
  reports: number;
  trips: number;
}

async function getWeeklyStats(userId?: string): Promise<WeeklyStatsResult[]> {
  if (!userId) return [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('reports')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch weekly stats: ${error.message}`);

  // Group by day
  const dayMap = new Map<string, number>();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize all days to 0
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    dayMap.set(dayName, 0);
  }

  // Count reports per day
  const reports = (data ?? []) as Array<{ created_at: string }>;
  reports.forEach((report) => {
    const date = new Date(report.created_at);
    const dayName = days[date.getDay()];
    dayMap.set(dayName, (dayMap.get(dayName) || 0) + 1);
  });

  return Array.from(dayMap.entries()).map(([day, reports]) => ({
    day,
    reports,
    trips: Math.ceil(reports / 2), // Estimate trips
  }));
}

interface MonthlyStatsResult {
  week: string;
  reports: number;
  trips: number;
}

async function getMonthlyStats(userId?: string): Promise<MonthlyStatsResult[]> {
  if (!userId) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('reports')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch monthly stats: ${error.message}`);

  // Group by week
  const weekMap = new Map<number, number>();

  const reports = (data ?? []) as Array<{ created_at: string }>;
  reports.forEach((report) => {
    const date = new Date(report.created_at);
    const weekOfMonth = Math.ceil((date.getDate()) / 7);
    weekMap.set(weekOfMonth, (weekMap.get(weekOfMonth) || 0) + 1);
  });

  return [1, 2, 3, 4].map((week) => ({
    week: `Week ${week}`,
    reports: weekMap.get(week) || 0,
    trips: Math.ceil((weekMap.get(week) || 0) / 2),
  }));
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Hook to get current user's stats
 */
export function useUserStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: userStatsKeys.detail(user?.id),
    queryFn: () => getUserStats(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get user's leaderboard rank
 */
export function useUserRank() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: userStatsKeys.rank(user?.id),
    queryFn: () => getUserRank(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get weekly activity stats
 */
export function useWeeklyStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: userStatsKeys.weeklyStats(user?.id),
    queryFn: () => getWeeklyStats(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to get monthly activity stats
 */
export function useMonthlyStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: userStatsKeys.monthlyStats(user?.id),
    queryFn: () => getMonthlyStats(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get level config for a given level
 */
export function getLevelConfig(level: ReporterLevel): LevelConfig {
  return LEVEL_CONFIG[level] ?? LEVEL_CONFIG.newbie;
}

/**
 * Get badge info by ID
 */
export function getBadgeInfo(badgeId: string): BadgeInfo | undefined {
  return BADGES[badgeId];
}

/**
 * Calculate progress to next level
 */
export function getLevelProgress(
  currentLevel: ReporterLevel,
  reportCount: number
): { progress: number; reportsToNext: number; nextLevel: ReporterLevel | null } {
  const config = LEVEL_CONFIG[currentLevel];

  // Handle invalid or undefined level - default to newbie
  if (!config) {
    const defaultConfig = LEVEL_CONFIG.newbie;
    return {
      progress: 0,
      reportsToNext: defaultConfig.minReports,
      nextLevel: defaultConfig.nextLevel
    };
  }

  const nextLevel = config.nextLevel;

  if (!nextLevel) {
    return { progress: 100, reportsToNext: 0, nextLevel: null };
  }

  const nextConfig = LEVEL_CONFIG[nextLevel];
  const currentMin = config.minReports;
  const nextMin = nextConfig.minReports;
  const range = nextMin - currentMin;
  const progress = Math.min(100, ((reportCount - currentMin) / range) * 100);
  const reportsToNext = Math.max(0, nextMin - reportCount);

  return { progress, reportsToNext, nextLevel };
}

/**
 * Get rarity color for badges
 */
export function getBadgeRarityColor(rarity: BadgeInfo['rarity']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (rarity) {
    case 'common':
      return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    case 'uncommon':
      return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' };
    case 'rare':
      return { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' };
    case 'epic':
      return { bg: '#EDE9FE', text: '#7C3AED', border: '#C4B5FD' };
    case 'legendary':
      return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
    default:
      return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
  }
}

/**
 * Combined hook for all stats data
 */
export function useAllUserStats() {
  const statsQuery = useUserStats();
  const rankQuery = useUserRank();
  const weeklyQuery = useWeeklyStats();
  const monthlyQuery = useMonthlyStats();

  const isLoading =
    statsQuery.isLoading ||
    rankQuery.isLoading ||
    weeklyQuery.isLoading ||
    monthlyQuery.isLoading;

  const isRefetching =
    statsQuery.isRefetching ||
    rankQuery.isRefetching ||
    weeklyQuery.isRefetching ||
    monthlyQuery.isRefetching;

  const refetchAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      rankQuery.refetch(),
      weeklyQuery.refetch(),
      monthlyQuery.refetch(),
    ]);
  };

  return {
    stats: statsQuery.data,
    rank: rankQuery.data,
    weeklyStats: weeklyQuery.data ?? [],
    monthlyStats: monthlyQuery.data ?? [],
    isLoading,
    isRefetching,
    refetchAll,
    error: statsQuery.error || rankQuery.error,
  };
}
