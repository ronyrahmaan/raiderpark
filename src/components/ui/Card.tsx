// ============================================================
// PREMIUM iOS-STYLE CARD COMPONENT
// RaiderPark Design System
// ============================================================

import React, { useCallback } from 'react';
import {
  Pressable,
  View,
  Text,
  ViewProps,
  TextProps,
  PressableProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Colors,
  Shadows,
  BorderRadius,
  Spacing,
  FontSize,
  FontWeight,
} from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================
// TYPES
// ============================================================

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'scarlet';
type CardRadius = 'sm' | 'md' | 'lg' | 'xl';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  variant?: CardVariant;
  radius?: CardRadius;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
}

// ============================================================
// STYLE HELPERS
// ============================================================

const getVariantStyle = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case 'default':
      return { backgroundColor: Colors.light.background };
    case 'elevated':
      return { backgroundColor: Colors.light.background };
    case 'outlined':
      return {
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.gray[4],
      };
    case 'filled':
      return { backgroundColor: Colors.gray[6] };
    case 'scarlet':
      return { backgroundColor: Colors.scarlet[50] };
    default:
      return { backgroundColor: Colors.light.background };
  }
};

const getRadiusStyle = (radius: CardRadius): ViewStyle => {
  switch (radius) {
    case 'sm':
      return { borderRadius: BorderRadius.sm };
    case 'md':
      return { borderRadius: BorderRadius.md };
    case 'lg':
      return { borderRadius: BorderRadius.lg };
    case 'xl':
      return { borderRadius: BorderRadius.xl };
    default:
      return { borderRadius: BorderRadius.lg };
  }
};

const getPaddingStyle = (padding: CardPadding): ViewStyle => {
  switch (padding) {
    case 'none':
      return {};
    case 'sm':
      return { padding: Spacing.md };
    case 'md':
      return { padding: Spacing.md };
    case 'lg':
      return { padding: Spacing.lg };
    case 'xl':
      return { padding: Spacing.lg };
    default:
      return { padding: Spacing.md };
  }
};

// ============================================================
// CARD COMPONENT
// ============================================================

export function Card({
  children,
  variant = 'elevated',
  radius = 'lg',
  padding = 'md',
  style,
  ...props
}: CardProps) {
  const cardStyle: StyleProp<ViewStyle> = [
    styles.cardBase,
    getVariantStyle(variant),
    getRadiusStyle(radius),
    getPaddingStyle(padding),
    variant === 'elevated' ? Shadows.md : undefined,
    style,
  ];

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// PRESSABLE CARD COMPONENT
// ============================================================

export interface PressableCardProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  variant?: CardVariant;
  radius?: CardRadius;
  padding?: CardPadding;
  style?: ViewStyle;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  selected?: boolean;
  selectedStyle?: ViewStyle;
}

export function PressableCard({
  children,
  variant = 'elevated',
  radius = 'lg',
  padding = 'md',
  style,
  hapticFeedback = 'selection',
  selected = false,
  selectedStyle,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: PressableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(0.98, {
        damping: 15,
        stiffness: 400,
      });
      onPressIn?.(e);
    },
    [onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );

  const handlePress = useCallback(
    (e: any) => {
      if (hapticFeedback !== 'none') {
        if (hapticFeedback === 'selection') {
          Haptics.selectionAsync();
        } else {
          const feedbackMap = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
          };
          Haptics.impactAsync(feedbackMap[hapticFeedback]);
        }
      }
      onPress?.(e);
    },
    [hapticFeedback, onPress]
  );

  const getShadowStyle = (): ViewStyle | undefined => {
    if (variant === 'elevated') {
      return selected ? styles.selectedShadow : Shadows.md;
    }
    return undefined;
  };

  const defaultSelectedStyle: ViewStyle = {
    borderWidth: 2,
    borderColor: Colors.scarlet[500],
  };

  const cardStyle: ViewStyle[] = [
    styles.cardBase,
    getVariantStyle(variant),
    getRadiusStyle(radius),
    getPaddingStyle(padding),
    getShadowStyle(),
    selected ? (selectedStyle || defaultSelectedStyle) : undefined,
    disabled ? styles.disabled : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <AnimatedPressable
      style={[animatedStyle, ...cardStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

// ============================================================
// CARD HEADER COMPONENT
// ============================================================

export interface CardHeaderProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style, ...props }: CardHeaderProps) {
  return (
    <View style={[styles.cardHeader, style]} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// CARD TITLE COMPONENT
// ============================================================

export interface CardTitleProps extends Omit<TextProps, 'style'> {
  children?: React.ReactNode;
  style?: TextStyle;
}

export function CardTitle({ children, style, ...props }: CardTitleProps) {
  return (
    <Text style={[styles.cardTitle, style]} {...props}>
      {children}
    </Text>
  );
}

// ============================================================
// CARD DESCRIPTION COMPONENT
// ============================================================

export interface CardDescriptionProps extends Omit<TextProps, 'style'> {
  children?: React.ReactNode;
  style?: TextStyle;
}

export function CardDescription({
  children,
  style,
  ...props
}: CardDescriptionProps) {
  return (
    <Text style={[styles.cardDescription, style]} {...props}>
      {children}
    </Text>
  );
}

// ============================================================
// CARD CONTENT COMPONENT
// ============================================================

export interface CardContentProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style, ...props }: CardContentProps) {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// CARD FOOTER COMPONENT
// ============================================================

export interface CardFooterProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style, ...props }: CardFooterProps) {
  return (
    <View style={[styles.cardFooter, style]} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  cardBase: {
    overflow: 'hidden',
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  cardDescription: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: Spacing.xs,
  },
  cardFooter: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedShadow: {
    shadowColor: Colors.scarlet.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Card;
