// ============================================================
// FREE PARKING FINDER SCREEN
// Feature 4.5: Find free parking after 5:30pm, weekends, holidays
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

interface FreeParkingRule {
  id: string;
  title: string;
  description: string;
  icon: string;
  when: string;
  lots: string[];
  exceptions: string[];
}

const FREE_PARKING_RULES: FreeParkingRule[] = [
  {
    id: 'evening',
    title: 'After 5:30 PM',
    description: 'Most commuter lots become free parking',
    icon: 'sunset',
    when: 'Monday - Friday, 5:30 PM onwards',
    lots: ['C1', 'C4', 'C11', 'C16', 'C18', 'Most C-lots'],
    exceptions: ['Reserved spaces', 'Residence Hall lots', 'Paid parking garages'],
  },
  {
    id: 'weekend',
    title: 'Weekends',
    description: 'Free parking all day Saturday and Sunday',
    icon: 'calendar',
    when: 'Saturday & Sunday, all day',
    lots: ['All commuter lots', 'Most surface lots'],
    exceptions: ['Reserved 24/7 spaces', 'Event day restrictions', 'Residence Hall lots'],
  },
  {
    id: 'holiday',
    title: 'University Holidays',
    description: 'Free parking on official TTU holidays',
    icon: 'star',
    when: 'Official university holidays',
    lots: ['All commuter and faculty lots'],
    exceptions: ['Check TTU calendar for specific dates'],
  },
  {
    id: 'summer',
    title: 'Summer Sessions',
    description: 'Reduced enforcement during summer',
    icon: 'sun-max',
    when: 'Summer semester (varies)',
    lots: ['Many lots have relaxed rules'],
    exceptions: ['Some restrictions still apply', 'Check current signage'],
  },
];

const UPCOMING_HOLIDAYS = [
  { name: 'Spring Break', date: 'March 8-16, 2025' },
  { name: 'Memorial Day', date: 'May 26, 2025' },
  { name: 'Independence Day', date: 'July 4, 2025' },
  { name: 'Labor Day', date: 'September 1, 2025' },
  { name: 'Thanksgiving', date: 'November 26-30, 2025' },
  { name: 'Winter Break', date: 'December 15 - January 12' },
];

// ============================================================
// HELPERS
// ============================================================

function getCurrentFreeStatus(): { isFree: boolean; reason: string; until: string } {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour + minute / 60;

  // Weekend
  if (day === 0 || day === 6) {
    return {
      isFree: true,
      reason: 'Weekend - Free all day!',
      until: day === 6 ? 'Until Monday 7:30 AM' : 'Until Monday 7:30 AM',
    };
  }

  // After 5:30 PM
  if (currentTime >= 17.5) {
    return {
      isFree: true,
      reason: 'Evening hours - Most lots free!',
      until: 'Until tomorrow 7:30 AM',
    };
  }

  // Before 7:30 AM
  if (currentTime < 7.5) {
    return {
      isFree: true,
      reason: 'Early morning - Free parking',
      until: 'Until 7:30 AM',
    };
  }

  // Calculate time until free
  const minutesUntil530 = Math.round((17.5 - currentTime) * 60);
  const hoursUntil = Math.floor(minutesUntil530 / 60);
  const minsUntil = minutesUntil530 % 60;

  return {
    isFree: false,
    reason: 'Permit required',
    until: `Free in ${hoursUntil}h ${minsUntil}m (at 5:30 PM)`,
  };
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function FreeParkingScreen() {
  const router = useRouter();
  const [expandedRule, setExpandedRule] = useState<string | null>('evening');

  const currentStatus = useMemo(() => getCurrentFreeStatus(), []);

  const toggleRule = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedRule(prev => (prev === id ? null : id));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Parking</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status Hero */}
        <Animated.View
          entering={FadeIn}
          style={[
            styles.statusCard,
            currentStatus.isFree ? styles.statusCardFree : styles.statusCardPaid,
          ]}
        >
          <View style={styles.statusIcon}>
            {currentStatus.isFree ? (
              <SFIcon name="checkmark-circle" size={48} color={Colors.ios.green} />
            ) : (
              <SFIcon name="clock" size={48} color={Colors.ios.orange} />
            )}
          </View>
          <Text style={styles.statusTitle}>
            {currentStatus.isFree ? 'FREE PARKING NOW!' : 'PERMIT REQUIRED'}
          </Text>
          <Text style={styles.statusReason}>{currentStatus.reason}</Text>
          <View style={styles.statusUntilBadge}>
            <Text style={styles.statusUntilText}>{currentStatus.until}</Text>
          </View>
        </Animated.View>

        {/* Quick Reference */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.quickRefCard}>
          <Text style={styles.quickRefTitle}>QUICK REFERENCE</Text>
          <View style={styles.quickRefUnderline} />
          <View style={styles.quickRefGrid}>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefTime}>Before 7:30 AM</Text>
              <View style={[styles.quickRefStatus, styles.quickRefFree]}>
                <Text style={styles.quickRefStatusText}>FREE</Text>
              </View>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefTime}>7:30 AM - 5:30 PM</Text>
              <View style={[styles.quickRefStatus, styles.quickRefPaid]}>
                <Text style={[styles.quickRefStatusText, { color: Colors.ios.orange }]}>PERMIT</Text>
              </View>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefTime}>After 5:30 PM</Text>
              <View style={[styles.quickRefStatus, styles.quickRefFree]}>
                <Text style={styles.quickRefStatusText}>FREE</Text>
              </View>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefTime}>Weekends</Text>
              <View style={[styles.quickRefStatus, styles.quickRefFree]}>
                <Text style={styles.quickRefStatusText}>FREE</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Free Parking Rules */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>FREE PARKING RULES</Text>
          {FREE_PARKING_RULES.map((rule, index) => (
            <Animated.View
              key={rule.id}
              entering={FadeInDown.delay(250 + index * 50)}
            >
              <TouchableOpacity
                style={[
                  styles.ruleCard,
                  expandedRule === rule.id && styles.ruleCardExpanded,
                ]}
                onPress={() => toggleRule(rule.id)}
                activeOpacity={0.7}
              >
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleIconContainer}>
                    <SFIcon name={rule.icon as any} size={24} color={Colors.ios.green} />
                  </View>
                  <View style={styles.ruleContent}>
                    <Text style={styles.ruleTitle}>{rule.title}</Text>
                    <Text style={styles.ruleDesc}>{rule.description}</Text>
                  </View>
                  <SFIcon
                    name={expandedRule === rule.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.gray[2]}
                  />
                </View>

                {expandedRule === rule.id && (
                  <View style={styles.ruleExpanded}>
                    <View style={styles.ruleDetail}>
                      <Text style={styles.ruleDetailLabel}>When:</Text>
                      <Text style={styles.ruleDetailValue}>{rule.when}</Text>
                    </View>
                    <View style={styles.ruleDetail}>
                      <Text style={styles.ruleDetailLabel}>Applies to:</Text>
                      <View style={styles.ruleLots}>
                        {rule.lots.map(lot => (
                          <View key={lot} style={styles.ruleLotBadge}>
                            <Text style={styles.ruleLotText}>{lot}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.ruleExceptions}>
                      <Text style={styles.ruleExceptionsTitle}>Exceptions:</Text>
                      {rule.exceptions.map((exc, i) => (
                        <View key={i} style={styles.ruleExceptionRow}>
                          <Text style={styles.ruleExceptionBullet}>•</Text>
                          <Text style={styles.ruleExceptionText}>{exc}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Upcoming Holidays */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.holidaysCard}>
          <Text style={styles.holidaysTitle}>UPCOMING FREE PARKING DAYS</Text>
          <View style={styles.holidaysUnderline} />
          {UPCOMING_HOLIDAYS.map((holiday, index) => (
            <View
              key={holiday.name}
              style={[
                styles.holidayRow,
                index < UPCOMING_HOLIDAYS.length - 1 && styles.holidayRowBorder,
              ]}
            >
              <SFIcon name="calendar" size={16} color={Colors.ios.blue} />
              <Text style={styles.holidayName}>{holiday.name}</Text>
              <Text style={styles.holidayDate}>{holiday.date}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Warning */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.warningCard}>
          <SFIcon name="exclamationmark-triangle" size={20} color={Colors.ios.orange} />
          <Text style={styles.warningText}>
            Always check posted signage. Some spaces remain restricted 24/7
            (reserved, handicap, fire lanes). Event days may have special
            restrictions.
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

  // Status Card
  statusCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  statusCardFree: {
    backgroundColor: Colors.ios.green + '15',
    borderWidth: 2,
    borderColor: Colors.ios.green + '30',
  },
  statusCardPaid: {
    backgroundColor: Colors.ios.orange + '15',
    borderWidth: 2,
    borderColor: Colors.ios.orange + '30',
  },
  statusIcon: {
    marginBottom: Spacing.md,
  },
  statusTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  statusReason: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginBottom: Spacing.md,
  },
  statusUntilBadge: {
    backgroundColor: Colors.light.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  statusUntilText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },

  // Quick Reference
  quickRefCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  quickRefTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  quickRefUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  quickRefGrid: {
    gap: Spacing.sm,
  },
  quickRefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickRefTime: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  quickRefStatus: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  quickRefFree: {
    backgroundColor: Colors.ios.green + '15',
  },
  quickRefPaid: {
    backgroundColor: Colors.ios.orange + '15',
  },
  quickRefStatusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
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

  // Rule Card
  ruleCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  ruleCardExpanded: {
    borderWidth: 1,
    borderColor: Colors.ios.green + '30',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  ruleDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  ruleExpanded: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  ruleDetail: {
    marginBottom: Spacing.sm,
  },
  ruleDetailLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: 4,
  },
  ruleDetailValue: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
  },
  ruleLots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  ruleLotBadge: {
    backgroundColor: Colors.ios.green + '15',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  ruleLotText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.ios.green,
  },
  ruleExceptions: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ruleExceptionsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.xs,
  },
  ruleExceptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ruleExceptionBullet: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginRight: Spacing.xs,
  },
  ruleExceptionText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
  },

  // Holidays
  holidaysCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  holidaysTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  holidaysUnderline: {
    width: 120,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  holidayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  holidayName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  holidayDate: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },

  // Warning
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },
});
