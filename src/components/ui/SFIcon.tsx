// ============================================================
// SF SYMBOL ICON COMPONENT
// Native iOS SF Symbols with Android fallback
// Uses expo-symbols when available (dev build), Ionicons otherwise
// ============================================================

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Try to import expo-symbols - it may not be available in Expo Go
let SymbolView: any = null;
let symbolsAvailable = false;

try {
  const expoSymbols = require('expo-symbols');
  SymbolView = expoSymbols.SymbolView;
  // Check if the native module is actually available
  symbolsAvailable = SymbolView != null && Platform.OS === 'ios';
} catch (e) {
  // expo-symbols not available (running in Expo Go)
  symbolsAvailable = false;
}

type SymbolWeight = 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';

// Map of our icon names to SF Symbol names
const SF_SYMBOL_MAP: Record<string, string> = {
  // Navigation
  'home': 'house.fill',
  'home-outline': 'house',
  'map': 'map.fill',
  'map-outline': 'map',
  'location': 'location.fill',
  'location-outline': 'location',
  'navigate': 'location.north.fill',
  'compass': 'safari.fill',

  // Parking & Cars
  'car': 'car.fill',
  'car-outline': 'car',
  'parking': 'parkingsign',
  'parking-circle': 'parkingsign.circle.fill',

  // Status & Alerts
  'alert': 'exclamationmark.triangle.fill',
  'alert-outline': 'exclamationmark.triangle',
  'warning': 'exclamationmark.triangle.fill',
  'info': 'info.circle.fill',
  'info-outline': 'info.circle',
  'checkmark': 'checkmark.circle.fill',
  'checkmark-outline': 'checkmark.circle',
  'close': 'xmark.circle.fill',
  'close-outline': 'xmark.circle',
  'xmark': 'xmark',

  // Time & Calendar
  'clock': 'clock.fill',
  'clock-outline': 'clock',
  'calendar': 'calendar',
  'calendar-fill': 'calendar.circle.fill',
  'timer': 'timer',

  // Notifications
  'bell': 'bell.fill',
  'bell-outline': 'bell',
  'bell-badge': 'bell.badge.fill',

  // Settings & Profile
  'settings': 'gearshape.fill',
  'settings-outline': 'gearshape',
  'person': 'person.fill',
  'person-outline': 'person',
  'person-circle': 'person.circle.fill',
  'person-circle-outline': 'person.circle',
  'person-2': 'person.2.fill',
  'shield': 'shield.fill',
  'lock': 'lock.fill',
  'lock-outline': 'lock',

  // Actions
  'share': 'square.and.arrow.up',
  'refresh': 'arrow.clockwise',
  'search': 'magnifyingglass',
  'filter': 'line.3.horizontal.decrease.circle.fill',
  'plus': 'plus.circle.fill',
  'minus': 'minus.circle.fill',
  'edit': 'pencil',
  'trash': 'trash.fill',
  'dollarsign': 'dollarsign.circle.fill',
  'creditcard': 'creditcard.fill',
  'doc-text': 'doc.text.fill',
  'exclamationmark-triangle': 'exclamationmark.triangle.fill',

  // Arrows & Chevrons
  'chevron-right': 'chevron.right',
  'chevron-left': 'chevron.left',
  'chevron-up': 'chevron.up',
  'chevron-down': 'chevron.down',
  'arrow-up': 'arrow.up',
  'arrow-down': 'arrow.down',
  'arrow-right': 'arrow.right',
  'arrow-left': 'arrow.left',
  'trending-up': 'arrow.up.right',
  'trending-down': 'arrow.down.right',

  // Transportation
  'bus': 'bus.fill',
  'bus-outline': 'bus',
  'walk': 'figure.walk',
  'figure-walk': 'figure.walk',
  'figure-roll': 'figure.roll',
  'bicycle': 'bicycle',

  // Weather
  'snow': 'snowflake',
  'sun': 'sun.max.fill',
  'cloud': 'cloud.fill',
  'rain': 'cloud.rain.fill',

  // Stats & Charts
  'chart': 'chart.bar.fill',
  'chart-outline': 'chart.bar',
  'stats': 'chart.pie.fill',
  'trophy': 'trophy.fill',
  'star': 'star.fill',
  'star-outline': 'star',
  'flame': 'flame.fill',

  // Communication
  'message': 'message.fill',
  'mail': 'envelope.fill',
  'phone': 'phone.fill',

  // Misc
  'pin': 'mappin',
  'pin-fill': 'mappin.circle.fill',
  'flag': 'flag.fill',
  'bookmark': 'bookmark.fill',
  'heart': 'heart.fill',
  'heart-outline': 'heart',
  'eye': 'eye.fill',
  'eye-off': 'eye.slash.fill',
  'ticket': 'ticket.fill',
  'gift': 'gift.fill',
  'bolt': 'bolt.fill',
  'target': 'scope',

  // Buildings
  'building': 'building.2.fill',
  'building-2': 'building.2.fill',

  // Additional Status
  'checkmark-circle-fill': 'checkmark.circle.fill',
  'xmark-circle-fill': 'xmark.circle.fill',
  'plus-circle': 'plus.circle.fill',

  // Time of Day
  'sunrise': 'sunrise.fill',
  'sun-max': 'sun.max.fill',
  'moon': 'moon.fill',
  'moon-outline': 'moon',

  // Utilities
  'lightbulb': 'lightbulb.fill',
  'lightbulb-outline': 'lightbulb',
  'link': 'link',
  'link-circle': 'link.circle.fill',
};

// Map to Ionicons for Android fallback
const IONICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Navigation
  'home': 'home',
  'home-outline': 'home-outline',
  'map': 'map',
  'map-outline': 'map-outline',
  'location': 'location',
  'location-outline': 'location-outline',
  'navigate': 'navigate',
  'compass': 'compass',

  // Parking & Cars
  'car': 'car',
  'car-outline': 'car-outline',
  'parking': 'car',
  'parking-circle': 'car',

  // Status & Alerts
  'alert': 'alert',
  'alert-outline': 'alert-outline',
  'warning': 'warning',
  'info': 'information-circle',
  'info-outline': 'information-circle-outline',
  'checkmark': 'checkmark-circle',
  'checkmark-outline': 'checkmark-circle-outline',
  'close': 'close-circle',
  'close-outline': 'close-circle-outline',
  'xmark': 'close',

  // Time & Calendar
  'clock': 'time',
  'clock-outline': 'time-outline',
  'calendar': 'calendar',
  'calendar-fill': 'calendar',
  'timer': 'timer',

  // Notifications
  'bell': 'notifications',
  'bell-outline': 'notifications-outline',
  'bell-badge': 'notifications',

  // Settings & Profile
  'settings': 'settings',
  'settings-outline': 'settings-outline',
  'person': 'person',
  'person-outline': 'person-outline',
  'person-circle': 'person-circle',
  'person-circle-outline': 'person-circle-outline',
  'person-2': 'people',
  'shield': 'shield-checkmark',
  'lock': 'lock-closed',
  'lock-outline': 'lock-closed-outline',

  // Actions
  'share': 'share',
  'refresh': 'refresh',
  'search': 'search',
  'filter': 'filter',
  'plus': 'add-circle',
  'minus': 'remove-circle',
  'edit': 'pencil',
  'trash': 'trash',
  'dollarsign': 'cash',
  'creditcard': 'card',
  'doc-text': 'document-text',
  'exclamationmark-triangle': 'warning',

  // Arrows & Chevrons
  'chevron-right': 'chevron-forward',
  'chevron-left': 'chevron-back',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'arrow-right': 'arrow-forward',
  'arrow-left': 'arrow-back',
  'trending-up': 'trending-up',
  'trending-down': 'trending-down',

  // Transportation
  'bus': 'bus',
  'bus-outline': 'bus-outline',
  'walk': 'walk',
  'figure-walk': 'walk',
  'figure-roll': 'accessibility',
  'bicycle': 'bicycle',

  // Weather
  'snow': 'snow',
  'sun': 'sunny',
  'cloud': 'cloud',
  'rain': 'rainy',

  // Stats & Charts
  'chart': 'bar-chart',
  'chart-outline': 'bar-chart-outline',
  'stats': 'stats-chart',
  'trophy': 'trophy',
  'star': 'star',
  'star-outline': 'star-outline',
  'flame': 'flame',

  // Communication
  'message': 'chatbubble',
  'mail': 'mail',
  'phone': 'call',

  // Misc
  'pin': 'pin',
  'pin-fill': 'pin',
  'flag': 'flag',
  'bookmark': 'bookmark',
  'heart': 'heart',
  'heart-outline': 'heart-outline',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'ticket': 'ticket',
  'gift': 'gift',
  'bolt': 'flash',
  'target': 'locate',

  // Buildings
  'building': 'business',
  'building-2': 'business',

  // Additional Status
  'checkmark-circle-fill': 'checkmark-circle',
  'xmark-circle-fill': 'close-circle',
  'plus-circle': 'add-circle',

  // Time of Day
  'sunrise': 'sunny',
  'sun-max': 'sunny',
  'moon': 'moon',
  'moon-outline': 'moon-outline',

  // Utilities
  'lightbulb': 'bulb',
  'lightbulb-outline': 'bulb-outline',
  'link': 'link',
  'link-circle': 'link',
};

export interface SFIconProps {
  name: keyof typeof SF_SYMBOL_MAP;
  size?: number;
  color?: string;
  weight?: SymbolWeight;
  style?: any;
}

export function SFIcon({
  name,
  size = 24,
  color = '#000000',
  weight = 'regular',
  style,
}: SFIconProps) {
  // Use native SF Symbols when available (dev build on iOS)
  if (symbolsAvailable && SymbolView) {
    const sfSymbolName = SF_SYMBOL_MAP[name] || 'questionmark.circle';

    return (
      <SymbolView
        name={sfSymbolName as any}
        size={size}
        tintColor={color}
        weight={weight}
        style={style}
      />
    );
  }

  // Fallback to Ionicons (Android, or iOS in Expo Go)
  const ioniconName = IONICON_MAP[name] || 'help-circle';

  return (
    <Ionicons
      name={ioniconName}
      size={size}
      color={color}
      style={style}
    />
  );
}

// Export the icon names for type safety
export type SFIconName = keyof typeof SF_SYMBOL_MAP;

// Helper to get all available icon names
export const SF_ICON_NAMES = Object.keys(SF_SYMBOL_MAP) as SFIconName[];
