import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows, Typography } from '@/constants/theme';
import { NotificationPreferences } from '@/types/database';

interface NotificationSettingProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

function NotificationSetting({ icon, iconBgColor, title, description, value, onValueChange, isLast = false }: NotificationSettingProps) {
  return (
    <View style={[styles.settingRow, !isLast && styles.settingRowBorder]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: Colors.gray[3], true: Colors.ios.green }} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {children}
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { appUser, updateNotificationPreferences } = useAuthStore();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    appUser?.notification_preferences ?? {
      departure_reminders: true,
      lot_filling: true,
      spot_opening: false,
      event_closures: true,
      tower_icing: true,
      time_limit_warnings: true,
      weekly_summary: false,
    }
  );

  const handleToggle = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    const previousValue = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }));

    try {
      await updateNotificationPreferences({ [key]: value });
    } catch (error) {
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      Alert.alert('Update Failed', 'Could not update notification preferences. Please try again.');
    }
  }, [preferences, updateNotificationPreferences]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <SFIcon name="chevron-left" size={28} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Section title="PARKING ALERTS">
          <NotificationSetting
            icon={<SFIcon name="trending-up" size={20} color={Colors.ios.orange} />}
            iconBgColor="#FFF7ED"
            title="Lot Filling Up"
            description="Alert when your preferred lots are getting busy"
            value={preferences.lot_filling}
            onValueChange={(v) => handleToggle('lot_filling', v)}
          />
          <NotificationSetting
            icon={<SFIcon name="bell" size={20} color={Colors.ios.green} />}
            iconBgColor="#F0FDF4"
            title="Spot Opening"
            description="Notify when spots open in full lots"
            value={preferences.spot_opening}
            onValueChange={(v) => handleToggle('spot_opening', v)}
          />
          <NotificationSetting
            icon={<SFIcon name="clock" size={20} color={Colors.ios.purple} />}
            iconBgColor="#FAF5FF"
            title="Time Limit Warnings"
            description="Remind before metered parking expires"
            value={preferences.time_limit_warnings}
            onValueChange={(v) => handleToggle('time_limit_warnings', v)}
            isLast
          />
        </Section>

        <Section title="SCHEDULE & REMINDERS">
          <NotificationSetting
            icon={<SFIcon name="clock" size={20} color={Colors.ios.blue} />}
            iconBgColor="#EFF6FF"
            title="Departure Reminders"
            description="Smart reminders based on your class schedule"
            value={preferences.departure_reminders}
            onValueChange={(v) => handleToggle('departure_reminders', v)}
            isLast
          />
        </Section>

        <Section title="EVENTS & CLOSURES">
          <NotificationSetting
            icon={<SFIcon name="calendar" size={20} color={Colors.scarlet.DEFAULT} />}
            iconBgColor="#FEF2F2"
            title="Event Closures"
            description="Alerts for game days, concerts, and special events"
            value={preferences.event_closures}
            onValueChange={(v) => handleToggle('event_closures', v)}
          />
          <NotificationSetting
            icon={<SFIcon name="snow" size={20} color={Colors.ios.teal} />}
            iconBgColor="#ECFEFF"
            title="Tower Icing Alerts"
            description="Warnings when lots may close due to icing"
            value={preferences.tower_icing}
            onValueChange={(v) => handleToggle('tower_icing', v)}
            isLast
          />
        </Section>

        <Section title="WEEKLY UPDATES">
          <NotificationSetting
            icon={<SFIcon name="chart" size={20} color={Colors.ios.indigo} />}
            iconBgColor="#EEF2FF"
            title="Weekly Summary"
            description="Your parking stats and best times to park"
            value={preferences.weekly_summary}
            onValueChange={(v) => handleToggle('weekly_summary', v)}
            isLast
          />
        </Section>

        <View style={styles.infoBox}>
          <SFIcon name="info" size={20} color={Colors.ios.blue} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Push Notification Permission</Text>
            <Text style={styles.infoText}>
              Make sure push notifications are enabled in your device settings to receive alerts from RaiderPark.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
    backgroundColor: Colors.light.background,
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginLeft: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: Spacing.md,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  settingRow: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[6],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  settingDescription: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  infoBox: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#1E40AF',
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  infoText: {
    color: '#2563EB',
    fontSize: FontSize.sm,
  },
});
