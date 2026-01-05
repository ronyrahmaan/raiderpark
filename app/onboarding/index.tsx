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
import { SFIcon } from '@/components/ui/SFIcon';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/auth/login');
  };

  const handleGuestMode = () => {
    router.push('/onboarding/permit');
  };

  return (
    <View style={styles.container}>
      {/* Hero Illustration Area */}
      <View style={styles.heroSection}>
        {/* Gradient Background */}
        <LinearGradient
          colors={['#FFE5E5', '#FFF5F5', '#FFFFFF']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Decorative Elements */}
        <View style={styles.heroContent}>
          {/* Floating Icons Animation */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(800)}
            style={styles.iconContainer}
          >
            <View style={styles.iconsRow}>
              <View style={styles.floatingIcon}>
                <View style={[styles.iconBox, styles.iconBoxScarlet]}>
                  <SFIcon name="pin" size={32} color={Colors.scarlet[500]} />
                </View>
              </View>
              <View style={[styles.floatingIcon, styles.floatingIconOffset]}>
                <View style={[styles.iconBox, styles.iconBoxGreen]}>
                  <SFIcon name="car" size={32} color={Colors.ios.green} />
                </View>
              </View>
              <View style={styles.floatingIcon}>
                <View style={[styles.iconBox, styles.iconBoxBlue]}>
                  <SFIcon name="clock" size={32} color={Colors.ios.blue} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Main Logo Area */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(800)}
            style={styles.logoArea}
          >
            <View style={styles.logoContainer}>
              <Logo size={96} variant="icon" showBackground={true} />
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Content Area */}
      <SafeAreaView style={styles.contentArea}>
        <Animated.View
          entering={FadeInDown.delay(600).duration(800)}
          style={styles.brandingSection}
        >
          {/* Brand Name */}
          <Text style={styles.brandName}>
            <Text style={styles.brandScarlet}>RAIDER</Text>
            <Text style={styles.brandBlack}> PARK</Text>
          </Text>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Never circle a lot again
          </Text>
        </Animated.View>

        {/* Feature Pills */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(800)}
          style={styles.featurePillsContainer}
        >
          <FeaturePill icon={<SFIcon name="pin" size={14} color={Colors.scarlet[500]} />} text="Real-time availability" />
          <FeaturePill icon={<SFIcon name="bell" size={14} color={Colors.scarlet[500]} />} text="Smart alerts" />
          <FeaturePill icon={<SFIcon name="clock" size={14} color={Colors.scarlet[500]} />} text="Crowd predictions" />
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(800)}
          style={styles.buttonsContainer}
        >
          <Button
            title="Get Started with TTU Email"
            variant="primary"
            size="xl"
            fullWidth
            onPress={handleGetStarted}
            style={styles.primaryButton}
          />

          <Button
            title="Continue as Guest"
            variant="ghost"
            size="lg"
            fullWidth
            onPress={handleGuestMode}
            textStyle={styles.ghostButtonText}
          />
        </Animated.View>

        {/* Terms Notice */}
        <Animated.View
          entering={FadeInDown.delay(900).duration(800)}
          style={styles.termsContainer}
        >
          <Text style={styles.termsText}>
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
    <View style={styles.featurePill}>
      <View style={styles.featurePillIcon}>{icon}</View>
      <Text style={styles.featurePillText}>{text}</Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroSection: {
    flex: 1,
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    top: height * 0.08,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 48,
  },
  floatingIcon: {
    ...Shadows.md,
  },
  floatingIconOffset: {
    marginTop: -20,
  },
  iconBox: {
    padding: 16,
    borderRadius: BorderRadius.xl,
  },
  iconBoxScarlet: {
    backgroundColor: Colors.scarlet[100],
  },
  iconBoxGreen: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  iconBoxBlue: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  logoArea: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: Colors.scarlet[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  contentArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  brandScarlet: {
    color: Colors.scarlet[500],
  },
  brandBlack: {
    color: '#000000',
  },
  tagline: {
    fontSize: 18,
    color: Colors.gray[1],
    textAlign: 'center',
  },
  featurePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  featurePillIcon: {
    marginRight: 6,
  },
  featurePillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.scarlet[700],
  },
  buttonsContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
  },
  ghostButtonText: {
    color: Colors.gray[1],
  },
  termsContainer: {
    marginTop: 16,
  },
  termsText: {
    fontSize: 12,
    color: Colors.gray[3],
    textAlign: 'center',
    lineHeight: 20,
  },
});
