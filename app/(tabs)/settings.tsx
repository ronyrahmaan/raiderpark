// ============================================================
// SETTINGS TAB - Comprehensive App Settings
// All preferences, parking config, notifications, and account
// ============================================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
import { getPermitInfo } from '@/constants/permits';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SettingsScreen() {
  const router = useRouter();
  const {
    appUser,
    signOut,
    updateNotificationPreferences,
    updateLocationEnabled,
  } = useAuthStore();
  const permitInfo = appUser ? getPermitInfo(appUser.permit_type) : null;

  // Local state for switches (optimistic updates)
  const [notifPrefs, setNotifPrefs] = useState(
    appUser?.notification_preferences ?? {
      departure_reminders: true,
      lot_filling: true,
      spot_opening: true,
      event_closures: true,
      tower_icing: true,
      time_limit_warnings: true,
      weekly_summary: false,
    }
  );
  const [locationEnabled, setLocationEnabled] = useState(
    appUser?.location_enabled ?? true
  );

  // Handle notification toggle
  const handleNotifToggle = useCallback(
    async (key: keyof typeof notifPrefs, value: boolean) => {
      // Optimistic update
      setNotifPrefs((prev) => ({ ...prev, [key]: value }));
      try {
        await updateNotificationPreferences({ [key]: value });
      } catch (error) {
        // Revert on error
        setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
        console.error('Failed to update notification preference:', error);
      }
    },
    [updateNotificationPreferences]
  );

  // Handle location toggle
  const handleLocationToggle = useCallback(
    async (value: boolean) => {
      setLocationEnabled(value);
      try {
        await updateLocationEnabled(value);
      } catch (error) {
        setLocationEnabled(!value);
        console.error('Failed to update location preference:', error);
      }
    },
    [updateLocationEnabled]
  );

  // Handle sign out
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              setTimeout(() => {
                router.replace('/onboarding');
              }, 100);
            } catch (error) {
              console.error('Sign out error:', error);
              router.replace('/onboarding');
            }
          },
        },
      ]
    );
  };

  // Handle share app
  const handleShareApp = useCallback(async () => {
    try {
      await Share.share({
        message:
          'Check out RaiderPark - the smart parking app for TTU! Find parking faster and help fellow Red Raiders. 🔴⚫',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

  // Handle rate app
  const handleRateApp = useCallback(() => {
    // TODO: Replace with actual App Store link
    Linking.openURL('https://apps.apple.com/app/raiderpark');
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => router.push('/settings/profile')}
          >
            <View style={styles.profileAvatar}>
              <SFIcon name="person" size={28} color={Colors.scarlet.DEFAULT} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {appUser?.display_name ?? 'Raider'}
              </Text>
              <Text style={styles.profileEmail}>{appUser?.email ?? 'View your stats & badges'}</Text>
            </View>
            <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
          </TouchableOpacity>
        </Animated.View>

        {/* Parking Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARKING</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItemBordered}
              onPress={() => router.push('/settings/permit')}
            >
              <View style={[styles.iconContainer, styles.iconBlue]}>
                <SFIcon name="car" size={20} color={Colors.ios.blue} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Permit Type</Text>
                <Text style={styles.menuItemSubtext}>
                  {permitInfo?.name ?? 'Not Set'}
                </Text>
              </View>
              <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/settings/schedule')}
            >
              <View style={[styles.iconContainer, styles.iconGreen]}>
                <SFIcon name="calendar" size={20} color={Colors.ios.green} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Class Schedule</Text>
                <Text style={styles.menuItemSubtext}>
                  Set your arrival times
                </Text>
              </View>
              <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconOrange]}>
                  <SFIcon name="clock" size={20} color={Colors.ios.orange} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Departure Reminders</Text>
                  <Text style={styles.switchSubtext}>When to leave for class</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.departure_reminders}
                onValueChange={(v) => handleNotifToggle('departure_reminders', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconRed]}>
                  <SFIcon name="exclamationmark-triangle" size={20} color={Colors.ios.red} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Lot Filling Up</Text>
                  <Text style={styles.switchSubtext}>Alert when lots reach 80%</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.lot_filling}
                onValueChange={(v) => handleNotifToggle('lot_filling', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconGreen]}>
                  <SFIcon name="checkmark" size={20} color={Colors.ios.green} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Spot Opening</Text>
                  <Text style={styles.switchSubtext}>When target lot has spots</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.spot_opening}
                onValueChange={(v) => handleNotifToggle('spot_opening', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconBlue]}>
                  <SFIcon name="calendar" size={20} color={Colors.ios.blue} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Event Closures</Text>
                  <Text style={styles.switchSubtext}>Game days & lot closures</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.event_closures}
                onValueChange={(v) => handleNotifToggle('event_closures', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconTeal]}>
                  <SFIcon name="snow" size={20} color={Colors.ios.teal} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Tower Icing Alerts</Text>
                  <Text style={styles.switchSubtext}>KTXT tower icing warnings</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.tower_icing}
                onValueChange={(v) => handleNotifToggle('tower_icing', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconPurple]}>
                  <SFIcon name="timer" size={20} color={Colors.ios.purple} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Time Limit Warnings</Text>
                  <Text style={styles.switchSubtext}>C11 2-hour limit reminder</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.time_limit_warnings}
                onValueChange={(v) => handleNotifToggle('time_limit_warnings', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconYellow]}>
                  <SFIcon name="doc-text" size={20} color={Colors.ios.orange} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Weekly Summary</Text>
                  <Text style={styles.switchSubtext}>Your parking stats digest</Text>
                </View>
              </View>
              <Switch
                value={notifPrefs.weekly_summary}
                onValueChange={(v) => handleNotifToggle('weekly_summary', v)}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>
          </View>
        </View>

        {/* Location & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCATION & PRIVACY</Text>
          <View style={styles.card}>
            <View style={styles.switchRowBordered}>
              <View style={styles.switchRowLeft}>
                <View style={[styles.iconContainer, styles.iconBlue]}>
                  <SFIcon name="pin" size={20} color={Colors.ios.blue} />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.menuItemLabel}>Location Services</Text>
                  <Text style={styles.switchSubtext}>For nearby spot finder</Text>
                </View>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                trackColor={{ false: Colors.gray[4], true: Colors.ios.green }}
              />
            </View>

            <TouchableOpacity
              style={styles.menuItemBordered}
              onPress={() => Linking.openURL('https://raiderpark.app/privacy')}
            >
              <View style={[styles.iconContainer, styles.iconPurple]}>
                <SFIcon name="shield" size={20} color={Colors.ios.purple} />
              </View>
              <Text style={[styles.menuItemLabel, styles.flex1]}>
                Privacy Policy
              </Text>
              <SFIcon name="arrow-up" size={14} color={Colors.gray[2]} style={styles.externalIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://raiderpark.app/terms')}
            >
              <View style={[styles.iconContainer, styles.iconTeal]}>
                <SFIcon name="doc-text" size={20} color={Colors.ios.teal} />
              </View>
              <Text style={[styles.menuItemLabel, styles.flex1]}>
                Terms of Service
              </Text>
              <SFIcon name="arrow-up" size={14} color={Colors.gray[2]} style={styles.externalIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItemBordered}
              onPress={() => router.push('/referral')}
            >
              <View style={[styles.iconContainer, styles.iconYellow]}>
                <SFIcon name="person-2" size={20} color={Colors.ios.orange} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Invite Friends</Text>
                <Text style={styles.menuItemSubtext}>Earn rewards for referrals</Text>
              </View>
              <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItemBordered} onPress={handleShareApp}>
              <View style={[styles.iconContainer, styles.iconBlue]}>
                <SFIcon name="share" size={20} color={Colors.ios.blue} />
              </View>
              <Text style={[styles.menuItemLabel, styles.flex1]}>Share App</Text>
              <SFIcon name="chevron-right" size={20} color={Colors.gray[2]} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItemBordered} onPress={handleRateApp}>
              <View style={[styles.iconContainer, styles.iconYellow]}>
                <SFIcon name="star" size={20} color={Colors.ios.orange} />
              </View>
              <Text style={[styles.menuItemLabel, styles.flex1]}>Rate on App Store</Text>
              <SFIcon name="arrow-up" size={14} color={Colors.gray[2]} style={styles.externalIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('mailto:support@raiderpark.app')}
            >
              <View style={[styles.iconContainer, styles.iconGreen]}>
                <SFIcon name="mail" size={20} color={Colors.ios.green} />
              </View>
              <Text style={[styles.menuItemLabel, styles.flex1]}>Help & Support</Text>
              <SFIcon name="arrow-up" size={14} color={Colors.gray[2]} style={styles.externalIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.sectionNoMargin}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <SFIcon name="arrow-right" size={20} color={Colors.ios.red} style={styles.signOutIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>RaiderPark v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with love for Red Raiders</Text>
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
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionNoMargin: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.md,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  profileEmail: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginTop: 2,
  },
  menuItem: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemBordered: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
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
  iconBlue: { backgroundColor: '#EFF6FF' },
  iconGreen: { backgroundColor: '#F0FDF4' },
  iconOrange: { backgroundColor: '#FFF7ED' },
  iconRed: { backgroundColor: '#FEF2F2' },
  iconPurple: { backgroundColor: '#FAF5FF' },
  iconTeal: { backgroundColor: '#F0FDFA' },
  iconYellow: { backgroundColor: '#FFFBEB' },
  switchRow: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchRowBordered: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchSubtext: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginTop: 2,
  },
  externalIcon: {
    transform: [{ rotate: '45deg' }],
  },
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  signOutIcon: {
    transform: [{ rotate: '180deg' }],
  },
  signOutText: {
    color: Colors.ios.red,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
    fontSize: FontSize.lg,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  versionText: {
    color: Colors.gray[2],
    fontSize: FontSize.sm,
  },
  versionSubtext: {
    color: Colors.gray[3],
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  flex1: {
    flex: 1,
  },
});
