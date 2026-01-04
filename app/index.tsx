import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, isOnboarded, isLoading } = useAuthStore();

  // Show loading indicator while initializing
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#CC0000" />
      </View>
    );
  }

  // Not authenticated -> Go to onboarding/auth
  if (!session) {
    return <Redirect href="/onboarding" />;
  }

  // Authenticated but not onboarded -> Go to permit selection
  if (!isOnboarded) {
    return <Redirect href="/onboarding/permit" />;
  }

  // Authenticated and onboarded -> Go to main app
  return <Redirect href="/(tabs)" />;
}
