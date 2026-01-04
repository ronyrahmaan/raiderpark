// ============================================================
// WELCOME SCREEN - ONBOARDING ENTRY POINT
// Premium iOS-first design for RaiderPark
// ============================================================

import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { MapPin, Car, Clock, Bell } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { setIsOnboarded } = useAuthStore();

  const handleGetStarted = () => {
    router.push('/auth/login');
  };

  const handleGuestMode = () => {
    // Set up guest mode and go to permit selection
    router.push('/onboarding/permit');
  };

  return (
    <View className="flex-1 bg-white">
      {/* Hero Illustration Area */}
      <View className="flex-1 relative">
        {/* Gradient Background */}
        <LinearGradient
          colors={['#FFE5E5', '#FFF5F5', '#FFFFFF']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Decorative Elements */}
        <View className="flex-1 items-center justify-center">
          {/* Floating Icons Animation */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(800)}
            style={styles.iconContainer}
          >
            <View className="flex-row justify-center items-center gap-8 mb-12">
              <View style={styles.floatingIcon}>
                <View className="bg-scarlet-100 p-4 rounded-2xl">
                  <MapPin size={32} color="#CC0000" strokeWidth={2} />
                </View>
              </View>
              <View style={[styles.floatingIcon, { marginTop: -20 }]}>
                <View className="bg-ios-green/10 p-4 rounded-2xl">
                  <Car size={32} color="#34C759" strokeWidth={2} />
                </View>
              </View>
              <View style={styles.floatingIcon}>
                <View className="bg-ios-blue/10 p-4 rounded-2xl">
                  <Clock size={32} color="#007AFF" strokeWidth={2} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Main Logo Area */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(800)}
            className="items-center px-8"
          >
            {/* Large Parking Icon */}
            <View className="mb-6">
              <View className="bg-scarlet-500 w-24 h-24 rounded-3xl items-center justify-center" style={styles.logoShadow}>
                <Text className="text-white text-5xl font-bold">P</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Content Area */}
      <SafeAreaView className="px-6 pb-4">
        <Animated.View
          entering={FadeInDown.delay(600).duration(800)}
          className="items-center mb-8"
        >
          {/* Brand Name */}
          <Text className="text-4xl font-bold tracking-tight mb-2">
            <Text className="text-scarlet-500">RAIDER</Text>
            <Text className="text-black"> PARK</Text>
          </Text>

          {/* Tagline */}
          <Text className="text-lg text-ios-gray text-center">
            Never circle a lot again
          </Text>
        </Animated.View>

        {/* Feature Pills */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(800)}
          className="flex-row flex-wrap justify-center gap-2 mb-10"
        >
          <FeaturePill icon={<MapPin size={14} color="#CC0000" />} text="Real-time availability" />
          <FeaturePill icon={<Bell size={14} color="#CC0000" />} text="Smart alerts" />
          <FeaturePill icon={<Clock size={14} color="#CC0000" />} text="Crowd predictions" />
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(800)}
          className="gap-3"
        >
          <Button
            title="Get Started with TTU Email"
            variant="primary"
            size="xl"
            fullWidth
            onPress={handleGetStarted}
            className="rounded-2xl"
          />

          <Button
            title="Continue as Guest"
            variant="ghost"
            size="lg"
            fullWidth
            onPress={handleGuestMode}
            textClassName="text-ios-gray"
          />
        </Animated.View>

        {/* Terms Notice */}
        <Animated.View
          entering={FadeInDown.delay(900).duration(800)}
          className="mt-4"
        >
          <Text className="text-xs text-ios-gray3 text-center leading-5">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ============================================================
// FEATURE PILL COMPONENT
// ============================================================

interface FeaturePillProps {
  icon: React.ReactNode;
  text: string;
}

function FeaturePill({ icon, text }: FeaturePillProps) {
  return (
    <View className="flex-row items-center bg-scarlet-50 px-3 py-2 rounded-full">
      <View className="mr-1.5">{icon}</View>
      <Text className="text-sm font-medium text-scarlet-700">{text}</Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  iconContainer: {
    position: 'absolute',
    top: height * 0.08,
  },
  floatingIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoShadow: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
