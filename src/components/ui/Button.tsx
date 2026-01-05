// ============================================================
// PREMIUM iOS-STYLE BUTTON COMPONENT
// RaiderPark Design System - Pure StyleSheet
// ============================================================

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  PressableProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, BorderRadius, FontSize, FontWeight, ColoredShadows } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================
// BUTTON VARIANTS
// ============================================================

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'apple' | 'google';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: Colors.scarlet[500],
  },
  secondary: {
    backgroundColor: Colors.gray[6],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.scarlet[500],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.ios.red,
  },
  apple: {
    backgroundColor: '#000000',
  },
  google: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.gray[4],
  },
};

const textVariantStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: '#FFFFFF',
  },
  secondary: {
    color: '#000000',
  },
  outline: {
    color: Colors.scarlet[500],
  },
  ghost: {
    color: Colors.scarlet[500],
  },
  destructive: {
    color: '#FFFFFF',
  },
  apple: {
    color: '#FFFFFF',
  },
  google: {
    color: '#000000',
  },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    height: 40,
    paddingHorizontal: 16,
  },
  md: {
    height: 48,
    paddingHorizontal: 24,
  },
  lg: {
    height: 56,
    paddingHorizontal: 32,
  },
  xl: {
    height: 64,
    paddingHorizontal: 40,
  },
  icon: {
    height: 48,
    width: 48,
    paddingHorizontal: 0,
  },
};

const textSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: {
    fontSize: FontSize.sm,
  },
  md: {
    fontSize: FontSize.md,
  },
  lg: {
    fontSize: FontSize.lg,
  },
  xl: {
    fontSize: FontSize.xl,
  },
  icon: {
    fontSize: FontSize.md,
  },
};

// ============================================================
// BUTTON PROPS
// ============================================================

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// ============================================================
// BUTTON COMPONENT
// ============================================================

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
  style,
  textStyle,
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
    if (variant === 'outline' || variant === 'ghost') return Colors.scarlet[500];
    return '#FFFFFF';
  };

  const buttonStyles: ViewStyle[] = [
    styles.base,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && styles.fullWidth,
    variant === 'primary' && ColoredShadows.scarlet,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const labelStyles: TextStyle[] = [
    styles.text,
    textVariantStyles[variant],
    textSizeStyles[size],
    textStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <AnimatedPressable
      style={[animatedStyle, ...buttonStyles]}
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
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          {title ? (
            <Text style={labelStyles}>{title}</Text>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </AnimatedPressable>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

// ============================================================
// SOCIAL AUTH BUTTONS
// ============================================================

interface SocialButtonProps extends Omit<ButtonProps, 'variant'> {
  provider?: 'apple' | 'google';
}

export function AppleSignInButton({ ...props }: Omit<SocialButtonProps, 'provider'>) {
  return (
    <Button
      variant="apple"
      leftIcon={
        <Text style={socialStyles.appleIcon}></Text>
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
      leftIcon={<GoogleLogo />}
      title="Continue with Google"
      {...props}
    />
  );
}

// Simple Google Logo component
function GoogleLogo() {
  return (
    <View style={socialStyles.googleLogoContainer}>
      <Text style={socialStyles.googleLogoText}>G</Text>
    </View>
  );
}

const socialStyles = StyleSheet.create({
  appleIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    marginRight: 4,
  },
  googleLogoContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  googleLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
});

export default Button;
