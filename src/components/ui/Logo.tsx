// ============================================================
// RAIDERPARK LOGO COMPONENT
// Authentic Texas Tech Double-T with Parking theme
// ============================================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Rect, G, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'text';
  color?: string;
  showBackground?: boolean;
  style?: ViewStyle;
}

// ============================================================
// AUTHENTIC DOUBLE-T LOGO WITH PARKING THEME
// Based on Texas Tech University's iconic Double-T
// Smaller T overlaps the vertical bar of larger T
// ============================================================

export function Logo({
  size = 80,
  variant = 'icon',
  color = Colors.scarlet[500],
  showBackground = true,
  style,
}: LogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Defs>
          <LinearGradient id="scarletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.scarlet[500]} />
            <Stop offset="100%" stopColor={Colors.scarlet[600]} />
          </LinearGradient>
        </Defs>

        {/* Background */}
        {showBackground && (
          <Rect
            x="0"
            y="0"
            width="80"
            height="80"
            rx="18"
            fill="url(#scarletGradient)"
          />
        )}

        {/*
          Authentic TTU Double-T Design
          - Large T in back
          - Smaller T overlapping the vertical bar
          - Geometric serif style with distinctive serifs
        */}
        <G transform="translate(8, 8)">
          {/* LARGE T (Back) */}
          {/* Top horizontal bar with serifs */}
          <Path
            d="M4 8 L4 4 L60 4 L60 8 L60 16 L60 20 L36 20 L36 16 L56 16 L56 8 L8 8 L8 16 L28 16 L28 20 L4 20 L4 16 L4 8 Z"
            fill="#FFFFFF"
          />
          {/* Left serif extension */}
          <Rect x="4" y="4" width="8" height="4" fill="#FFFFFF" />
          {/* Right serif extension */}
          <Rect x="52" y="4" width="8" height="4" fill="#FFFFFF" />

          {/* Vertical bar of large T */}
          <Rect x="26" y="16" width="12" height="48" fill="#FFFFFF" />
          {/* Bottom serifs */}
          <Rect x="20" y="60" width="24" height="4" fill="#FFFFFF" />

          {/* SMALL T (Front/Overlapping) - positioned on the vertical bar */}
          {/* Small T horizontal bar */}
          <Rect x="16" y="26" width="32" height="6" fill="#FFFFFF" />
          {/* Small T left serif */}
          <Rect x="14" y="24" width="6" height="4" fill="#FFFFFF" />
          {/* Small T right serif */}
          <Rect x="44" y="24" width="6" height="4" fill="#FFFFFF" />

          {/* Shadow/depth line to show overlap */}
          <Rect x="16" y="32" width="10" height="1" fill={color} opacity="0.3" />
          <Rect x="38" y="32" width="10" height="1" fill={color} opacity="0.3" />
        </G>

        {/* Parking "P" Badge - bottom right corner */}
        <G transform="translate(52, 52)">
          <Circle cx="12" cy="12" r="12" fill="#FFFFFF" />
          <Circle cx="12" cy="12" r="10" fill={color} />
          <Path
            d="M8 6 L8 18 L10 18 L10 14 L13 14 C16 14 18 12.5 18 10 C18 7.5 16 6 13 6 L8 6 Z M10 8 L12 8 C14 8 15 8.8 15 10 C15 11.2 14 12 12 12 L10 12 Z"
            fill="#FFFFFF"
          />
        </G>
      </Svg>
    </View>
  );
}

// ============================================================
// DOUBLE-T PARK LOGO (Alternate - T + P Combined)
// The Double-T with "PARK" integrated
// ============================================================

export function LogoDoubleTWithP({
  size = 80,
  showBackground = true,
  style,
}: Omit<LogoProps, 'variant' | 'color'>) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Defs>
          <LinearGradient id="dtpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.scarlet[500]} />
            <Stop offset="100%" stopColor={Colors.scarlet[600]} />
          </LinearGradient>
        </Defs>

        {/* Background */}
        {showBackground && (
          <Rect x="0" y="0" width="80" height="80" rx="18" fill="url(#dtpGradient)" />
        )}

        {/* Authentic Double-T */}
        <G transform="translate(6, 10)">
          {/* Large T - horizontal bar */}
          <Rect x="2" y="2" width="44" height="10" fill="#FFFFFF" />
          {/* Large T - serifs */}
          <Rect x="0" y="0" width="6" height="4" fill="#FFFFFF" />
          <Rect x="42" y="0" width="6" height="4" fill="#FFFFFF" />
          {/* Large T - vertical */}
          <Rect x="18" y="10" width="12" height="50" fill="#FFFFFF" />
          {/* Large T - bottom serifs */}
          <Rect x="12" y="56" width="24" height="4" fill="#FFFFFF" />

          {/* Small T overlay */}
          <Rect x="10" y="20" width="28" height="6" fill="#FFFFFF" />
          <Rect x="8" y="18" width="5" height="4" fill="#FFFFFF" />
          <Rect x="35" y="18" width="5" height="4" fill="#FFFFFF" />
        </G>

        {/* P for PARK - right side */}
        <G transform="translate(52, 20)">
          <Path
            d="M2 4 L2 40 L8 40 L8 26 L14 26 C22 26 26 21 26 15 C26 9 22 4 14 4 L2 4 Z M8 9 L12 9 C17 9 20 11 20 15 C20 19 17 21 12 21 L8 21 Z"
            fill="#FFFFFF"
          />
        </G>
      </Svg>
    </View>
  );
}

// ============================================================
// SIMPLE P LOGO (For smaller contexts)
// ============================================================

export function LogoP({
  size = 80,
  showBackground = true,
  style,
}: Omit<LogoProps, 'variant' | 'color'>) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Defs>
          <LinearGradient id="pGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.scarlet[500]} />
            <Stop offset="100%" stopColor={Colors.scarlet[600]} />
          </LinearGradient>
        </Defs>

        {/* Background */}
        {showBackground && (
          <Rect x="0" y="0" width="80" height="80" rx="18" fill="url(#pGradient)" />
        )}

        {/* P Letter with parking lines */}
        <Path
          d="M20 12 L20 68 L32 68 L32 48 L44 48 C56 48 64 40 64 32 C64 24 56 12 44 12 L20 12 Z M32 24 L40 24 C48 24 52 27 52 32 C52 37 48 40 40 40 L32 40 Z"
          fill="#FFFFFF"
        />

        {/* Subtle parking space lines emanating from P */}
        <Rect x="56" y="20" width="12" height="2" rx="1" fill="#FFFFFF" opacity="0.4" />
        <Rect x="58" y="28" width="14" height="2" rx="1" fill="#FFFFFF" opacity="0.3" />
        <Rect x="56" y="36" width="12" height="2" rx="1" fill="#FFFFFF" opacity="0.4" />
      </Svg>
    </View>
  );
}

// ============================================================
// DOUBLE-T ONLY (Clean, no parking badge)
// ============================================================

export function LogoDoubleT({
  size = 80,
  showBackground = true,
  style,
}: Omit<LogoProps, 'variant' | 'color'>) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Defs>
          <LinearGradient id="dtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.scarlet[500]} />
            <Stop offset="100%" stopColor={Colors.scarlet[600]} />
          </LinearGradient>
        </Defs>

        {/* Background */}
        {showBackground && (
          <Rect x="0" y="0" width="80" height="80" rx="18" fill="url(#dtGradient)" />
        )}

        {/* Authentic TTU Double-T */}
        <G transform="translate(10, 8)">
          {/* LARGE T */}
          {/* Horizontal bar */}
          <Rect x="0" y="4" width="60" height="12" fill="#FFFFFF" />
          {/* Top serifs */}
          <Rect x="0" y="0" width="8" height="6" fill="#FFFFFF" />
          <Rect x="52" y="0" width="8" height="6" fill="#FFFFFF" />
          {/* Vertical bar */}
          <Rect x="24" y="14" width="12" height="52" fill="#FFFFFF" />
          {/* Bottom serifs */}
          <Rect x="16" y="62" width="28" height="6" fill="#FFFFFF" />

          {/* SMALL T (overlapping) */}
          {/* Horizontal bar */}
          <Rect x="10" y="24" width="40" height="8" fill="#FFFFFF" />
          {/* Top serifs */}
          <Rect x="8" y="22" width="6" height="4" fill="#FFFFFF" />
          <Rect x="46" y="22" width="6" height="4" fill="#FFFFFF" />

          {/* Subtle shadow to show depth */}
          <Rect x="10" y="32" width="14" height="1.5" fill={Colors.scarlet[500]} opacity="0.25" />
          <Rect x="36" y="32" width="14" height="1.5" fill={Colors.scarlet[500]} opacity="0.25" />
        </G>
      </Svg>
    </View>
  );
}

// ============================================================
// PARKING ICON (For map markers and small uses)
// ============================================================

export function ParkingIcon({
  size = 32,
  color = Colors.scarlet[500],
  style,
}: {
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Rect x="0" y="0" width="32" height="32" rx="8" fill={color} />
        <Path
          d="M10 6 L10 26 L14 26 L14 19 L18 19 C23 19 26 16 26 13 C26 10 23 6 18 6 L10 6 Z M14 10 L17 10 C20 10 22 11 22 13 C22 15 20 16 17 16 L14 16 Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

// ============================================================
// SPLASH LOGO (For splash screen)
// ============================================================

export function SplashLogo({ size = 120 }: { size?: number }) {
  return (
    <View style={[styles.splashContainer, { width: size, height: size }]}>
      <Logo size={size} showBackground={true} />
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.scarlet[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default Logo;
