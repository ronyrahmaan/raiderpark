// ============================================================
// AUTH STACK NAVIGATOR
// RaiderPark Authentication Flow
// ============================================================

import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        presentation: 'card',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
