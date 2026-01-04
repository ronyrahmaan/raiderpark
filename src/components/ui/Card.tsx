// ============================================================
// PREMIUM iOS-STYLE CARD COMPONENT
// RaiderPark Design System
// ============================================================

import React, { useCallback } from 'react';
import {
  Pressable,
  View,
  ViewProps,
  PressableProps,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Card variants using CVA
const cardVariants = cva('overflow-hidden', {
  variants: {
    variant: {
      default: 'bg-white',
      elevated: 'bg-white',
      outlined: 'bg-white border border-ios-gray4',
      filled: 'bg-ios-gray6',
      scarlet: 'bg-scarlet-50',
    },
    radius: {
      sm: 'rounded-lg',
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      xl: 'rounded-3xl',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
      xl: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'elevated',
    radius: 'lg',
    padding: 'md',
  },
});

export interface CardProps
  extends Omit<ViewProps, 'style'>,
    VariantProps<typeof cardVariants> {
  children?: React.ReactNode;
  className?: string;
}

export function Card({
  children,
  variant = 'elevated',
  radius = 'lg',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const getShadowStyle = () => {
    if (variant === 'elevated') {
      return styles.elevatedShadow;
    }
    return undefined;
  };

  return (
    <View
      style={getShadowStyle()}
      className={cn(cardVariants({ variant, radius, padding }), className)}
      {...props}
    >
      {children}
    </View>
  );
}

// ============================================================
// PRESSABLE CARD COMPONENT
// ============================================================

export interface PressableCardProps
  extends Omit<PressableProps, 'style'>,
    VariantProps<typeof cardVariants> {
  children?: React.ReactNode;
  className?: string;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  selected?: boolean;
  selectedClassName?: string;
}

export function PressableCard({
  children,
  variant = 'elevated',
  radius = 'lg',
  padding = 'md',
  className,
  hapticFeedback = 'selection',
  selected = false,
  selectedClassName,
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

  const getShadowStyle = () => {
    if (variant === 'elevated') {
      return selected ? styles.selectedShadow : styles.elevatedShadow;
    }
    return undefined;
  };

  const selectedClasses = selected
    ? selectedClassName || 'border-2 border-scarlet-500'
    : '';

  return (
    <AnimatedPressable
      style={[animatedStyle, getShadowStyle(), disabled && styles.disabled]}
      className={cn(
        cardVariants({ variant, radius, padding }),
        selectedClasses,
        className
      )}
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

export interface CardHeaderProps extends ViewProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <View className={cn('mb-3', className)} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// CARD TITLE COMPONENT
// ============================================================

import { Text, TextProps } from 'react-native';

export interface CardTitleProps extends TextProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <Text
      className={cn('text-lg font-semibold text-black', className)}
      {...props}
    >
      {children}
    </Text>
  );
}

// ============================================================
// CARD DESCRIPTION COMPONENT
// ============================================================

export interface CardDescriptionProps extends TextProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <Text className={cn('text-sm text-ios-gray mt-1', className)} {...props}>
      {children}
    </Text>
  );
}

// ============================================================
// CARD CONTENT COMPONENT
// ============================================================

export interface CardContentProps extends ViewProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <View className={cn('', className)} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// CARD FOOTER COMPONENT
// ============================================================

export interface CardFooterProps extends ViewProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <View className={cn('mt-3 flex-row items-center', className)} {...props}>
      {children}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  elevatedShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  selectedShadow: {
    shadowColor: '#CC0000',
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
