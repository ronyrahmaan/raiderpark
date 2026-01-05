// ============================================================
// CITATION HELP SCREEN
// Feature 4.4: Violation info, fines, appeal process, deadlines
// ============================================================

import { useState, useCallback } from 'react';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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

interface Violation {
  code: string;
  description: string;
  fine: number;
  commonCause: string;
}

const VIOLATIONS: Violation[] = [
  {
    code: 'NO PERMIT',
    description: 'Parking without valid permit',
    fine: 50,
    commonCause: 'Forgot to hang permit or expired',
  },
  {
    code: 'WRONG LOT',
    description: 'Parking in lot not valid for permit type',
    fine: 35,
    commonCause: 'Parked in wrong zone before 2:30pm',
  },
  {
    code: 'EXPIRED METER',
    description: 'Overtime at paid parking',
    fine: 25,
    commonCause: 'Class ran late, forgot to add time',
  },
  {
    code: 'FIRE LANE',
    description: 'Parking in fire lane',
    fine: 100,
    commonCause: 'Quick drop-off that took too long',
  },
  {
    code: 'HANDICAP',
    description: 'Unauthorized handicap parking',
    fine: 250,
    commonCause: 'No placard displayed',
  },
  {
    code: 'RESERVED',
    description: 'Parking in reserved space',
    fine: 50,
    commonCause: 'Thought it was general parking',
  },
  {
    code: 'TIME LIMIT',
    description: 'Exceeded time limit (C11: 2 hours)',
    fine: 25,
    commonCause: 'Stayed too long at Rec Center',
  },
];

const APPEAL_STEPS = [
  {
    step: 1,
    title: 'Review Your Citation',
    description: 'Check violation details and take photos of any relevant evidence',
    deadline: 'Same day recommended',
  },
  {
    step: 2,
    title: 'File Appeal Online',
    description: 'Submit through TTU Transportation & Parking Services portal',
    deadline: 'Within 10 calendar days',
  },
  {
    step: 3,
    title: 'First Level Review',
    description: 'Staff reviews your appeal and supporting evidence',
    deadline: '5-7 business days',
  },
  {
    step: 4,
    title: 'Second Level (if needed)',
    description: 'Appeal to Parking Appeals Committee',
    deadline: 'Within 10 days of first decision',
  },
  {
    step: 5,
    title: 'Final Review (if needed)',
    description: 'Administrative review - final decision',
    deadline: 'Within 10 days of second decision',
  },
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function CitationHelpScreen() {
  const router = useRouter();
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);

  const handlePayOnline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('https://www.depts.ttu.edu/parking/citations/');
  }, []);

  const handleAppealOnline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('https://www.depts.ttu.edu/parking/citations/appeals.php');
  }, []);

  const handleCall = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:8067423811');
  }, []);

  const toggleViolation = useCallback((code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedViolation(prev => (prev === code ? null : code));
  }, []);

  // Check if December for Toys for Tickets
  const isDecember = new Date().getMonth() === 11;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Citation Help</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeIn} style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <SFIcon name="doc-text" size={32} color={Colors.ios.orange} />
          </View>
          <Text style={styles.heroTitle}>Got a Ticket?</Text>
          <Text style={styles.heroSubtitle}>
            Don't panic. Here's everything you need to know.
          </Text>
        </Animated.View>

        {/* Deadline Warning */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.deadlineCard}>
          <View style={styles.deadlineIcon}>
            <SFIcon name="exclamationmark-triangle" size={24} color={Colors.ios.red} />
          </View>
          <View style={styles.deadlineContent}>
            <Text style={styles.deadlineTitle}>10-Day Appeal Deadline</Text>
            <Text style={styles.deadlineText}>
              You must file an appeal within 10 calendar days of the citation date.
              After that, a $5 late fee is added.
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePayOnline}>
            <SFIcon name="creditcard" size={20} color={Colors.light.background} />
            <Text style={styles.actionButtonText}>Pay Online</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={handleAppealOnline}
          >
            <SFIcon name="doc-text" size={20} color={Colors.ios.blue} />
            <Text style={styles.actionButtonTextSecondary}>File Appeal</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Toys for Tickets */}
        {isDecember && (
          <Animated.View entering={FadeInDown.delay(175)} style={styles.toysCard}>
            <Text style={styles.toysEmoji}>🎁</Text>
            <View style={styles.toysContent}>
              <Text style={styles.toysTitle}>Toys for Tickets!</Text>
              <Text style={styles.toysText}>
                December only: Donate an unwrapped toy worth $10+ to dismiss
                eligible citations. Visit the parking office for details.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Common Violations */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>COMMON VIOLATIONS & FINES</Text>
          {VIOLATIONS.map((violation, index) => (
            <Animated.View
              key={violation.code}
              entering={FadeInDown.delay(250 + index * 30)}
            >
              <TouchableOpacity
                style={styles.violationCard}
                onPress={() => toggleViolation(violation.code)}
                activeOpacity={0.7}
              >
                <View style={styles.violationHeader}>
                  <View style={styles.violationInfo}>
                    <Text style={styles.violationCode}>{violation.code}</Text>
                    <Text style={styles.violationDesc}>{violation.description}</Text>
                  </View>
                  <View style={styles.violationFine}>
                    <Text style={styles.violationFineAmount}>${violation.fine}</Text>
                  </View>
                </View>
                {expandedViolation === violation.code && (
                  <View style={styles.violationExpanded}>
                    <View style={styles.violationExpandedRow}>
                      <SFIcon name="info-circle" size={14} color={Colors.gray[2]} />
                      <Text style={styles.violationExpandedText}>
                        Common cause: {violation.commonCause}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Appeal Process */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.appealSection}>
          <Text style={styles.sectionTitle}>APPEAL PROCESS</Text>
          <View style={styles.appealCard}>
            {APPEAL_STEPS.map((step, index) => (
              <View
                key={step.step}
                style={[
                  styles.appealStep,
                  index < APPEAL_STEPS.length - 1 && styles.appealStepBorder,
                ]}
              >
                <View style={styles.appealStepNumber}>
                  <Text style={styles.appealStepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.appealStepContent}>
                  <Text style={styles.appealStepTitle}>{step.title}</Text>
                  <Text style={styles.appealStepDesc}>{step.description}</Text>
                  <View style={styles.appealStepDeadline}>
                    <SFIcon name="clock" size={12} color={Colors.ios.orange} />
                    <Text style={styles.appealStepDeadlineText}>{step.deadline}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Tips for Successful Appeal */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>APPEAL TIPS</Text>
          <View style={styles.tipsUnderline} />
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>Take photos of your permit and the parking sign</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>Note the exact time and circumstances</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>Be polite and factual in your appeal</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>Include any evidence of unclear signage</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>First-time offenses often get reduced</Text>
            </View>
          </View>
        </Animated.View>

        {/* Contact Info */}
        <Animated.View entering={FadeInDown.delay(550)} style={styles.contactCard}>
          <Text style={styles.contactTitle}>NEED HELP?</Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
            <SFIcon name="phone" size={20} color={Colors.ios.green} />
            <View style={styles.contactButtonContent}>
              <Text style={styles.contactButtonTitle}>Call Parking Services</Text>
              <Text style={styles.contactButtonNumber}>(806) 742-3811</Text>
            </View>
            <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
          </TouchableOpacity>
          <Text style={styles.contactHours}>
            Hours: Mon-Fri 7:45am - 4:45pm
          </Text>
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

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.orange + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
  },

  // Deadline Warning
  deadlineCard: {
    flexDirection: 'row',
    backgroundColor: Colors.ios.red + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.red + '20',
  },
  deadlineIcon: {
    marginRight: Spacing.md,
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.ios.red,
    marginBottom: 4,
  },
  deadlineText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.ios.blue,
  },
  actionButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  actionButtonTextSecondary: {
    color: Colors.ios.blue,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Toys for Tickets
  toysCard: {
    flexDirection: 'row',
    backgroundColor: Colors.ios.green + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.ios.green + '20',
  },
  toysEmoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  toysContent: {
    flex: 1,
  },
  toysTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
    marginBottom: 4,
  },
  toysText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
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

  // Violations
  violationCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  violationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  violationInfo: {
    flex: 1,
  },
  violationCode: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  violationDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  violationFine: {
    backgroundColor: Colors.ios.red + '10',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  violationFineAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.ios.red,
  },
  violationExpanded: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  violationExpandedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  violationExpandedText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
    lineHeight: 20,
  },

  // Appeal Section
  appealSection: {
    marginTop: Spacing.lg,
  },
  appealCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  appealStep: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  appealStepBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  appealStepNumber: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  appealStepNumberText: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  appealStepContent: {
    flex: 1,
  },
  appealStepTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  appealStepDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 2,
  },
  appealStepDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  appealStepDeadlineText: {
    fontSize: FontSize.xs,
    color: Colors.ios.orange,
    fontWeight: FontWeight.medium,
  },

  // Tips
  tipsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  tipsUnderline: {
    width: 60,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: FontSize.md,
    color: Colors.ios.green,
    marginRight: Spacing.sm,
    fontWeight: FontWeight.bold,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
    lineHeight: 20,
  },

  // Contact
  contactCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  contactTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gray[1],
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.green + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  contactButtonContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactButtonTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  contactButtonNumber: {
    fontSize: FontSize.sm,
    color: Colors.ios.green,
  },
  contactHours: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
