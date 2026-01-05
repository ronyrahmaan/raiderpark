// ============================================================
// LOCATION PERMISSION SCREEN
// Premium iOS-first design for RaiderPark
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import {
  Colors,
  BorderRadius,
  Spacing,
  FontSize,
  FontWeight,
  Typography,
} from '@/constants/theme';

// Location benefits to show
const LOCATION_BENEFITS = [
  {
    id: 'auto_detect',
    iconName: 'navigate' as const,
    title: 'Auto-detect Parking',
    description: 'Know which lot you parked in automatically',
    color: Colors.ios.blue,
  },
  {
    id: 'predictions',
    iconName: 'bolt' as const,
    title: 'Better Predictions',
    description: 'Get more accurate parking availability forecasts',
    color: Colors.ios.orange,
  },
  {
    id: 'nearby',
    iconName: 'pin' as const,
    title: 'Find Nearby Spots',
    description: 'See open parking spots closest to you',
    color: Colors.ios.green,
  },
];

export default function LocationScreen() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const { setIsOnboarded, updateLocationEnabled } = useAuthStore();

  const requestLocationPermission = async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus === 'granted' ? 'granted' : 'denied');

      if (finalStatus === 'granted') {
        // Request background permission for better experience
        await Location.requestBackgroundPermissionsAsync();

        // Save location preference to backend
        try {
          await updateLocationEnabled(true);
        } catch (err) {
          console.error('Failed to save location preference:', err);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          completeOnboarding();
        }, 500);
      } else {
        // Save disabled preference
        try {
          await updateLocationEnabled(false);
        } catch (err) {
          console.error('Failed to save location preference:', err);
        }

        // Permission denied
        Alert.alert(
          'Location Access Denied',
          'You can enable location access later in Settings to get the full experience.',
          [
            {
              text: 'Continue Anyway',
              onPress: () => completeOnboarding(),
            },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to request location permission:', error);

      // Handle Expo Go limitation gracefully
      if (error?.message?.includes('NSLocation') || error?.message?.includes('Info.plist')) {
        Alert.alert(
          'Location Not Available',
          'Location services require a development build. You can still use the app without location features.',
          [
            {
              text: 'Continue Without Location',
              onPress: () => completeOnboarding(),
            },
          ]
        );
      } else {
        completeOnboarding();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const completeOnboarding = () => {
    setIsOnboarded(true);
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <Pressable onPress={handleBack} style={styles.backButton}>
          <SFIcon name="chevron-left" size={24} color={Colors.scarlet[500]} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        {/* Progress Indicator */}
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.progressContainer}
        >
          {[1, 2, 3, 4].map((step, index) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                index <= 3 ? styles.progressStepActive : styles.progressStepInactive,
              ]}
            />
          ))}
        </Animated.View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon and Title */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          style={styles.titleSection}
        >
          {/* Animated Location Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, styles.iconShadow]}>
              <SFIcon name="pin" size={48} color={Colors.ios.blue} />
            </View>
            {/* Pulse Effect Indicator */}
            <View style={styles.iconBadge}>
              <SFIcon name="navigate" size={12} color={Colors.light.background} />
            </View>
          </View>

          <Text style={styles.title}>Enable Location</Text>
          <Text style={styles.subtitle}>
            Help us help you find the best parking
          </Text>
        </Animated.View>

        {/* Benefits List */}
        <View style={styles.benefitsList}>
          {LOCATION_BENEFITS.map((benefit, index) => (
            <Animated.View
              key={benefit.id}
              entering={FadeInUp.delay(200 + index * 100).duration(500)}
            >
              <Card variant="filled" padding="md" radius="lg">
                <View style={styles.benefitRow}>
                  <View
                    style={[
                      styles.benefitIconContainer,
                      { backgroundColor: `${benefit.color}15` },
                    ]}
                  >
                    <SFIcon name={benefit.iconName} size={24} color={benefit.color} />
                  </View>
                  <View style={styles.benefitTextContainer}>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>
                      {benefit.description}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>

        {/* Permission Status Feedback */}
        {permissionStatus === 'granted' && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.successFeedback}>
            <SFIcon name="checkmark" size={20} color={Colors.ios.green} style={styles.successIcon} />
            <Text style={styles.successText}>
              Location access enabled! You're ready to go.
            </Text>
          </Animated.View>
        )}

        {/* Privacy Notice */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          style={styles.privacyNoticeContainer}
        >
          <View style={styles.privacyNotice}>
            <SFIcon name="lock" size={18} color={Colors.gray[1]} style={styles.privacyIcon} />
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
              <Text style={styles.privacyDescription}>
                Location data is only used to improve your parking experience.{' '}
                We never share or sell your location data. You can disable this anytime in Settings.
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA}>
        <Animated.View entering={FadeInUp.delay(600).duration(600)}>
          <Button
            title="Enable Location Access"
            variant="primary"
            size="xl"
            fullWidth
            isLoading={isRequesting}
            onPress={requestLocationPermission}
            leftIcon={<SFIcon name="pin" size={20} color={Colors.light.background} />}
          />
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        </Animated.View>

        {/* iOS Permission Note */}
        {Platform.OS === 'ios' && (
          <Animated.View entering={FadeInUp.delay(700).duration(600)}>
            <Text style={styles.permissionNote}>
              Select "While Using the App" for basic features, or "Always" for auto-parking detection
            </Text>
          </Animated.View>
        )}
      </View>
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButtonText: {
    fontSize: FontSize.lg,
    color: Colors.scarlet[500],
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  progressStepActive: {
    backgroundColor: Colors.scarlet[500],
  },
  progressStepInactive: {
    backgroundColor: Colors.gray[5],
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  iconBackground: {
    backgroundColor: `${Colors.ios.blue}15`,
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShadow: {
    shadowColor: Colors.ios.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.ios.green,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  title: {
    fontSize: 30,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.gray[1],
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  benefitsList: {
    gap: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  benefitDescription: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  successFeedback: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: `${Colors.ios.green}15`,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    marginRight: Spacing.md,
  },
  successText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.ios.green,
    flex: 1,
  },
  privacyNoticeContainer: {
    marginTop: Spacing.lg,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.md,
  },
  privacyIcon: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  privacyDescription: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    lineHeight: 20,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    fontSize: FontSize.lg,
    color: Colors.gray[1],
    textAlign: 'center',
  },
  permissionNote: {
    fontSize: FontSize.xs,
    color: Colors.gray[3],
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
