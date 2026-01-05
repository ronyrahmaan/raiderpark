// ============================================================
// TOW EMERGENCY SCREEN
// Feature 4.6: What to do if towed, TTU impound info
// ============================================================

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// DATA
// ============================================================

const EMERGENCY_STEPS = [
  {
    step: 1,
    title: "Don't Panic",
    description: 'Take a deep breath. Your car is likely at the TTU impound lot, not stolen.',
    icon: 'heart',
  },
  {
    step: 2,
    title: 'Call TTU Police',
    description: 'Confirm your vehicle was towed and get impound location.',
    icon: 'phone',
    phone: '8067422222',
  },
  {
    step: 3,
    title: 'Gather Documents',
    description: "You'll need: Driver's license, vehicle registration, proof of insurance.",
    icon: 'doc-text',
  },
  {
    step: 4,
    title: 'Go to Impound Lot',
    description: 'Bring required documents and payment method.',
    icon: 'car',
  },
  {
    step: 5,
    title: 'Pay Fees & Retrieve',
    description: 'Pay tow and storage fees to get your vehicle back.',
    icon: 'creditcard',
  },
];

const FEE_INFO = {
  towFee: 150,
  storageFee: 25,
  storageNote: 'per day after first 24 hours',
  paymentMethods: ['Cash', 'Credit Card', 'Debit Card'],
};

const IMPOUND_INFO = {
  name: 'TTU Impound Lot',
  address: '413 Flint Ave, Lubbock, TX 79409',
  phone: '8067422222',
  hours: '24/7 for vehicle retrieval',
  policePhone: '8067422222',
};

const COMMON_TOW_REASONS = [
  'Parking in fire lane',
  'Blocking accessible space',
  'Parking in reserved space without authorization',
  'Multiple unpaid citations',
  'Parking during event closure',
  'Abandoned vehicle (72+ hours)',
  'Blocking traffic or driveway',
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function TowEmergencyScreen() {
  const router = useRouter();

  const handleCall = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleOpenMaps = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const address = encodeURIComponent(IMPOUND_INFO.address);
    Linking.openURL(`maps:0,0?q=${address}`);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tow Emergency</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Banner */}
        <Animated.View entering={FadeIn} style={styles.emergencyBanner}>
          <View style={styles.emergencyIcon}>
            <SFIcon name="exclamationmark-triangle" size={32} color={Colors.ios.red} />
          </View>
          <Text style={styles.emergencyTitle}>Car Towed?</Text>
          <Text style={styles.emergencySubtitle}>
            Here's exactly what to do to get it back.
          </Text>
          <TouchableOpacity
            style={styles.emergencyCallButton}
            onPress={() => handleCall(IMPOUND_INFO.policePhone)}
          >
            <SFIcon name="phone" size={20} color={Colors.light.background} />
            <Text style={styles.emergencyCallText}>Call TTU Police Now</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Step by Step Guide */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.sectionTitle}>STEP-BY-STEP GUIDE</Text>
          <View style={styles.stepsCard}>
            {EMERGENCY_STEPS.map((step, index) => (
              <View
                key={step.step}
                style={[
                  styles.stepItem,
                  index < EMERGENCY_STEPS.length - 1 && styles.stepItemBorder,
                ]}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <SFIcon name={step.icon as any} size={18} color={Colors.ios.blue} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDesc}>{step.description}</Text>
                  {step.phone && (
                    <TouchableOpacity
                      style={styles.stepPhoneButton}
                      onPress={() => handleCall(step.phone!)}
                    >
                      <Text style={styles.stepPhoneText}>
                        Call: ({step.phone.slice(0, 3)}) {step.phone.slice(3, 6)}-{step.phone.slice(6)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Impound Location */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.locationCard}>
          <Text style={styles.locationTitle}>IMPOUND LOCATION</Text>
          <View style={styles.locationUnderline} />

          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{IMPOUND_INFO.name}</Text>
            <TouchableOpacity
              style={styles.locationAddress}
              onPress={handleOpenMaps}
            >
              <SFIcon name="map" size={16} color={Colors.ios.blue} />
              <Text style={styles.locationAddressText}>{IMPOUND_INFO.address}</Text>
            </TouchableOpacity>
            <View style={styles.locationHours}>
              <SFIcon name="clock" size={16} color={Colors.gray[2]} />
              <Text style={styles.locationHoursText}>{IMPOUND_INFO.hours}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.directionsButton}
            onPress={handleOpenMaps}
          >
            <SFIcon name="arrow-triangle-turn-up-right-diamond" size={18} color={Colors.ios.blue} />
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Fee Information */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.feesCard}>
          <Text style={styles.feesTitle}>EXPECTED FEES</Text>
          <View style={styles.feesUnderline} />

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Tow Fee</Text>
            <Text style={styles.feeAmount}>${FEE_INFO.towFee}</Text>
          </View>
          <View style={styles.feeRow}>
            <View style={styles.feeLabelContainer}>
              <Text style={styles.feeLabel}>Storage Fee</Text>
              <Text style={styles.feeNote}>{FEE_INFO.storageNote}</Text>
            </View>
            <Text style={styles.feeAmount}>${FEE_INFO.storageFee}/day</Text>
          </View>

          <View style={styles.feeDivider} />

          <View style={styles.paymentMethods}>
            <Text style={styles.paymentTitle}>Accepted Payment:</Text>
            <View style={styles.paymentBadges}>
              {FEE_INFO.paymentMethods.map(method => (
                <View key={method} style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>{method}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* What to Bring */}
        <Animated.View entering={FadeInDown.delay(350)} style={styles.bringCard}>
          <Text style={styles.bringTitle}>WHAT TO BRING</Text>
          <View style={styles.bringUnderline} />
          <View style={styles.bringList}>
            <View style={styles.bringItem}>
              <SFIcon name="checkmark-circle" size={18} color={Colors.ios.green} />
              <Text style={styles.bringText}>Valid driver's license</Text>
            </View>
            <View style={styles.bringItem}>
              <SFIcon name="checkmark-circle" size={18} color={Colors.ios.green} />
              <Text style={styles.bringText}>Vehicle registration</Text>
            </View>
            <View style={styles.bringItem}>
              <SFIcon name="checkmark-circle" size={18} color={Colors.ios.green} />
              <Text style={styles.bringText}>Proof of insurance</Text>
            </View>
            <View style={styles.bringItem}>
              <SFIcon name="checkmark-circle" size={18} color={Colors.ios.green} />
              <Text style={styles.bringText}>Payment method</Text>
            </View>
          </View>
        </Animated.View>

        {/* Common Tow Reasons */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>COMMON TOW REASONS</Text>
          <View style={styles.reasonsUnderline} />
          <Text style={styles.reasonsSubtitle}>
            Understanding why helps prevent future tows:
          </Text>
          {COMMON_TOW_REASONS.map((reason, index) => (
            <View key={index} style={styles.reasonRow}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Pro Tips */}
        <Animated.View entering={FadeInDown.delay(450)} style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <SFIcon name="lightbulb" size={20} color={Colors.ios.orange} />
            <Text style={styles.tipsTitle}>Pro Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>
              • Take photos of where you parked and nearby signs
            </Text>
            <Text style={styles.tipItem}>
              • Note the time and date you parked
            </Text>
            <Text style={styles.tipItem}>
              • If wrongfully towed, you can dispute the charge
            </Text>
            <Text style={styles.tipItem}>
              • Get a receipt for all payments
            </Text>
          </View>
        </Animated.View>

        {/* Emergency Contacts */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>EMERGENCY CONTACTS</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handleCall('8067422222')}
          >
            <View style={styles.contactIcon}>
              <SFIcon name="shield" size={20} color={Colors.ios.blue} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>TTU Police</Text>
              <Text style={styles.contactPhone}>(806) 742-2222</Text>
            </View>
            <SFIcon name="phone" size={20} color={Colors.ios.green} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => handleCall('8067423811')}
          >
            <View style={styles.contactIcon}>
              <SFIcon name="car" size={20} color={Colors.ios.orange} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>Parking Services</Text>
              <Text style={styles.contactPhone}>(806) 742-3811</Text>
            </View>
            <SFIcon name="phone" size={20} color={Colors.ios.green} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Emergency Banner
  emergencyBanner: {
    backgroundColor: Colors.ios.red + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.ios.red + '20',
  },
  emergencyIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.red + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emergencyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ios.red,
    marginBottom: Spacing.xs,
  },
  emergencySubtitle: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.red,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  emergencyCallText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Section Title
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gray[1],
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Steps Card
  stepsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  stepItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  stepDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },
  stepPhoneButton: {
    marginTop: Spacing.sm,
  },
  stepPhoneText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },

  // Location Card
  locationCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  locationTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  locationUnderline: {
    width: 100,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  locationInfo: {
    marginBottom: Spacing.md,
  },
  locationName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  locationAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  locationAddressText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
  },
  locationHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationHoursText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ios.blue + '10',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  directionsButtonText: {
    color: Colors.ios.blue,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Fees Card
  feesCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  feesTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  feesUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  feeLabelContainer: {
    flex: 1,
  },
  feeLabel: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  feeNote: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  feeAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.ios.red,
  },
  feeDivider: {
    height: 1,
    backgroundColor: Colors.gray[5],
    marginVertical: Spacing.md,
  },
  paymentMethods: {
    gap: Spacing.sm,
  },
  paymentTitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  paymentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  paymentBadge: {
    backgroundColor: Colors.gray[5],
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  paymentBadgeText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },

  // Bring Card
  bringCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  bringTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  bringUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  bringList: {
    gap: Spacing.sm,
  },
  bringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bringText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },

  // Reasons Card
  reasonsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  reasonsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  reasonsUnderline: {
    width: 120,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  reasonsSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reasonBullet: {
    fontSize: FontSize.md,
    color: Colors.ios.red,
    marginRight: Spacing.sm,
  },
  reasonText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
  },
  tipsList: {
    gap: Spacing.xs,
  },
  tipItem: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },

  // Contacts Card
  contactsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  contactsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gray[1],
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[6],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  contactPhone: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
});
