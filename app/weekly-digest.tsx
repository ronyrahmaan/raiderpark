// ============================================================
// WEEKLY DIGEST SCREEN - Shareable weekly parking summary
// Feature 11: Viral Sharing & Growth Engine
// ============================================================

import { useState, useMemo, useCallback } from 'react';
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

interface WeeklyStats {
  trips: number;
  minutesSaved: number;
  successRate: number;
  favoriteLot: string;
  dateRange: string;
}

// ============================================================
// FUN QUOTES
// ============================================================

const FUN_QUOTES = [
  '"Parking anxiety? Never heard of her."',
  '"I came, I parked, I conquered."',
  '"Professional parking spot finder."',
  '"No more circling the lot like a shark."',
  '"Found spots faster than my coffee cools."',
  '"Parking goals: achieved."',
  '"Stress-free parking is my superpower."',
  '"My parking karma is unmatched."',
];

// ============================================================
// HELPERS
// ============================================================

function getDateRange(): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `${formatDate(startOfWeek)}-${endOfWeek.getDate()}, ${now.getFullYear()}`;
}

function getRandomQuote(): string {
  return FUN_QUOTES[Math.floor(Math.random() * FUN_QUOTES.length)];
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function WeeklyDigestScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [quote] = useState(getRandomQuote);

  // Mock weekly stats - in production, this would come from the backend
  const weeklyStats: WeeklyStats = useMemo(
    () => ({
      trips: 5,
      minutesSaved: 47,
      successRate: 100,
      favoriteLot: 'C11',
      dateRange: getDateRange(),
    }),
    []
  );

  const userName = appUser?.display_name?.split(' ')[0] || 'Raider';

  const handleShareStories = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production, this would generate an image and open Instagram Stories
    Alert.alert(
      'Share to Stories',
      'This would generate a shareable image and open Instagram Stories. For now, the general share sheet will be used.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => handleGeneralShare(),
        },
      ]
    );
  }, []);

  const handleTweet = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tweetText = `My week in parking with @RaiderParkApp:\n\n🚗 ${weeklyStats.trips} trips\n⏱️ ${weeklyStats.minutesSaved} minutes saved\n🎯 ${weeklyStats.successRate}% found spots\n\n${quote}\n\nDownload free: raiderpark.app`;

    try {
      await Share.share({
        message: tweetText,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [weeklyStats, quote]);

  const handleSaveImage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production, this would capture the card as an image and save to camera roll
    Alert.alert(
      'Save Image',
      'Image saving would be implemented with react-native-view-shot. For now, use the share options.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleGeneralShare = useCallback(async () => {
    const message = `📊 My Week in Parking with RaiderPark!\n\n🚗 ${weeklyStats.trips} trips\n⏱️ ${weeklyStats.minutesSaved} minutes saved\n🎯 ${weeklyStats.successRate}% found spots\n📍 Favorite lot: ${weeklyStats.favoriteLot}\n\n${quote}\n\nDownload free: raiderpark.app`;

    try {
      await Share.share({
        message,
        title: 'My Week in Parking',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [weeklyStats, quote]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </Pressable>
        <Text style={styles.headerTitle}>Weekly Digest</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Animated.View entering={FadeIn} style={styles.titleSection}>
          <Text style={styles.titleIcon}>📊</Text>
          <Text style={styles.titleText}>YOUR WEEK IN PARKING</Text>
        </Animated.View>
        <View style={styles.titleUnderline} />

        {/* Shareable Card */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.cardWrapper}>
          <View style={styles.shareCard}>
            {/* App Branding */}
            <View style={styles.brandingRow}>
              <View style={styles.brandingIcon}>
                <Text style={styles.brandingIconText}>🅿️</Text>
              </View>
              <Text style={styles.brandingText}>RAIDER PARK</Text>
            </View>

            {/* User's Week Title */}
            <View style={styles.weekTitleSection}>
              <Text style={styles.weekTitleName}>{userName}'s Parking Week</Text>
              <Text style={styles.weekTitleDate}>{weeklyStats.dateRange}</Text>
            </View>

            {/* Stats List */}
            <View style={styles.statsList}>
              <View style={styles.statRow}>
                <Text style={styles.statEmoji}>🚗</Text>
                <Text style={styles.statText}>{weeklyStats.trips} trips</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statEmoji}>⏱️</Text>
                <Text style={styles.statText}>{weeklyStats.minutesSaved} minutes saved</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statEmoji}>🎯</Text>
                <Text style={styles.statText}>{weeklyStats.successRate}% found spots</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statEmoji}>📍</Text>
                <Text style={styles.statText}>Favorite lot: {weeklyStats.favoriteLot}</Text>
              </View>
            </View>

            {/* Fun Quote */}
            <View style={styles.quoteSection}>
              <Text style={styles.quoteText}>{quote} 💅</Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.actionsContainer}>
          <Pressable style={styles.actionButton} onPress={handleShareStories}>
            <Text style={styles.actionButtonText}>[Share to Stories]</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleTweet}>
            <Text style={styles.actionButtonText}>[Tweet This]</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleSaveImage}>
            <Text style={styles.actionButtonText}>[Save Image]</Text>
          </Pressable>
        </Animated.View>

        {/* Share General Button */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.generalShareContainer}>
          <Pressable style={styles.generalShareButton} onPress={handleGeneralShare}>
            <SFIcon name="square-arrow-up" size={20} color={Colors.light.background} />
            <Text style={styles.generalShareText}>Share</Text>
          </Pressable>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.infoCard}>
          <SFIcon name="info-circle" size={16} color={Colors.ios.blue} />
          <Text style={styles.infoText}>
            Share your parking wins with friends! Weekly digests are generated every Sunday.
          </Text>
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
    width: 120,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 6,
    marginBottom: Spacing.lg,
  },

  // Card Wrapper
  cardWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  // Share Card
  shareCard: {
    width: '100%',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.gray[4],
    ...Shadows.lg,
  },

  // Branding
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  brandingIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingIconText: {
    fontSize: 18,
  },
  brandingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },

  // Week Title
  weekTitleSection: {
    marginBottom: Spacing.lg,
  },
  weekTitleName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  weekTitleDate: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginTop: 2,
  },

  // Stats List
  statsList: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statEmoji: {
    fontSize: 18,
    width: 28,
  },
  statText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },

  // Quote Section
  quoteSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  quoteText: {
    fontSize: FontSize.md,
    fontStyle: 'italic',
    color: Colors.gray[1],
    lineHeight: 22,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  actionButtonText: {
    fontSize: FontSize.md,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },

  // General Share Button
  generalShareContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  generalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  generalShareText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.ios.blue + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 18,
  },
});
