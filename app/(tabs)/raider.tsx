// ============================================================
// RAIDER TAB - Quick Actions, Info & Resources
// Your TTU parking companion hub
// ============================================================

import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

const QUICK_ACTIONS = [
  {
    id: 'find-spot',
    title: 'Find a Spot',
    subtitle: 'Best lot for you now',
    icon: 'target',
    iconColor: Colors.scarlet[500],
    route: '/(tabs)', // Go to home to use finder
  },
  {
    id: 'report',
    title: 'Report Status',
    subtitle: 'Help fellow Raiders',
    icon: 'pin-fill',
    iconColor: Colors.ios.blue,
    route: '/report',
  },
  {
    id: 'events',
    title: 'Events',
    subtitle: 'Closures & game days',
    icon: 'calendar',
    iconColor: Colors.ios.orange,
    route: '/events',
  },
  {
    id: 'bus',
    title: 'Bus Routes',
    subtitle: 'Citibus & S1',
    icon: 'bus',
    iconColor: Colors.ios.green,
    route: '/bus',
  },
];

const PARKING_INFO = [
  {
    id: 'free-parking',
    title: 'Free Parking',
    subtitle: 'After 5:30pm, weekends & holidays',
    icon: 'clock',
    iconColor: Colors.ios.teal,
    route: '/free-parking',
  },
  {
    id: 'paid-parking',
    title: 'Paid Parking',
    subtitle: 'Visitor rates: $1.50/hr, $9/day',
    icon: 'creditcard',
    iconColor: Colors.ios.orange,
    route: '/paid-parking',
  },
  {
    id: 'walk-times',
    title: 'Walk Times',
    subtitle: 'Distance from lots to buildings',
    icon: 'figure-walk',
    iconColor: Colors.ios.green,
    route: '/walk-times',
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    subtitle: 'ADA parking & shuttle info',
    icon: 'figure-roll',
    iconColor: Colors.ios.purple,
    route: '/accessibility',
  },
];

const HELP_RESOURCES = [
  {
    id: 'citation-help',
    title: 'Citation Help',
    subtitle: 'Fines, appeals & 10-day deadline',
    icon: 'doc-text',
    iconColor: Colors.ios.orange,
    route: '/citation-help',
  },
  {
    id: 'tow-emergency',
    title: 'Tow Emergency',
    subtitle: 'What to do if your car is towed',
    icon: 'exclamationmark-triangle',
    iconColor: Colors.ios.red,
    route: '/tow-emergency',
  },
];

const EXTERNAL_LINKS = [
  {
    id: 'ttu-parking',
    title: 'TTU Parking Website',
    url: 'https://www.depts.ttu.edu/parking/',
  },
  {
    id: 'citibus',
    title: 'Citibus / GoPass',
    url: 'https://citibus.com/',
  },
  {
    id: 'pay-citation',
    title: 'Pay Citation Online',
    url: 'https://www.depts.ttu.edu/parking/citations/',
  },
];

const PRO_TIPS = [
  'After 2:30 PM, Commuter West can park in North lots',
  'S1 shuttle runs every 10-15 min to campus',
  'Free parking after 5:30 PM and on weekends',
  'Appeal citations within 10 business days',
  'C11 has a 2-hour limit - set a reminder!',
];

// ============================================================
// COMPONENT
// ============================================================

export default function RaiderScreen() {
  const router = useRouter();

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  const handleExternalLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Raider</Text>
            <View style={styles.headerBadge}>
              <SFIcon name="star" size={14} color={Colors.scarlet[500]} />
              <Text style={styles.headerBadgeText}>TTU</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Your parking companion</Text>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 50).duration(300)}
                style={styles.quickGridItem}
              >
                <TouchableOpacity
                  style={styles.quickCard}
                  onPress={() => handlePress(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickIconContainer, { backgroundColor: item.iconColor + '15' }]}>
                    <SFIcon name={item.icon as any} size={24} color={item.iconColor} />
                  </View>
                  <Text style={styles.quickTitle}>{item.title}</Text>
                  <Text style={styles.quickSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Parking Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARKING INFO</Text>
          <View style={styles.card}>
            {PARKING_INFO.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < PARKING_INFO.length - 1 && styles.menuItemBordered,
                ]}
                onPress={() => handlePress(item.route)}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '15' }]}>
                  <SFIcon name={item.icon as any} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemLabel}>{item.title}</Text>
                  <Text style={styles.menuItemSubtext}>{item.subtitle}</Text>
                </View>
                <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help & Emergency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HELP & EMERGENCY</Text>
          <View style={styles.card}>
            {HELP_RESOURCES.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < HELP_RESOURCES.length - 1 && styles.menuItemBordered,
                ]}
                onPress={() => handlePress(item.route)}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '15' }]}>
                  <SFIcon name={item.icon as any} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemLabel}>{item.title}</Text>
                  <Text style={styles.menuItemSubtext}>{item.subtitle}</Text>
                </View>
                <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pro Tips */}
        <View style={styles.section}>
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <SFIcon name="lightbulb" size={20} color={Colors.ios.orange} />
              <Text style={styles.tipsTitle}>Pro Tips</Text>
            </View>
            <View style={styles.tipsList}>
              {PRO_TIPS.map((tip, index) => (
                <Text key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>• </Text>
                  {tip}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* External Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OFFICIAL LINKS</Text>
          <View style={styles.card}>
            {EXTERNAL_LINKS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < EXTERNAL_LINKS.length - 1 && styles.menuItemBordered,
                ]}
                onPress={() => handleExternalLink(item.url)}
              >
                <View style={[styles.iconContainer, { backgroundColor: Colors.scarlet[50] }]}>
                  <SFIcon name="link" size={18} color={Colors.scarlet[500]} />
                </View>
                <Text style={[styles.menuItemLabel, styles.flex1]}>{item.title}</Text>
                <SFIcon name="arrow-up" size={14} color={Colors.gray[2]} style={styles.externalIcon} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Guns Up! 🔴⚫</Text>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.scarlet[500],
  },
  headerSubtitle: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginTop: 4,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  // Quick Actions Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickGridItem: {
    width: '48%',
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  quickIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },
  quickSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    textAlign: 'center',
    marginTop: 2,
  },
  // Menu Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuItem: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: FontSize.lg,
    color: Colors.light.text,
  },
  menuItemSubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  externalIcon: {
    transform: [{ rotate: '45deg' }],
  },
  flex1: {
    flex: 1,
  },
  // Tips Card
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#92400E',
  },
  tipsList: {
    gap: Spacing.xs,
  },
  tipItem: {
    fontSize: FontSize.sm,
    color: '#78350F',
    lineHeight: 20,
  },
  tipBullet: {
    color: Colors.ios.orange,
    fontWeight: FontWeight.bold,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.md,
    color: Colors.gray[2],
    fontWeight: FontWeight.medium,
  },
});
