// ============================================================
// FRIEND JOINED MODAL - Notification when referred friend joins
// Feature 11: Viral Sharing & Growth Engine
// ============================================================

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Share,
} from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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

interface FriendJoinedModalProps {
  visible: boolean;
  friendName: string;
  totalReferrals: number;
  onDismiss: () => void;
  onInviteMore: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function FriendJoinedModal({
  visible,
  friendName,
  totalReferrals,
  onDismiss,
  onInviteMore,
}: FriendJoinedModalProps) {
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const message = `My friend ${friendName} just joined RaiderPark! That's ${totalReferrals} friend${totalReferrals !== 1 ? 's' : ''} I've helped find parking easier at TTU. Join us!\n\nDownload free: raiderpark.app`;

    try {
      await Share.share({
        message,
        title: 'My friend joined RaiderPark!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [friendName, totalReferrals]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          entering={ZoomIn.springify()}
          style={styles.modalContainer}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onDismiss}>
              <SFIcon name="xmark" size={18} color={Colors.gray[2]} />
            </Pressable>

            {/* Success Icon */}
            <Animated.View entering={ZoomIn.delay(100).springify()} style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>🎉</Text>
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>Your Friend Joined!</Text>

            {/* Friend Name */}
            <View style={styles.friendBadge}>
              <SFIcon name="person" size={16} color={Colors.ios.green} />
              <Text style={styles.friendName}>{friendName}</Text>
            </View>

            {/* Message */}
            <Text style={styles.message}>
              Thanks to you, {friendName} is now part of the RaiderPark community!
            </Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalReferrals}</Text>
                <Text style={styles.statLabel}>
                  Friend{totalReferrals !== 1 ? 's' : ''} Referred
                </Text>
              </View>
            </View>

            {/* Reward Info */}
            <View style={styles.rewardBanner}>
              <SFIcon name="star-fill" size={16} color={Colors.ios.orange} />
              <Text style={styles.rewardText}>+50 points earned!</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable style={styles.shareButton} onPress={handleShare}>
                <Text style={styles.shareButtonText}>Share the News</Text>
              </Pressable>

              <Pressable style={styles.inviteButton} onPress={onInviteMore}>
                <SFIcon name="person-badge-plus" size={18} color={Colors.ios.blue} />
                <Text style={styles.inviteButtonText}>Invite More Friends</Text>
              </Pressable>

              <Pressable style={styles.dismissButton} onPress={onDismiss}>
                <Text style={styles.dismissButtonText}>Awesome!</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: -Spacing.md,
    right: -Spacing.md,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[6],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconEmoji: {
    fontSize: 36,
  },

  // Title
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },

  // Friend Badge
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.green + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  friendName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.green,
  },

  // Message
  message: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },

  // Reward Banner
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.orange + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  rewardText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
  },

  // Actions
  actionsContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  shareButton: {
    width: '100%',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    ...Shadows.sm,
  },
  shareButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  inviteButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.ios.blue,
    gap: Spacing.sm,
  },
  inviteButtonText: {
    color: Colors.ios.blue,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  dismissButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: Colors.gray[2],
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});

export default FriendJoinedModal;
