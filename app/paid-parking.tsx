// ============================================================
// PAID PARKING INFO SCREEN
// Feature 4.2: Park-and-pay locations, rates, and info
// ============================================================

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
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

interface PaidLot {
  id: string;
  name: string;
  location: string;
  hourlyRate: number;
  dailyMax: number;
  paymentMethods: string[];
  textCode?: string;
  hours: string;
}

const PAID_LOTS: PaidLot[] = [
  {
    id: 'flint',
    name: 'Flint Avenue Garage',
    location: 'Near Student Union',
    hourlyRate: 1.50,
    dailyMax: 9,
    paymentMethods: ['Credit Card', 'Text-to-Pay', 'ParkMobile App'],
    textCode: 'FLINT',
    hours: '24/7',
  },
  {
    id: 'visitor',
    name: 'Visitor Parking',
    location: 'Various Campus Locations',
    hourlyRate: 2.00,
    dailyMax: 12,
    paymentMethods: ['Credit Card', 'Text-to-Pay'],
    textCode: 'VISIT',
    hours: '6am - 10pm',
  },
  {
    id: 'jones',
    name: 'Jones AT&T Stadium',
    location: 'Game Day Only',
    hourlyRate: 0,
    dailyMax: 20,
    paymentMethods: ['Cash', 'Credit Card'],
    hours: 'Game Days',
  },
];

const PAYMENT_TIPS = [
  {
    icon: 'iphone',
    title: 'Text-to-Pay',
    description: 'Text the lot code to 25023 for quick payment',
  },
  {
    icon: 'creditcard',
    title: 'Pay Stations',
    description: 'Use kiosks at lot entrances. Accept cards only.',
  },
  {
    icon: 'app-badge',
    title: 'ParkMobile App',
    description: 'Download for easy mobile payments and reminders',
  },
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function PaidParkingScreen() {
  const router = useRouter();

  const handleTextToPay = useCallback((code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`sms:25023&body=${code}`);
  }, []);

  const handleOpenParkMobile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('https://parkmobile.io');
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paid Parking</Text>
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
            <SFIcon name="creditcard" size={32} color={Colors.ios.green} />
          </View>
          <Text style={styles.heroTitle}>Visitor & Pay Parking</Text>
          <Text style={styles.heroSubtitle}>
            No permit? No problem. Pay-as-you-go options available.
          </Text>
        </Animated.View>

        {/* Quick Rates Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.quickRatesCard}>
          <Text style={styles.quickRatesTitle}>QUICK RATES</Text>
          <View style={styles.quickRatesUnderline} />
          <View style={styles.ratesGrid}>
            <View style={styles.rateItem}>
              <Text style={styles.rateValue}>$1.50</Text>
              <Text style={styles.rateLabel}>/hour</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateValue}>$9</Text>
              <Text style={styles.rateLabel}>/day max</Text>
            </View>
          </View>
        </Animated.View>

        {/* Payment Methods */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={styles.sectionTitle}>PAYMENT METHODS</Text>
          <View style={styles.paymentMethodsCard}>
            {PAYMENT_TIPS.map((tip, index) => (
              <View
                key={tip.title}
                style={[
                  styles.paymentMethod,
                  index < PAYMENT_TIPS.length - 1 && styles.paymentMethodBorder,
                ]}
              >
                <View style={styles.paymentMethodIcon}>
                  <SFIcon name={tip.icon as any} size={24} color={Colors.ios.blue} />
                </View>
                <View style={styles.paymentMethodContent}>
                  <Text style={styles.paymentMethodTitle}>{tip.title}</Text>
                  <Text style={styles.paymentMethodDesc}>{tip.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Paid Lots List */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>PAID PARKING LOCATIONS</Text>
          {PAID_LOTS.map((lot, index) => (
            <Animated.View
              key={lot.id}
              entering={FadeInDown.delay(250 + index * 50)}
              style={styles.lotCard}
            >
              <View style={styles.lotHeader}>
                <View style={styles.lotInfo}>
                  <Text style={styles.lotName}>{lot.name}</Text>
                  <Text style={styles.lotLocation}>{lot.location}</Text>
                </View>
                <View style={styles.lotPricing}>
                  {lot.hourlyRate > 0 ? (
                    <>
                      <Text style={styles.lotPrice}>${lot.hourlyRate.toFixed(2)}</Text>
                      <Text style={styles.lotPriceUnit}>/hr</Text>
                    </>
                  ) : (
                    <Text style={styles.lotPriceFlat}>${lot.dailyMax}</Text>
                  )}
                </View>
              </View>

              <View style={styles.lotDetails}>
                <View style={styles.lotDetailRow}>
                  <SFIcon name="clock" size={14} color={Colors.gray[2]} />
                  <Text style={styles.lotDetailText}>Hours: {lot.hours}</Text>
                </View>
                {lot.dailyMax > 0 && lot.hourlyRate > 0 && (
                  <View style={styles.lotDetailRow}>
                    <SFIcon name="info-circle" size={14} color={Colors.gray[2]} />
                    <Text style={styles.lotDetailText}>
                      Daily max: ${lot.dailyMax}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.lotPayments}>
                {lot.paymentMethods.map(method => (
                  <View key={method} style={styles.paymentBadge}>
                    <Text style={styles.paymentBadgeText}>{method}</Text>
                  </View>
                ))}
              </View>

              {lot.textCode && (
                <TouchableOpacity
                  style={styles.textToPayButton}
                  onPress={() => handleTextToPay(lot.textCode!)}
                >
                  <SFIcon name="message" size={16} color={Colors.ios.blue} />
                  <Text style={styles.textToPayText}>
                    Text "{lot.textCode}" to 25023
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          ))}
        </Animated.View>

        {/* ParkMobile CTA */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.parkMobileCard}>
          <View style={styles.parkMobileContent}>
            <Text style={styles.parkMobileTitle}>Use ParkMobile App</Text>
            <Text style={styles.parkMobileDesc}>
              Get reminders before your time expires. Add time from anywhere!
            </Text>
          </View>
          <TouchableOpacity
            style={styles.parkMobileButton}
            onPress={handleOpenParkMobile}
          >
            <Text style={styles.parkMobileButtonText}>Download</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Important Notes */}
        <Animated.View entering={FadeInDown.delay(450)} style={styles.notesCard}>
          <Text style={styles.notesTitle}>IMPORTANT NOTES</Text>
          <View style={styles.notesUnderline} />
          <View style={styles.notesList}>
            <View style={styles.noteItem}>
              <Text style={styles.noteBullet}>•</Text>
              <Text style={styles.noteText}>
                Overtime fees: $25 per violation
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Text style={styles.noteBullet}>•</Text>
              <Text style={styles.noteText}>
                Pay stations accept credit/debit only (no cash)
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Text style={styles.noteBullet}>•</Text>
              <Text style={styles.noteText}>
                Event days may have different rates
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Text style={styles.noteBullet}>•</Text>
              <Text style={styles.noteText}>
                Keep receipt visible on dashboard
              </Text>
            </View>
          </View>
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
    backgroundColor: Colors.ios.green + '15',
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

  // Quick Rates
  quickRatesCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  quickRatesTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  quickRatesUnderline: {
    width: 60,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  ratesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
  },
  rateValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
  },
  rateLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  rateDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray[4],
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

  // Payment Methods
  paymentMethodsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  paymentMethodBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.blue + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  paymentMethodDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 2,
  },

  // Lot Card
  lotCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  lotInfo: {
    flex: 1,
  },
  lotName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  lotLocation: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  lotPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lotPrice: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
  },
  lotPriceUnit: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  lotPriceFlat: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ios.orange,
  },
  lotDetails: {
    marginBottom: Spacing.sm,
  },
  lotDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  lotDetailText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  lotPayments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  paymentBadge: {
    backgroundColor: Colors.gray[5],
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  paymentBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },
  textToPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  textToPayText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },

  // ParkMobile CTA
  parkMobileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.blue + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.ios.blue + '20',
  },
  parkMobileContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  parkMobileTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.blue,
  },
  parkMobileDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  parkMobileButton: {
    backgroundColor: Colors.ios.blue,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  parkMobileButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Notes
  notesCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  notesTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  notesUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  notesList: {
    gap: Spacing.xs,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteBullet: {
    fontSize: FontSize.md,
    color: Colors.gray[2],
    marginRight: Spacing.sm,
  },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
    lineHeight: 20,
  },
});
