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
import {
  Bell,
  BellRing,
  CalendarClock,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Notification benefits to show
const NOTIFICATION_BENEFITS = [
  {
    id: 'events',
    icon: CalendarClock,
    title: 'Event Closures',
    description: 'Know when lots close for games or events before you leave',
    color: '#FF9500',
  },
  {
    id: 'filling',
    icon: AlertTriangle,
    title: 'Lot Filling Alerts',
    description: 'Get notified when your preferred lots are filling up fast',
    color: '#FF3B30',
  },
  {
    id: 'reminders',
    icon: Clock,
    title: 'Departure Reminders',
    description: 'Never get a ticket from time-limited parking spots',
    color: '#007AFF',
  },
];

export default function NotificationsScreen() {
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
        // Success - navigate after brief delay for feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          router.push('/onboarding/location');
        }, 500);
      } else {
        // Permission denied - still allow them to continue
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
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          className="flex-row items-center -ml-2 mb-4"
        >
          <ChevronLeft size={24} color="#CC0000" />
          <Text className="text-base text-scarlet-500">Back</Text>
        </Pressable>

        {/* Progress Indicator */}
        <Animated.View
          entering={FadeInDown.duration(600)}
          className="flex-row gap-2 mb-6"
        >
          {[1, 2, 3, 4].map((step, index) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${
                index <= 2 ? 'bg-scarlet-500' : 'bg-ios-gray5'
              }`}
            />
          ))}
        </Animated.View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6">
        {/* Icon and Title */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          className="items-center mb-8"
        >
          {/* Animated Bell Icon */}
          <View className="relative mb-6">
            <View className="bg-scarlet-100 w-24 h-24 rounded-3xl items-center justify-center" style={styles.iconShadow}>
              <BellRing size={48} color="#CC0000" strokeWidth={1.5} />
            </View>
            {/* Notification Badge */}
            <View className="absolute -top-1 -right-1 bg-ios-red w-6 h-6 rounded-full items-center justify-center border-2 border-white">
              <Text className="text-white text-xs font-bold">3</Text>
            </View>
          </View>

          <Text className="text-3xl font-bold text-black text-center mb-2">
            Stay in the Loop
          </Text>
          <Text className="text-base text-ios-gray text-center px-4">
            Get real-time updates about parking at TTU
          </Text>
        </Animated.View>

        {/* Benefits List */}
        <View className="gap-3">
          {NOTIFICATION_BENEFITS.map((benefit, index) => (
            <Animated.View
              key={benefit.id}
              entering={FadeInUp.delay(200 + index * 100).duration(500)}
            >
              <Card variant="filled" padding="md" radius="lg">
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: `${benefit.color}15` }}
                  >
                    <benefit.icon size={24} color={benefit.color} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-black">
                      {benefit.title}
                    </Text>
                    <Text className="text-sm text-ios-gray mt-0.5">
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
          <Animated.View
            entering={FadeIn.duration(400)}
            className="mt-4 p-4 bg-ios-green/10 rounded-xl flex-row items-center"
          >
            <Bell size={20} color="#34C759" className="mr-3" />
            <Text className="text-sm font-medium text-ios-green flex-1">
              Notifications enabled! You're all set.
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA} className="px-6 pt-4 pb-6 bg-white border-t border-ios-gray5">
        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
          <Button
            title="Enable Notifications"
            variant="primary"
            size="xl"
            fullWidth
            isLoading={isRequesting}
            onPress={requestNotificationPermission}
            className="rounded-2xl"
            leftIcon={<Bell size={20} color="#FFFFFF" />}
          />
          <Pressable onPress={handleSkip} className="mt-3 py-2">
            <Text className="text-base text-ios-gray text-center">Maybe Later</Text>
          </Pressable>
        </Animated.View>

        {/* iOS Permission Note */}
        {Platform.OS === 'ios' && (
          <Animated.View entering={FadeInUp.delay(600).duration(600)}>
            <Text className="text-xs text-ios-gray3 text-center mt-3">
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
  bottomCTA: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  iconShadow: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
});
