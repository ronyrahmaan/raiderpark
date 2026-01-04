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
import {
  MapPin,
  Navigation,
  Shield,
  Zap,
  Lock,
  ChevronLeft,
  Check,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

// Location benefits to show
const LOCATION_BENEFITS = [
  {
    id: 'auto_detect',
    icon: Navigation,
    title: 'Auto-detect Parking',
    description: 'Know which lot you parked in automatically',
    color: '#007AFF',
  },
  {
    id: 'predictions',
    icon: Zap,
    title: 'Better Predictions',
    description: 'Get more accurate parking availability forecasts',
    color: '#FF9500',
  },
  {
    id: 'nearby',
    icon: MapPin,
    title: 'Find Nearby Spots',
    description: 'See open parking spots closest to you',
    color: '#34C759',
  },
];

export default function LocationScreen() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const { setIsOnboarded } = useAuthStore();

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
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          completeOnboarding();
        }, 500);
      } else {
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
    } catch (error) {
      console.error('Failed to request location permission:', error);
      completeOnboarding();
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
                index <= 3 ? 'bg-scarlet-500' : 'bg-ios-gray5'
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
          {/* Animated Location Icon */}
          <View className="relative mb-6">
            <View className="bg-ios-blue/10 w-24 h-24 rounded-3xl items-center justify-center" style={styles.iconShadow}>
              <MapPin size={48} color="#007AFF" strokeWidth={1.5} />
            </View>
            {/* Pulse Effect Indicator */}
            <View className="absolute -top-1 -right-1 bg-ios-green w-6 h-6 rounded-full items-center justify-center border-2 border-white">
              <Navigation size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text className="text-3xl font-bold text-black text-center mb-2">
            Enable Location
          </Text>
          <Text className="text-base text-ios-gray text-center px-4">
            Help us help you find the best parking
          </Text>
        </Animated.View>

        {/* Benefits List */}
        <View className="gap-3">
          {LOCATION_BENEFITS.map((benefit, index) => (
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
            <Check size={20} color="#34C759" className="mr-3" />
            <Text className="text-sm font-medium text-ios-green flex-1">
              Location access enabled! You're ready to go.
            </Text>
          </Animated.View>
        )}

        {/* Privacy Notice */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          className="mt-6"
        >
          <View className="flex-row items-start p-4 bg-ios-gray6 rounded-xl">
            <Lock size={18} color="#8E8E93" className="mr-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-black mb-1">
                Your Privacy Matters
              </Text>
              <Text className="text-xs text-ios-gray leading-5">
                Location data is only used to improve your parking experience.{' '}
                We never share or sell your location data. You can disable this anytime in Settings.
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA} className="px-6 pt-4 pb-6 bg-white border-t border-ios-gray5">
        <Animated.View entering={FadeInUp.delay(600).duration(600)}>
          <Button
            title="Enable Location Access"
            variant="primary"
            size="xl"
            fullWidth
            isLoading={isRequesting}
            onPress={requestLocationPermission}
            className="rounded-2xl"
            leftIcon={<MapPin size={20} color="#FFFFFF" />}
          />
          <Pressable onPress={handleSkip} className="mt-3 py-2">
            <Text className="text-base text-ios-gray text-center">Skip for now</Text>
          </Pressable>
        </Animated.View>

        {/* iOS Permission Note */}
        {Platform.OS === 'ios' && (
          <Animated.View entering={FadeInUp.delay(700).duration(600)}>
            <Text className="text-xs text-ios-gray3 text-center mt-3">
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
  bottomCTA: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  iconShadow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
});
