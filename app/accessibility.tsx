// ============================================================
// ACCESSIBILITY INFO SCREEN
// Feature 4.7: ADA spots, accessible routes, shuttle info
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

interface AccessibleLot {
  id: string;
  name: string;
  adaSpots: number;
  nearBuildings: string[];
  features: string[];
}

const ACCESSIBLE_LOTS: AccessibleLot[] = [
  {
    id: 'C1',
    name: 'Commuter West',
    adaSpots: 8,
    nearBuildings: ['Administration', 'Student Union'],
    features: ['Level surface', 'Curb cuts', 'Near ramps'],
  },
  {
    id: 'C11',
    name: 'Rec Center',
    adaSpots: 12,
    nearBuildings: ['Recreation Center', 'Library'],
    features: ['Level surface', 'Wide spaces', 'Near entrance'],
  },
  {
    id: 'C4',
    name: 'Engineering',
    adaSpots: 6,
    nearBuildings: ['Engineering Center', 'Chemistry'],
    features: ['Level access', 'Covered walkway nearby'],
  },
  {
    id: 'Flint',
    name: 'Flint Garage',
    adaSpots: 15,
    nearBuildings: ['Student Union', 'Library'],
    features: ['Elevator access', 'Covered parking', 'Near ramps'],
  },
];

const SHUTTLE_INFO = {
  name: 'Raider Ride',
  description: 'On-demand accessible shuttle service',
  hours: '6:00 PM - 2:45 AM daily',
  phone: '8067423646',
  features: [
    'Wheelchair accessible',
    'On-demand service',
    'Campus-wide coverage',
    'Free for students',
  ],
};

const RESOURCES = [
  {
    title: 'Student Disability Services',
    description: 'Register for accommodations and parking permits',
    phone: '8067422405',
    url: 'https://www.depts.ttu.edu/sds/',
  },
  {
    title: 'ADA Coordinator',
    description: 'Report accessibility issues or concerns',
    phone: '8067423851',
  },
  {
    title: 'Parking Services',
    description: 'ADA parking permit applications',
    phone: '8067423811',
  },
];

const TIPS = [
  'ADA spaces require valid state-issued placard or plate',
  'Temporary permits available through Student Disability Services',
  'Report blocked accessible spaces to TTU Police',
  'Emergency call boxes are located throughout campus',
  'All buildings have accessible entrances (some may not be main entrance)',
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function AccessibilityScreen() {
  const router = useRouter();

  const handleCall = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleOpenURL = useCallback((url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accessibility</Text>
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
            <SFIcon name="figure-roll" size={32} color={Colors.ios.blue} />
          </View>
          <Text style={styles.heroTitle}>Accessible Parking</Text>
          <Text style={styles.heroSubtitle}>
            Resources and information for accessible parking at TTU
          </Text>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>50+</Text>
            <Text style={styles.statLabel}>ADA Spaces</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24/7</Text>
            <Text style={styles.statLabel}>Reserved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Free</Text>
            <Text style={styles.statLabel}>Raider Ride</Text>
          </View>
        </Animated.View>

        {/* Raider Ride Shuttle */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.shuttleCard}>
          <View style={styles.shuttleHeader}>
            <View style={styles.shuttleIcon}>
              <SFIcon name="bus" size={28} color={Colors.ios.green} />
            </View>
            <View style={styles.shuttleInfo}>
              <Text style={styles.shuttleName}>{SHUTTLE_INFO.name}</Text>
              <Text style={styles.shuttleDesc}>{SHUTTLE_INFO.description}</Text>
            </View>
          </View>

          <View style={styles.shuttleHours}>
            <SFIcon name="clock" size={16} color={Colors.gray[2]} />
            <Text style={styles.shuttleHoursText}>{SHUTTLE_INFO.hours}</Text>
          </View>

          <View style={styles.shuttleFeatures}>
            {SHUTTLE_INFO.features.map(feature => (
              <View key={feature} style={styles.shuttleFeature}>
                <SFIcon name="checkmark" size={14} color={Colors.ios.green} />
                <Text style={styles.shuttleFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.shuttleCallButton}
            onPress={() => handleCall(SHUTTLE_INFO.phone)}
          >
            <SFIcon name="phone" size={18} color={Colors.light.background} />
            <Text style={styles.shuttleCallText}>Request Pickup</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Accessible Lots */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>ACCESSIBLE PARKING LOTS</Text>
          {ACCESSIBLE_LOTS.map((lot, index) => (
            <Animated.View
              key={lot.id}
              entering={FadeInDown.delay(250 + index * 50)}
              style={styles.lotCard}
            >
              <View style={styles.lotHeader}>
                <View style={styles.lotBadge}>
                  <Text style={styles.lotBadgeText}>{lot.id}</Text>
                </View>
                <View style={styles.lotInfo}>
                  <Text style={styles.lotName}>{lot.name}</Text>
                  <Text style={styles.lotBuildings}>
                    Near: {lot.nearBuildings.join(', ')}
                  </Text>
                </View>
                <View style={styles.lotSpots}>
                  <Text style={styles.lotSpotsNumber}>{lot.adaSpots}</Text>
                  <Text style={styles.lotSpotsLabel}>ADA</Text>
                </View>
              </View>
              <View style={styles.lotFeatures}>
                {lot.features.map(feature => (
                  <View key={feature} style={styles.lotFeatureBadge}>
                    <Text style={styles.lotFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Resources */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Text style={styles.sectionTitle}>HELPFUL RESOURCES</Text>
          <View style={styles.resourcesCard}>
            {RESOURCES.map((resource, index) => (
              <TouchableOpacity
                key={resource.title}
                style={[
                  styles.resourceRow,
                  index < RESOURCES.length - 1 && styles.resourceRowBorder,
                ]}
                onPress={() =>
                  resource.url
                    ? handleOpenURL(resource.url)
                    : handleCall(resource.phone!)
                }
              >
                <View style={styles.resourceContent}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceDesc}>{resource.description}</Text>
                </View>
                <View style={styles.resourceAction}>
                  {resource.url ? (
                    <SFIcon name="link" size={18} color={Colors.ios.blue} />
                  ) : (
                    <SFIcon name="phone" size={18} color={Colors.ios.green} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Important Tips */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>IMPORTANT INFORMATION</Text>
          <View style={styles.tipsUnderline} />
          {TIPS.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <SFIcon name="info-circle" size={14} color={Colors.ios.blue} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Report Issue */}
        <Animated.View entering={FadeInDown.delay(550)} style={styles.reportCard}>
          <View style={styles.reportIcon}>
            <SFIcon name="exclamationmark-bubble" size={24} color={Colors.ios.orange} />
          </View>
          <View style={styles.reportContent}>
            <Text style={styles.reportTitle}>See an Issue?</Text>
            <Text style={styles.reportDesc}>
              Report blocked spaces, broken ramps, or other accessibility concerns
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => handleCall('8067423851')}
          >
            <Text style={styles.reportButtonText}>Report</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Emergency */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.emergencyCard}>
          <SFIcon name="sos" size={20} color={Colors.ios.red} />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Assistance</Text>
            <Text style={styles.emergencyPhone}>TTU Police: (806) 742-2222</Text>
          </View>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => handleCall('8067422222')}
          >
            <SFIcon name="phone" size={16} color={Colors.light.background} />
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

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue + '15',
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

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ios.blue,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray[4],
  },

  // Shuttle Card
  shuttleCard: {
    backgroundColor: Colors.ios.green + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.ios.green + '20',
  },
  shuttleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  shuttleIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  shuttleInfo: {
    flex: 1,
  },
  shuttleName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
  },
  shuttleDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  shuttleHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shuttleHoursText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  shuttleFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shuttleFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shuttleFeatureText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  shuttleCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ios.green,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  shuttleCallText: {
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
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lotBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.blue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  lotBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.ios.blue,
  },
  lotInfo: {
    flex: 1,
  },
  lotName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  lotBuildings: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  lotSpots: {
    alignItems: 'center',
    backgroundColor: Colors.ios.blue + '10',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  lotSpotsNumber: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.ios.blue,
  },
  lotSpotsLabel: {
    fontSize: FontSize.xs,
    color: Colors.ios.blue,
  },
  lotFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  lotFeatureBadge: {
    backgroundColor: Colors.gray[5],
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  lotFeatureText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
  },

  // Resources Card
  resourcesCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  resourceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  resourceDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  resourceAction: {
    marginLeft: Spacing.md,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  tipsUnderline: {
    width: 100,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
    lineHeight: 20,
  },

  // Report Card
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.ios.orange + '20',
  },
  reportIcon: {
    marginRight: Spacing.md,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
  },
  reportDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  reportButton: {
    backgroundColor: Colors.ios.orange,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  reportButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Emergency Card
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.red + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.red + '20',
  },
  emergencyContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  emergencyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.red,
  },
  emergencyPhone: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  emergencyButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
