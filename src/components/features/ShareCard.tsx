// ============================================================
// SHARE CARD COMPONENT
// Shareable parking success card for viral growth
// ============================================================

import { View, Text, StyleSheet, Pressable } from 'react-native';
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

export interface ShareCardData {
  lotId: string;
  lotStatus: 'open' | 'busy' | 'filling' | 'full';
  foundTime: Date;
  searchTimeMinutes: number;
  savedMinutes: number;
}

interface ShareCardProps {
  data: ShareCardData;
  onShareInstagram?: () => void;
  onShareFriends?: () => void;
  onSkip?: () => void;
}

function getStatusColor(status: string): string {
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function ShareCard({ data, onShareInstagram, onShareFriends, onSkip }: ShareCardProps) {
  const statusColor = getStatusColor(data.lotStatus);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
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
            I just parked at {data.lotId} in {data.searchTimeMinutes} minutes! 🚗
          </Text>

          {/* Lot Status Card */}
          <View style={styles.lotStatusCard}>
            <View style={styles.lotStatusLeft}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View>
                <Text style={styles.lotId}>{data.lotId}</Text>
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {data.lotStatus.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.lotStatusRight}>
              <Text style={styles.detailText}>Found spot at {formatTime(data.foundTime)}</Text>
              <Text style={styles.savedText}>Saved ~{data.savedMinutes} min vs circling</Text>
            </View>
          </View>

          {/* Download CTA */}
          <Text style={styles.downloadText}>Download free: raiderpark.app</Text>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.actionsContainer}>
        <Pressable style={styles.shareButton} onPress={onShareInstagram}>
          <Text style={styles.shareButtonIcon}>📱</Text>
          <Text style={styles.shareButtonText}>Share to Instagram</Text>
        </Pressable>

        <Pressable style={styles.shareButton} onPress={onShareFriends}>
          <Text style={styles.shareButtonIcon}>💬</Text>
          <Text style={styles.shareButtonText}>Send to Friends</Text>
        </Pressable>

        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// Compact version for embedding in other screens
export function ShareCardCompact({ data, onPress }: { data: ShareCardData; onPress?: () => void }) {
  const statusColor = getStatusColor(data.lotStatus);

  return (
    <Pressable onPress={onPress} style={styles.compactCard}>
      <View style={styles.compactHeader}>
        <Text style={styles.compactEmoji}>🎉</Text>
        <View style={styles.compactHeaderText}>
          <Text style={styles.compactTitle}>Share your win!</Text>
          <Text style={styles.compactSubtitle}>Let friends know about RaiderPark</Text>
        </View>
        <SFIcon name="chevron-right" size={20} color={Colors.gray[3]} />
      </View>

      <View style={styles.compactPreview}>
        <View style={styles.compactPreviewCard}>
          <View style={styles.compactBranding}>
            <Text style={styles.compactBrandingIcon}>🅿️</Text>
            <Text style={styles.compactBrandingText}>RAIDER PARK</Text>
          </View>
          <Text style={styles.compactMessage}>
            I just parked at {data.lotId} in {data.searchTimeMinutes} min!
          </Text>
          <View style={styles.compactStats}>
            <View style={[styles.compactStatusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.compactStatText}>{data.lotId}</Text>
            <Text style={styles.compactStatDivider}>•</Text>
            <Text style={styles.compactStatText}>Saved {data.savedMinutes} min</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
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
    fontSize: 28,
  },
  successText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },

  // Share Card
  cardWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  shareCard: {
    width: '100%',
    maxWidth: 320,
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },

  // Success Message
  successMessage: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },

  // Lot Status Card
  lotStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  lotStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.gray[4],
    marginRight: Spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  lotId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  lotStatusRight: {
    flex: 1,
  },
  detailText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: 2,
  },
  savedText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
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
  },
  shareButton: {
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
  shareButtonIcon: {
    fontSize: 18,
  },
  shareButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  skipButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[2],
  },

  // Compact Card Styles
  compactCard: {
    backgroundColor: Colors.ios.green + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.green + '30',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  compactEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  compactHeaderText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  compactSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  compactPreview: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  compactPreviewCard: {
    padding: Spacing.sm,
  },
  compactBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  compactBrandingIcon: {
    fontSize: 14,
  },
  compactBrandingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
    letterSpacing: 0.5,
  },
  compactMessage: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactStatText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  compactStatDivider: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
  },
});
