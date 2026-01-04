// ============================================================
// PREMIUM iOS-STYLE BUTTON COMPONENT
// RaiderPark Design System
// ============================================================

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
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

// Button variants using CVA (class-variance-authority)
const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl active:opacity-90',
  {
    variants: {
      variant: {
        primary: 'bg-scarlet-500',
        secondary: 'bg-ios-gray6',
        outline: 'bg-transparent border-2 border-scarlet-500',
        ghost: 'bg-transparent',
        destructive: 'bg-ios-red',
        apple: 'bg-black',
        google: 'bg-white border border-ios-gray4',
      },
      size: {
        sm: 'h-10 px-4',
        md: 'h-12 px-6',
        lg: 'h-14 px-8',
        xl: 'h-16 px-10',
        icon: 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'lg',
      fullWidth: false,
    },
  }
);

const textVariants = cva('font-semibold text-center', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-black',
      outline: 'text-scarlet-500',
      ghost: 'text-scarlet-500',
      destructive: 'text-white',
      apple: 'text-white',
      google: 'text-black',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'lg',
  },
});

export interface ButtonProps
  extends Omit<PressableProps, 'style'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  title?: string;
  isLoading?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  children,
  title,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  isLoading = false,
  hapticFeedback = 'light',
  leftIcon,
  rightIcon,
  disabled,
  className,
  textClassName,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(0.97, {
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
        const feedbackMap = {
          light: Haptics.ImpactFeedbackStyle.Light,
          medium: Haptics.ImpactFeedbackStyle.Medium,
          heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };
        Haptics.impactAsync(feedbackMap[hapticFeedback]);
      }
      onPress?.(e);
    },
    [hapticFeedback, onPress]
  );

  const isDisabled = disabled || isLoading;

  const getLoaderColor = () => {
    if (variant === 'secondary' || variant === 'google') return '#000000';
    if (variant === 'outline' || variant === 'ghost') return '#CC0000';
    return '#FFFFFF';
  };

  return (
    <AnimatedPressable
      style={[animatedStyle, isDisabled && styles.disabled]}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getLoaderColor()} size="small" />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          {title ? (
            <Text className={cn(textVariants({ variant, size }), textClassName)}>
              {title}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});

// ============================================================
// SOCIAL AUTH BUTTONS
// ============================================================

interface SocialButtonProps extends Omit<ButtonProps, 'variant'> {
  provider: 'apple' | 'google';
}

export function AppleSignInButton({ ...props }: Omit<SocialButtonProps, 'provider'>) {
  return (
    <Button
      variant="apple"
      leftIcon={
        <Text className="text-white text-xl mr-1"></Text>
      }
      title="Continue with Apple"
      {...props}
    />
  );
}

export function GoogleSignInButton({ ...props }: Omit<SocialButtonProps, 'provider'>) {
  return (
    <Button
      variant="google"
      leftIcon={
        <View className="mr-1">
          <GoogleLogo />
        </View>
      }
      title="Continue with Google"
      {...props}
    />
  );
}

// Simple Google Logo component
function GoogleLogo() {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>G</Text>
    </View>
  );
}

export default Button;
