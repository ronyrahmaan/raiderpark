// ============================================================
// SETTINGS STACK NAVIGATOR
// RaiderPark Settings Sub-Screens
// ============================================================

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '@/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Settings',
        headerTintColor: Colors.scarlet.DEFAULT,
        headerStyle: {
          backgroundColor: Colors.gray[6],
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: '#000000',
        },
        headerShadowVisible: false,
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        contentStyle: { backgroundColor: Colors.gray[6] },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="permit"
        options={{
          title: 'Permit Type',
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          title: 'Class Schedule',
        }}
      />
    </Stack>
  );
}
