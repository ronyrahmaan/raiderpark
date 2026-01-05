// ============================================================
// QUICK REPORT MODAL
// Feature 1.5: One-tap parking report triggered by geofence
// Premium iOS-first design with haptic feedback & animations
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { submitReport } from '@/services/lots';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

const { width } = Dimensions.get('window');

interface QuickReportModalProps {
  visible: boolean;
  detectedLotId: string;
  detectedLotName: string;
  onClose: () => void;
  onSuccess?: () => void;
  onChangeLot?: () => void;
  currentStreak?: number;
  totalReports?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuickReportModal({
  visible,
  detectedLotId,
  detectedLotName,
  onClose,
  onSuccess,
  onChangeLot,
  currentStreak = 0,
  totalReports = 0,
}: QuickReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<'yes' | 'no' | null>(null);

  // Animation values
  const yesScale = useSharedValue(1);
  const noScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  const pointsOpacity = useSharedValue(0);

  // Reset animations when modal opens
  useEffect(() => {
    if (visible) {
      setSubmitted(null);
      setIsSubmitting(false);
      successScale.value = 0;
      pointsOpacity.value = 0;
    }
  }, [visible]);

  const handleReport = useCallback(async (foundParking: boolean) => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await submitReport({
        lotId: detectedLotId,
        occupancyStatus: foundParking ? 'busy' : 'full',
        occupancyPercent: foundParking ? 75 : 100,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(foundParking ? 'yes' : 'no');

      // Animate success
      successScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      pointsOpacity.value = withDelay(300, withSpring(1));

      // Auto-close after showing success
      setTimeout(() => {
        setSubmitted(null);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSubmitting(false);
    }
  }, [detectedLotId, onSuccess, onClose, successScale, pointsOpacity]);

  const handleChangeLot = useCallback(() => {
    onChangeLot?.();
    onClose();
  }, [onChangeLot, onClose]);

  // Button press animations
  const handleYesPressIn = () => {
    yesScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };
  const handleYesPressOut = () => {
    yesScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };
  const handleNoPressIn = () => {
    noScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };
  const handleNoPressOut = () => {
    noScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const yesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: yesScale.value }],
  }));

  const noAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: noScale.value }],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const pointsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pointsOpacity.value,
    transform: [{ translateY: (1 - pointsOpacity.value) * 10 }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View entering={SlideInUp.springify().damping(15)} style={styles.modalContainer}>
          {/* Success State */}
          {submitted ? (
            <Animated.View style={[styles.successContainer, successAnimatedStyle]}>
              <View style={[
                styles.successIcon,
                { backgroundColor: submitted === 'yes' ? Colors.ios.green + '15' : Colors.ios.red + '15' }
              ]}>
                <SFIcon
                  name={submitted === 'yes' ? 'checkmark' : 'xmark'}
                  size={48}
                  color={submitted === 'yes' ? Colors.ios.green : Colors.ios.red}
                />
              </View>
              <Text style={styles.successTitle}>
                {submitted === 'yes' ? 'Thanks!' : 'Got it!'}
              </Text>
              <Text style={styles.successText}>
                {submitted === 'yes'
                  ? 'Your report helps others find parking!'
                  : "We'll alert others that it's full."}
              </Text>

              {/* Points & Streak Earned */}
              <Animated.View style={[styles.rewardContainer, pointsAnimatedStyle]}>
                <View style={styles.rewardBadge}>
                  <SFIcon name="star" size={16} color={Colors.ios.orange} />
                  <Text style={styles.rewardText}>+10 points</Text>
                </View>
                {currentStreak > 0 && (
                  <View style={styles.streakBadge}>
                    <SFIcon name="flame" size={16} color={Colors.scarlet.DEFAULT} />
                    <Text style={styles.streakText}>{currentStreak + 1} day streak!</Text>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          ) : (
            <>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <SFIcon name="xmark" size={14} color={Colors.gray[2]} />
              </TouchableOpacity>

              {/* Header with detected lot */}
              <View style={styles.header}>
                <View style={styles.locationIconContainer}>
                  <SFIcon name="pin-fill" size={24} color={Colors.scarlet.DEFAULT} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>You're at</Text>
                  <Text style={styles.lotId}>{detectedLotId}</Text>
                  <Text style={styles.lotName}>{detectedLotName}</Text>
                </View>
              </View>

              {/* Main Question */}
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>Did you find parking?</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsRow}>
                <AnimatedPressable
                  style={[styles.actionButton, styles.yesButton, yesAnimatedStyle]}
                  onPressIn={handleYesPressIn}
                  onPressOut={handleYesPressOut}
                  onPress={() => handleReport(true)}
                  disabled={isSubmitting}
                >
                  <View style={styles.buttonIconContainer}>
                    <SFIcon name="checkmark" size={32} color={Colors.ios.green} />
                  </View>
                  <Text style={styles.yesButtonText}>Yes!</Text>
                  <Text style={styles.buttonHint}>Found a spot</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[styles.actionButton, styles.noButton, noAnimatedStyle]}
                  onPressIn={handleNoPressIn}
                  onPressOut={handleNoPressOut}
                  onPress={() => handleReport(false)}
                  disabled={isSubmitting}
                >
                  <View style={styles.buttonIconContainer}>
                    <SFIcon name="xmark" size={32} color={Colors.ios.red} />
                  </View>
                  <Text style={styles.noButtonText}>No</Text>
                  <Text style={styles.buttonHint}>It's full</Text>
                </AnimatedPressable>
              </View>

              {/* Reporter Stats Preview */}
              {totalReports > 0 && (
                <View style={styles.statsPreview}>
                  <SFIcon name="trophy" size={14} color={Colors.ios.orange} />
                  <Text style={styles.statsText}>
                    You've helped {totalReports} times this semester
                  </Text>
                </View>
              )}

              {/* Footer Actions */}
              <View style={styles.footerActions}>
                {/* Give Detailed Report Link */}
                <TouchableOpacity
                  style={styles.detailedReportButton}
                  onPress={handleChangeLot}
                >
                  <SFIcon name="edit" size={14} color={Colors.gray[1]} />
                  <Text style={styles.detailedReportText}>
                    Give detailed report
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.footerDivider} />

                {/* Change Lot Link */}
                <TouchableOpacity
                  style={styles.changeLotButton}
                  onPress={handleChangeLot}
                >
                  <Text style={styles.changeLotText}>
                    Not in {detectedLotId}? Tap to change
                  </Text>
                  <SFIcon name="chevron-right" size={14} color={Colors.ios.blue} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 40,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xxl + 4,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    ...Shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[6],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  locationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lotId: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  lotName: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },

  // Question
  questionContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontSize: 22,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },

  // Buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    minHeight: 130,
  },
  buttonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  yesButton: {
    backgroundColor: Colors.ios.green + '12',
    borderColor: Colors.ios.green + '40',
  },
  yesButtonText: {
    color: Colors.ios.green,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  noButton: {
    backgroundColor: Colors.ios.red + '12',
    borderColor: Colors.ios.red + '40',
  },
  noButtonText: {
    color: Colors.ios.red,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  buttonHint: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: Spacing.xs,
  },

  // Stats preview
  statsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
  },
  statsText: {
    fontSize: FontSize.sm,
    color: Colors.ios.orange,
    marginLeft: Spacing.xs,
    fontWeight: FontWeight.medium,
  },

  // Footer actions
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  detailedReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  detailedReportText: {
    color: Colors.gray[1],
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  footerDivider: {
    height: 1,
    backgroundColor: Colors.gray[5],
    marginVertical: Spacing.xs,
  },
  changeLotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  changeLotText: {
    color: Colors.ios.blue,
    fontSize: FontSize.sm,
    marginRight: Spacing.xs,
  },

  // Success state
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  successText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // Rewards
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.orange + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  rewardText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
    marginLeft: Spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  streakText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.scarlet.DEFAULT,
    marginLeft: Spacing.xs,
  },
});

export default QuickReportModal;
