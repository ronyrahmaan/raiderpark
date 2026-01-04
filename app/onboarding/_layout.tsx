// ============================================================
// ONBOARDING STACK NAVIGATOR
// RaiderPark Onboarding Flow
// ============================================================

import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          // Welcome screen - no back gesture
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="permit"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="location"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
