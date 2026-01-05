// ============================================================
// VERIFY EMAIL SCREEN - OTP Code Entry
// Premium iOS-first design for RaiderPark
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import {
  Colors,
  BorderRadius,
  Spacing,
  FontWeight,
  FontSize,
} from '@/constants/theme';

const CODE_LENGTH = 8; // Supabase email tokens are 8 digits
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const { verifyOTP, resendOTP, isOnboarded } = useAuthStore();

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Please enter the 6-digit code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await verifyOTP(email!, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if user needs onboarding
      const { isOnboarded } = useAuthStore.getState();
      if (isOnboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/permit');
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || 'Invalid code. Please try again.');
      setCode(''); // Clear code on error
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await resendOTP(email!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResendCooldown(RESEND_COOLDOWN);
      setError(null);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
    if (error) setError(null);

    // Haptic feedback for each digit
    if (cleaned.length > code.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Render code boxes
  const renderCodeBoxes = () => {
    const boxes = [];
    for (let i = 0; i < CODE_LENGTH; i++) {
      const digit = code[i] || '';
      const isFocused = code.length === i;

      boxes.push(
        <View
          key={i}
          style={[
            styles.codeBox,
            isFocused && styles.codeBoxFocused,
            error && styles.codeBoxError,
          ]}
        >
          <Text style={styles.codeDigit}>{digit}</Text>
        </View>
      );
    }
    return boxes;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <SFIcon name="chevron-left" size={24} color={Colors.light.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.iconContainer}
          >
            <View style={styles.iconCircle}>
              <SFIcon name="mail" size={32} color={Colors.scarlet[500]} />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.titleContainer}
          >
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a code to
            </Text>
            <Text style={styles.email}>{email}</Text>
          </Animated.View>

          {/* Hidden TextInput for keyboard */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            autoFocus
            maxLength={CODE_LENGTH}
          />

          {/* Code Boxes */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Pressable
              style={styles.codeContainer}
              onPress={() => inputRef.current?.focus()}
            >
              {renderCodeBoxes()}
            </Pressable>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </Animated.View>

          {/* Verify Button */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.buttonContainer}
          >
            <Button
              title="Verify"
              variant="primary"
              size="xl"
              fullWidth
              isLoading={isLoading}
              onPress={handleVerify}
              disabled={code.length !== CODE_LENGTH}
              style={styles.verifyButton}
            />
          </Animated.View>

          {/* Resend */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.resendContainer}
          >
            <Text style={styles.resendText}>Didn't receive a code?</Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0 || isResending}
              style={styles.resendButton}
            >
              {isResending ? (
                <SFIcon name="refresh" size={16} color={Colors.gray[2]} />
              ) : resendCooldown > 0 ? (
                <Text style={styles.resendCooldownText}>
                  Resend in {resendCooldown}s
                </Text>
              ) : (
                <Text style={styles.resendActionText}>Resend code</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Help Text */}
          <Animated.View
            entering={FadeIn.delay(500).duration(600)}
            style={styles.helpContainer}
          >
            <Text style={styles.helpText}>
              Check your spam folder if you don't see the email.
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.gray[1],
  },
  email: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: Spacing.xs,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  codeBox: {
    width: 38,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  codeBoxFocused: {
    borderColor: Colors.scarlet[500],
    backgroundColor: Colors.light.background,
  },
  codeBoxError: {
    borderColor: Colors.ios.red,
    backgroundColor: Colors.ios.red + '10',
  },
  codeDigit: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  errorText: {
    color: Colors.ios.red,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  buttonContainer: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  verifyButton: {
    borderRadius: BorderRadius.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  resendText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
  },
  resendButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  resendCooldownText: {
    fontSize: FontSize.md,
    color: Colors.gray[2],
  },
  resendActionText: {
    fontSize: FontSize.md,
    color: Colors.scarlet[500],
    fontWeight: FontWeight.semibold,
  },
  helpContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  helpText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    textAlign: 'center',
  },
});
