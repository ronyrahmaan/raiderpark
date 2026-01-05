/**
 * QuickReportPrompt Component
 * A minimal, non-intrusive prompt that appears when user might have just parked
 * One tap to confirm, easy to dismiss
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { Colors, Shadows, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { OccupancyStatus } from '@/types/database';
import { submitReportWithRetry } from '@/services/reportQueue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuickReportPromptProps {
  lotId: string;
  lotName: string;
  onDismiss: () => void;
  onReported: (status: OccupancyStatus) => void;
}

// OccupancyStatus: 'open' | 'busy' | 'filling' | 'full' | 'closed'
const STATUS_OPTIONS: { value: OccupancyStatus; label: string; icon: string; color: string }[] = [
  { value: 'open', label: 'Easy', icon: '😊', color: Colors.status.open },
  { value: 'busy', label: 'OK', icon: '😐', color: Colors.status.busy },
  { value: 'filling', label: 'Hard', icon: '😰', color: Colors.status.filling },
  { value: 'full', label: 'Full', icon: '😤', color: Colors.status.full },
];

export function QuickReportPrompt({
  lotId,
  lotName,
  onDismiss,
  onReported,
}: QuickReportPromptProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const translateX = useSharedValue(0);

  // Handle quick status tap
  const handleStatusTap = useCallback(async (status: OccupancyStatus) => {
    if (isSubmitting || submitted) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      await submitReportWithRetry({
        lotId,
        occupancyStatus: status,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      onReported(status);

      // Auto-dismiss after success
      setTimeout(onDismiss, 1500);
    } catch (error) {
      console.error('Quick report failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [lotId, isSubmitting, submitted, onDismiss, onReported]);

  // Swipe to dismiss gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward swipe
      if (event.translationY > 0) {
        translateX.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        // Dismiss if swiped far enough
        translateX.value = withTiming(300, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        // Spring back
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateX.value }],
  }));

  // Auto-dismiss after 15 seconds if no interaction
  useEffect(() => {
    const timer = setTimeout(onDismiss, 15000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (submitted) {
    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[styles.container, styles.successContainer]}
      >
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successText}>Thanks! +10 pts</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={SlideInDown.springify().damping(15)}
        exiting={SlideOutDown}
        style={[styles.container, animatedStyle]}
      >
        {/* Drag indicator */}
        <View style={styles.dragIndicator} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SFIcon name="car" size={20} color={Colors.scarlet.DEFAULT} />
            <Text style={styles.headerText}>Just parked at {lotName}?</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <SFIcon name="xmark" size={18} color={Colors.gray[2]} />
          </TouchableOpacity>
        </View>

        {/* Quick question */}
        <Text style={styles.question}>How easy was it to find a spot?</Text>

        {/* Status options - horizontal */}
        <View style={styles.optionsRow}>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionButton, { borderColor: option.color }]}
              onPress={() => handleStatusTap(option.value)}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.icon}</Text>
              <Text style={[styles.optionLabel, { color: option.color }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip text */}
        <TouchableOpacity onPress={onDismiss} style={styles.skipButton}>
          <Text style={styles.skipText}>Not now</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.lg,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  successEmoji: {
    fontSize: 24,
  },
  successText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.green,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: Colors.gray[4],
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  question: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    backgroundColor: Colors.light.background,
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  skipButton: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
});
