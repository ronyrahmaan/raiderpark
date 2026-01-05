// ============================================================
// LOGIN SCREEN - Magic Link (Passwordless)
// Premium iOS-first design for RaiderPark
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { Button, AppleSignInButton, GoogleSignInButton } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import {
  Colors,
  BorderRadius,
  Spacing,
  FontWeight,
  FontSize,
} from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signInWithOTP, signInWithOAuth } = useAuthStore();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleContinue = async () => {
    // Validate email
    if (!email) {
      setError('Email is required');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signInWithOTP(email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to verify screen with email
      router.push({
        pathname: '/auth/verify',
        params: { email },
      });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'apple' | 'google') => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signInWithOAuth(provider);
      // OAuth will redirect via deep link
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Sign In Error',
        err.message || 'Failed to sign in. Please try again.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const isTTUEmail = email.toLowerCase().endsWith('@ttu.edu');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <SFIcon name="xmark" size={20} color={Colors.gray[1]} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.titleContainer}
          >
            <Text style={styles.title}>Welcome to RaiderPark</Text>
            <Text style={styles.subtitle}>
              Enter your email to sign in or create an account
            </Text>
          </Animated.View>

          {/* Social Auth Buttons */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.socialAuthContainer}
          >
            {Platform.OS === 'ios' && (
              <AppleSignInButton
                onPress={() => handleOAuth('apple')}
                disabled={isLoading}
                fullWidth
                style={styles.socialButton}
              />
            )}
            <GoogleSignInButton
              onPress={() => handleOAuth('google')}
              disabled={isLoading}
              fullWidth
              style={styles.socialButton}
            />
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.dividerContainer}
          >
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Email Input */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.inputWrapper}
          >
            <View
              style={[
                styles.inputContainer,
                error && styles.inputError,
              ]}
            >
              <SFIcon name="mail" size={20} color={Colors.gray[1]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.gray[1]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={handleContinue}
              />
              {isTTUEmail && (
                <View style={styles.ttuBadge}>
                  <Text style={styles.ttuBadgeText}>TTU</Text>
                </View>
              )}
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </Animated.View>

          {/* Continue Button */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.submitButtonContainer}
          >
            <Button
              title="Continue"
              variant="primary"
              size="xl"
              fullWidth
              isLoading={isLoading}
              onPress={handleContinue}
              style={styles.submitButton}
            />
          </Animated.View>

          {/* Info Text */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(600)}
            style={styles.infoContainer}
          >
            <Text style={styles.infoText}>
              We'll send you a code to verify your email. No password needed.
            </Text>
          </Animated.View>

          {/* TTU Email Note */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.ttuNoteContainer}
          >
            <View style={styles.ttuNoteCard}>
              <Text style={styles.ttuNoteText}>
                <Text style={styles.ttuNoteTextBold}>Pro tip:</Text> Use your @ttu.edu email to get verified student status and access to exclusive features
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
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
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  titleContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 30,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.gray[1],
  },
  socialAuthContainer: {
    gap: 12,
    marginBottom: Spacing.lg,
  },
  socialButton: {
    borderRadius: BorderRadius.lg,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[5],
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  inputWrapper: {
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.ios.red,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.light.text,
  },
  ttuBadge: {
    backgroundColor: Colors.scarlet[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm - 2,
  },
  ttuBadgeText: {
    color: Colors.light.background,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  errorText: {
    color: Colors.ios.red,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  submitButtonContainer: {
    marginTop: Spacing.md,
  },
  submitButton: {
    borderRadius: BorderRadius.lg,
  },
  infoContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    textAlign: 'center',
  },
  ttuNoteContainer: {
    marginTop: Spacing.xl,
  },
  ttuNoteCard: {
    backgroundColor: Colors.scarlet[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  ttuNoteText: {
    fontSize: FontSize.sm,
    color: Colors.scarlet[700],
    textAlign: 'center',
  },
  ttuNoteTextBold: {
    fontWeight: FontWeight.semibold,
  },
});
