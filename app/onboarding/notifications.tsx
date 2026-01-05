// ============================================================
// NOTIFICATIONS PERMISSION SCREEN
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
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import * as Notifications from 'expo-notifications';
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
} from '@/constants/theme';

// Notification benefits to show
const NOTIFICATION_BENEFITS = [
  {
    id: 'events',
    iconName: 'calendar' as const,
    title: 'Event Closures',
    description: 'Know when lots close for games or events before you leave',
    color: Colors.ios.orange,
  },
  {
    id: 'filling',
    iconName: 'alert' as const,
    title: 'Lot Filling Alerts',
    description: 'Get notified when your preferred lots are filling up fast',
    color: Colors.ios.red,
  },
  {
    id: 'reminders',
    iconName: 'clock' as const,
    title: 'Departure Reminders',
    description: 'Never get a ticket from time-limited parking spots',
    color: Colors.ios.blue,
  },
];

export default function NotificationsScreen() {
  const { updateNotificationPreferences } = useAuthStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  const requestNotificationPermission = async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus === 'granted' ? 'granted' : 'denied');

      if (finalStatus === 'granted') {
        // Save notification preferences to backend
        try {
          await updateNotificationPreferences({
            departure_reminders: true,
            lot_filling: true,
            spot_opening: true,
            event_closures: true,
            tower_icing: true,
            time_limit_warnings: true,
            weekly_summary: true,
          });
        } catch (err) {
          console.error('Failed to save notification preferences:', err);
          // Continue anyway - preferences can be updated later
        }

        // Success - navigate after brief delay for feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          router.push('/onboarding/location');
        }, 500);
      } else {
        // Permission denied - save disabled preferences
        try {
          await updateNotificationPreferences({
            departure_reminders: false,
            lot_filling: false,
            spot_opening: false,
            event_closures: false,
            tower_icing: false,
            time_limit_warnings: false,
            weekly_summary: false,
          });
        } catch (err) {
          console.error('Failed to save notification preferences:', err);
        }

        // Still allow them to continue
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in Settings.',
          [
            {
              text: 'Continue Anyway',
              onPress: () => router.push('/onboarding/location'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      router.push('/onboarding/location');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/location');
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
                index <= 2 ? styles.progressStepActive : styles.progressStepInactive,
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
          {/* Animated Bell Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, styles.iconShadow]}>
              <SFIcon name="bell" size={48} color={Colors.scarlet[500]} />
            </View>
            {/* Notification Badge */}
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>3</Text>
            </View>
          </View>

          <Text style={styles.title}>Stay in the Loop</Text>
          <Text style={styles.subtitle}>
            Get real-time updates about parking at TTU
          </Text>
        </Animated.View>

        {/* Benefits List */}
        <View style={styles.benefitsList}>
          {NOTIFICATION_BENEFITS.map((benefit, index) => (
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
            <SFIcon name="bell" size={20} color={Colors.ios.green} style={styles.successIcon} />
            <Text style={styles.successText}>
              Notifications enabled! You're all set.
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA}>
        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
          <Button
            title="Enable Notifications"
            variant="primary"
            size="xl"
            fullWidth
            isLoading={isRequesting}
            onPress={requestNotificationPermission}
            leftIcon={<SFIcon name="bell" size={20} color={Colors.light.background} />}
          />
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Maybe Later</Text>
          </Pressable>
        </Animated.View>

        {/* iOS Permission Note */}
        {Platform.OS === 'ios' && (
          <Animated.View entering={FadeInUp.delay(600).duration(600)}>
            <Text style={styles.permissionNote}>
              When prompted, tap "Allow" to receive notifications
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
    backgroundColor: Colors.scarlet[100],
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShadow: {
    shadowColor: Colors.scarlet[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.ios.red,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  iconBadgeText: {
    color: Colors.light.background,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
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
