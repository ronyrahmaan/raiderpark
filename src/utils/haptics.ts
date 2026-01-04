/**
 * Haptic feedback utilities for iOS-native feel
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Light haptic feedback for selections
 */
export async function lightHaptic() {
  if (Platform.OS === 'ios') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Medium haptic feedback for confirmations
 */
export async function mediumHaptic() {
  if (Platform.OS === 'ios') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Heavy haptic feedback for important actions
 */
export async function heavyHaptic() {
  if (Platform.OS === 'ios') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/**
 * Success haptic feedback
 */
export async function successHaptic() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Warning haptic feedback
 */
export async function warningHaptic() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Error haptic feedback
 */
export async function errorHaptic() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Selection changed haptic
 */
export async function selectionHaptic() {
  await Haptics.selectionAsync();
}

/**
 * Button press haptic
 */
export const buttonHaptic = lightHaptic;

/**
 * Tab switch haptic
 */
export const tabSwitchHaptic = selectionHaptic;

/**
 * Pull to refresh haptic
 */
export const refreshHaptic = mediumHaptic;

/**
 * Submit/confirm action haptic
 */
export const confirmHaptic = successHaptic;
