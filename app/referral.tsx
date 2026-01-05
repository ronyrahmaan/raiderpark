// ============================================================
// REFERRAL SCREEN - Invite friends and track referrals
// Feature 11: Viral Sharing & Growth Engine
// ============================================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================

interface ReferralStats {
  invited: number;
  joined: number;
  percentile: number;
  rank: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  referrals: number;
  isCurrentUser?: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_STATS: ReferralStats = {
  invited: 7,
  joined: 4,
  percentile: 12,
  rank: 127,
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: '@RedRaider23', referrals: 47 },
  { rank: 2, username: '@TechParker', referrals: 31 },
  { rank: 3, username: '@WreckEm2025', referrals: 28 },
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function ReferralScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [linkCopied, setLinkCopied] = useState(false);

  // Generate invite link based on user
  const username = appUser?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'user';
  const inviteLink = `raiderpark.app/invite/${username}`;

  const stats = MOCK_STATS;
  const leaderboard = MOCK_LEADERBOARD;

  const handleCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(`https://${inviteLink}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  }, [inviteLink]);

  const handleShare = useCallback(async () => {
    const message = `Join me on RaiderPark - the smartest way to find parking at TTU! Use my invite link: https://${inviteLink}`;

    try {
      await Share.share({
        message,
        title: 'Join RaiderPark!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [inviteLink]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </Pressable>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <Animated.View entering={FadeIn} style={styles.mainCard}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.titleIcon}>👥</Text>
            <Text style={styles.titleText}>INVITE FRIENDS</Text>
          </View>
          <View style={styles.titleUnderline} />

          {/* Description */}
          <Text style={styles.description}>
            Share Raider Park with friends who hate parking!
          </Text>

          {/* Invite Link Section */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.linkSection}>
            <Text style={styles.linkLabel}>YOUR INVITE LINK:</Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText}>{inviteLink}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.linkActions}>
              <Pressable style={styles.actionButton} onPress={handleCopyLink}>
                <Text style={styles.actionButtonText}>
                  {linkCopied ? '[Copied!]' : '[Copy Link]'}
                </Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={handleShare}>
                <Text style={styles.actionButtonText}>[Share]</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Referral Stats Section */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.statsSection}>
            <Text style={styles.statsLabel}>YOUR REFERRAL STATS:</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.invited}</Text>
                <Text style={styles.statName}>Invited</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.joined}</Text>
                <Text style={styles.statName}>Joined</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, styles.statValueHighlight]}>
                  Top {stats.percentile}%
                </Text>
                <Text style={styles.statName}>Referrer</Text>
              </View>
            </View>
          </Animated.View>

          {/* Leaderboard Section */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.leaderboardSection}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardIcon}>🏆</Text>
              <Text style={styles.leaderboardTitle}>REFERRAL LEADERBOARD</Text>
            </View>
            <View style={styles.leaderboardUnderline} />

            {/* Top 3 */}
            {leaderboard.map((entry) => (
              <View key={entry.rank} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardRank}>{entry.rank}.</Text>
                <Text style={styles.leaderboardUsername}>{entry.username}</Text>
                <Text style={styles.leaderboardSeparator}>–</Text>
                <Text style={styles.leaderboardReferrals}>
                  {entry.referrals} referrals
                </Text>
              </View>
            ))}

            {/* Ellipsis */}
            <Text style={styles.leaderboardEllipsis}>...</Text>

            {/* Current User Position */}
            <View style={[styles.leaderboardRow, styles.leaderboardRowHighlight]}>
              <Text style={styles.leaderboardRank}>{stats.rank}.</Text>
              <Text style={[styles.leaderboardUsername, styles.leaderboardUsernameHighlight]}>
                You
              </Text>
              <Text style={styles.leaderboardSeparator}>–</Text>
              <Text style={styles.leaderboardReferrals}>
                {stats.joined} referrals
              </Text>
            </View>

            {/* Featured Note */}
            <View style={styles.featuredNote}>
              <Text style={styles.featuredNoteText}>
                Top referrers get featured in the app! ⭐
              </Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Tips Section */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <SFIcon name="lightbulb" size={18} color={Colors.ios.orange} />
            <Text style={styles.tipsTitle}>Referral Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Share right before peak parking times (9-11am)
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Post in TTU class GroupMe chats
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>
                Share when friends complain about parking
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Rewards Section */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.rewardsCard}>
          <Text style={styles.rewardsTitle}>REFERRAL REWARDS</Text>
          <View style={styles.rewardsUnderline} />
          <View style={styles.rewardsList}>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardMilestone}>5 referrals</Text>
              <Text style={styles.rewardBadge}>🥉 Bronze Recruiter</Text>
            </View>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardMilestone}>15 referrals</Text>
              <Text style={styles.rewardBadge}>🥈 Silver Recruiter</Text>
            </View>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardMilestone}>30 referrals</Text>
              <Text style={styles.rewardBadge}>🥇 Gold Recruiter</Text>
            </View>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardMilestone}>50+ referrals</Text>
              <Text style={styles.rewardBadge}>💎 Diamond Recruiter</Text>
            </View>
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
    backgroundColor: Colors.gray[6],
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
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Main Card
  mainCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray[4],
    ...Shadows.sm,
  },

  // Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleIcon: {
    fontSize: 24,
  },
  titleText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  titleUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 6,
    marginBottom: Spacing.md,
  },

  // Description
  description: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginBottom: Spacing.lg,
  },

  // Link Section
  linkSection: {
    marginBottom: Spacing.lg,
  },
  linkLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  linkBox: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[4],
  },
  linkText: {
    fontSize: FontSize.md,
    color: Colors.ios.blue,
    fontFamily: 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  actionButton: {
    paddingVertical: Spacing.xs,
  },
  actionButtonText: {
    fontSize: FontSize.md,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },

  // Stats Section
  statsSection: {
    marginBottom: Spacing.lg,
  },
  statsLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[4],
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: 4,
  },
  statValueHighlight: {
    color: Colors.ios.green,
    fontSize: FontSize.md,
  },
  statName: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },

  // Leaderboard Section
  leaderboardSection: {
    marginTop: Spacing.sm,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  leaderboardIcon: {
    fontSize: 20,
  },
  leaderboardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  leaderboardUnderline: {
    width: 100,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 6,
    marginBottom: Spacing.md,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  leaderboardRowHighlight: {
    backgroundColor: Colors.scarlet[50],
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  leaderboardRank: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    width: 36,
  },
  leaderboardUsername: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  leaderboardUsernameHighlight: {
    color: Colors.scarlet[500],
    fontWeight: FontWeight.bold,
  },
  leaderboardSeparator: {
    fontSize: FontSize.md,
    color: Colors.gray[2],
    marginHorizontal: Spacing.sm,
  },
  leaderboardReferrals: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
  },
  leaderboardEllipsis: {
    fontSize: FontSize.md,
    color: Colors.gray[2],
    paddingVertical: Spacing.xs,
    paddingLeft: 12,
  },
  featuredNote: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  featuredNoteText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    textAlign: 'center',
  },

  // Tips Card
  tipsCard: {
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.orange + '30',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
  },
  tipsList: {
    gap: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: FontSize.md,
    color: Colors.ios.orange,
    marginRight: Spacing.sm,
    marginTop: -2,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },

  // Rewards Card
  rewardsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[4],
  },
  rewardsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  rewardsUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 6,
    marginBottom: Spacing.md,
  },
  rewardsList: {
    gap: Spacing.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  rewardMilestone: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  rewardBadge: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
});
