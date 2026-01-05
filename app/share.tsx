// ============================================================
// SHARE SCREEN - Post-parking viral sharing modal
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

// ============================================================
// TYPES
// ============================================================

type LotStatus = 'open' | 'busy' | 'filling' | 'full';

interface ShareData {
  lotId: string;
  lotStatus: LotStatus;
  foundTime: string;
  searchTimeMinutes: number;
  savedMinutes: number;
}

// ============================================================
// HELPERS
// ============================================================

function getStatusColor(status: LotStatus): string {
  switch (status) {
    case 'open':
      return Colors.status.open;
    case 'busy':
      return Colors.status.busy;
    case 'filling':
      return Colors.status.filling;
    case 'full':
      return Colors.status.full;
    default:
      return Colors.gray[3];
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lotId?: string;
    lotStatus?: string;
    foundTime?: string;
    searchTimeMinutes?: string;
    savedMinutes?: string;
  }>();

  // Parse params with defaults
  const shareData: ShareData = {
    lotId: params.lotId || 'C11',
    lotStatus: (params.lotStatus as LotStatus) || 'open',
    foundTime: params.foundTime || new Date().toISOString(),
    searchTimeMinutes: parseInt(params.searchTimeMinutes || '3', 10),
    savedMinutes: parseInt(params.savedMinutes || '12', 10),
  };

  const statusColor = getStatusColor(shareData.lotStatus);

  const handleShareGeneral = useCallback(async () => {
    const message = `🎉 I just parked at ${shareData.lotId} in ${shareData.searchTimeMinutes} minutes using RaiderPark!\n\n🅿️ Found spot at ${formatTime(shareData.foundTime)}\n⏱️ Saved ~${shareData.savedMinutes} min vs circling\n\nDownload free: raiderpark.app`;

    try {
      await Share.share({
        message,
        title: 'I found parking with RaiderPark!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [shareData]);

  const handleShareInstagram = useCallback(() => {
    // In a real app, this would generate an image and open Instagram Stories
    Alert.alert(
      'Share to Instagram',
      'This would generate a shareable image and open Instagram Stories. For now, the general share sheet will be used.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: handleShareGeneral },
      ]
    );
  }, [handleShareGeneral]);

  const handleShareFriends = useCallback(() => {
    handleShareGeneral();
  }, [handleShareGeneral]);

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
        {/* Success Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.successHeader}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successText}>NICE! You found parking.</Text>
        </Animated.View>

        {/* Shareable Card Preview */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.cardWrapper}>
          <View style={styles.shareCard}>
            {/* App Branding */}
            <View style={styles.brandingRow}>
              <View style={styles.brandingIcon}>
                <Text style={styles.brandingIconText}>🅿️</Text>
              </View>
              <Text style={styles.brandingText}>RAIDER PARK</Text>
            </View>

            {/* Success Message */}
            <Text style={styles.successMessage}>
              I just parked at {shareData.lotId} in {shareData.searchTimeMinutes} minutes! 🚗
            </Text>

            {/* Lot Status Card */}
            <View style={styles.lotStatusCard}>
              <View style={styles.lotStatusLeft}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View>
                  <Text style={styles.lotId}>{shareData.lotId}</Text>
                  <Text style={[styles.statusLabel, { color: statusColor }]}>
                    {shareData.lotStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.lotStatusDivider} />
              <View style={styles.lotStatusRight}>
                <Text style={styles.detailText}>Found spot at {formatTime(shareData.foundTime)}</Text>
                <Text style={styles.savedText}>Saved ~{shareData.savedMinutes} min vs circling</Text>
              </View>
            </View>

            {/* Download CTA */}
            <Text style={styles.downloadText}>Download free: raiderpark.app</Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.actionsContainer}>
          <Pressable style={styles.instagramButton} onPress={handleShareInstagram}>
            <Text style={styles.shareButtonIcon}>📱</Text>
            <Text style={styles.instagramButtonText}>Share to Instagram</Text>
          </Pressable>

          <Pressable style={styles.friendsButton} onPress={handleShareFriends}>
            <Text style={styles.shareButtonIcon}>💬</Text>
            <Text style={styles.friendsButtonText}>Send to Friends</Text>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </Animated.View>

        {/* Info Text */}
        <Animated.View entering={FadeIn.delay(400)} style={styles.infoContainer}>
          <SFIcon name="info-circle" size={14} color={Colors.gray[3]} />
          <Text style={styles.infoText}>
            Help your friends find parking too!
          </Text>
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

  // Success Header
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  successEmoji: {
    fontSize: 32,
  },
  successText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },

  // Share Card
  cardWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  shareCard: {
    width: '100%',
    maxWidth: 340,
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
    marginBottom: Spacing.md,
  },
  brandingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingIconText: {
    fontSize: 20,
  },
  brandingText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },

  // Success Message
  successMessage: {
    fontSize: 20,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.lg,
    lineHeight: 28,
  },

  // Lot Status Card
  lotStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  lotStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lotStatusDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.gray[4],
    marginHorizontal: Spacing.md,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  lotId: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  lotStatusRight: {
    flex: 1,
  },
  detailText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: 4,
  },
  savedText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
  },

  // Download CTA
  downloadText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    textAlign: 'center',
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  shareButtonIcon: {
    fontSize: 18,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.gray[4],
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  instagramButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  friendsButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.background,
  },
  skipButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.gray[2],
  },

  // Info
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.gray[3],
  },
});
