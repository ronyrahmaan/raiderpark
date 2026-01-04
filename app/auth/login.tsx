// ============================================================
// LOGIN SCREEN
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
  FadeInUp,
} from 'react-native-reanimated';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button, AppleSignInButton, GoogleSignInButton } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuthStore();

  const validateEmail = (email: string): boolean => {
    // Allow TTU emails and regular emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup' && password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/onboarding/permit');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Authentication Error',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
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
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Sign In Error',
        error.message || 'Failed to sign in. Please try again.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
  };

  const isTTUEmail = email.toLowerCase().endsWith('@ttu.edu');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 bg-ios-gray6 rounded-full items-center justify-center"
          >
            <X size={20} color="#8E8E93" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            className="mb-8"
          >
            <Text className="text-3xl font-bold text-black mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text className="text-base text-ios-gray">
              {mode === 'login'
                ? 'Sign in to continue to RaiderPark'
                : 'Join the TTU parking community'}
            </Text>
          </Animated.View>

          {/* Social Auth Buttons */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            className="gap-3 mb-6"
          >
            {Platform.OS === 'ios' && (
              <AppleSignInButton
                onPress={() => handleOAuth('apple')}
                disabled={isLoading}
                fullWidth
                className="rounded-2xl"
              />
            )}
            <GoogleSignInButton
              onPress={() => handleOAuth('google')}
              disabled={isLoading}
              fullWidth
              className="rounded-2xl"
            />
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="flex-row items-center mb-6"
          >
            <View className="flex-1 h-px bg-ios-gray5" />
            <Text className="px-4 text-sm text-ios-gray">or continue with email</Text>
            <View className="flex-1 h-px bg-ios-gray5" />
          </Animated.View>

          {/* Email Input */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            className="mb-4"
          >
            <View
              className={`flex-row items-center bg-ios-gray6 rounded-xl px-4 py-3 ${
                errors.email ? 'border border-ios-red' : ''
              }`}
            >
              <Mail size={20} color="#8E8E93" className="mr-3" />
              <TextInput
                className="flex-1 text-base text-black"
                placeholder="Email address"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              {isTTUEmail && (
                <View className="bg-scarlet-500 px-2 py-1 rounded-md">
                  <Text className="text-white text-xs font-semibold">TTU</Text>
                </View>
              )}
            </View>
            {errors.email && (
              <Text className="text-ios-red text-sm mt-1 ml-1">{errors.email}</Text>
            )}
          </Animated.View>

          {/* Password Input */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            className="mb-4"
          >
            <View
              className={`flex-row items-center bg-ios-gray6 rounded-xl px-4 py-3 ${
                errors.password ? 'border border-ios-red' : ''
              }`}
            >
              <Lock size={20} color="#8E8E93" className="mr-3" />
              <TextInput
                ref={passwordRef}
                className="flex-1 text-base text-black"
                placeholder="Password"
                placeholderTextColor="#8E8E93"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (mode === 'signup') {
                    confirmRef.current?.focus();
                  } else {
                    handleAuth();
                  }
                }}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#8E8E93" />
                ) : (
                  <Eye size={20} color="#8E8E93" />
                )}
              </Pressable>
            </View>
            {errors.password && (
              <Text className="text-ios-red text-sm mt-1 ml-1">{errors.password}</Text>
            )}
          </Animated.View>

          {/* Confirm Password (Sign Up only) */}
          {mode === 'signup' && (
            <Animated.View
              entering={FadeInDown.delay(450).duration(600)}
              className="mb-4"
            >
              <View
                className={`flex-row items-center bg-ios-gray6 rounded-xl px-4 py-3 ${
                  errors.confirm ? 'border border-ios-red' : ''
                }`}
              >
                <Lock size={20} color="#8E8E93" className="mr-3" />
                <TextInput
                  ref={confirmRef}
                  className="flex-1 text-base text-black"
                  placeholder="Confirm Password"
                  placeholderTextColor="#8E8E93"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirm) setErrors({ ...errors, confirm: undefined });
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
              </View>
              {errors.confirm && (
                <Text className="text-ios-red text-sm mt-1 ml-1">{errors.confirm}</Text>
              )}
            </Animated.View>
          )}

          {/* Forgot Password (Login only) */}
          {mode === 'login' && (
            <Animated.View
              entering={FadeInDown.delay(500).duration(600)}
              className="mb-6"
            >
              <Pressable className="self-end">
                <Text className="text-sm text-scarlet-500 font-medium">
                  Forgot Password?
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Submit Button */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(600)}
            className="mt-4"
          >
            <Button
              title={mode === 'login' ? 'Sign In' : 'Create Account'}
              variant="primary"
              size="xl"
              fullWidth
              isLoading={isLoading}
              onPress={handleAuth}
              className="rounded-2xl"
            />
          </Animated.View>

          {/* Toggle Mode */}
          <Animated.View
            entering={FadeInDown.delay(700).duration(600)}
            className="mt-6"
          >
            <Pressable onPress={toggleMode} className="flex-row justify-center">
              <Text className="text-base text-ios-gray">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <Text className="text-base text-scarlet-500 font-semibold">
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* TTU Email Note */}
          <Animated.View
            entering={FadeInDown.delay(800).duration(600)}
            className="mt-8"
          >
            <View className="bg-scarlet-50 p-4 rounded-xl">
              <Text className="text-sm text-scarlet-700 text-center">
                <Text className="font-semibold">Pro tip:</Text> Use your @ttu.edu email to get verified student status and access to exclusive features
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

const styles = StyleSheet.create({});
