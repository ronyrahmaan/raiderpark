// ============================================================
// SHARE BADGE SCREEN - Achievement unlocked sharing
// Feature 11: Viral Sharing & Growth Engine
// ============================================================

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { BADGES, getBadgeRarityColor } from '@/hooks/useUserStats';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// HELPERS
// ============================================================

function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  };
  return labels[rarity] || 'Common';
}

function getRarityEmoji(rarity: string): string {
  const emojis: Record<string, string> = {
    common: '',
    uncommon: '',
    rare: '!',
    epic: '!!',
    legendary: '!!!',
  };
  return emojis[rarity] || '';
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function ShareBadgeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    badgeId?: string;
  }>();

  const badgeId = params.badgeId || 'first_report';
  const badge = BADGES[badgeId] || BADGES.first_report;
  const rarityColor = getBadgeRarityColor(badge.rarity);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const message = `${badge.icon} Achievement Unlocked!\n\nI just earned the "${badge.name}" badge on RaiderPark!\n\n${badge.description}\n\nRarity: ${getRarityLabel(badge.rarity)} ${getRarityEmoji(badge.rarity)}\n\nDownload free: raiderpark.app`;

    try {
      await Share.share({
        message,
        title: 'I unlocked a badge!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [badge]);

  const handleShareStories = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Share to Stories',
      'This would generate a shareable image for Instagram Stories.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: handleShare },
      ]
    );
  }, [handleShare]);

  const handleSkip = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={styles.closeButton}>
          <SFIcon name="xmark" size={20} color={Colors.gray[2]} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Achievement Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.achievementHeader}>
          <Text style={styles.achievementLabel}>ACHIEVEMENT UNLOCKED</Text>
          <View style={styles.achievementUnderline} />
        </Animated.View>

        {/* Badge Card */}
        <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.badgeCardWrapper}>
          <View style={[styles.badgeCard, { borderColor: rarityColor.border }]}>
            {/* Rarity Ribbon */}
            <View style={[styles.rarityRibbon, { backgroundColor: rarityColor.bg }]}>
              <Text style={[styles.rarityRibbonText, { color: rarityColor.text }]}>
                {getRarityLabel(badge.rarity).toUpperCase()}
              </Text>
            </View>

            {/* Badge Icon */}
            <View style={[styles.badgeIconContainer, { backgroundColor: rarityColor.bg }]}>
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
            </View>

            {/* Badge Name */}
            <Text style={styles.badgeName}>{badge.name}</Text>

            {/* Badge Description */}
            <Text style={styles.badgeDescription}>{badge.description}</Text>

            {/* Decorative Stars */}
            <View style={styles.starsContainer}>
              <Text style={styles.star}>✨</Text>
              <Text style={styles.star}>✨</Text>
              <Text style={styles.star}>✨</Text>
            </View>

            {/* App Branding */}
            <View style={styles.brandingRow}>
              <Text style={styles.brandingIcon}>🅿️</Text>
              <Text style={styles.brandingText}>RAIDER PARK</Text>
            </View>
          </View>
        </Animated.View>

        {/* Celebration Text */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.celebrationSection}>
          <Text style={styles.celebrationText}>
            {badge.rarity === 'legendary'
              ? 'WOW! This is incredibly rare!'
              : badge.rarity === 'epic'
              ? 'Amazing! Only a few have this!'
              : badge.rarity === 'rare'
              ? 'Nice! This one is hard to get!'
              : 'Great job! Keep it up!'}
          </Text>
        </Animated.View>

        {/* Share Buttons */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.actionsContainer}>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <SFIcon name="square-arrow-up" size={20} color={Colors.light.background} />
            <Text style={styles.shareButtonText}>Share Badge</Text>
          </Pressable>

          <Pressable style={styles.storiesButton} onPress={handleShareStories}>
            <Text style={styles.storiesButtonIcon}>📱</Text>
            <Text style={styles.storiesButtonText}>Share to Stories</Text>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Maybe Later</Text>
          </Pressable>
        </Animated.View>
      </View>
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },

  // Achievement Header
  achievementHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  achievementLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.ios.orange,
    letterSpacing: 2,
  },
  achievementUnderline: {
    width: 100,
    height: 2,
    backgroundColor: Colors.ios.orange,
    marginTop: 6,
  },

  // Badge Card
  badgeCardWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  badgeCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 2,
    ...Shadows.lg,
    overflow: 'hidden',
  },
  rarityRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    alignItems: 'center',
  },
  rarityRibbonText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
    letterSpacing: 1,
  },
  badgeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  badgeIcon: {
    fontSize: 42,
  },
  badgeName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  badgeDescription: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  star: {
    fontSize: 20,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  brandingIcon: {
    fontSize: 14,
  },
  brandingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
    letterSpacing: 1,
  },

  // Celebration
  celebrationSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  celebrationText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
  },

  // Actions
  actionsContainer: {
    alignItems: 'center',
    gap: Spacing.md,
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
  shareButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  storiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.gray[4],
    gap: Spacing.sm,
  },
  storiesButtonIcon: {
    fontSize: 18,
  },
  storiesButtonText: {
    color: Colors.light.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  skipButtonText: {
    color: Colors.gray[2],
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
