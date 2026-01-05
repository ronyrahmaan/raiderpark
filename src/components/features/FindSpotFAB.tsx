/**
 * Find Spot FAB (Floating Action Button)
 *
 * Premium floating button for the Find Nearby Spot feature.
 * Two variants:
 * - Pill button (Home screen): "Find Spot" with text
 * - Circular button (Map screen): Location icon only
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  ColoredShadows,
} from '@/constants/theme';
import { mediumHaptic } from '@/utils/haptics';

// ============================================================
// TYPES
// ============================================================

export type FABVariant = 'pill' | 'circle';

interface FindSpotFABProps {
  onPress: () => void;
  variant?: FABVariant;
  position?: 'bottomRight' | 'bottomCenter' | 'bottomLeft';
  label?: string;
  isVisible?: boolean;
  style?: ViewStyle;
  testID?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function FindSpotFAB({
  onPress,
  variant = 'pill',
  position = 'bottomRight',
  label = 'Find Spot',
  isVisible = true,
  style,
  testID,
}: FindSpotFABProps) {
  const scale = useSharedValue(1);

  // Handle press with animation and haptic
  const handlePress = useCallback(() => {
    'worklet';
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    runOnJS(mediumHaptic)();
    runOnJS(onPress)();
  }, [onPress, scale]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Position styles
  const positionStyle = getPositionStyle(position);

  if (!isVisible) {
    return null;
  }

  if (variant === 'circle') {
    return (
      <Animated.View
        entering={FadeIn.duration(300).springify()}
        exiting={FadeOut.duration(200)}
        style={[styles.fabContainer, positionStyle, style]}
      >
        <AnimatedTouchable
          onPress={handlePress}
          activeOpacity={0.9}
          style={[styles.fabCircle, animatedStyle, ColoredShadows.scarlet]}
          accessibilityLabel="Find nearby parking spot"
          accessibilityRole="button"
          testID={testID}
        >
          <SFIcon name="location.magnifyingglass" size={24} color="#FFFFFF" />
        </AnimatedTouchable>
      </Animated.View>
    );
  }

  // Pill variant
  return (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      style={[styles.fabContainer, positionStyle, style]}
    >
      <AnimatedTouchable
        onPress={handlePress}
        activeOpacity={0.9}
        style={[styles.fabPill, animatedStyle, ColoredShadows.scarlet]}
        accessibilityLabel={`${label}. Tap to find nearby parking`}
        accessibilityRole="button"
        testID={testID}
      >
        <SFIcon name="location.magnifyingglass" size={18} color="#FFFFFF" />
        <Text style={styles.fabLabel}>{label}</Text>
      </AnimatedTouchable>
    </Animated.View>
  );
}

// ============================================================
// MINI FAB (for map)
// ============================================================

interface MiniFindSpotFABProps {
  onPress: () => void;
  style?: ViewStyle;
}

export function MiniFindSpotFAB({ onPress, style }: MiniFindSpotFABProps) {
  return (
    <FindSpotFAB
      onPress={onPress}
      variant="circle"
      position="bottomRight"
      style={style}
    />
  );
}

// ============================================================
// EXPANDED FAB (shows quick info)
// ============================================================

interface ExpandedFindSpotFABProps {
  onPress: () => void;
  topSpot?: {
    lotId: string;
    occupancy: number;
    status: 'open' | 'busy' | 'filling' | 'full';
  };
  isVisible?: boolean;
  style?: ViewStyle;
}

export function ExpandedFindSpotFAB({
  onPress,
  topSpot,
  isVisible = true,
  style,
}: ExpandedFindSpotFABProps) {
  if (!isVisible) return null;

  const statusColor = topSpot
    ? Colors.status[topSpot.status]
    : Colors.status.open;

  return (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      style={[styles.expandedContainer, style]}
    >
      <TouchableOpacity
        onPress={() => {
          mediumHaptic();
          onPress();
        }}
        activeOpacity={0.9}
        style={[styles.expandedFab, ColoredShadows.scarlet]}
        accessibilityLabel="Find nearby parking spot"
        accessibilityRole="button"
      >
        <View style={styles.expandedLeft}>
          <View style={styles.expandedIcon}>
            <SFIcon name="location.magnifyingglass" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.expandedText}>
            <Text style={styles.expandedTitle}>Find Spot</Text>
            {topSpot && (
              <Text style={styles.expandedSubtitle}>
                Best: {topSpot.lotId} ({topSpot.occupancy}%)
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.expandedStatus, { backgroundColor: statusColor + '30' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <SFIcon name="chevron.right" size={14} color={statusColor} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getPositionStyle(position: FindSpotFABProps['position']): ViewStyle {
  switch (position) {
    case 'bottomCenter':
      return {
        bottom: Spacing.xl,
        left: 0,
        right: 0,
        alignItems: 'center',
      };
    case 'bottomLeft':
      return {
        bottom: Spacing.xl,
        left: Spacing.md,
      };
    case 'bottomRight':
    default:
      return {
        bottom: Spacing.xl,
        right: Spacing.md,
      };
  }
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  fabCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.scarlet[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  // Expanded FAB styles
  expandedContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 100,
  },
  expandedFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  expandedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedText: {
    gap: 2,
  },
  expandedTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  expandedSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.sm,
  },
  expandedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default FindSpotFAB;
