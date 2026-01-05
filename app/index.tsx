import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { session, isOnboarded, isLoading } = useAuthStore();

  // Show loading indicator while initializing
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.scarlet.DEFAULT} />
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
});
